import { guessCategory } from './categories';
import { TxType } from '../types';

export interface ParsedMessage {
  amount: number;
  currency: string;
  type: TxType;
  merchant: string;
  category: string;
  last4: string;
  date: string; // ISO
  raw: string;
}

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

export function normalizeDigits(s: string): string {
  return s
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/٫/g, '.')
    .replace(/[٬،](?=\d{3})/g, ',');
}

const CURRENCIES: [RegExp, string][] = [
  [/\bSAR\b|\bSR\b|ر\.?\s?س|ريال/i, 'SAR'],
  [/\bAED\b|د\.?\s?إ|درهم/i, 'AED'],
  [/\bEGP\b|ج\.?\s?م|جنيه/i, 'EGP'],
  [/\bKWD\b|د\.?\s?ك|دينار كويتي/i, 'KWD'],
  [/\bQAR\b|ر\.?\s?ق/i, 'QAR'],
  [/\bBHD\b|د\.?\s?ب/i, 'BHD'],
  [/\bOMR\b|ر\.?\s?ع/i, 'OMR'],
  [/\bJOD\b|د\.?\s?أ|دينار أردني/i, 'JOD'],
  [/\bUSD\b|\$/i, 'USD'],
  [/\bEUR\b|€/i, 'EUR'],
  [/\bGBP\b|£/i, 'GBP'],
];
const CUR_SRC = CURRENCIES.map(([r]) => r.source).join('|');
const NUM = '(\\d{1,3}(?:,\\d{3})+(?:\\.\\d+)?|\\d+(?:\\.\\d+)?)';

const DEBIT_WORDS = /purchase|paid|payment|spent|debited?|withdraw(?:n|al)?|charged|pos\b|sent|transfer(?:red)? to|شراء|مشتريات|سحب|خصم|دفع|سداد|حوالة صادرة|تحويل صادر|صرف/i;
const CREDIT_WORDS = /credited?|received|deposit(?:ed)?|salary|refund|reversal|حوالة واردة|إيداع|ايداع|استلام|راتب|استرداد|استرجاع|إضافة|اضافة|تم تحويل مبلغ إلى حسابك/i;

const OTP_WORDS = /\botp\b|one[- ]time|verification code|passcode|رمز التحقق|رمز التفعيل|كلمة المرور المؤقتة|رمز سري/i;

/** True for messages that report a completed debit/credit (not OTPs, promos or chat). */
export function looksLikeTransaction(message: string): boolean {
  const text = normalizeDigits(message);
  if (OTP_WORDS.test(text)) return false;
  return DEBIT_WORDS.test(text) || CREDIT_WORDS.test(text);
}

const BALANCE_RE = new RegExp(
  `(?:available\\s+)?(?:balance|bal\\.?|avl|الرصيد(?: المتاح)?|رصيدك(?: المتاح)?|رصيد)\\s*(?:is|:|=|هو)?\\s*(?:${CUR_SRC})?\\s*${NUM}\\s*(?:${CUR_SRC})?`,
  'ig',
);

function detectCurrency(text: string): string {
  for (const [re, code] of CURRENCIES) if (re.test(text)) return code;
  return '';
}

function findAmount(text: string): number | null {
  const withoutBalance = text.replace(BALANCE_RE, ' ');
  const patterns = [
    new RegExp(`(?:${CUR_SRC})\\s*${NUM}`, 'i'),
    new RegExp(`${NUM}\\s*(?:${CUR_SRC})`, 'i'),
    new RegExp(`(?:amount|amt|بمبلغ|مبلغ|قيمة)\\s*(?:of|:)?\\s*${NUM}`, 'i'),
  ];
  for (const p of patterns) {
    const m = withoutBalance.match(p);
    if (m) {
      const v = parseFloat(m[1].replace(/,/g, ''));
      if (isFinite(v) && v > 0) return v;
    }
  }
  return null;
}

