import React from 'react';
import { Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, Card, BackBar, Screen, T } from '../components/ui';
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';
import { money } from '../utils/format';

export default function AccountsScreen() {
  const { t, row, colors } = useSettings();
  const { accounts, accountBalance } = useData();
  const nav = useNavigation<any>();
  return (
    <Screen>
      <BackBar />
      <T size={22} bold>{t('accounts')}</T>
      {accounts.length === 0 && <Card><T muted>{t('needAccount')}</T></Card>}
      {accounts.map((a) => (
        <Pressable key={a.id} onPress={() => nav.navigate('AccountForm', { id: a.id })}>
          <Card style={{ flexDirection: row, alignItems: 'center', gap: 12 }}>
            <T size={28}>💳</T>
            <View style={{ flex: 1, gap: 2 }}>
              <T bold>{a.name}</T>
              <T size={12} muted>{[a.bank, a.last4 && `•••• ${a.last4}`, a.currency].filter(Boolean).join(' · ')}</T>
            </View>
            <T bold color={accountBalance(a.id) < 0 ? colors.danger : colors.text}>{money(accountBalance(a.id), a.currency)}</T>
          </Card>
        </Pressable>
      ))}
      <Button title={'+ ' + t('addAccount')} onPress={() => nav.navigate('AccountForm', {})} />
    </Screen>
  );
}
