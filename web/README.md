# Nidhal Wallet (web)

Static web app (no build, no server): open `index.html` or serve the folder (`python3 -m http.server`).

- Sign in / create account / sign out (PBKDF2-hashed password, data stored per user in the browser)
- Reads Omani bank SMS / app notifications (English + Arabic; OMR/RO, Bank Muscat, NBO, Sohar Intl, BankDhofar, OAB, Ahli, Nizwa, Alizz, HSBC…) via paste or file upload (incl. "SMS Backup & Restore" XML). OTP/promo messages are ignored.
- 217 built-in Omani merchants (hypermarkets, restaurants, fuel, telecom, utilities, malls, hospitals, airlines, MSX brokers…); corrections are remembered.
- Dashboard with percentages, operating / investment / savings budgets, bills & budget reminders, rule-based financial advice, yearly history, CSV and JSON export.

Tests: `node test.js` (parser). Limit: a website cannot read a phone inbox automatically; use paste/upload, or the native app in `../app` for automatic SMS on Android.

## Automatic capture
Host the `web/` folder over HTTPS (a workflow in `.github/workflows/pages.yml` deploys it to GitHub Pages after merge to `main`; enable Pages → Source: GitHub Actions). In **Add messages** the app shows your private link `…/?k=<key>&sms=<encoded message>`:
- iPhone Shortcuts "Message" automation / Android MacroDroid or Tasker "SMS received" → open that link → the transaction is saved without review (only with your key; links without it go to the review queue).
- Android: install the web app, then Share an SMS to it.
- "Import from clipboard" saves whatever you just copied in one tap.
