import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

/** Local (on-device) notifications. Every call is a safe no-op where notifications are unavailable, such as the web preview. */
export const notificationsAvailable = Platform.OS === 'android' || Platform.OS === 'ios';

let ready = false;
async function setup() {
  if (ready || !notificationsAvailable) return;
  ready = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('budget', {
      name: 'Budget',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!notificationsAvailable) return false;
  try {
    await setup();
    const cur = await Notifications.getPermissionsAsync();
    if (cur.granted) return true;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

export async function notifyNow(title: string, body: string): Promise<void> {
  if (!notificationsAvailable) return;
  try {
    await setup();
    if (!(await Notifications.getPermissionsAsync()).granted) return;
    await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null });
  } catch {}
}

const WEEKLY_ID = 'flusi-weekly-budget';

/** Every Sunday 09:00 local time. Re-scheduling replaces the previous one, so changing language updates the text. */
export async function setWeeklyReminder(on: boolean, title: string, body: string): Promise<void> {
  if (!notificationsAvailable) return;
  try {
    await setup();
    await Notifications.cancelScheduledNotificationAsync(WEEKLY_ID).catch(() => {});
    if (!on || !(await Notifications.getPermissionsAsync()).granted) return;
    await Notifications.scheduleNotificationAsync({
      identifier: WEEKLY_ID,
      content: { title, body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 1, hour: 9, minute: 0, channelId: 'budget' },
    });
  } catch {}
}
