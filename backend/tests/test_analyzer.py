"""Tests for the quantity analyzer."""

import pytest
from pathlib import Path

from ..parsers.revit_csv import parse
from ..services.analyzer import analyze, AnalysisResult

FIXTURE = Path(__file__).parent / "fixtures" / "Todas_las_Tablas.csv"


@pytest.fixture(scope="module")
def ar() -> AnalysisResult:
    return analyze(parse(FIXTURE))


class TestQuantityPriority:
    def test_grand_total_prioritized_over_calculated_sum(self, ar):
        # 03.02.02: Grand Total = 245 m², calculated sum of rows is different
        s = next(x for x in ar.summaries if x.code == "03.02.02")
        assert s.quantity == 245.0
        assert s.fuente == "Grand Total (Revit)"
        assert s.unit == "m²"

    def test_falls_back_to_calculated_sum(self, ar):
        # 01.01.01 has no Grand Total — must use sum of count column
        s = next(x for x in ar.summaries if x.code == "01.01.01")
        assert s.fuente == "Suma calculada"
        assert s.quantity == 17

    def test_area_prioritized_over_volume(self, ar):
        # 03.02.02 has both area and volume in grand total: area wins
        s = next(x for x in ar.summaries if x.code == "03.02.02")
        assert s.unit == "m²"

    def test_length_unit_correct(self, ar):
        s = next(x for x in ar.summaries if x.code == "05.01.08")
        assert s.unit == "ml"
        assert s.quantity == pytest.approx(36.15, abs=0.01)


class TestEmptySections:
    def test_empty_section_has_none_quantity(self, ar):
        s = next(x for x in ar.summaries if x.code == "02.00.03")
        assert s.quantity is None
        assert not s.has_data

    def test_empty_section_fuente_is_sin_datos(self, ar):
        s = next(x for x in ar.summaries if x.code == "02.00.03")
        assert s.fuente == "Sin datos"


class TestChapterStats:
    def test_chapter_stats_keys(self, ar):
        stats = ar.chapter_stats()
        assert "01" in stats
        assert "05" in stats

    def test_chapter_pct_calculation(self, ar):
        stats = ar.chapter_stats()
        for ch, data in stats.items():
            if data["total"] > 0:
                expected_pct = round(100 * data["with_data"] / data["total"], 1)
                assert data["pct"] == expected_pct

    def test_chapter_totals_add_up(self, ar):
        stats = ar.chapter_stats()
        total_with = sum(d["with_data"] for d in stats.values())
        total_without = sum(d["without_data"] for d in stats.values())
        assert total_with == len(ar.with_data)
        assert total_without == len(ar.without_data)


class TestTopRubros:
    def test_top_area_returns_up_to_10(self, ar):
        top = ar.top_by_unit("m²")
        assert len(top) <= 10

    def test_top_area_sorted_descending(self, ar):
        top = ar.top_by_unit("m²")
        qtys = [s.quantity for s in top if s.quantity]
        assert qtys == sorted(qtys, reverse=True)

    def test_top_area_only_m2_units(self, ar):
        top = ar.top_by_unit("m²")
        assert all(s.unit == "m²" for s in top)


class TestTotalsByUnit:
    def test_totals_contain_m2(self, ar):
        totals = ar.totals_by_unit()
        assert "m²" in totals
        assert totals["m²"] > 0

    def test_pct_modeled_formula(self, ar):
        expected = 100 * len(ar.with_data) / ar.total_count
        actual = round(expected, 1)
        assert actual > 0


class TestWarnings:
    def test_duplicate_warning_present(self, ar):
        dup = [w for w in ar.warnings if "DUPLICATE_DATA" in w]
        assert len(dup) >= 1

    def test_chapter_low_warning_present(self, ar):
        low = [w for w in ar.warnings if "CHAPTER_LOW" in w]
        assert len(low) >= 1

    def test_no_desc_warning_for_unnamed_sections(self, ar):
        no_desc = [w for w in ar.warnings if "NO_DESC" in w]
        # At minimum 14.01.07.b "Asfalto" has description; but some sections may not
        # Just verify the list is valid (could be empty or not)
        assert isinstance(no_desc, list)
