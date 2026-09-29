"""Regex definitions and keyword constants for expiration-date parsing."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Pattern


EXPIRATION_KEYWORDS = (
    "BEST BEFORE",
    "BEST BY",
    "BB",
    "BBE",
    "USE BY",
    "USED BY",
    "EXPIRY",
    "EXPIRE",
    "EXP",
    "EXP DATE",
    "EXPIRATION DATE",
    "HSD",
    "HD",
    "DUE",
    "DATE LIMITE",
    "HAN SU DUNG",
    "HẠN SỬ DỤNG",
    "HSD",
)

PRODUCTION_KEYWORDS = (
    "MANUFACTURE",
    "PRODUCTION",
    "PROD",
    "PRO",
    "MFG",
    "NSX",
)

MONTHS = {
    "JAN": 1,
    "FEB": 2,
    "FEV": 2,
    "FER": 2,
    "MAR": 3,
    "APR": 4,
    "AVR": 4,
    "MAY": 5,
    "MAI": 5,
    "JUN": 6,
    "JUNE": 6,
    "JUL": 7,
    "JULY": 7,
    "AUG": 8,
    "AOU": 8,
    "SEP": 9,
    "SEPT": 9,
    "OCT": 10,
    "NOV": 11,
    "DEC": 12,
    "DEZ": 12,
}

MONTH_TOKEN = "|".join(sorted(MONTHS, key=len, reverse=True))
YEAR_TOKEN = r"\d{2}(?:\d{2})?"


@dataclass(frozen=True)
class DatePattern:
    """A supported OCR date pattern ordered from most to least specific."""

    name: str
    regex: Pattern[str]
    precision: str
    recovered_from_noise: bool = False


DATE_PATTERNS = (
    DatePattern(
        "DD/MM/YYYY",
        re.compile(
            rf"(?<!\d)(?P<day>\d{{1,2}})/(?P<month>\d{{1,2}})/(?P<year>{YEAR_TOKEN})(?!\d)"
        ),
        "day",
    ),
    DatePattern(
        "DD-MM-YYYY",
        re.compile(
            rf"(?<!\d)(?P<day>\d{{1,2}})-(?P<month>\d{{1,2}})-(?P<year>{YEAR_TOKEN})(?!\d)"
        ),
        "day",
    ),
    DatePattern(
        "YYYY-MM-DD",
        re.compile(r"(?<!\d)(?P<year>\d{4})-(?P<month>\d{1,2})-(?P<day>\d{1,2})(?!\d)"),
        "day",
    ),
    DatePattern(
        "YYYY/MM/DD",
        re.compile(r"(?<!\d)(?P<year>\d{4})/(?P<month>\d{1,2})/(?P<day>\d{1,2})(?!\d)"),
        "day",
    ),
    DatePattern(
        "YYYY.MM.DD",
        re.compile(r"(?<!\d)(?P<year>\d{4})\.(?P<month>\d{1,2})\.(?P<day>\d{1,2})(?!\d)"),
        "day",
    ),
    DatePattern(
        "DD.MM.YYYY",
        re.compile(
            rf"(?<!\d)(?P<day>\d{{1,2}})\.(?P<month>\d{{1,2}})\.(?P<year>{YEAR_TOKEN})(?!\d)"
        ),
        "day",
    ),
    DatePattern(
        "YYYY.MM.DD",
        re.compile(
            r"(?<!\d)(?P<year>\d{4})\.(?P<month>\d{1,2})\.(?P<day>\d{2})(?=\d{1,})(?!\d*\.)"
        ),
        "day",
        recovered_from_noise=True,
    ),
    DatePattern(
        "DD MMM YYYY",
        re.compile(
            rf"(?<![A-Z0-9])(?P<day>\d{{1,2}})\s+(?P<month_name>{MONTH_TOKEN})\s+(?P<year>{YEAR_TOKEN})(?![A-Z0-9])"
        ),
        "day",
    ),
    DatePattern(
        "YY.MM.DD",
        re.compile(r"(?<!\d)(?P<year>\d{2})\.(?P<month>\d{1,2})\.(?P<day>\d{1,2})(?!\d)"),
        "day",
    ),
    DatePattern(
        "MM/YYYY",
        re.compile(
            rf"(?<![\d./-])(?P<month>\d{{1,2}})/(?P<year>{YEAR_TOKEN})(?!\d)"
        ),
        "month",
    ),
    DatePattern(
        "YYYY/MM",
        re.compile(r"(?<![\d./-])(?P<year>\d{4})/(?P<month>\d{1,2})(?![\d./-])"),
        "month",
    ),
    DatePattern(
        "MM-YYYY",
        re.compile(
            rf"(?<![\d./-])(?P<month>\d{{1,2}})-(?P<year>{YEAR_TOKEN})(?!\d)"
        ),
        "month",
    ),
    DatePattern(
        "YYYY-MM",
        re.compile(r"(?<![\d./-])(?P<year>\d{4})-(?P<month>\d{1,2})(?![\d./-])"),
        "month",
    ),
    DatePattern(
        "MM.YYYY",
        re.compile(r"(?<![\d./-])(?P<month>\d{1,2})\.(?P<year>\d{4})(?![\d./-])"),
        "month",
    ),
    DatePattern(
        "YYYY.MM",
        re.compile(r"(?<![\d./-])(?P<year>\d{4})\.(?P<month>\d{1,2})(?![\d./-])"),
        "month",
    ),
    DatePattern(
        "MMM YYYY",
        re.compile(
            rf"(?<![A-Z0-9])(?P<month_name>{MONTH_TOKEN})\s+(?P<year>{YEAR_TOKEN})(?![A-Z0-9])"
        ),
        "month",
    ),
    DatePattern(
        "DD MM YYYY",
        re.compile(
            rf"(?<!\d)(?P<day>\d{{1,2}})\s+(?P<month>\d{{1,2}})\s+(?P<year>{YEAR_TOKEN})(?!\d)"
        ),
        "day",
    ),
    DatePattern(
        "MMYYYY",
        re.compile(r"(?<!\d)(?P<month>\d{2})(?P<year>\d{4})(?!\d)"),
        "month",
    ),
)
