from orders.models import Cart, Order, User
from orders.payments import charge
from orders.repository import save


def build_order(cart: Cart, user: User) -> Order:
    return Order(user_id=user.id, lines=list(cart.lines))


def place_order(cart: Cart, user: User) -> Order:
    order = build_order(cart, user)
    charge(order)
    save(order)
    return order
