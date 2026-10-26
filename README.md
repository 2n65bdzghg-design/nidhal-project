# My Wallet (محفظتي)

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

## Notes / limits
- Data is **local to the device** (no server). Signing out keeps data; uninstalling removes it.
- iOS does not let any app read SMS, so import is paste-based on both platforms. Automatic
  Android SMS reading would need a native module (`READ_SMS`) and a dev build; the
  parser in `app/src/utils/smsParser.ts` is ready to be fed by it.
