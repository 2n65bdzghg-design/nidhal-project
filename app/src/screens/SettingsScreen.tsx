import React, { useState } from 'react';
import { Platform, Switch, View } from 'react-native';
import { useSms } from '../context/SmsContext';
import { Button, Card, Credit, Field, BackBar, Screen, Segmented, T } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';
import { csvEscape, isoDay } from '../utils/format';

export default function SettingsScreen() {
  const { t, lang, setLang, mode, setMode } = useSettings();
  const { user, signOut } = useAuth();
  const { transactions, accounts } = useData();
  const [csv, setCsv] = useState('');
  const sms = useSms();
  const [status, setStatus] = useState('');
  const { colors, row } = useSettings();

  const toggle = async (on: boolean) => {
    setStatus('');
    if (await sms.setEnabled(on) === 'denied') setStatus(t('smsDenied'));
  };
  const sync = async () => {
    const r = await sms.syncNow();
    setStatus(r === 'denied' ? t('smsDenied') : r === 'unsupported' ? t('smsUnsupported') : `${t('syncResult')}: ${r.saved} · ${t('syncQueued')}: ${r.queued}`);
  };

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
      <BackBar />
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
        <T bold>{t('autoRead')}</T>
        {Platform.OS === 'android' ? (
          <>
            {!sms.supported && <T size={12} color={colors.danger}>{t('smsUnsupported')}</T>}
            <View style={{ flexDirection: row, alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <View style={{ flex: 1 }}><T>{t('autoReadAndroid')}</T></View>
              <Switch value={sms.enabled} onValueChange={toggle} disabled={!sms.supported} />
            </View>
            <Button kind="ghost" title={sms.busy ? t('syncing') : t('syncNow')} onPress={sync} disabled={!sms.supported || sms.busy} />
            {sms.lastSync && <T size={12} muted>{t('lastSync')}: {new Date(sms.lastSync).toLocaleString()}</T>}
            {!!status && <T size={12} muted>{status}</T>}
          </>
        ) : (
          <>
            {Platform.OS === 'web' ? (
              <T size={13} muted>{t('webSmsNote')}</T>
            ) : (
              <>
                <T bold size={13}>{t('iosAutoTitle')}</T>
                <T size={13} muted>{t('iosAutoSteps')}</T>
              </>
            )}
          </>
        )}
      </Card>
      <Card>
        <Button kind="ghost" title={t('exportData')} onPress={exportCsv} />
        {!!csv && <Field label={t('copied')} value={csv} multiline editable={false} selectTextOnFocus autoCapitalize="none" />}
        <T size={12} muted>{t('privacy')}</T>
      </Card>
      <Button kind="danger" title={t('signOut')} onPress={signOut} />
      <Credit />
    </Screen>
  );
}
