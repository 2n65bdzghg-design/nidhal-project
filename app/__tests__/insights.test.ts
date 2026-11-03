import { Account, Budget, EMPTY_BUDGET, Transaction } from '../src/types';
import { budgetLines, buildAdvice, delta, monthStats, shiftMonth, suggestLimits } from '../src/utils/insights';

const acc: Account[] = [
  { id: 'a', name: 'A', bank: '', last4: '', currency: 'SAR', openingBalance: 0 },
  { id: 'b', name: 'B', bank: '', last4: '', currency: 'USD', openingBalance: 0 },
];
let n = 0;
const tx = (accountId: string, type: 'income' | 'expense', amount: number, category: string, date: string): Transaction => ({
  id: String(n++), accountId, type, amount, category, merchant: '', note: '', date: new Date(date + 'T12:00:00').toISOString(), source: 'manual',
});

const txs = [
  tx('a', 'income', 10000, 'salary', '2026-10-01'),
  tx('a', 'expense', 3000, 'groceries', '2026-10-05'),
  tx('a', 'expense', 2500, 'food', '2026-10-06'),
  tx('a', 'expense', 1000, 'investment', '2026-10-07'),
  tx('b', 'expense', 999, 'food', '2026-10-08'), // other currency, ignored
  tx('a', 'income', 10000, 'salary', '2026-09-01'),
  tx('a', 'expense', 1000, 'groceries', '2026-09-05'),
  tx('a', 'expense', 1000, 'food', '2026-09-06'),
];

test('shiftMonth crosses years', () => {
  expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  expect(shiftMonth('2026-11', 2)).toBe('2027-01');
});

test('monthStats separates operating and investment and filters by currency', () => {
  const s = monthStats(txs, acc, 'SAR', '2026-10');
  expect(s.income).toBe(10000);
  expect(s.expense).toBe(6500);
  expect(s.operating).toBe(5500);
  expect(s.investment).toBe(1000);
  expect(s.byCat.food).toBe(2500);
});

test('budgetLines and delta', () => {
  const s = monthStats(txs, acc, 'SAR', '2026-10');
  const b: Budget = { ...EMPTY_BUDGET, limits: { groceries: 2000, food: 5000 } };
  const lines = budgetLines(s, b);
  expect(lines[0]).toMatchObject({ cat: 'groceries', pct: 1.5 });
  expect(delta(150, 100)).toEqual({ cur: 150, prev: 100, diff: 50, pct: 0.5 });
  expect(delta(5, 0).pct).toBeNull();
});

test('suggestLimits averages previous months', () => {
  const l = suggestLimits(txs, acc, 'SAR', '2026-10', 1);
  expect(l.groceries).toBe(1000);
  expect(l.food).toBe(1000);
});

test('advice flags budget overrun, wants share and category jump', () => {
  const cur = monthStats(txs, acc, 'SAR', '2026-10');
  const prev = monthStats(txs, acc, 'SAR', '2026-09');
  const ids = buildAdvice(cur, prev, { ...EMPTY_BUDGET, limits: { groceries: 2000 }, investment: 2000 }, 3000).map((a) => a.id);
  expect(ids).toContain('budgetOver');
  expect(ids).toContain('catUp');
  expect(ids).toContain('investLow');
  expect(ids).toContain('emergency');
  expect(ids).toContain('goodSavings'); // (10000-5500)/10000 = 45%
  expect(ids[0]).toBe('budgetOver'); // alerts first
});

test('advice warns when spending exceeds income', () => {
  const cur = monthStats([tx('a', 'income', 100, 'salary', '2026-10-01'), tx('a', 'expense', 300, 'other', '2026-10-02')], acc, 'SAR', '2026-10');
  const ids = buildAdvice(cur, monthStats([], acc, 'SAR', '2026-09'), EMPTY_BUDGET, 0).map((a) => a.id);
  expect(ids).toContain('overspend');
  expect(ids).toContain('noBudget');
});

test('suggestLimits ignores months without spending when averaging', () => {
  const l = suggestLimits(txs, acc, 'SAR', '2026-10', 3); // only September has data
  expect(l.groceries).toBe(1000);
});
