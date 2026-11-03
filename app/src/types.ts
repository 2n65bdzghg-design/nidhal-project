export type Lang = 'en' | 'ar';
export type ThemeMode = 'system' | 'light' | 'dark';
export type TxType = 'expense' | 'income';

export interface Account {
  id: string;
  name: string;
  bank: string;
  last4: string;
  currency: string;
  openingBalance: number;
}

export interface Transaction {
  id: string;
  accountId: string;
  type: TxType;
  amount: number;
  category: string;
  merchant: string;
  note: string;
  date: string; // ISO string
  source: 'manual' | 'sms';
  raw?: string;
}

export interface Budget {
  /** currency the budget is measured in; only accounts in this currency count. '' = first account's currency */
  currency: string;
  /** monthly spending limit per expense category id (operating budget) */
  limits: Record<string, number>;
  /** monthly amount to put into investments (investment budget) */
  investment: number;
  /** notify when a category reaches 80% / 100% of its limit */
  alerts: boolean;
  /** weekly reminder to review the budget */
  weekly: boolean;
  /** "<month>:<category>:<level>" keys already notified, so each alert fires once */
  notified: string[];
}

export const EMPTY_BUDGET: Budget = { currency: '', limits: {}, investment: 0, alerts: false, weekly: false, notified: [] };

export interface User {
  id: string;
  name: string;
  email: string;
}

import type { ParsedMessage } from './utils/smsParser';
/** A message that was read automatically but could not be assigned to an account yet. */
export type PendingItem = ParsedMessage & { id: string };
