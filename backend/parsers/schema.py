from dataclasses import dataclass, field
from typing import Optional


@dataclass
class GrandTotal:
    row_count: int
    metrics: dict[str, float]  # column_label -> value


@dataclass
class DataRow:
    raw: list[str]
    metrics: dict[str, float]  # normalized metric name -> value


@dataclass
class Section:
    code: str
    description: str
    header_labels: list[str]
    data_rows: list[DataRow]
    grand_total: Optional[GrandTotal]
    has_data: bool

    @property
    def chapter_code(self) -> str:
        parts = self.code.split(".")
        return parts[0] if parts else "00"

    @property
    def element_count(self) -> int:
        if self.grand_total:
            return self.grand_total.row_count
        return len(self.data_rows)


@dataclass
class ParseResult:
    sections: list[Section] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    raw_section_count: int = 0
