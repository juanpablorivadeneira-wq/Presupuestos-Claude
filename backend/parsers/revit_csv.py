"""
Parser for Revit quantity schedule CSV exports.

Revit exports multiple schedule tables concatenated in a single file separated
by section-header rows.  Each section follows this pattern:

  <CODE>  <DESCRIPTION>          <- section header (tab-separated)
  <col1>  <col2>  ...            <- column header row
  <data row 1>
  <data row 2>
  ...
  Grand total: N  ...  <val>     <- optional grand-total row

The file may also contain non-section tables at the end (room areas, doors,
windows…) that do not match the XX.XX pattern.  Those are skipped.
"""

import re
import csv
import io
from pathlib import Path
from typing import Union

from .schema import DataRow, GrandTotal, ParseResult, Section

# Matches codes like: 01.01.01  03.02.02  03.03.01.a  31.20  41.00
# Format: XX.XX  or  XX.XX.XX  or  XX.XX.XX.a
_SECTION_CODE_RE = re.compile(
    r"^(\d{2}\.\d{2}(?:\.\d{2}(?:\.[a-z])?)?)(?:\s|$)"
)

# Words that identify a column-header row
_HEADER_WORDS = {
    "area", "área", "volume", "volumen", "length", "longitud",
    "family", "familia", "type", "tipo", "material", "mark",
    "name", "nombre", "perimeter", "perímetro", "count",
    "cantidad", "recuento", "model", "manufacturer",
}

# Metric column labels → canonical name + unit
_METRIC_MAP = [
    (re.compile(r"\barea\b|\bárea\b", re.I),    "area",   "m²"),
    (re.compile(r"\bvolume\b|\bvolumen\b", re.I), "volume", "m³"),
    (re.compile(r"\blength\b|\blongitud\b", re.I), "length", "ml"),
    (re.compile(r"\bcantidad\b|\bcount\b|\brecuento\b", re.I), "count", "u"),
]


def _is_section_header(cells: list[str]) -> re.Match | None:
    if not cells:
        return None
    m = _SECTION_CODE_RE.match(cells[0].strip())
    if not m:
        return None
    # Reject false positives: rows where the code cell is followed by
    # empty cells and then numeric values (e.g. door-schedule subtotals
    # like "31.20\t\t10.46\t\t13" in puertas table).
    remainder_after_code = cells[0].strip()[len(m.group(1)):].strip()
    description_in_cell0 = bool(remainder_after_code and not remainder_after_code[0].isdigit())
    description_in_cell1 = bool(len(cells) > 1 and cells[1].strip() and not cells[1].strip()[0].isdigit())
    if not description_in_cell0 and not description_in_cell1:
        # Code cell has no description – check that no subsequent cell is numeric
        has_trailing_numbers = any(
            _parse_number(c) is not None for c in cells[1:] if c.strip()
        )
        if has_trailing_numbers:
            return None
    return m


def _is_column_header(cells: list[str]) -> bool:
    words = {c.strip().lower() for c in cells if c.strip()}
    return bool(words & _HEADER_WORDS)


def _is_grand_total(cells: list[str]) -> bool:
    return cells[0].strip().lower().startswith("grand total")


def _is_subtotal_row(cells: list[str]) -> bool:
    """Revit emits family-group subtotal rows like 'FamilyName: N  val ...'"""
    first = cells[0].strip()
    return bool(re.search(r":\s*\d+\s*$", first))


def _parse_number(text: str) -> float | None:
    """Parse number, handling thousand-separators and empty strings."""
    cleaned = text.strip().replace(",", "")
    if not cleaned or cleaned == "-":
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


def _extract_metrics_from_row(
    cells: list[str], metric_cols: dict[str, tuple[int, str, str]]
) -> dict[str, float]:
    """Return {canonical_name: value} for each metric column present."""
    result: dict[str, float] = {}
    for canonical, (idx, _label, _unit) in metric_cols.items():
        if idx < len(cells):
            val = _parse_number(cells[idx])
            if val is not None:
                result[canonical] = val
    return result


def _detect_metric_columns(
    header: list[str],
) -> dict[str, tuple[int, str, str]]:
    """
    Scan header labels and return mapping:
      canonical_name → (column_index, original_label, unit)
    Only the first match per canonical name is kept.
    """
    found: dict[str, tuple[int, str, str]] = {}
    for idx, label in enumerate(header):
        label_clean = label.strip()
        for pattern, canonical, unit in _METRIC_MAP:
            if canonical not in found and pattern.search(label_clean):
                found[canonical] = (idx, label_clean, unit)
                break
    return found


def _parse_grand_total(
    cells: list[str], metric_cols: dict[str, tuple[int, str, str]]
) -> GrandTotal:
    """
    Grand-total row: 'Grand total: N  ...  val  unit  val  unit ...'
    Extract row-count from first cell and metric values from metric columns.
    """
    m = re.match(r"grand total:\s*(\d+)", cells[0].strip(), re.I)
    row_count = int(m.group(1)) if m else 0
    metrics = _extract_metrics_from_row(cells, metric_cols)
    return GrandTotal(row_count=row_count, metrics=metrics)


