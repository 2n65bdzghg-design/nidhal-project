import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { Button, Card, Credit, Field, Screen, Segmented, T } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

export default function AuthScreen() {
  const { t, lang, setLang } = useSettings();
  const { signIn, signUp } = useAuth();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    if (!email.trim() || !password || (creating && !name.trim())) return setError(t('fillAll'));
    if (creating && password.length < 6) return setError(t('weakPassword'));
    setBusy(true);
    try {
      const r = creating ? await signUp(name, email, password) : await signIn(email, password);
      if (r !== 'ok') setError(t(r));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ gap: 16 }}>
        <View style={{ alignItems: 'center', paddingVertical: 24, gap: 8 }}>
          <T size={56} style={{ textAlign: 'center' }}>💳</T>
          <T size={28} bold style={{ textAlign: 'center' }}>{t('appName')}</T>
        </View>
        <Segmented value={lang} onChange={setLang} options={[{ value: 'en', label: 'English' }, { value: 'ar', label: 'العربية' }]} />
        <Card>
          <T size={20} bold>{creating ? t('signUp') : t('signIn')}</T>
          {creating && <Field label={t('name')} value={name} onChangeText={setName} />}
          <Field label={t('email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          <Field label={t('password')} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
          {!!error && <T color="#DC2626">{error}</T>}
          <Button title={creating ? t('signUp') : t('signIn')} onPress={submit} disabled={busy} />
        </Card>
        <Button kind="ghost" title={creating ? t('haveAccount') : t('noAccountYet')} onPress={() => { setCreating(!creating); setError(''); }} />
        <T size={12} muted style={{ textAlign: 'center' }}>{t('privacy')}</T>
        <Credit />
      </KeyboardAvoidingView>
    </Screen>
  );
}
