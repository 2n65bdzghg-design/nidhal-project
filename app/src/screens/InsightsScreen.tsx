import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Card, Screen, T } from '../components/ui';
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';
import { categoryById } from '../utils/categories';
import { money } from '../utils/format';
import { INVESTMENT, buildAdvice, delta, monthKeyOf, monthStats, shiftMonth } from '../utils/insights';

const LEVEL = { alert: { icon: '🚨', color: '#DC2626' }, warn: { icon: '⚠️', color: '#F59E0B' }, info: { icon: '💡', color: '#3B82F6' }, good: { icon: '✅', color: '#16A34A' } } as const;

/** goodWhenUp: income and savings are good when they rise, spending is good when it falls */
function DeltaText({ cur, prev, goodWhenUp, currency }: { cur: number; prev: number; goodWhenUp: boolean; currency: string }) {
  const { t, colors } = useSettings();
  const d = delta(cur, prev);
  if (Math.abs(d.diff) < 0.005) return <T size={12} muted>{t('same')}</T>;
  const up = d.diff > 0;
  const good = up === goodWhenUp;
  return (
    <T size={12} bold color={good ? colors.success : colors.danger}>
      {up ? '▲' : '▼'} {money(Math.abs(d.diff), currency)}{d.pct !== null ? ` (${Math.round(Math.abs(d.pct) * 100)}%)` : ''}
    </T>
  );
}

export default function InsightsScreen() {
  const { t, colors, row } = useSettings();
  const { accounts, transactions, budget } = useData();
  const currency = budget.currency || accounts[0]?.currency || '';
  const key = monthKeyOf(new Date());
  const prevKey = shiftMonth(key, -1);

  const { cur, prev, advice } = useMemo(() => {
    const cur = monthStats(transactions, accounts, currency, key);
    const prev = monthStats(transactions, accounts, currency, prevKey);
    const past = [1, 2, 3].map((i) => monthStats(transactions, accounts, currency, shiftMonth(key, -i)).operating).filter((v) => v > 0);
    const avg = past.length ? past.reduce((a, b) => a + b, 0) / past.length : cur.operating;
    return { cur, prev, advice: buildAdvice(cur, prev, budget, avg) };
  }, [transactions, accounts, currency, key, prevKey, budget]);

  const rows: { label: string; c: number; p: number; goodWhenUp: boolean }[] = [
    { label: t('income'), c: cur.income, p: prev.income, goodWhenUp: true },
    { label: t('expenses'), c: cur.operating, p: prev.operating, goodWhenUp: false },
    { label: t('cat_investment'), c: cur.investment, p: prev.investment, goodWhenUp: true },
    { label: t('netSaved'), c: cur.income - cur.operating, p: prev.income - prev.operating, goodWhenUp: true },
  ];

  const cats = [...new Set([...Object.keys(cur.byCat), ...Object.keys(prev.byCat)])]
    .filter((c) => c !== INVESTMENT)
    .sort((a, b) => (cur.byCat[b] ?? 0) + (prev.byCat[b] ?? 0) - ((cur.byCat[a] ?? 0) + (prev.byCat[a] ?? 0)));
  const maxCat = Math.max(1, ...cats.map((c) => Math.max(cur.byCat[c] ?? 0, prev.byCat[c] ?? 0)));
  const monthName = (k: string) => {
    const [y, m] = k.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString(t('lang') === 'ar' ? 'ar' : 'en-US', { month: 'long' });
  };

  return (
    <Screen>
      <T size={22} bold>{t('insightsTitle')}</T>

      <Card>
        <T bold size={17}>{t('compare')}</T>
        <View style={{ flexDirection: row, justifyContent: 'space-between' }}>
          <View style={{ flex: 1.4 }} />
          <View style={{ flex: 1 }}><T size={12} muted bold>{monthName(prevKey)}</T></View>
          <View style={{ flex: 1 }}><T size={12} muted bold>{monthName(key)}</T></View>
        </View>
        {rows.map((r) => (
          <View key={r.label} style={{ gap: 2 }}>
            <View style={{ flexDirection: row, alignItems: 'center' }}>
              <View style={{ flex: 1.4 }}><T bold size={13}>{r.label}</T></View>
              <View style={{ flex: 1 }}><T size={13} muted>{money(r.p)}</T></View>
              <View style={{ flex: 1 }}><T size={13} bold>{money(r.c)}</T></View>
            </View>
            {prev.count > 0 ? <DeltaText cur={r.c} prev={r.p} goodWhenUp={r.goodWhenUp} currency={currency} /> : <T size={12} muted>{t('noPrev')}</T>}
          </View>
        ))}
        {!!currency && <T size={11} muted>{currency}</T>}
      </Card>

      <Card>
        <T bold size={17}>{t('byCategory')}</T>
        {cats.length === 0 && <T muted>{t('noData')}</T>}
        {cats.map((c) => {
          const cat = categoryById(c);
          const a = cur.byCat[c] ?? 0;
          const b = prev.byCat[c] ?? 0;
          return (
            <View key={c} style={{ gap: 4 }}>
              <View style={{ flexDirection: row, justifyContent: 'space-between' }}>
                <T>{cat.icon} {t('cat_' + c)}</T>
                <DeltaText cur={a} prev={b} goodWhenUp={false} currency={currency} />
              </View>
              {[{ v: b, color: colors.border, label: monthName(prevKey) }, { v: a, color: cat.color, label: monthName(key) }].map((bar) => (
                <View key={bar.label} style={{ flexDirection: row, alignItems: 'center', gap: 8 }}>
                  <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.input, overflow: 'hidden', flexDirection: row }}>
                    <View style={{ width: `${bar.v > 0 ? Math.max(2, (bar.v / maxCat) * 100) : 0}%`, backgroundColor: bar.color, borderRadius: 4 }} />
                  </View>
                  <View style={{ width: 84 }}><T size={11} muted>{money(bar.v)}</T></View>
                </View>
              ))}
            </View>
          );
        })}
      </Card>

      <T bold size={17}>{t('adviceTitle')}</T>
      {advice.map((a) => {
        const L = LEVEL[a.level];
        const params = { ...a.params, ...('cat' in a.params ? { cat: t('cat_' + a.params.cat) } : {}) };
        return (
          <Card key={a.id + JSON.stringify(a.params)} style={{ flexDirection: row, gap: 12, alignItems: 'flex-start', borderColor: L.color }}>
            <T size={20}>{L.icon}</T>
            <View style={{ flex: 1 }}><T>{t('adv_' + a.id, params)}</T></View>
          </Card>
        );
      })}
      <T size={11} muted>{t('adviceDisclaimer')}</T>
    </Screen>
  );
}
