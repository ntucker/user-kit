from datetime import date


def monthly_report(orders, month, year, fmt):
    # build rows
    rows = []
    for i in range(len(orders)):
        o = orders[i]
        if o["date"].month == month and o["date"].year == year:
            if o["status"] != "cancelled":
                rows.append(o)
    # compute totals
    total = 0
    for r in rows:
        total = total + r["amount"]
    avg = total / len(rows)
    # format
    if fmt == "csv":
        out = "id,amount\n"
        for r in rows:
            out += str(r["id"]) + "," + str(r["amount"]) + "\n"
        out += "total," + str(total) + "\n"
        out += "avg," + str(avg) + "\n"
        return out
    else:
        out = "Report for " + str(month) + "/" + str(year) + "\n"
        for r in rows:
            out += "  #" + str(r["id"]) + ": " + str(r["amount"]) + "\n"
        out += "Total: " + str(total) + "\n"
        out += "Average: " + str(avg) + "\n"
        return out
