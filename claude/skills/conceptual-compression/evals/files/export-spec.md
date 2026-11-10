# Report export: current behavior

This describes export as it works today, collected from the code and from support tickets.

## Formats and who can use them

- Reports can be exported as CSV, XLSX, or PDF.
- Viewers can export CSV only. Editors and Admins can export all three formats.

## What an export contains

- CSV contains the columns currently visible in the report view.
- XLSX contains all columns of the report, including ones the user has hidden in the view.
- PDF contains the visible columns.
- CSV and XLSX contain every row that matches the current filters.
- PDF contains only the first 500 rows. (The old PDF renderer fell over on long tables. It was replaced last year; the limit stayed.)
- Dates: CSV writes ISO 8601 strings. XLSX writes native date cells. PDF writes dates in the user's locale format.

## Delivery

- CSV and XLSX exports under 10,000 rows download immediately in the browser.
- CSV and XLSX exports of 10,000 rows or more are generated in the background, and the user is emailed a download link.
- PDF exports always download immediately, whatever the report size (they are capped at 500 rows anyway).
- Emailed links expire after 7 days. For Admins they expire after 30 days.

## File names

- CSV: `<report>-<YYYY-MM-DD>.csv`
- XLSX: `<report>_<YYYYMMDD>.xlsx`
- PDF: `<report> (<date in user locale>).pdf`

## Where export is offered

- Reports page: an Export button in the toolbar.
- Dashboard page: under the "…" menu of each widget.
- Saved Views list: only via right-click on a view.

## Audit

- Every export is written to the audit log with user, report, format and row count, except exports of fewer than 100 rows, which are not logged.
