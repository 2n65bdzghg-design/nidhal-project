import { parseBankMessage, parseMany, normalizeDigits } from '../src/utils/smsParser';

const now = new Date(2026, 9, 26, 10, 0);

describe('parseBankMessage', () => {
  it('parses an English POS purchase and ignores the balance', () => {
    const p = parseBankMessage(
      'Purchase of SAR 45.50 at STARBUCKS RIYADH using card ending 1234 on 12/10/2026 14:30. Available balance SAR 2,300.00',
      now,
    )!;
    expect(p.amount).toBe(45.5);
    expect(p.currency).toBe('SAR');
    expect(p.type).toBe('expense');
    expect(p.merchant.toLowerCase()).toContain('starbucks');
    expect(p.category).toBe('food');
    expect(p.last4).toBe('1234');
    expect(new Date(p.date).getDate()).toBe(12);
    expect(new Date(p.date).getMonth()).toBe(9);
  });

  it('parses an Arabic purchase with Arabic-Indic digits', () => {
    const p = parseBankMessage(
      'شراء عبر نقاط البيع بمبلغ ١٢٠٫٥٠ ريال لدى كارفور بطاقة مدى ٥٦٧٨ الرصيد ١٬٠٠٠ ريال',
      now,
    )!;
    expect(p.amount).toBe(120.5);
    expect(p.currency).toBe('SAR');
    expect(p.type).toBe('expense');
    expect(p.category).toBe('groceries');
    expect(p.last4).toBe('5678');
  });

  it('detects salary credit as income', () => {
    const p = parseBankMessage('Your account was credited with AED 12,000.00 salary from ACME LLC. Bal AED 15,000', now)!;
    expect(p.type).toBe('income');
    expect(p.amount).toBe(12000);
    expect(p.currency).toBe('AED');
    expect(p.category).toBe('salary');
  });

  it('detects Arabic deposit', () => {
    const p = parseBankMessage('تم إيداع مبلغ 500 ريال في حسابك', now)!;
    expect(p.type).toBe('income');
    expect(p.amount).toBe(500);
  });

  it('returns null without an amount', () => {
    expect(parseBankMessage('Your OTP is 123456', now)).toBeNull();
  });

  it('splits multiple messages on blank lines', () => {
    const r = parseMany('Paid USD 10 at Netflix\n\nhello there\n\nSpent $5.25 at Uber', now);
    expect(r.parsed).toHaveLength(2);
    expect(r.skipped).toBe(1);
    expect(r.parsed[0].category).toBe('entertainment');
    expect(r.parsed[1].category).toBe('transport');
  });
});

test('normalizeDigits', () => {
  expect(normalizeDigits('١٢٣٫٤٥')).toBe('123.45');
});

import { looksLikeTransaction } from '../src/utils/smsParser';
import { parseImportUrl } from '../src/utils/inbound';

describe('looksLikeTransaction', () => {
  it('accepts debits/credits, rejects OTPs and promos', () => {
    expect(looksLikeTransaction('Purchase of SAR 10 at X')).toBe(true);
    expect(looksLikeTransaction('تم إيداع مبلغ 500 ريال')).toBe(true);
    expect(looksLikeTransaction('OTP for purchase of SAR 50 is 123456')).toBe(false);
    expect(looksLikeTransaction('رمز التحقق لعملية شراء 50 ريال هو 1234')).toBe(false);
    expect(looksLikeTransaction('Win SAR 1000 now! Visit our branch')).toBe(false);
  });
});

describe('parseImportUrl', () => {
  it('decodes the text query param', () => {
    expect(parseImportUrl('mywallet://import?text=Paid%20SAR%2010%20at%20Uber')).toBe('Paid SAR 10 at Uber');
    expect(parseImportUrl('mywallet://import?x=1&text=a+b')).toBe('a b');
    expect(parseImportUrl('mywallet://other?text=a')).toBeNull();
  });
});
