"""
Consolidates and de-duplicates warnings from the parse and analysis steps.
Provides a structured warning list for the UI and Excel export.
"""

import re
from dataclasses import dataclass
from enum import Enum


class WarnLevel(str, Enum):
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


@dataclass
class Warning:
    code: str
    level: WarnLevel
    section_code: str | None
    message: str


_PREFIX_MAP = {
    "DUPLICATE_DATA": ("DUP", WarnLevel.WARNING),
    "DISCREPANCY": ("DISC", WarnLevel.WARNING),
    "NO_DESC": ("DESC", WarnLevel.INFO),
    "CHAPTER_LOW": ("CHAP", WarnLevel.WARNING),
}


def build_warning_list(raw_warnings: list[str]) -> list[Warning]:
    """Convert raw warning strings into structured Warning objects."""
    result: list[Warning] = []
    seen: set[str] = set()

    for raw in raw_warnings:
        if raw in seen:
            continue
        seen.add(raw)

        section_code = None
        m = re.search(r"\[([^\]]+)\]", raw)
        if m:
            section_code = m.group(1)

        level = WarnLevel.WARNING
        code = "WARN"
        for prefix, (short, lvl) in _PREFIX_MAP.items():
            if raw.startswith(prefix):
                code = short
                level = lvl
                break

        result.append(Warning(code=code, level=level, section_code=section_code, message=raw))

    return result
