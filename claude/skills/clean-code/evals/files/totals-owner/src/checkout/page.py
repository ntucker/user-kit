from ..orders.model import Order


def checkout_summary(order: Order) -> dict:
    return {
        "items": [{"description": line.description, "qty": line.qty} for line in order.lines],
    }
