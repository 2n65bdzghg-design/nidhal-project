import React, { useEffect, useMemo, useState } from 'react';
import { Switch, View } from 'react-native';
import { Button, Card, Field, Screen, T } from '../components/ui';
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';
import { categoryById } from '../utils/categories';
import { money } from '../utils/format';
import { BUDGETABLE, INVESTMENT, budgetLines, monthKeyOf, monthStats, suggestLimits, totalLimit } from '../utils/insights';
import { ensureNotificationPermission, notificationsAvailable } from '../utils/notify';

const barColor = (pct: number, c: { success: string; danger: string }) => (pct > 1 ? c.danger : pct >= 0.8 ? '#F59E0B' : c.success);

function Progress({ pct, color }: { pct: number; color: string }) {
  const { colors, row } = useSettings();
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden', flexDirection: row }}>
      <View style={{ width: `${Math.min(100, Math.max(2, pct * 100))}%`, backgroundColor: color, borderRadius: 4 }} />
    </View>
  );
}

function LimitRow({ cat, value, spent, currency, onChange }: { cat: string; value: number; spent: number; currency: string; onChange: (v: number) => void }) {
  const { t, colors, row } = useSettings();
  const [text, setText] = useState(value > 0 ? String(value) : '');
  useEffect(() => setText(value > 0 ? String(value) : ''), [value]);
  const c = categoryById(cat);
  const pct = value > 0 ? spent / value : 0;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: row, alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1 }}><T>{c.icon} {t('cat_' + cat)}</T></View>
        <View style={{ width: 120 }}>
          <Field
            label=""
            value={text}
            onChangeText={setText}
            onEndEditing={() => { const v = parseFloat(text.replace(',', '.')); onChange(isFinite(v) && v > 0 ? v : 0); }}
            placeholder={t('clearLimit')}
            keyboardType="decimal-pad"
          />
        </View>
      </View>
      {value > 0 && (
        <>
          <Progress pct={pct} color={barColor(pct, colors)} />
          <T size={12} muted>
            {money(spent, currency)} {t('ofLimit')} {money(value, currency)} · {spent <= value ? `${money(value - spent, currency)} ${t('left')}` : `${money(spent - value, currency)} ${t('over')}`}
          </T>
        </>
      )}
    </View>
  );
}

export default function BudgetScreen() {
  const { t, colors, row } = useSettings();
  const { accounts, transactions, budget, setBudget } = useData();
  const [status, setStatus] = useState('');
  const currency = budget.currency || accounts[0]?.currency || '';
  const month = monthKeyOf(new Date());
  const stats = useMemo(() => monthStats(transactions, accounts, currency, month), [transactions, accounts, currency, month]);
  const lines = budgetLines(stats, budget);
  const total = totalLimit(budget);
  const totalSpent = lines.reduce((s, l) => s + l.spent, 0);
  const [cur, setCur] = useState(currency);
  const [inv, setInv] = useState(budget.investment > 0 ? String(budget.investment) : '');
  useEffect(() => setInv(budget.investment > 0 ? String(budget.investment) : ''), [budget.investment]);
  useEffect(() => setCur(currency), [currency]);

  const suggest = () => {
    const s = suggestLimits(transactions, accounts, currency, month, 3);
    if (Object.keys(s).length === 0) return setStatus(t('suggestNone'));
    setStatus('');
    setBudget({ limits: { ...budget.limits, ...s } });
  };

  const toggle = async (key: 'alerts' | 'weekly', on: boolean) => {
    setStatus('');
    if (on) {
      if (!notificationsAvailable) return setStatus(t('notifUnsupported'));
      if (!(await ensureNotificationPermission())) return setStatus(t('notifDenied'));
    }
    setBudget({ [key]: on });
  };

  const invPct = budget.investment > 0 ? stats.investment / budget.investment : 0;

  return (
    <Screen>
      <T size={22} bold>{t('budgetTitle')}</T>
      <Card>
        <Field
          label={t('budgetCurrency')}
          value={cur}
          onChangeText={(v) => setCur(v.toUpperCase())}
          onEndEditing={() => setBudget({ currency: cur.trim().toUpperCase().slice(0, 3) })}
          autoCapitalize="characters"
          maxLength={3}
        />
      </Card>

      <Card>
        <T bold size={17}>{t('operatingBudget')}</T>
        <T size={13} muted>{t('operatingHelp')}</T>
        {total > 0 && (
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: row, justifyContent: 'space-between' }}>
              <T bold>{t('totalBudget')}</T>
              <T bold>{money(totalSpent, currency)} / {money(total, currency)}</T>
            </View>
            <Progress pct={totalSpent / total} color={barColor(totalSpent / total, colors)} />
          </View>
        )}
        {BUDGETABLE.map((c) => (
          <LimitRow
            key={c}
            cat={c}
            value={budget.limits[c] ?? 0}
            spent={stats.byCat[c] ?? 0}
            currency={currency}
            onChange={(v) => setBudget({ limits: { ...budget.limits, [c]: v } })}
          />
        ))}
        <Button kind="ghost" title={t('suggestLimits')} onPress={suggest} />
      </Card>

      <Card>
        <T bold size={17}>📈 {t('investmentBudget')}</T>
        <T size={13} muted>{t('investmentHelp')}</T>
        <Field
          label={t('monthlyTarget')}
          value={inv}
          onChangeText={setInv}
          onEndEditing={() => { const v = parseFloat(inv.replace(',', '.')); setBudget({ investment: isFinite(v) && v > 0 ? v : 0 }); }}
          keyboardType="decimal-pad"
          placeholder="0"
        />
        <T size={12} muted>{t('suggestedInvest')}{stats.income > 0 ? ` (${money(stats.income * 0.1, currency)} – ${money(stats.income * 0.2, currency)})` : ''}</T>
        {budget.investment > 0 && (
          <View style={{ gap: 6 }}>
            <Progress pct={invPct} color={invPct >= 1 ? colors.success : colors.primary} />
            <T size={12} muted>{t('invested')}: {money(stats.byCat[INVESTMENT] ?? 0, currency)} {t('ofLimit')} {money(budget.investment, currency)}</T>
          </View>
        )}
      </Card>

      <Card>
        <T bold size={17}>🔔 {t('reminders')}</T>
        <View style={{ flexDirection: row, alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}><T>{t('remindAlerts')}</T></View>
          <Switch value={budget.alerts} onValueChange={(v) => toggle('alerts', v)} />
        </View>
        <View style={{ flexDirection: row, alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}><T>{t('remindWeekly')}</T></View>
          <Switch value={budget.weekly} onValueChange={(v) => toggle('weekly', v)} />
        </View>
        {!!status && <T size={12} color={colors.danger}>{status}</T>}
      </Card>
    </Screen>
  );
}
