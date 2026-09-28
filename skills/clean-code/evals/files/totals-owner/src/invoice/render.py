from string import Template

from ..orders.model import Order
from ..tax.rates import TAX_RATES

INVOICE = Template("Invoice $id\nSubtotal: $subtotal\nTax: $tax\nTotal: $total\n")


def cents(value: int) -> str:
    return f"${value / 100:.2f}"


class InvoiceRenderer:
    def render(self, order: Order) -> str:
        subtotal = sum(line.price * line.qty for line in order.lines)
        tax = round(subtotal * TAX_RATES[order.region])
        return INVOICE.substitute(
            id=order.id, subtotal=cents(subtotal), tax=cents(tax), total=cents(subtotal + tax)
        )
