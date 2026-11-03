import { useEffect, useMemo } from 'react';
import { useData } from './DataContext';
import { useSettings } from './SettingsContext';
import { budgetLines, monthKeyOf, monthStats } from '../utils/insights';
import { notifyNow, setWeeklyReminder } from '../utils/notify';

/** Renders nothing. Fires a local notification the first time a category crosses 80% / 100% of its limit this month. */
export default function BudgetWatcher() {
  const { t } = useSettings();
  const { accounts, transactions, budget, setBudget, loaded } = useData();
  const currency = budget.currency || accounts[0]?.currency || '';
  const month = monthKeyOf(new Date());

  const lines = useMemo(
    () => budgetLines(monthStats(transactions, accounts, currency, month), budget),
    [transactions, accounts, currency, month, budget],
  );

  useEffect(() => {
    if (!loaded || !budget.alerts) return;
    const fresh: string[] = [];
    for (const l of lines) {
      const level = l.pct > 1 ? 'over' : l.pct >= 0.8 ? 'near' : null;
      if (!level) continue;
      // crossing 100% should also count as having passed 80%
      const keys = level === 'over' ? [`${month}:${l.cat}:near`, `${month}:${l.cat}:over`] : [`${month}:${l.cat}:near`];
      const key = keys[keys.length - 1];
      if (budget.notified.includes(key)) continue;
      fresh.push(...keys.filter((k) => !budget.notified.includes(k)));
      const cat = t('cat_' + l.cat);
      if (level === 'over') notifyNow(t('notifOver'), t('notifOverBody', { cat, over: Math.round(l.spent - l.limit).toLocaleString('en-US') }));
      else notifyNow(t('notifNear'), t('notifNearBody', { cat, pct: Math.round(l.pct * 100) }));
    }
    if (fresh.length) setBudget({ notified: [...budget.notified.filter((k) => k.startsWith(month)), ...fresh] });
  }, [lines, loaded, budget.alerts, budget.notified, month, setBudget, t]);

  useEffect(() => {
    if (!loaded) return;
    setWeeklyReminder(budget.weekly, t('notifWeekly'), t('notifWeeklyBody'));
  }, [loaded, budget.weekly, t]);

  return null;
}