function findType(text: string): TxType {
  const d = text.search(DEBIT_WORDS);
  const c = text.search(CREDIT_WORDS);
  if (c !== -1 && (d === -1 || c < d)) return 'income';
  return 'expense';
}

const STOP = '(?=\\s+(?:on|at|using|with|via|card|ending|avail|available|bal|balance|ref|date|from|in|for|في|بتاريخ|بطاقة|البطاقة|مدى|رصيد|الرصيد|عبر|باستخدام|مرجع)\\b|\\s*\\d{1,2}[\\/\\-.]\\d{1,2}|\\s*[.,،;\\n]|\\s+\\d|$)';
const NAME = "([\\p{L}\\p{N} &'’._*-]{2,40}?)";

function findMerchant(text: string, type: TxType): string {
  const patterns =
    type === 'expense'
      ? [
          new RegExp(`(?:merchant|store|shop)\\s*:\\s*${NAME}${STOP}`, 'iu'),
          new RegExp(`(?:\\bat|@|\\bto)\\s+${NAME}${STOP}`, 'iu'),
          new RegExp(`(?:لدى|عند|إلى|الى|لـ)\\s*:?\\s*${NAME}${STOP}`, 'iu'),
        ]
      : [
          new RegExp(`(?:\\bfrom)\\s+${NAME}${STOP}`, 'iu'),
          new RegExp(`(?:من)\\s*:?\\s*${NAME}${STOP}`, 'iu'),
        ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const name = m[1].trim().replace(/[*.\-_]+$/, '');
      if (name.length >= 2 && !/^\d+$/.test(name) && !/^(?:your|account|حسابك|حساب)/i.test(name)) return name;
    }
  }
  return '';
}

function findLast4(text: string): string {
  const m = text.match(
    /(?:\*{2,}|[xX]{2,}|ending(?:\s+in|\s+with)?|card(?:\s+(?:no\.?|number))?|بطاقة(?:\s+رقم)?|البطاقة|مدى|فيزا|ماستر(?:كارد)?)\s*[^\d\n]{0,10}(\d{4})\b/i,
  );
  return m ? m[1] : '';
}

function findDate(text: string, now: Date): string {
  let m = text.match(/\b(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})\b/);
  let y: number, mo: number, d: number;
  if (m) {
    [y, mo, d] = [+m[1], +m[2], +m[3]];
  } else if ((m = text.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/))) {
    [d, mo, y] = [+m[1], +m[2], +m[3]];
    if (y < 100) y += 2000;
  } else {
    return now.toISOString();
  }
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return now.toISOString();
  const t = text.match(/\b(\d{1,2}):(\d{2})(?::\d{2})?\b/);
  const dt = new Date(y, mo - 1, d, t ? +t[1] : 12, t ? +t[2] : 0);
  return isNaN(dt.getTime()) ? now.toISOString() : dt.toISOString();
}

/** Parse one bank SMS / notification. Returns null when no amount can be found. */
export function parseBankMessage(message: string, now: Date = new Date()): ParsedMessage | null {
  const raw = message.trim();
  if (!raw) return null;
  const text = normalizeDigits(raw);
  const amount = findAmount(text);
  if (amount === null) return null;
  const type = findType(text);
  const merchant = findMerchant(text, type);
  return {
    amount,
    currency: detectCurrency(text),
    type,
    merchant,
    category: guessCategory(`${merchant} ${text}`, type === 'income'),
    last4: findLast4(text),
    date: findDate(text, now),
    raw,
  };
}

/** Split pasted text into separate messages (blank-line separated) and parse each. */
export function parseMany(input: string, now: Date = new Date()): { parsed: ParsedMessage[]; skipped: number } {
  const chunks = input
    .split(/\n\s*\n/)
    .map((c) => c.trim())
    .filter(Boolean);
  const parsed: ParsedMessage[] = [];
  let skipped = 0;
  for (const c of chunks) {
    const p = parseBankMessage(c, now);
    if (p) parsed.push(p);
    else skipped++;
  }
  return { parsed, skipped };
}
