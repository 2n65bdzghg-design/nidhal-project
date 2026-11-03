import React from 'react';
import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card, Screen, T } from '../components/ui';
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';

export default function MoreScreen() {
  const { t, row, colors, lang } = useSettings();
  const { pending } = useData();
  const nav = useNavigation<any>();
  const items = [
    { icon: '✉️', label: t('importTitle'), to: 'Import', badge: pending.length },
    { icon: '💳', label: t('accountsAndCards'), to: 'Accounts', badge: 0 },
    { icon: '⚙️', label: t('settings'), to: 'Settings', badge: 0 },
  ];
  return (
    <Screen>
      <T size={22} bold>{t('more')}</T>
      {items.map((i) => (
        <Pressable key={i.to} onPress={() => nav.navigate(i.to)}>
          <Card style={{ flexDirection: row, alignItems: 'center', gap: 12 }}>
            <T size={24}>{i.icon}</T>
            <T bold style={{ flex: 1 }}>{i.label}</T>
            {i.badge > 0 && <T bold color={colors.danger}>{i.badge}</T>}
            <T size={20} muted>{lang === 'ar' ? '‹' : '›'}</T>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}
