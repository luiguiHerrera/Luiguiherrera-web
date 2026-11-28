import { MAX_MONTHS, monthlyInterest, monthlyRate } from "./debt-input.ts";
import type { ContributionTrace, DebtCashMovement, DebtPeriod, PayoffMethod, PayoffPlan, PayoffStatus } from "./types.ts";

const zero = BigInt(0);
const balanceLimit = BigInt(10) ** BigInt(18);

export type AmortizableDebt = {
  id: string;
  order: number;
  balance: bigint;
  monthlyMinimum: bigint;
  fee: bigint;
  rate: ReturnType<typeof monthlyRate>;
};

type OpenDebt = {
  terms: AmortizableDebt;
  principal: bigint;
  interest: bigint;
  fees: bigint;
};

export type ScheduledExtra = Omit<ContributionTrace, "applied" | "unused" | "outsideHorizon" | "unsimulated">;

const min = (a: bigint, b: bigint) => a < b ? a : b;
const sum = (values: bigint[]) => values.reduce((total, value) => total + value, zero);
const balanceOf = (debt: OpenDebt) => debt.principal + debt.interest + debt.fees;

export function contractualMinimum(debt: AmortizableDebt, amountDue: bigint) {
  return min(debt.monthlyMinimum, amountDue);
}

function prioritize<T>(debts: T[], method: PayoffMethod, getDebt: (item: T) => OpenDebt) {
  return debts.slice().sort((a, b) => {
    const left = getDebt(a);
    const right = getDebt(b);
    const by = method === "avalanche"
      ? right.terms.rate.numerator * left.terms.rate.denominator - left.terms.rate.numerator * right.terms.rate.denominator
      : balanceOf(left) - balanceOf(right);
    return by === zero ? left.terms.order - right.terms.order : by < zero ? -1 : 1;
  });
}

type Posting = { account: OpenDebt; movement: DebtCashMovement; minimumRemaining: bigint };

function postPayment(row: Posting, requested: bigint, source: "ordinaryPaid" | "extraPaid") {
  const { account, movement } = row;
  const applied = min(requested, balanceOf(account));
  const feePaid = min(account.fees, applied);
  const interestPaid = min(account.interest, applied - feePaid);
  const principalPaid = applied - feePaid - interestPaid;
  account.fees -= feePaid;
  account.interest -= interestPaid;
  account.principal -= principalPaid;
  movement[source] += applied;
  movement.feesPaid += feePaid;
  movement.interestPaid += interestPaid;
  movement.principalPaid += principalPaid;
  row.minimumRemaining -= min(row.minimumRemaining, applied);
  return applied;
}

function allocateMinimums(rows: Posting[], budget: bigint, source: "ordinaryPaid" | "extraPaid") {
  const required = sum(rows.map(row => row.minimumRemaining));
  const pool = min(required, budget);
  if (pool === zero) return budget;

  // Use largest remainders to conserve every minor unit when minimums are underfunded.
  const shares = rows.map(row => {
    const scaled = row.minimumRemaining * pool;
    return { row, share: scaled / required, remainder: scaled % required };
  }).sort((a, b) => a.remainder === b.remainder
    ? a.row.account.terms.order - b.row.account.terms.order
    : a.remainder > b.remainder ? -1 : 1);
  let remainder = pool - sum(shares.map(item => item.share));
  for (const item of shares) {
    const unit = remainder > zero ? BigInt(1) : zero;
    postPayment(item.row, item.share + unit, source);
    remainder -= unit;
  }
  return budget - pool;
}

function allocate(rows: Posting[], budget: bigint, source: "ordinaryPaid" | "extraPaid", method: PayoffMethod, priority: string[]) {
  let remaining = allocateMinimums(rows, budget, source);
  const ordered = prioritize(rows.filter(row => balanceOf(row.account) > zero), method, row => row.account);
  for (const row of ordered) {
    if (remaining === zero) break;
    const paid = postPayment(row, remaining, source);
    remaining -= paid;
    if (paid > zero) priority.push(row.movement.id);
  }
  return remaining;
}

const movementKeys = [
  "opening", "interest", "fees", "minimumDue", "minimumShortfall", "ordinaryPaid", "extraPaid",
  "interestPaid", "feesPaid", "principalPaid", "closing", "closingPrincipal", "closingInterest", "closingFees",
] as const;

export function totalMovements(rows: DebtCashMovement[]): DebtPeriod["totals"] {
  return Object.fromEntries(movementKeys.map(key => [key, sum(rows.map(row => row[key]))])) as DebtPeriod["totals"];
}

