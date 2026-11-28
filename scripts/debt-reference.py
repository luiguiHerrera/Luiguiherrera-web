"""Independent Decimal reference for the debt preview. Read fixtures from stdin."""
from decimal import Decimal, ROUND_HALF_UP, localcontext
import json
import sys


TOTAL_KEYS = ("ordinary", "extra", "interest", "fees", "paid_interest", "paid_fees", "paid_principal")


def round_minor(amount):
    return int(amount.quantize(Decimal(1), rounding=ROUND_HALF_UP))


def run(case):
    accounts = []
    with localcontext() as ctx:
        ctx.prec = 70
        for row in case["debts"]:
            annual = Decimal(row["annualRate"]) / Decimal(1_000_000)
            if row["rateType"] == "nominal":
                rate = annual / Decimal(12)
            else:
                rate = ctx.power(1 + annual, Decimal(1) / Decimal(12)) - 1
            accounts.append({
                "principal": row["balance"], "interest": 0, "fees": 0,
                "row": row, "rate": rate, "balance": row["balance"],
            })

        totals = dict.fromkeys(TOTAL_KEYS, 0)
        timeline = []
        liquidations = []
        method = case["method"]
        for month in range(1, 601):
            open_accounts = [account for account in accounts if account["balance"] > 0]
            if not open_accounts:
                break

            period = dict.fromkeys(TOTAL_KEYS, 0)
            due = []
            opening = sum(a["balance"] for a in accounts)
            for account in open_accounts:
                charge = account["row"]["monthlyFee"]
                interest = round_minor(Decimal(account["principal"] + account["interest"]) * account["rate"])
                account["interest"] += interest
                account["fees"] += charge
                account["balance"] += interest + charge
                minimum = account["row"]["minimumPayment"]
                if not account["row"]["minimumIncludesFees"]:
                    minimum += charge
                due.append(min(minimum, account["balance"]))
                period["interest"] += interest
                period["fees"] += charge

            def spend(account, budget, category):
                payment = min(budget, account["balance"])
                period[category] += payment
                account["balance"] -= payment
                for bucket in ("fees", "interest", "principal"):
                    consumed = min(payment, account[bucket])
                    period["paid_" + bucket] += consumed
                    account[bucket] -= consumed
                    payment -= consumed

            def pay(account, budget, category):
                before = account["balance"]
                spend(account, budget, category)
                return before - account["balance"]

            flows = [("ordinary", case["budget"])]
            flows += [("extra", e["amount"]) for e in case["extras"] if e["monthNumber"] == month]
            for category, budget in flows:
                required = sum(due)
                pool = min(budget, required)
                if pool:
                    apportioned = [divmod(pool * requirement, required) for requirement in due]
                    residual = pool - sum(item[0] for item in apportioned)
                    rankings = sorted(range(len(due)), key=lambda i: (-apportioned[i][1], i))
                    recipients = set(rankings[:residual])
                    for i, account in enumerate(open_accounts):
                        amount = apportioned[i][0] + int(i in recipients)
                        due[i] -= pay(account, amount, category)
                    budget -= pool
                ranked = (
                    sorted(open_accounts, key=lambda account: -account["rate"])
                    if method == "avalanche"
                    else sorted(open_accounts, key=lambda account: account["balance"])
                )
                for account in ranked:
                    budget -= pay(account, budget, category)
                    if not budget:
                        break

            for key in totals:
                totals[key] += period[key]
            closing = sum(a["balance"] for a in accounts)
            timeline.append([opening, period["interest"], period["fees"], period["ordinary"], period["extra"], closing, sum(due)])
            liquidations += [[a["row"]["id"], month] for a in open_accounts if not a["balance"]]

        ending = sum(a["balance"] for a in accounts)
        return {"totals": totals, "ending": ending, "months": None if ending else len(timeline),
                "timeline": timeline, "liquidations": liquidations}


if __name__ == "__main__":
    print(json.dumps([run(case) for case in json.load(sys.stdin)]))
