import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Account, Transaction } from '../types';
import { uid } from '../utils/format';
import { useAuth } from './AuthContext';

interface Ctx {
  accounts: Account[];
  transactions: Transaction[];
  loaded: boolean;
  saveAccount: (a: Omit<Account, 'id'> & { id?: string }) => void;
  deleteAccount: (id: string) => void;
  saveTransaction: (t: Omit<Transaction, 'id'> & { id?: string }) => void;
  addTransactions: (t: Omit<Transaction, 'id'>[]) => void;
  deleteTransaction: (id: string) => void;
  accountBalance: (id: string) => number;
}
const DataContext = createContext<Ctx>(null as unknown as Ctx);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loaded, setLoaded] = useState(false);
  const key = user ? `data.v1.${user.id}` : null;
  const loadedKey = useRef<string | null>(null);

  useEffect(() => {
    setLoaded(false);
    loadedKey.current = null;
    if (!key) { setAccounts([]); setTransactions([]); return; }
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(key);
        const d = raw ? JSON.parse(raw) : { accounts: [], transactions: [] };
        setAccounts(d.accounts ?? []);
        setTransactions(d.transactions ?? []);
      } catch {}
      loadedKey.current = key;
      setLoaded(true);
    })();
  }, [key]);

  // persist after every change, but only once the user's data has been loaded (never overwrite with empty state)
  useEffect(() => {
    if (key && loadedKey.current === key) {
      AsyncStorage.setItem(key, JSON.stringify({ accounts, transactions })).catch(() => {});
    }
  }, [accounts, transactions, key]);

  const saveAccount: Ctx['saveAccount'] = useCallback((a) => {
    setAccounts((prev) =>
      a.id ? prev.map((x) => (x.id === a.id ? ({ ...a, id: a.id } as Account) : x)) : [...prev, { ...a, id: uid() }],
    );
  }, []);
  const deleteAccount = useCallback((id: string) => {
    setAccounts((p) => p.filter((a) => a.id !== id));
    setTransactions((p) => p.filter((t) => t.accountId !== id));
  }, []);
  const saveTransaction: Ctx['saveTransaction'] = useCallback((t) => {
    setTransactions((prev) =>
      t.id ? prev.map((x) => (x.id === t.id ? ({ ...t, id: t.id } as Transaction) : x)) : [{ ...t, id: uid() }, ...prev],
    );
  }, []);
  const addTransactions = useCallback((list: Omit<Transaction, 'id'>[]) => {
    setTransactions((prev) => [...list.map((t) => ({ ...t, id: uid() })), ...prev]);
  }, []);
  const deleteTransaction = useCallback((id: string) => setTransactions((p) => p.filter((t) => t.id !== id)), []);

  const value = useMemo<Ctx>(() => ({
    accounts, transactions, loaded, saveAccount, deleteAccount, saveTransaction, addTransactions, deleteTransaction,
    accountBalance: (id) => {
      const a = accounts.find((x) => x.id === id);
      if (!a) return 0;
      return transactions.filter((t) => t.accountId === id)
        .reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), a.openingBalance);
    },
  }), [accounts, transactions, loaded, saveAccount, deleteAccount, saveTransaction, addTransactions, deleteTransaction]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
export const useData = () => useContext(DataContext);
