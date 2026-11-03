import { Account, Budget, Transaction } from '../types';

export const NEEDS = ['groceries', 'bills', 'transport', 'fuel', 'health', 'education'];
export const WANTS = ['food', 'shopping', 'entertainment', 'travel'];
export const INVESTMENT = 'investment';
/** categories that can have a spending limit (everything except income and investing) */
export const BUDGETABLE = [...NEEDS, ...WANTS, 'transfer', 'other'];

export interface MonthStats {
  key: string;
  income: number;
  /** every expense, investing included */
  expense: number;
  /** expenses without investing: what the operating budget is measured against */
  operating: number;
  investment: number;
  byCat: Record<string, number>;
  count: number;
}

export const monthOf = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const monthKeyOf = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  return monthKeyOf(new Date(y, m - 1 + delta, 1));
}

export function monthStats(txs: Transaction[], accounts: Account[], currency: string, key: string): MonthStats {
  const cur = new Map(accounts.map((a) => [a.id, a.currency]));
  const s: MonthStats = { key, income: 0, expense: 0, operating: 0, investment: 0, byCat: {}, count: 0 };
  for (const t of txs) {
    if (monthOf(t.date) !== key) continue;
    if (currency && cur.get(t.accountId) !== currency) continue;
    s.count++;
    if (t.type === 'income') { s.income += t.amount; continue; }
    s.expense += t.amount;
    s.byCat[t.category] = (s.byCat[t.category] ?? 0) + t.amount;
    if (t.category === INVESTMENT) s.investment += t.amount;
    else s.operating += t.amount;
  }
  return s;
}

export interface BudgetLine { cat: string; limit: number; spent: number; pct: number }

export function budgetLines(stats: MonthStats, budget: Budget): BudgetLine[] {
  return Object.entries(budget.limits)
    .filter(([, limit]) => limit > 0)
    .map(([cat, limit]) => ({ cat, limit, spent: stats.byCat[cat] ?? 0, pct: (stats.byCat[cat] ?? 0) / limit }))
    .sort((a, b) => b.pct - a.pct);
}

export const totalLimit = (b: Budget): number => Object.values(b.limits).reduce((s, v) => s + (v > 0 ? v : 0), 0);

/** Suggested limits: average spend per category over the previous `months` months, rounded up to a tidy number. */
export function suggestLimits(txs: Transaction[], accounts: Account[], currency: string, fromKey: string, months = 3): Record<string, number> {
  const sums: Record<string, number> = {};
  let withData = 0; // average only over months that have any spending, so a new user is not averaged down by empty months
  for (let i = 1; i <= months; i++) {
    const st = monthStats(txs, accounts, currency, shiftMonth(fromKey, -i));
    if (st.operating > 0) withData++;
    for (const c of BUDGETABLE) if (st.byCat[c]) sums[c] = (sums[c] ?? 0) + st.byCat[c];
  }
  const out: Record<string, number> = {};
  for (const [c, v] of Object.entries(sums)) {
    const avg = v / Math.max(1, withData);
    const step = avg >= 1000 ? 50 : avg >= 100 ? 10 : 5;
    out[c] = Math.ceil(avg / step) * step;
  }
  return out;
}

export interface Delta { cur: number; prev: number; diff: number; pct: number | null }
export const delta = (cur: number, prev: number): Delta => ({ cur, prev, diff: cur - prev, pct: prev > 0 ? (cur - prev) / prev : null });

export interface Advice {
  id: string;
  level: 'good' | 'info' | 'warn' | 'alert';
  params: Record<string, string | number>;
}

const r0 = (n: number) => Math.round(n).toLocaleString('en-US');

/**
 * Plain rule-based guidance from the user's own numbers (50/30/20 rule, savings rate, budget use, month-over-month changes).
 * Pure function so it can be unit-tested; texts live in the i18n dictionaries under `adv_<id>`.
 */
export function buildAdvice(cur: MonthStats, prev: MonthStats, budget: Budget, avgMonthlySpend: number): Advice[] {
  const out: Advice[] = [];
  const add = (id: string, level: Advice['level'], params: Advice['params'] = {}) => out.push({ id, level, params });

  for (const l of budgetLines(cur, budget)) {
    if (l.pct > 1) add('budgetOver', 'alert', { cat: l.cat, over: r0(l.spent - l.limit) });
    else if (l.pct >= 0.8) add('budgetNear', 'warn', { cat: l.cat, pct: Math.round(l.pct * 100) });
  }
  if (totalLimit(budget) === 0) add('noBudget', 'info');

  if (cur.income <= 0) {
    if (cur.count > 0) add('noIncome', 'info');
  } else {
    const saved = cur.income - cur.operating; // money invested counts as saved
    const rate = saved / cur.income;
    if (saved < 0) add('overspend', 'alert', { amount: r0(-saved) });
    else if (rate < 0.1) add('lowSavings', 'warn', { rate: Math.round(rate * 100) });
    else if (rate < 0.2) add('okSavings', 'info', { rate: Math.round(rate * 100) });
    else add('goodSavings', 'good', { rate: Math.round(rate * 100) });

    const wants = WANTS.reduce((s, c) => s + (cur.byCat[c] ?? 0), 0);
    if (wants / cur.income > 0.3) add('wants', 'warn', { pct: Math.round((wants / cur.income) * 100) });

    if (budget.investment <= 0 && cur.investment <= 0) add('investNone', 'info', { suggest: r0(cur.income * 0.1) });
  }

  if (cur.operating > 0) {
    const top = Object.entries(cur.byCat).filter(([c]) => c !== INVESTMENT).sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] / cur.operating > 0.35 && cur.operating > 0) add('topCat', 'warn', { cat: top[0], pct: Math.round((top[1] / cur.operating) * 100) });
  }

  for (const [c, v] of Object.entries(cur.byCat)) {
    const p = prev.byCat[c] ?? 0;
    if (c !== INVESTMENT && p > 0 && v > p * 1.2 && v - p >= Math.max(20, cur.operating * 0.03)) {
      add('catUp', 'warn', { cat: c, pct: Math.round(((v - p) / p) * 100) });
    }
  }

  if (budget.investment > 0) {
    if (cur.investment >= budget.investment) add('investOk', 'good', { have: r0(cur.investment), target: r0(budget.investment) });
    else add('investLow', 'warn', { have: r0(cur.investment), target: r0(budget.investment) });
  }

  if (avgMonthlySpend > 0) add('emergency', 'info', { amount: r0(avgMonthlySpend * 3), amount6: r0(avgMonthlySpend * 6) });

  const order = { alert: 0, warn: 1, info: 2, good: 3 } as const;
  return out.sort((a, b) => order[a.level] - order[b.level]);
}
