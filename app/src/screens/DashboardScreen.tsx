import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Card, Screen, T } from '../components/ui';
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';
import { categoryById } from '../utils/categories';
import { monthKey, money } from '../utils/format';
import { budgetLines, monthKeyOf, monthStats } from '../utils/insights';

export default function DashboardScreen() {
  const { t, colors, row, lang } = useSettings();
  const { accounts, transactions, accountBalance, budget } = useData();
  const [offset, setOffset] = useState(0);

  const month = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + offset);
    return d;
  }, [offset]);
  const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
  const title = month.toLocaleDateString(lang === 'ar' ? 'ar' : 'en-US', { month: 'long', year: 'numeric' });

  // Totals mix currencies only if the user has several; show per-currency lines when that happens.
  const stats = useMemo(() => {
    const cur = (id: string) => accounts.find((a) => a.id === id)?.currency ?? '';
    const inMonth = transactions.filter((x) => monthKey(x.date) === key);
    const byCur: Record<string, { income: number; expense: number; cats: Record<string, number> }> = {};
    for (const x of inMonth) {
      const c = cur(x.accountId);
      const b = (byCur[c] ??= { income: 0, expense: 0, cats: {} });
      if (x.type === 'income') b.income += x.amount;
      else { b.expense += x.amount; b.cats[x.category] = (b.cats[x.category] ?? 0) + x.amount; }
    }
    return byCur;
  }, [transactions, accounts, key]);

  const currencies = Object.keys(stats);
  const budgetCur = budget.currency || accounts[0]?.currency || '';
  const hot = useMemo(
    () => budgetLines(monthStats(transactions, accounts, budgetCur, monthKeyOf(new Date())), budget).filter((l) => l.pct >= 0.8).slice(0, 3),
    [transactions, accounts, budgetCur, budget],
  );

  return (
    <Screen>
      <View style={{ flexDirection: row, alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable onPress={() => setOffset(offset - 1)} hitSlop={12}><T size={24} color={colors.primary}>{lang === 'ar' ? '›' : '‹'}</T></Pressable>
        <T size={18} bold>{title}</T>
        <Pressable onPress={() => setOffset(Math.min(0, offset + 1))} hitSlop={12} disabled={offset === 0}>
          <T size={24} color={offset === 0 ? colors.border : colors.primary}>{lang === 'ar' ? '‹' : '›'}</T>
        </Pressable>
      </View>

      {offset === 0 && hot.length > 0 && (
        <Card style={{ borderColor: hot[0].pct > 1 ? colors.danger : '#F59E0B' }}>
          <T bold>🔔 {t('budgetAlerts')}</T>
          {hot.map((l) => (
            <T key={l.cat} size={13} color={l.pct > 1 ? colors.danger : undefined}>
              {categoryById(l.cat).icon} {t('cat_' + l.cat)}: {money(l.spent, budgetCur)} / {money(l.limit, budgetCur)} ({Math.round(l.pct * 100)}%)
            </T>
          ))}
        </Card>
      )}

      {currencies.length === 0 && <Card><T muted>{t('noData')}</T></Card>}

      {currencies.map((c) => {
        const s = stats[c];
        const cats = Object.entries(s.cats).sort((a, b) => b[1] - a[1]);
        return (
          <React.Fragment key={c || 'none'}>
            <Card>
              <View style={{ flexDirection: row, justifyContent: 'space-between' }}>
                <View style={{ gap: 2 }}><T size={12} muted>{t('income')}</T><T bold color={colors.success}>{money(s.income, c)}</T></View>
                <View style={{ gap: 2 }}><T size={12} muted>{t('expenses')}</T><T bold color={colors.danger}>{money(s.expense, c)}</T></View>
                <View style={{ gap: 2 }}><T size={12} muted>{t('net')}</T><T bold>{money(s.income - s.expense, c)}</T></View>
              </View>
            </Card>
            <Card>
              <T bold size={16}>{t('spendingByCategory')}{currencies.length > 1 ? ` (${c})` : ''}</T>
              {cats.length === 0 && <T muted>{t('noData')}</T>}
              {cats.map(([id, amt]) => {
                const cat = categoryById(id);
                const pct = s.expense ? amt / s.expense : 0;
                return (
                  <View key={id} style={{ gap: 4 }}>
                    <View style={{ flexDirection: row, justifyContent: 'space-between' }}>
                      <T>{cat.icon} {t('cat_' + id)}</T>
                      <T bold>{money(amt, c)} · {Math.round(pct * 100)}%</T>
                    </View>
                    <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden', flexDirection: row }}>
                      <View style={{ width: `${Math.max(2, pct * 100)}%`, backgroundColor: cat.color, borderRadius: 4 }} />
                    </View>
                  </View>
                );
              })}
            </Card>
          </React.Fragment>
        );
      })}

      <Card>
        <T bold size={16}>{t('byAccount')}</T>
        {accounts.length === 0 && <T muted>{t('needAccount')}</T>}
        {accounts.map((a) => (
          <View key={a.id} style={{ flexDirection: row, justifyContent: 'space-between' }}>
            <T>{a.name}{a.last4 ? ` ••${a.last4}` : ''}</T>
            <T bold>{money(accountBalance(a.id), a.currency)}</T>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