function buildMonth(
  accounts: OpenDebt[],
  method: PayoffMethod,
  month: number,
  budget: bigint,
  extra: ScheduledExtra[],
): DebtPeriod | null {
  const active = accounts.filter(account => balanceOf(account) > zero);
  const rows: Posting[] = [];
  for (const account of active) {
    const opening = balanceOf(account);
    const fees = account.terms.fee;
    const interest = monthlyInterest(account.principal + account.interest, account.terms.rate);
    if (opening + fees + interest > balanceLimit) return null;
    account.fees += fees;
    account.interest += interest;
    const minimumDue = contractualMinimum(account.terms, balanceOf(account));
    rows.push({
      account,
      minimumRemaining: minimumDue,
      movement: {
        id: account.terms.id, opening, interest, fees, minimumDue,
        minimumShortfall: zero, ordinaryPaid: zero, extraPaid: zero,
        interestPaid: zero, feesPaid: zero, principalPaid: zero,
        closing: zero, closingPrincipal: zero, closingInterest: zero, closingFees: zero, paidOff: false,
      },
    });
  }
  const priorityApplied: string[] = [];
  const ordinaryUnused = allocate(rows, budget, "ordinaryPaid", method, priorityApplied);
  const contributions = extra.map(event => {
    const unused = allocate(rows, event.planned, "extraPaid", method, priorityApplied);
    return { ...event, applied: event.planned - unused, unused, outsideHorizon: zero, unsimulated: zero };
  });

  const debts = rows.map(({ movement, account, minimumRemaining }) => ({
    ...movement,
    minimumShortfall: minimumRemaining,
    closing: balanceOf(account),
    closingPrincipal: account.principal,
    closingInterest: account.interest,
    closingFees: account.fees,
    paidOff: balanceOf(account) === zero,
  }));
  return {
    month, debts, totals: totalMovements(debts),
    ordinaryAvailable: budget, ordinaryUnused,
    extraAvailable: sum(contributions.map(event => event.planned)),
    extraUnused: sum(contributions.map(event => event.unused)),
    priorityApplied: Array.from(new Set(priorityApplied)),
    contributions,
  };
}

function finalize(
  method: PayoffMethod, status: PayoffStatus, initialPrincipal: bigint | null, ledger: DebtPeriod[],
  initialPriority: string[], extras: ScheduledExtra[],
): PayoffPlan {
  const last = ledger.at(-1);
  const simulated = ledger.length > 0 || status === "no-debt";
  const keys = ["ordinaryPaid", "extraPaid", "interest", "fees", "interestPaid", "feesPaid", "principalPaid"] as const;
  const totals = simulated
    ? Object.fromEntries(keys.map(key => [key, sum(ledger.map(month => month.totals[key]))])) as PayoffPlan["totals"]
    : null;
  const costAccrued = totals ? totals.fees + totals.interest : null;
  const endingBalance = last?.totals.closing ?? initialPrincipal;
  const completedEvents = new Map(ledger.flatMap(month => month.contributions).map(e => [e.id, e]));
  const months = status === "no-debt" ? 0 : status === "paid" && last ? last.month : null;
  const contributions = extras.map(event => completedEvents.get(event.id) ?? {
    ...event, applied: zero,
    unused: months !== null && event.month <= MAX_MONTHS ? event.planned : zero,
    outsideHorizon: event.month > MAX_MONTHS ? event.planned : zero,
    unsimulated: months === null && event.month <= MAX_MONTHS ? event.planned : zero,
  });
  return {
    method, status, months, ledger, initialPrincipal, endingBalance,
    netBalanceReduction: simulated && endingBalance !== null && initialPrincipal !== null ? initialPrincipal - endingBalance : null,
    totals, costAccrued, totalPayoffCost: months === null ? null : costAccrued,
    monthsBelowMinimum: ledger.filter(month => month.totals.minimumShortfall > zero).length,
    negativeAmortizationMonths: ledger.filter(month => month.debts.some(row => row.closing > row.opening)).length,
    initialPriority,
    liquidations: ledger.flatMap(month => month.debts.filter(row => row.paidOff).map(row => ({ id: row.id, month: month.month }))),
    contributions,
  };
}

export function unavailablePlan(method: PayoffMethod, status: "invalid-input" | "data-missing", principal: bigint | null, extras: ScheduledExtra[]) {
  return finalize(method, status, principal, [], [], extras);
}

export function simulateDebtPlan(method: PayoffMethod, debts: AmortizableDebt[], budget: bigint, extras: ScheduledExtra[]): PayoffPlan {
  const initial = sum(debts.map(debt => debt.balance));
  if (debts.length === 0) return finalize(method, "no-debt", zero, [], [], extras);
  const accounts = debts.map(terms => ({ terms, principal: terms.balance, interest: zero, fees: zero }));
  const initialPriority = prioritize(accounts, method, account => account).map(account => account.terms.id);
  const extrasByMonth = new Map<number, ScheduledExtra[]>();
  for (const event of extras) {
    const month = extrasByMonth.get(event.month);
    if (month) month.push(event);
    else extrasByMonth.set(event.month, [event]);
  }
  const ledger: DebtPeriod[] = [];
  for (let month = 1; month <= MAX_MONTHS; month += 1) {
    const entry = buildMonth(accounts, method, month, budget, extrasByMonth.get(month) ?? []);
    if (!entry) return finalize(method, "range-error", initial, ledger, initialPriority, extras);
    ledger.push(entry);
    if (entry.totals.closing === zero) return finalize(method, "paid", initial, ledger, initialPriority, extras);
  }
  return finalize(method, "horizon", initial, ledger, initialPriority, extras);
}
