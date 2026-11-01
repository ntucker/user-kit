from datetime import date

from src.reports.monthly import monthly_report


def test_text_report():
    orders = [
        {"id": 1, "date": date(2026, 3, 2), "status": "paid", "amount": 100},
        {"id": 2, "date": date(2026, 3, 9), "status": "cancelled", "amount": 50},
        {"id": 3, "date": date(2026, 4, 1), "status": "paid", "amount": 70},
    ]
    out = monthly_report(orders, 3, 2026, "text")
    assert "Total: 100" in out
    assert "#2" not in out


def test_csv_report():
    orders = [{"id": 1, "date": date(2026, 3, 2), "status": "paid", "amount": 100}]
    assert monthly_report(orders, 3, 2026, "csv").startswith("id,amount\n1,100\n")
