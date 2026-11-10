const assert = require('assert');
const O = require('./oman.js');
const now = new Date(2026, 10, 10, 9, 0);
const cases = [
  ['Bank Muscat: Your Debit Card ending 1234 was used for OMR 5.500 at LULU HYPERMARKET MUSCAT on 10/11/2026 12:30. Avl Bal OMR 120.500', { amount: 5.5, type: 'expense', category: 'groceries', merchant: 'Lulu Hypermarket', last4: '1234', balance: 120.5, bank: 'Bank Muscat' }],
  ['NBO: Purchase of OMR 3.200 at STARBUCKS QURUM with card ending 5678 on 09-NOV-26. Bal: OMR 400.000', { amount: 3.2, category: 'food', merchant: 'Starbucks', last4: '5678' }],
  ['OMR 600.000 has been credited to your a/c XXXX4321 - SALARY NOV. Available balance OMR 1,250.750', { amount: 600, type: 'income', category: 'salary', last4: '4321', balance: 1250.75 }],
  ['RO 12.300 debited from your account **1234 at SHELL SEEB on 08/11/2026', { amount: 12.3, category: 'fuel', merchant: 'Shell' }],
  ['تم خصم مبلغ ٥٫٥٠٠ ر.ع من بطاقتك المنتهية بـ ١٢٣٤ لدى كارفور', { amount: 5.5, type: 'expense', last4: '1234' }],
  ['Sohar International: OMR 25.000 withdrawn at ATM RUWI on 07/11/2026', { amount: 25, category: 'cash' }],
  ['Your OTP is 123456. Do not share. OMR 5.000 payment at Amazon', null],
  ['Ooredoo bill payment of OMR 8.000 on 05/11/2026 successful', { amount: 8, category: 'bills' }],
  ['Purchase USD 20.00 at NETFLIX.COM on card ending 1111', { currency: 'USD', category: 'entertain' }],
  ['Win a free gift! Get 20% discount on your next loan', null],
  ['OMR 150.000 transferred to MOHAMMED ALI via Mobile Payment', { amount: 150, category: 'transfer' }],
  ['OMR 50.000 purchase at AL MAHA PETROLEUM SOHAR using card ending 9999', { category: 'fuel' }],
  ['OMR 70.000 paid to MUSCAT SECURITIES for investment', { category: 'investment' }],
];
let ok = 0;
for (const [msg, exp] of cases) {
  const r = O.parseMessage(msg, now);
  if (exp === null) { assert.strictEqual(r, null, msg); ok++; continue; }
  assert.ok(r, 'no parse: ' + msg);
  for (const k of Object.keys(exp)) assert.strictEqual(r[k], exp[k], `${k} in "${msg}" -> got ${JSON.stringify(r[k])} (${JSON.stringify(r)})`);
  ok++;
}
const many = O.parseMany('OMR 1.000 purchase at KFC\nOMR 2.000 purchase at Subway', now);
assert.strictEqual(many.parsed.length, 2);
console.log(`${ok}/${cases.length} parser cases passed, ${O.MERCHANTS.length} merchant entries`);
