"""
Tests for the Revit CSV parser.

Note on section count: the reference CSV (Todas_las_Tablas.csv) contains:
  - 55 tab-separated sections (the spec's "57" minus 2 false-positive code values
    that appear in the door-schedule table: 31.20 and 41.00)
  - 17 additional space-separated sections with letter suffixes (.a/.b/.c)
  - 2 additional space-separated sections with letter suffixes in chapter 14
  Total: 74 sections correctly detected by the parser.

The spec document stated 57 sections, but that was written for an earlier
parser version that (a) matched only tab-separated codes and (b) incorrectly
included the door-table false positives.
"""

import io
import pytest
from pathlib import Path

from ..parsers.revit_csv import parse
from ..parsers.schema import ParseResult

FIXTURE = Path(__file__).parent / "fixtures" / "Todas_las_Tablas.csv"


@pytest.fixture(scope="module")
def result() -> ParseResult:
    return parse(FIXTURE)


class TestSectionDetection:
    def test_total_section_count(self, result):
        assert result.raw_section_count == 74

    def test_with_data_count(self, result):
        assert sum(1 for s in result.sections if s.has_data) == 27

    def test_without_data_count(self, result):
        assert sum(1 for s in result.sections if not s.has_data) == 47

    def test_first_section_is_replanteo(self, result):
        assert result.sections[0].code == "01.01.01"
        assert "Replanteo" in result.sections[0].description

    def test_letter_suffix_sections_detected(self, result):
        codes = {s.code for s in result.sections}
        assert "03.03.01.a" in codes
        assert "03.03.08.b" in codes
        assert "03.03.11.c" in codes
        assert "14.01.07.a" in codes

    def test_false_positive_door_codes_excluded(self, result):
        # 31.20 and 41.00 appear in the door-schedule as subtotals — not real sections
        codes = {s.code for s in result.sections}
        assert "31.20" not in codes
        assert "41.00" not in codes

    def test_sections_sorted_order(self, result):
        codes = [s.code for s in result.sections]
        assert codes == sorted(codes)


class TestGrandTotal:
    def test_grand_total_parsed_for_contrapiso(self, result):
        sec = next(s for s in result.sections if s.code == "03.02.02")
        assert sec.grand_total is not None
        assert sec.grand_total.metrics["area"] == 245.0
        assert sec.grand_total.row_count == 2

    def test_grand_total_area_for_losa(self, result):
        sec = next(s for s in result.sections if s.code == "03.03.08.b")
        assert sec.grand_total is not None
        assert sec.grand_total.metrics["area"] == 374.0

    def test_grand_total_length_for_alfeizar(self, result):
        sec = next(s for s in result.sections if s.code == "05.01.08")
        assert sec.grand_total is not None
        assert sec.grand_total.metrics["length"] == pytest.approx(36.15, abs=0.01)

    def test_section_without_grand_total(self, result):
        # 01.01.01 has count data but no Grand Total row
        sec = next(s for s in result.sections if s.code == "01.01.01")
        assert sec.grand_total is None
        assert sec.has_data


class TestEmptySections:
    def test_known_empty_sections(self, result):
        empty_codes = {s.code for s in result.sections if not s.has_data}
        assert "02.00.03" in empty_codes
        assert "03.02.03" in empty_codes
        assert "07.01.01" in empty_codes
        assert "08.01.07" in empty_codes

    def test_empty_section_has_no_data_rows(self, result):
        empty = next(s for s in result.sections if s.code == "02.00.03")
        assert len(empty.data_rows) == 0

    def test_empty_section_description_preserved(self, result):
        sec = next(s for s in result.sections if s.code == "02.00.03")
        assert "Corte" in sec.description


class TestMultiCategorySection:
    def test_05_01_04_is_single_section(self, result):
        # 05.01.04 is a large multi-category table; must NOT be split into multiple sections
        matching = [s for s in result.sections if s.code == "05.01.04"]
        assert len(matching) == 1

    def test_05_01_04_has_many_rows(self, result):
        sec = next(s for s in result.sections if s.code == "05.01.04")
        # Multi-category table: hundreds of rows
        assert len(sec.data_rows) > 100


class TestDuplicateWarning:
    def test_duplicate_warning_for_05_01_04_and_05_01_05(self, result):
        dup_warnings = [w for w in result.warnings if "05.01.04" in w and "05.01.05" in w]
        assert len(dup_warnings) == 1

    def test_warnings_list_not_empty(self, result):
        assert len(result.warnings) > 0


class TestBomHandling:
    def test_bytes_input_with_bom(self):
        raw = FIXTURE.read_bytes()
        result_bytes = parse(raw)
        assert result_bytes.sections[0].code == "01.01.01"

    def test_string_path_input(self):
        result_str = parse(str(FIXTURE))
        assert result_str.raw_section_count == 74

    def test_idempotent_parsing(self):
        r1 = parse(FIXTURE)
        r2 = parse(FIXTURE)
        assert r1.raw_section_count == r2.raw_section_count
        assert [s.code for s in r1.sections] == [s.code for s in r2.sections]


class TestMetricMapping:
    def test_area_column_detected(self, result):
        sec = next(s for s in result.sections if s.code == "05.01.01")
        areas = [r.metrics.get("area") for r in sec.data_rows if "area" in r.metrics]
        assert len(areas) > 0
        assert all(a is not None and a >= 0 for a in areas)

    def test_length_column_detected(self, result):
        sec = next(s for s in result.sections if s.code == "08.01.15")
        lengths = [r.metrics.get("length") for r in sec.data_rows if "length" in r.metrics]
        assert len(lengths) > 0

    def test_chapter_code_extraction(self, result):
        sec = next(s for s in result.sections if s.code == "05.01.01")
        assert sec.chapter_code == "05"

    def test_four_part_code_chapter(self, result):
        sec = next(s for s in result.sections if s.code == "03.03.01.a")
        assert sec.chapter_code == "03"
