import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SmsInbox from '../../modules/sms-inbox/src/SmsInboxModule';
import { attachInbound } from '../utils/inbound';
import { useAuth } from './AuthContext';
import { useData } from './DataContext';
import { useSettings } from './SettingsContext';

const DAY = 86_400_000;
const FIRST_SYNC_DAYS = 30;

interface Ctx {
  /** Android build that includes the native SMS reader */
  supported: boolean;
  enabled: boolean;
  setEnabled: (on: boolean) => Promise<'ok' | 'denied'>;
  syncNow: () => Promise<{ saved: number; queued: number } | 'denied' | 'unsupported'>;
  busy: boolean;
  lastSync: number | null;
}
const SmsContext = createContext<Ctx>(null as unknown as Ctx);

export function SmsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { ingest, loaded } = useData();
  const { t } = useSettings();
  const supported = Platform.OS === 'android' && !!SmsInbox;
  const [enabled, setEnabledState] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const running = useRef(false);
  const autoKey = `sms.auto.v1.${user?.id}`;
  const syncKey = `sms.last.v1.${user?.id}`;

  const requestPermission = useCallback(async () => {
    if (Platform.OS !== 'android') return false;
    const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_SMS, {
      title: t('smsPermTitle'), message: t('smsPermMessage'), buttonPositive: 'OK', buttonNegative: t('cancel'),
    });
    return r === PermissionsAndroid.RESULTS.GRANTED;
  }, [t]);

  const syncNow: Ctx['syncNow'] = useCallback(async () => {
    if (!supported || !SmsInbox) return 'unsupported';
    if (running.current) return { saved: 0, queued: 0 };
    running.current = true;
    setBusy(true);
    try {
      if (!(await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS))) return 'denied';
      const stored = Number(await AsyncStorage.getItem(syncKey));
      const since = stored > 0 ? stored : Date.now() - FIRST_SYNC_DAYS * DAY;
      const started = Date.now();
      const msgs = await SmsInbox.readInbox(since, 1000);
      const bank = msgs.filter((m) => !/^\+?\d{9,}$/.test(m.address.trim())); // skip messages from ordinary phone numbers
      const res = ingest(bank.map((m) => ({ body: m.body, date: m.date })));
      await AsyncStorage.setItem(syncKey, String(started));
      setLastSync(started);
      return res;
    } finally {
      running.current = false;
      setBusy(false);
    }
  }, [supported, syncKey, ingest]);

  const setEnabled: Ctx['setEnabled'] = async (on) => {
    if (on && !(await requestPermission())) return 'denied';
    setEnabledState(on);
    await AsyncStorage.setItem(autoKey, on ? '1' : '0');
    if (on) syncNow().catch(() => {});
    return 'ok';
  };

  useEffect(() => {
    if (!user) return;
    AsyncStorage.getItem(autoKey).then((v) => setEnabledState(v === '1')).catch(() => {});
    AsyncStorage.getItem(syncKey).then((v) => setLastSync(v ? Number(v) : null)).catch(() => {});
  }, [user, autoKey, syncKey]);

  // Android: pick up new bank SMS whenever the app is opened / returns to the foreground.
  useEffect(() => {
    if (!supported || !enabled || !loaded) return;
    syncNow().catch(() => {});
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') syncNow().catch(() => {}); });
    return () => sub.remove();
  }, [supported, enabled, loaded, syncNow]);

  // iOS Shortcuts automation (and any mywallet://import?text=… link) feeds messages in here.
  useEffect(() => (loaded ? attachInbound((text) => { ingest([{ body: text }]); }) : undefined), [loaded, ingest]);

  return <SmsContext.Provider value={{ supported, enabled, setEnabled, syncNow, busy, lastSync }}>{children}</SmsContext.Provider>;
}
export const useSms = () => useContext(SmsContext);
