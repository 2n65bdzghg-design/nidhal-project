import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card, Chip, Field, Screen, T } from '../components/ui';
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';
import { categoryById } from '../utils/categories';
import { isoDay, money } from '../utils/format';

export default function TransactionsScreen() {
  const { t, colors, row } = useSettings();
  const { accounts, transactions } = useData();
  const nav = useNavigation<any>();
  const [acc, setAcc] = useState<string>('all');
  const [q, setQ] = useState('');

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return transactions
      .filter((x) => acc === 'all' || x.accountId === acc)
      .filter((x) => !needle || `${x.merchant} ${x.note} ${t('cat_' + x.category)}`.toLowerCase().includes(needle))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, acc, q, t]);

  return (
    <Screen scroll={false}>
      <View style={{ flexDirection: row, gap: 8, flexWrap: 'wrap' }}>
        <Chip label={t('all')} active={acc === 'all'} onPress={() => setAcc('all')} />
        {accounts.map((a) => <Chip key={a.id} label={a.name} active={acc === a.id} onPress={() => setAcc(a.id)} />)}
      </View>
      <Field label="" placeholder={t('search')} value={q} onChangeText={setQ} />
      <FlatList
        data={list}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{ gap: 10, paddingBottom: 90 }}
        ListEmptyComponent={<T muted>{t('noData')}</T>}
        renderItem={({ item }) => {
          const cat = categoryById(item.category);
          const a = accounts.find((x) => x.id === item.accountId);
          return (
            <Pressable onPress={() => nav.navigate('TransactionForm', { id: item.id })}>
              <Card style={{ flexDirection: row, alignItems: 'center', gap: 12, padding: 12 }}>
                <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: cat.color + '33', alignItems: 'center', justifyContent: 'center' }}>
                  <T size={20} style={{ textAlign: 'center' }}>{cat.icon}</T>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <T bold numberOfLines={1}>{item.merchant || t('cat_' + item.category)}</T>
                  <T size={12} muted numberOfLines={1}>{t('cat_' + item.category)} · {isoDay(item.date)} · {a?.name}</T>
                </View>
                <T bold color={item.type === 'income' ? colors.success : colors.danger}>
                  {item.type === 'income' ? '+' : '−'}{money(item.amount, a?.currency)}
                </T>
              </Card>
            </Pressable>
          );
        }}
      />
      <Pressable
        accessibilityLabel={t('addTransaction')}
        onPress={() => nav.navigate('TransactionForm', {})}
        style={{ position: 'absolute', bottom: 20, right: 20, width: 58, height: 58, borderRadius: 29, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 4 }}
      >
        <T size={30} color={colors.onPrimary} style={{ textAlign: 'center' }}>+</T>
      </Pressable>
    </Screen>
  );
}
