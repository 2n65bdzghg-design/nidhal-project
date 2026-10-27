import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { I18nManager, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { Lang, ThemeMode } from '../types';
import { translate } from '../i18n';
import { dark, light, Palette } from '../theme';

interface Ctx {
  lang: Lang; setLang: (l: Lang) => void;
  mode: ThemeMode; setMode: (m: ThemeMode) => void;
  colors: Palette; isDark: boolean; isRTL: boolean;
  t: (key: string) => string;
  /** flexDirection for a horizontal row that must follow the app language, not the OS layout direction */
  row: 'row' | 'row-reverse';
  align: 'left' | 'right';
  ready: boolean;
}

const SettingsContext = createContext<Ctx>(null as unknown as Ctx);
const KEY = 'settings.v1';

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [lang, setLangState] = useState<Lang>('en');
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(KEY);
        if (saved) {
          const s = JSON.parse(saved);
          if (s.lang) setLangState(s.lang);
          if (s.mode) setModeState(s.mode);
        } else {
          const code = getLocales()[0]?.languageCode;
          if (code === 'ar') setLangState('ar');
        }
      } catch {}
      setReady(true);
    })();
  }, []);

  const persist = useCallback((l: Lang, m: ThemeMode) => {
    AsyncStorage.setItem(KEY, JSON.stringify({ lang: l, mode: m })).catch(() => {});
  }, []);
  const setLang = useCallback((l: Lang) => { setLangState(l); persist(l, mode); }, [mode, persist]);
  const setMode = useCallback((m: ThemeMode) => { setModeState(m); persist(lang, m); }, [lang, persist]);

  const value = useMemo<Ctx>(() => {
    const isDark = mode === 'system' ? system === 'dark' : mode === 'dark';
    const isRTL = lang === 'ar';
    // If the OS already flips layouts (Arabic device), a plain 'row' is already right-to-left.
    const flip = isRTL !== !!I18nManager.isRTL;
    return {
      lang, setLang, mode, setMode, isDark, isRTL, ready,
      colors: isDark ? dark : light,
      t: (key) => translate(lang, key),
      row: flip ? 'row-reverse' : 'row',
      align: isRTL ? 'right' : 'left',
    };
  }, [lang, mode, system, setLang, setMode, ready]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);
