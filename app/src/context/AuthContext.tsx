import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { uid } from '../utils/format';

interface Ctx {
  user: User | null;
  loading: boolean;
  signUp: (name: string, email: string, password: string) => Promise<'ok' | 'emailTaken'>;
  signIn: (email: string, password: string) => Promise<'ok' | 'invalidCredentials'>;
  signOut: () => Promise<void>;
}
const AuthContext = createContext<Ctx>(null as unknown as Ctx);
const SESSION = 'session.v1';

interface Stored extends User { salt: string; hash: string }

const sha = (s: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, s);
async function derive(password: string, salt: string): Promise<string> {
  let h = await sha(salt + password);
  for (let i = 0; i < 2000; i++) h = await sha(h + salt);
  return h;
}
// SecureStore keys may only contain [A-Za-z0-9._-]
const userKey = async (email: string) => 'user.' + (await sha(email.trim().toLowerCase())).slice(0, 40);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const s = await AsyncStorage.getItem(SESSION);
        if (s) setUser(JSON.parse(s));
      } catch {}
      setLoading(false);
    })();
  }, []);

  const start = async (u: User) => {
    setUser(u);
    await AsyncStorage.setItem(SESSION, JSON.stringify(u));
  };

  const signUp: Ctx['signUp'] = async (name, email, password) => {
    const key = await userKey(email);
    if (await SecureStore.getItemAsync(key)) return 'emailTaken';
    const salt = uid() + uid();
    const rec: Stored = { id: uid(), name: name.trim(), email: email.trim().toLowerCase(), salt, hash: await derive(password, salt) };
    await SecureStore.setItemAsync(key, JSON.stringify(rec));
    await start({ id: rec.id, name: rec.name, email: rec.email });
    return 'ok';
  };

  const signIn: Ctx['signIn'] = async (email, password) => {
    const raw = await SecureStore.getItemAsync(await userKey(email));
    if (!raw) return 'invalidCredentials';
    const rec: Stored = JSON.parse(raw);
    if ((await derive(password, rec.salt)) !== rec.hash) return 'invalidCredentials';
    await start({ id: rec.id, name: rec.name, email: rec.email });
    return 'ok';
  };

  const signOut = async () => {
    setUser(null);
    await AsyncStorage.removeItem(SESSION);
  };

  return <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
