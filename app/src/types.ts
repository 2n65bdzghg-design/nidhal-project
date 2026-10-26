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

export interface User {
  id: string;
  name: string;
  email: string;
}
