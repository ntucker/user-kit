from dataclasses import dataclass, field
from uuid import uuid4


@dataclass(frozen=True)
class User:
    id: str
    email: str
    name: str


@dataclass(frozen=True)
class Line:
    sku: str
    description: str
    cents: int
    qty: int


@dataclass(frozen=True)
class Cart:
    lines: tuple[Line, ...]


@dataclass
class Order:
    user_id: str
    lines: list[Line]
    id: str = field(default_factory=lambda: uuid4().hex)

    @property
    def total_cents(self) -> int:
        return sum(line.cents * line.qty for line in self.lines)
