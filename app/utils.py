from datetime import datetime
from typing import Any, Callable, Optional, Tuple
from iso8601 import parse_date, ParseError


def convert_in_dict(dct: dict, key: Any, mapper: Callable) -> None:
    dct[key] = mapper(dct[key])


def format_datetime(value: Tuple[str, datetime], dt_format: str='%H:%M:%S') -> Optional[str]:
    """
    Converts ISO8601 string or datetime object to specified format.
    """
    dt = value

    if isinstance(value, str):
        try:
            dt = parse_date(value)
        except ParseError:
            pass

    if not isinstance(dt, datetime):
        raise ValueError('Cannot convert {0} to datetime'.format(value))

    return dt.strftime(dt_format) if isinstance(dt, datetime) else None
