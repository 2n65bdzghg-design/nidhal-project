import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Card, Chip, Field, Screen, T, Wrap } from '../components/ui';
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';
import { categoryById } from '../utils/categories';
import { isoDay, money } from '../utils/format';
import { ParsedMessage, parseMany } from '../utils/smsParser';

interface Row { p: ParsedMessage; accountId: string; matched: boolean; dup: boolean; on: boolean }

export default function ImportScreen() {
  const { t, colors, row } = useSettings();
  const { accounts, transactions, addTransactions, pending, resolvePending } = useData();
  const [text, setText] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [fallback, setFallback] = useState(accounts[0]?.id ?? '');
  const [done, setDone] = useState('');

  const fb = accounts.find((a) => a.id === fallback)?.id ?? accounts[0]?.id ?? '';

  const analyze = () => {
    setDone('');
    const { parsed, skipped } = parseMany(text);
    setSkipped(skipped);
    const seen = new Set(transactions.map((x) => x.raw).filter(Boolean));
    setRows(parsed.map((p) => {
      const hit = p.last4 ? accounts.find((a) => a.last4 === p.last4) : undefined;
      const dup = seen.has(p.raw);
      return { p, accountId: hit?.id ?? fb, matched: !!hit, dup, on: !dup };
    }));
  };

  const importNow = () => {
    const chosen = rows.filter((r) => r.on && r.accountId);
    addTransactions(chosen.map(({ p, accountId }) => ({
      accountId, type: p.type, amount: p.amount, category: p.category, merchant: p.merchant, note: '', date: p.date, source: 'sms' as const, raw: p.raw,
    })));
    setDone(`${t('imported')}: ${chosen.length}`);
    setRows([]); setText('');
  };

  const patch = (i: number, v: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...v } : r)));

  if (accounts.length === 0) return <Screen><T size={22} bold>{t('importTitle')}</T><Card><T muted>{t('needAccount')}</T></Card></Screen>;

  return (
    <Screen>
      <T size={22} bold>{t('importTitle')}</T>
      {pending.length > 0 && (
        <>
          <T bold size={16}>{t('needsReview')} ({pending.length})</T>
          {pending.map((p) => {
            const cat = categoryById(p.category);
            return (
              <Card key={p.id}>
                <View style={{ flexDirection: row, alignItems: 'center', gap: 12 }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <T bold numberOfLines={1}>{cat.icon} {p.merchant || t('cat_' + p.category)}</T>
                    <T size={12} muted>{t('cat_' + p.category)} · {isoDay(p.date)}{p.last4 ? ` · ••${p.last4}` : ''}</T>
                  </View>
                  <T bold color={p.type === 'income' ? colors.success : colors.danger}>{p.type === 'income' ? '+' : '−'}{money(p.amount, p.currency)}</T>
                </View>
                <T size={12} muted>{t('assignTo')}</T>
                <Wrap>{accounts.map((a) => <Chip key={a.id} label={a.name} active={false} onPress={() => resolvePending(p.id, a.id)} />)}</Wrap>
                <Button kind="ghost" title={t('dismiss')} onPress={() => resolvePending(p.id, null)} />
              </Card>
            );
          })}
        </>
      )}
      <T muted>{t('importHelp')}</T>
      <Field label="" value={text} onChangeText={setText} placeholder={t('paste')} multiline style={{ minHeight: 140 }} autoCapitalize="none" />
      <T size={13} muted bold>{t('defaultAccount')}</T>
      <Wrap>{accounts.map((a) => <Chip key={a.id} label={a.name} active={fb === a.id} onPress={() => setFallback(a.id)} />)}</Wrap>
      <Button title={t('analyze')} onPress={analyze} disabled={!text.trim()} />
      {!!done && <T bold color={colors.success}>{done}</T>}

      {rows.length > 0 && (
        <T muted>{t('found')}: {rows.length}{skipped ? ` · ${t('skipped')}: ${skipped}` : ''}</T>
      )}
      {rows.map((r, i) => {
        const cat = categoryById(r.p.category);
        return (
          <Card key={i} style={{ opacity: r.on ? 1 : 0.5 }}>
            <Pressable onPress={() => patch(i, { on: !r.on })} style={{ flexDirection: row, alignItems: 'center', gap: 12 }}>
              <T size={22}>{r.on ? '☑️' : '⬜'}</T>
              <View style={{ flex: 1, gap: 2 }}>
                <T bold numberOfLines={1}>{cat.icon} {r.p.merchant || t('cat_' + r.p.category)}</T>
                <T size={12} muted>{t('cat_' + r.p.category)} · {isoDay(r.p.date)}{r.matched ? ` · ${t('matchedByCard')} ${r.p.last4}` : ''}{r.dup ? ` · ${t('duplicates')}` : ''}</T>
              </View>
              <T bold color={r.p.type === 'income' ? colors.success : colors.danger}>
                {r.p.type === 'income' ? '+' : '−'}{money(r.p.amount, r.p.currency)}
              </T>
            </Pressable>
            <Wrap>{accounts.map((a) => <Chip key={a.id} label={a.name} active={r.accountId === a.id} onPress={() => patch(i, { accountId: a.id, matched: false })} />)}</Wrap>
          </Card>
        );
      })}
      {rows.some((r) => r.on) && <Button title={t('importSelected')} onPress={importNow} />}
    </Screen>
  );
}