def _rows_from_file(source: Union[str, Path, bytes]) -> list[list[str]]:
    """Read CSV/TSV rows from file path, Path object, or raw bytes."""
    if isinstance(source, (str, Path)):
        text = Path(source).read_text(encoding="utf-8-sig", errors="replace")
    else:
        # Strip UTF-8 BOM if present
        if source[:3] == b"\xef\xbb\xbf":
            source = source[3:]
        text = source.decode("utf-8", errors="replace")

    # Revit uses tabs as delimiter (not commas)
    dialect = "excel-tab"
    reader = csv.reader(io.StringIO(text), dialect=dialect)
    return [row for row in reader]


def parse(source: Union[str, Path, bytes]) -> ParseResult:
    """
    Parse a Revit quantity schedule CSV file.

    Returns a ParseResult with all sections, each tagged has_data=True/False,
    plus a warnings list for suspect data.
    """
    all_rows = _rows_from_file(source)
    result = ParseResult()

    current_code: str | None = None
    current_desc: str | None = None
    current_header: list[str] = []
    current_metric_cols: dict[str, tuple[int, str, str]] = {}
    current_data_rows: list[DataRow] = []
    current_grand_total: GrandTotal | None = None
    header_seen: bool = False

    def _flush_section():
        nonlocal current_code, current_desc, current_header
        nonlocal current_metric_cols, current_data_rows, current_grand_total
        nonlocal header_seen

        if current_code is None:
            return

        has_data = len(current_data_rows) > 0
        section = Section(
            code=current_code,
            description=current_desc or "",
            header_labels=current_header,
            data_rows=current_data_rows,
            grand_total=current_grand_total,
            has_data=has_data,
        )
        result.sections.append(section)
        result.raw_section_count += 1

        current_code = None
        current_desc = None
        current_header = []
        current_metric_cols = {}
        current_data_rows = []
        current_grand_total = None
        header_seen = False

    for row in all_rows:
        # Skip completely empty rows
        if not any(c.strip() for c in row):
            continue

        # Pad short rows
        cells = row + [""] * max(0, 10 - len(row))

        # ── Check for a new section header ───────────────────────────────
        m = _is_section_header(cells)
        if m:
            _flush_section()
            current_code = m.group(1)
            # Description is everything after the code on the same cell,
            # or in the next cell
            remainder = cells[0].strip()[len(current_code):].strip()
            if remainder:
                current_desc = remainder
            elif len(cells) > 1 and cells[1].strip():
                current_desc = cells[1].strip()
            else:
                current_desc = ""
            header_seen = False
            continue

        # Skip rows that don't belong to any section yet
        if current_code is None:
            continue

        # ── Grand total row ───────────────────────────────────────────────
        if _is_grand_total(cells):
            current_grand_total = _parse_grand_total(cells, current_metric_cols)
            continue

        # ── Column header row ─────────────────────────────────────────────
        if not header_seen and _is_column_header(cells):
            current_header = [c.strip() for c in cells]
            current_metric_cols = _detect_metric_columns(current_header)
            header_seen = True
            continue

        # ── Additional header rows inside multi-category sections ─────────
        # Revit repeats headers when switching family categories in one table.
        # Detect: row looks like a header and matches same columns as current.
        if header_seen and _is_column_header(cells):
            # Don't treat as new section — just skip this repeated header
            continue

        # ── Subtotal / group rows (e.g. "FamilyName: 6  ...  238  m²") ───
        if _is_subtotal_row(cells):
            continue

        # ── Data row ──────────────────────────────────────────────────────
        if header_seen:
            metrics = _extract_metrics_from_row(cells, current_metric_cols)
            # Only keep rows that have at least one metric value OR non-empty cells
            non_empty = any(c.strip() for c in cells[:6])
            if non_empty:
                current_data_rows.append(DataRow(raw=cells, metrics=metrics))

    _flush_section()

    # ── Post-parse warnings ───────────────────────────────────────────────
    _check_duplicate_sections(result)

    return result


def _check_duplicate_sections(result: ParseResult) -> None:
    """Warn if two different sections share identical data fingerprints."""
    fingerprints: dict[str, str] = {}

    for section in result.sections:
        if not section.has_data:
            continue
        # Fingerprint: element_count + sum of each metric
        metric_sums = {}
        for row in section.data_rows:
            for k, v in row.metrics.items():
                metric_sums[k] = metric_sums.get(k, 0.0) + v

        fp = f"{section.element_count}|" + "|".join(
            f"{k}={v:.4f}" for k, v in sorted(metric_sums.items())
        )

        if fp in fingerprints:
            result.warnings.append(
                f"DUPLICATE_DATA: secciones '{fingerprints[fp]}' y "
                f"'{section.code}' tienen exactamente los mismos datos — "
                "posiblemente la misma tabla Revit exportada dos veces."
            )
        else:
            fingerprints[fp] = section.code
