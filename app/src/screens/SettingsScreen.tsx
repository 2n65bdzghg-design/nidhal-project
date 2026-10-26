import React, { useState } from 'react';
import { Button, Card, Field, Screen, Segmented, T } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';
import { csvEscape, isoDay } from '../utils/format';

export default function SettingsScreen() {
  const { t, lang, setLang, mode, setMode } = useSettings();
  const { user, signOut } = useAuth();
  const { transactions, accounts } = useData();
  const [csv, setCsv] = useState('');

  const exportCsv = () => {
    const lines = ['date,type,amount,currency,account,category,merchant,note'];
    for (const x of [...transactions].sort((a, b) => b.date.localeCompare(a.date))) {
      const a = accounts.find((y) => y.id === x.accountId);
      lines.push([isoDay(x.date), x.type, x.amount, a?.currency ?? '', csvEscape(a?.name ?? ''), x.category, csvEscape(x.merchant), csvEscape(x.note)].join(','));
    }
    setCsv(lines.join('\n'));
  };

  return (
    <Screen>
      <Card>
        <T bold size={18}>{user?.name}</T>
        <T muted>{user?.email}</T>
      </Card>
      <Card>
        <T bold>{t('language')}</T>
        <Segmented value={lang} onChange={setLang} options={[{ value: 'en', label: 'English' }, { value: 'ar', label: 'العربية' }]} />
        <T bold>{t('theme')}</T>
        <Segmented value={mode} onChange={setMode} options={[{ value: 'system', label: t('themeSystem') }, { value: 'light', label: t('themeLight') }, { value: 'dark', label: t('themeDark') }]} />
      </Card>
      <Card>
        <Button kind="ghost" title={t('exportData')} onPress={exportCsv} />
        {!!csv && <Field label={t('copied')} value={csv} multiline editable={false} selectTextOnFocus autoCapitalize="none" />}
        <T size={12} muted>{t('privacy')}</T>
      </Card>
      <Button kind="danger" title={t('signOut')} onPress={signOut} />
    </Screen>
  );
}
