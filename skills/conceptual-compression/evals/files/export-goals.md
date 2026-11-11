# Report export: objective

1. Anyone who can see a report can get its data out in a form their tools open: spreadsheet users need CSV or XLSX, auditors need a fixed-layout document of the whole report.
2. An export contains what the user sees. It never includes data that their current view hides.
3. Every export of customer data is auditable.
4. A large export must not block the browser or time out.
5. Constraint: Finance's nightly script picks up CSV exports by the file name pattern `<report>-<YYYY-MM-DD>.csv`. That pattern must not change.
6. Non-goal: different export behavior for different roles. Roles decide who can see a report and nothing else.
