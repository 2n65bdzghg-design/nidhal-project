import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Button, Field, Screen } from '../components/ui';
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';

export default function AccountFormScreen() {
  const { t } = useSettings();
  const { accounts, saveAccount, deleteAccount } = useData();
  const nav = useNavigation<any>();
  const id: string | undefined = (useRoute().params as any)?.id;
  const ex = accounts.find((a) => a.id === id);
  const [name, setName] = useState(ex?.name ?? '');
  const [bank, setBank] = useState(ex?.bank ?? '');
  const [last4, setLast4] = useState(ex?.last4 ?? '');
  const [currency, setCurrency] = useState(ex?.currency ?? 'SAR');
  const [opening, setOpening] = useState(ex ? String(ex.openingBalance) : '0');
  const [error, setError] = useState('');

  const save = () => {
    const ob = parseFloat(opening.replace(',', '.'));
    if (!name.trim() || !currency.trim()) return setError(t('fillAll'));
    if (!isFinite(ob)) return setError(t('invalidAmount'));
    saveAccount({ id, name: name.trim(), bank: bank.trim(), last4: last4.replace(/\D/g, '').slice(-4), currency: currency.trim().toUpperCase(), openingBalance: ob });
    nav.goBack();
  };
  const remove = () =>
    Alert.alert(t('delete'), t('deleteAccountWarn'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: () => { deleteAccount(id!); nav.goBack(); } },
    ]);

  return (
    <Screen>
      <Field label={t('accountName')} value={name} onChangeText={setName} />
      <Field label={t('bank')} value={bank} onChangeText={setBank} />
      <Field label={t('last4')} value={last4} onChangeText={setLast4} keyboardType="number-pad" maxLength={4} />
      <Field label={t('currency')} value={currency} onChangeText={setCurrency} autoCapitalize="characters" maxLength={3} />
      <Field label={t('openingBalance')} value={opening} onChangeText={setOpening} keyboardType="numbers-and-punctuation" />
      {!!error && <Button kind="ghost" title={error} onPress={() => setError('')} />}
      <Button title={t('save')} onPress={save} />
      {ex && <Button kind="danger" title={t('delete')} onPress={remove} />}
      <Button kind="ghost" title={t('cancel')} onPress={() => nav.goBack()} />
    </Screen>
  );
}
