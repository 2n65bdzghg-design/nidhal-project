import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Account, Budget, EMPTY_BUDGET, PendingItem, Transaction } from '../types';
import { looksLikeTransaction, parseBankMessage } from '../utils/smsParser';
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
  pending: PendingItem[];
  budget: Budget;
  setBudget: (patch: Partial<Budget>) => void;
  /** Parse raw bank messages; save the ones matching a card (or the only account), queue the rest for review. */
  ingest: (messages: { body: string; date?: number }[]) => { saved: number; queued: number };
  resolvePending: (id: string, accountId: string | null) => void;
}
const DataContext = createContext<Ctx>(null as unknown as Ctx);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [budget, setBudgetState] = useState<Budget>(EMPTY_BUDGET);
  const [loaded, setLoaded] = useState(false);
  const txRef = useRef<Transaction[]>([]);
  const pendingRef = useRef<PendingItem[]>([]);
  const accRef = useRef<Account[]>([]);
  txRef.current = transactions; pendingRef.current = pending; accRef.current = accounts;
  const key = user ? `data.v1.${user.id}` : null;
  const loadedKey = useRef<string | null>(null);

  useEffect(() => {
    setLoaded(false);
    loadedKey.current = null;
    if (!key) { setAccounts([]); setTransactions([]); setPending([]); setBudgetState(EMPTY_BUDGET); return; }
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(key);
        const d = raw ? JSON.parse(raw) : { accounts: [], transactions: [] };
        setAccounts(d.accounts ?? []);
        setTransactions(d.transactions ?? []);
        setPending(d.pending ?? []);
        setBudgetState({ ...EMPTY_BUDGET, ...(d.budget ?? {}) });
      } catch {}
      loadedKey.current = key;
      setLoaded(true);
    })();
  }, [key]);

  // persist after every change, but only once the user's data has been loaded (never overwrite with empty state)
  useEffect(() => {
    if (key && loadedKey.current === key) {
      AsyncStorage.setItem(key, JSON.stringify({ accounts, transactions, pending, budget })).catch(() => {});
    }
  }, [accounts, transactions, pending, budget, key]);

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

  const ingest: Ctx['ingest'] = useCallback((messages) => {
    const seen = new Set<string>();
    txRef.current.forEach((x) => x.raw && seen.add(x.raw));
    pendingRef.current.forEach((x) => seen.add(x.raw));
    const toSave: Omit<Transaction, 'id'>[] = [];
    const toQueue: PendingItem[] = [];
    for (const m of messages) {
      const raw = m.body.trim();
      if (!raw || seen.has(raw) || !looksLikeTransaction(raw)) continue;
      const p = parseBankMessage(raw, m.date ? new Date(m.date) : new Date());
      if (!p) continue;
      seen.add(raw);
      const accs = accRef.current;
      const acc = (p.last4 && accs.find((a) => a.last4 === p.last4)) || (accs.length === 1 ? accs[0] : undefined);
      if (acc) {
        toSave.push({ accountId: acc.id, type: p.type, amount: p.amount, category: p.category, merchant: p.merchant, note: '', date: p.date, source: 'sms', raw });
      } else {
        toQueue.push({ ...p, id: uid() });
      }
    }
    if (toSave.length) {
      const withIds = toSave.map((t) => ({ ...t, id: uid() }));
      txRef.current = [...withIds, ...txRef.current];
      setTransactions(txRef.current);
    }
    if (toQueue.length) {
      pendingRef.current = [...toQueue, ...pendingRef.current];
      setPending(pendingRef.current);
    }
    return { saved: toSave.length, queued: toQueue.length };
  }, []);

  const resolvePending = useCallback((id: string, accountId: string | null) => {
    const item = pendingRef.current.find((x) => x.id === id);
    pendingRef.current = pendingRef.current.filter((x) => x.id !== id);
    setPending(pendingRef.current);
    if (item && accountId) {
      const t = { id: uid(), accountId, type: item.type, amount: item.amount, category: item.category, merchant: item.merchant, note: '', date: item.date, source: 'sms' as const, raw: item.raw };
      txRef.current = [t, ...txRef.current];
      setTransactions(txRef.current);
    }
  }, []);

  const setBudget = useCallback((patch: Partial<Budget>) => setBudgetState((b) => ({ ...b, ...patch })), []);

  const value = useMemo<Ctx>(() => ({
    budget, setBudget, pending, ingest, resolvePending,
    accounts, transactions, loaded, saveAccount, deleteAccount, saveTransaction, addTransactions, deleteTransaction,
    accountBalance: (id) => {
      const a = accounts.find((x) => x.id === id);
      if (!a) return 0;
      return transactions.filter((t) => t.accountId === id)
        .reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), a.openingBalance);
    },
  }), [accounts, transactions, pending, budget, setBudget, ingest, resolvePending, loaded, saveAccount, deleteAccount, saveTransaction, addTransactions, deleteTransaction]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
export const useData = () => useContext(DataContext);
