"""
Derives per-section quantity summaries from parsed Revit sections.

Priority rule for final quantity:
  1. Grand Total from Revit (authoritative)
  2. Sum of Area column
  3. Sum of Volume column
  4. Sum of Length column
  5. Sum of Count column
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional
import yaml

from ..parsers.schema import ParseResult, Section

_CAPITULOS_PATH = Path(__file__).parent.parent / "config" / "capitulos.yaml"


def _load_capitulos(path: Path = _CAPITULOS_PATH) -> dict[str, str]:
    with open(path, encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return data.get("capitulos", {})


_PRIORITY = ["area", "volume", "length", "count"]
_UNIT_MAP = {"area": "m²", "volume": "m³", "length": "ml", "count": "u"}


@dataclass
class SectionSummary:
    code: str
    description: str
    chapter_code: str
    chapter_name: str
    quantity: Optional[float]
    unit: str
    fuente: str
    element_count: int
    has_data: bool
    warnings: list[str] = field(default_factory=list)


@dataclass
class AnalysisResult:
    summaries: list[SectionSummary] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    @property
    def with_data(self) -> list[SectionSummary]:
        return [s for s in self.summaries if s.has_data]

    @property
    def without_data(self) -> list[SectionSummary]:
        return [s for s in self.summaries if not s.has_data]

    @property
    def total_count(self) -> int:
        return len(self.summaries)

    def chapter_stats(self) -> dict[str, dict]:
        stats: dict[str, dict] = {}
        for s in self.summaries:
            ch = s.chapter_code
            if ch not in stats:
                stats[ch] = {
                    "name": s.chapter_name,
                    "with_data": 0,
                    "without_data": 0,
                    "total": 0,
                }
            stats[ch]["total"] += 1
            if s.has_data:
                stats[ch]["with_data"] += 1
            else:
                stats[ch]["without_data"] += 1
        for ch, d in stats.items():
            d["pct"] = round(100 * d["with_data"] / d["total"], 1) if d["total"] else 0
        return dict(sorted(stats.items()))

    def top_by_unit(self, unit: str, n: int = 10) -> list[SectionSummary]:
        matching = [s for s in self.summaries if s.unit == unit and s.quantity]
        return sorted(matching, key=lambda s: s.quantity or 0, reverse=True)[:n]

    def totals_by_unit(self) -> dict[str, float]:
        result: dict[str, float] = {}
        for s in self.summaries:
            if s.quantity and s.unit:
                result[s.unit] = result.get(s.unit, 0.0) + s.quantity
        return result


def _pick_quantity(section: Section) -> tuple[Optional[float], str, str]:
    """Return (quantity, unit, fuente) for the section."""
    # Priority 1: use Grand Total
    if section.grand_total and section.grand_total.metrics:
        metrics = section.grand_total.metrics
        for key in _PRIORITY:
            if key in metrics:
                return metrics[key], _UNIT_MAP[key], "Grand Total (Revit)"
        # Has grand total but only unknown metrics; take first
        first_key = next(iter(metrics))
        return metrics[first_key], "u", "Grand Total (Revit)"

    # Priority 2-5: sum from data rows
    if not section.data_rows:
        return None, "", "Sin datos"

    for key in _PRIORITY:
        vals = [r.metrics[key] for r in section.data_rows if key in r.metrics]
        if vals:
            return sum(vals), _UNIT_MAP[key], "Suma calculada"

    return None, "u", "Sin métricas"


def analyze(parse_result: ParseResult, capitulos: dict[str, str] | None = None) -> AnalysisResult:
    if capitulos is None:
        capitulos = _load_capitulos()

    result = AnalysisResult(warnings=list(parse_result.warnings))

    for section in sorted(parse_result.sections, key=lambda s: s.code):
        quantity, unit, fuente = _pick_quantity(section)

        chapter_code = section.chapter_code
        chapter_name = capitulos.get(chapter_code, f"Capítulo {chapter_code}")

        warn: list[str] = []

        # Warning: discrepancy between grand total and calculated sum
        if section.grand_total and section.grand_total.metrics and section.data_rows:
            for key in _PRIORITY:
                if key in section.grand_total.metrics:
                    gt_val = section.grand_total.metrics[key]
                    calc_vals = [r.metrics[key] for r in section.data_rows if key in r.metrics]
                    if calc_vals:
                        calc_sum = sum(calc_vals)
                        if gt_val > 0 and abs(calc_sum - gt_val) / gt_val > 0.10:
                            ratio = calc_sum / gt_val if gt_val else 0
                            warn.append(
                                f"DISCREPANCY [{section.code}]: Grand Total={gt_val:.2f} "
                                f"vs Suma={calc_sum:.2f} ({ratio:.1f}x) — "
                                f"si ratio≈2 Revit duplicó caras de muros/contrapisos"
                            )
                    break

        # Warning: section with no description
        if not section.description.strip():
            warn.append(f"NO_DESC [{section.code}]: Sección sin descripción — revisar modelo")

        summary = SectionSummary(
            code=section.code,
            description=section.description,
            chapter_code=chapter_code,
            chapter_name=chapter_name,
            quantity=quantity,
            unit=unit,
            fuente=fuente,
            element_count=section.element_count,
            has_data=section.has_data,
            warnings=warn,
        )
        result.summaries.append(summary)

        # Propagate per-section warnings upward
        result.warnings.extend(warn)

    # Chapter-level warning: <50% modeled
    for ch, stats in result.chapter_stats().items():
        if stats["total"] >= 2 and stats["pct"] < 50:
            result.warnings.append(
                f"CHAPTER_LOW [{ch} – {stats['name']}]: "
                f"solo {stats['pct']}% de rubros modelados "
                f"({stats['with_data']}/{stats['total']})"
            )

    return result
