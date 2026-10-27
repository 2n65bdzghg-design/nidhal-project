import { requireOptionalNativeModule } from 'expo';

export interface InboxSms {
  address: string;
  body: string;
  date: number; // epoch millis
}

interface Native {
  readInbox(sinceMs: number, limit: number): Promise<InboxSms[]>;
}

/** null on iOS, in Expo Go, or in any build that doesn't include the native module. */
export default requireOptionalNativeModule<Native>('SmsInbox');
