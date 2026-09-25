# Worked examples

Short cases for the judgment calls in the skill. The code is illustrative; the reasoning is the point. Examples alternate TypeScript and Python, but every lesson applies to both.

Contents: 1 Reuse what exists · 2 Generalize along the concept, not with a flag · 3 Coincidental similarity · 4 A new step is a new unit · 5 Inline shallow units · 6 Move knowledge to its owner · 7 Surface ordering · 8 Errors at the right level

## 1. Reuse what exists

Task: show a user's name in a new notification email.

```ts
// Before: written without searching
function userLabel(u: User) {
  return u.preferredName ? u.preferredName : `${u.firstName} ${u.lastName}`;
}
```

A search for `preferredName` finds `displayName(user)` in `users/format.ts`, already used by the profile page, which also trims whitespace and handles a missing last name. Call it. The new function was a second, slightly different definition of "how we show a person's name", and the two would drift.

## 2. Generalize along the concept, not with a flag

Existing: `formatPrice(cents: number)` hardcodes USD. New need: prices in EUR.

```ts
// Good: currency was always part of "format a price"; it was just fixed
function formatPrice(cents: number, currency: Currency = 'USD') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100);
}
```

New need: invoices show prices without the currency symbol, right-aligned in a table.

```ts
// Bad: a flag that selects a different presentation
function formatPrice(cents: number, currency: Currency = 'USD', forInvoice = false) { ... }
```

`forInvoice` is not a dimension of "price"; it is a caller's layout concern, and it gives `formatPrice` a second reason to change. Invoice layout owns that decision: the invoice module formats the amount number (sharing a nameable `centsToAmount` step if one exists) and handles alignment itself.

## 3. Coincidental similarity

```py
def normalize_email(raw: str) -> str:
    return raw.strip().lower()

def normalize_tag(raw: str) -> str:
    return raw.strip().lower()
```

It is tempting to merge these into `normalize_string`. Don't: email rules (plus-addressing, IDN domains) and tag rules (spaces to hyphens, max length) will diverge, and a shared function would then accumulate flags or break one caller when changed for the other. Same code today, different owners and different reasons to change. Each stays with its owner; the shared part is already a standard library call.

## 4. A new step is a new unit

Existing:

```py
def place_order(cart: Cart, user: User) -> Order:
    order = build_order(cart, user)
    charge(order)
    save(order)
    return order
```

New requirement: email a receipt. Growing the function in place mixes levels:

```py
    save(order)
    msg = EmailMessage()
    msg["To"] = user.email
    msg["Subject"] = f"Receipt for order {order.id}"
    msg.set_content(render_receipt(order))
    with smtplib.SMTP(settings.SMTP_HOST) as smtp:
        smtp.send_message(msg)
    return order
```

The other lines are steps of placing an order; these are details of email transport. Keep the steps at one level, and put the email details with whoever owns sending mail (a notifications module, if there is one; search first):

```py
def place_order(cart: Cart, user: User) -> Order:
    order = build_order(cart, user)
    charge(order)
    save(order)
    send_receipt(order, user)
    return order
```

## 5. Inline shallow units

```ts
function getUserId(user: User) { return user.id; }
function isAdmin(user: User) { return checkRole(user, 'admin'); }
function loadUser(id: string) { return repo.findUser(id); }
```

Each name restates its body and hides nothing, so readers must jump to learn nothing. Inline them. A wrapper earns its place when it owns a decision (`isAdmin` that also accounts for impersonation and org owners) or marks a boundary you intend to swap (a repository interface with a real second implementation, such as tests using an in-memory store).

## 6. Move knowledge to its owner

```py
class InvoiceRenderer:
    def render(self, order: Order) -> str:
        subtotal = sum(line.price * line.qty for line in order.lines)
        tax = round(subtotal * TAX_RATES[order.region])
        return self.template.render(order=order, subtotal=subtotal, tax=tax, total=subtotal + tax)
```

The renderer computes totals from the order's internals (feature envy), and the tax rule now lives in presentation code, so the checkout page will compute it again, slightly differently. Totals and tax are order knowledge; layout is renderer knowledge:

```py
class Order:
    @property
    def subtotal(self) -> int: ...
    @property
    def tax(self) -> int: ...   # or delegate to a tax module that owns rates
    @property
    def total(self) -> int: ...

class InvoiceRenderer:
    def render(self, order: Order) -> str:
        return self.template.render(order=order)
```

Don't overcorrect by moving the invoice's layout into `Order`: that couples the order to a presentation concern.

The same idea applies to hidden assumptions. If a reporter batches rows by a `PAGE_SIZE = 55` that only the printer really knows, the reporter is assuming a fact the printer owns. Have the printer expose `max_rows_per_page` and let the reporter ask.

## 7. Surface ordering

```ts
// Hidden: nothing stops a caller from calling these out of order
importer.loadSchema();
importer.validateRows();
importer.write();
```

```ts
// Explicit: each step needs the previous step's output
const schema = await loadSchema(source);
const rows = validateRows(schema, await readRows(source));
await write(rows);
```

The second version has more parameters, and that is the point: the dependency was always there, and now the code shows it.

## 8. Errors at the right level

```py
def load_config(path: Path) -> Config:
    try:
        return Config.parse(path.read_text())
    except Exception:
        logger.warning("config load failed")
        return Config()
```

This silences every failure, including bugs, and continues with defaults the user never chose. Catch what the caller can act on, add context, and let the application boundary decide:

```py
def load_config(path: Path) -> Config:
    try:
        text = path.read_text()
    except FileNotFoundError as err:
        raise ConfigNotFoundError(f"No config at {path}; run `app init` to create one") from err
    return Config.parse(text)  # raises ConfigError naming the offending key
```

If a missing file really should mean "use defaults", decide that where the policy lives, by catching the one error that means it:

```py
try:
    config = load_config(path)
except ConfigNotFoundError:
    config = Config.default()
```
