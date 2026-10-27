import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Button, Chip, Field, Screen, Segmented, T, Wrap } from '../components/ui';
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';
import { CATEGORIES, categoryById } from '../utils/categories';
import { isoDay, parseDay } from '../utils/format';
import { TxType } from '../types';

export default function TransactionFormScreen() {
  const { t } = useSettings();
  const { accounts, transactions, saveTransaction, deleteTransaction } = useData();
  const nav = useNavigation<any>();
  const id: string | undefined = (useRoute().params as any)?.id;
  const existing = transactions.find((x) => x.id === id);

  const [type, setType] = useState<TxType>(existing?.type ?? 'expense');
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [category, setCategory] = useState(existing?.category ?? 'other');
  const [merchant, setMerchant] = useState(existing?.merchant ?? '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [date, setDate] = useState(isoDay(existing?.date ?? new Date().toISOString()));
  const [accountId, setAccountId] = useState(existing?.accountId ?? accounts[0]?.id ?? '');
  const [error, setError] = useState('');

  const save = () => {
    const amt = parseFloat(amount.replace(',', '.'));
    const d = parseDay(date);
    if (!accountId) return setError(t('needAccount'));
    if (!isFinite(amt) || amt <= 0) return setError(t('invalidAmount'));
    if (!d) return setError(t('invalidDate'));
    saveTransaction({ id, accountId, type, amount: amt, category, merchant: merchant.trim(), note: note.trim(), date: d.toISOString(), source: existing?.source ?? 'manual', raw: existing?.raw });
    nav.goBack();
  };
  const remove = () =>
    Alert.alert(t('delete'), t('confirmDelete'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: () => { deleteTransaction(id!); nav.goBack(); } },
    ]);

  const cats = CATEGORIES.filter((c) => !!c.income === (type === 'income'));

  return (
    <Screen>
      <Segmented value={type} onChange={(v) => { setType(v); setCategory(v === 'income' ? 'salary' : 'other'); }} options={[{ value: 'expense', label: t('expense') }, { value: 'income', label: t('income') }]} />
      <Field label={t('amount')} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" />
      <Field label={t('merchant')} value={merchant} onChangeText={setMerchant} />
      <T size={13} muted bold>{t('category')}</T>
      <Wrap>{cats.map((c) => <Chip key={c.id} label={`${c.icon} ${t('cat_' + c.id)}`} active={category === c.id} color={categoryById(c.id).color} onPress={() => setCategory(c.id)} />)}</Wrap>
      <T size={13} muted bold>{t('account')}</T>
      {accounts.length === 0 && <T color="#DC2626">{t('needAccount')}</T>}
      <Wrap>{accounts.map((a) => <Chip key={a.id} label={a.name} active={accountId === a.id} onPress={() => setAccountId(a.id)} />)}</Wrap>
      <Field label={t('date')} value={date} onChangeText={setDate} autoCapitalize="none" />
      <Field label={t('note')} value={note} onChangeText={setNote} multiline />
      {!!error && <T color="#DC2626">{error}</T>}
      <Button title={t('save')} onPress={save} />
      {existing && <Button kind="danger" title={t('delete')} onPress={remove} />}
      <Button kind="ghost" title={t('cancel')} onPress={() => nav.goBack()} />
    </Screen>
  );
}
