package expo.modules.smsinbox

import android.net.Uri
import android.provider.Telephony
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Reads the device SMS inbox. The READ_SMS runtime permission must already be granted (requested from JS). */
class SmsInboxModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SmsInbox")

    // Returns inbox messages newer than `sinceMs` (epoch millis), newest first, at most `limit`.
    AsyncFunction("readInbox") { sinceMs: Double, limit: Int ->
      val context = appContext.reactContext ?: throw CodedException("E_NO_CONTEXT", "No Android context", null)
      val out = mutableListOf<Map<String, Any>>()
      try {
        context.contentResolver.query(
          Telephony.Sms.Inbox.CONTENT_URI,
          arrayOf(Telephony.Sms.ADDRESS, Telephony.Sms.BODY, Telephony.Sms.DATE),
          "${Telephony.Sms.DATE} > ?",
          arrayOf(sinceMs.toLong().toString()),
          "${Telephony.Sms.DATE} DESC"
        )?.use { c ->
          val a = c.getColumnIndexOrThrow(Telephony.Sms.ADDRESS)
          val b = c.getColumnIndexOrThrow(Telephony.Sms.BODY)
          val d = c.getColumnIndexOrThrow(Telephony.Sms.DATE)
          while (c.moveToNext() && out.size < limit) {
            out.add(mapOf(
              "address" to (c.getString(a) ?: ""),
              "body" to (c.getString(b) ?: ""),
              "date" to c.getLong(d).toDouble()
            ))
          }
        }
      } catch (e: SecurityException) {
        throw CodedException("E_PERMISSION", "READ_SMS permission not granted", e)
      }
      out
    }
  }
}
