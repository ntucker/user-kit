from dataclasses import dataclass


@dataclass(frozen=True)
class Line:
    description: str
    price: int  # cents
    qty: int


@dataclass(frozen=True)
class Order:
    id: str
    region: str
    lines: tuple[Line, ...]
