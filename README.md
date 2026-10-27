# Flusi (فلوسي)

iOS + Android money tracker built with Expo / React Native (TypeScript).

- Sign up / sign in / sign out (credentials salted+hashed, kept in the device keychain/keystore)
- Record income & expenses with category, merchant ("what I paid for"), note, date
- Multiple accounts / cards (name, bank, last-4, currency, opening balance) with live balances
- **Bank message analysis**: paste bank SMS (English or Arabic, Arabic-Indic digits supported); the app extracts amount, currency, debit/credit, merchant, card last-4 (auto-matches your card), date, and a category
- Monthly dashboard with spending by category and per-account balances
- English / العربية (with RTL layout) and light / dark / system theme
- CSV export

## Run
```bash
cd app
npm install
npx expo start        # scan the QR code with Expo Go (iOS or Android)
npm test              # parser unit tests
```
Build store binaries with EAS: `npx eas-cli build -p ios` / `-p android`.

## Install on your phone
- **Android (installable APK, includes SMS reading):** `cd app && npm install && npx eas-cli login && npx eas-cli build -p android --profile preview` – EAS prints a link/QR to the finished `.apk`; open it on the phone and install.
- **iPhone:** quickest is Expo Go (`npx expo start`, scan the QR). A real installed iOS build needs a paid Apple Developer account: `npx eas-cli build -p ios --profile preview`.

## Automatic SMS reading
- **Android** – a local native module (`app/modules/sms-inbox`) reads the inbox. Turn it on in
  Settings → *Automatic SMS reading*. New bank messages are imported whenever the app opens; ones
  matching a card's last-4 (or when you have a single account) are saved, the rest wait in
  *Import → Needs your review*. It needs a **development/release build**, not Expo Go:
  `cd app && npx expo run:android` (or `npx eas-cli build -p android --profile development`).
  Google Play only allows `READ_SMS` for apps that apply for and are granted an exception, so this
  is meant for sideloaded / personal builds.
- **iPhone** – Apple gives apps no SMS access at all. Instead, a Shortcuts *Message* automation
  (sender = your bank, "Run Immediately") runs *URL Encode* → *Open URLs*
  `flusi://import?text=<encoded text>`, which hands the message to the app. Steps are also shown in Settings.

## Notes / limits
- Data is **local to the device** (no server). Signing out keeps data; uninstalling removes it.
