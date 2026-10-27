import { Linking } from 'react-native';

/**
 * Extracts the message text from  flusi://import?text=<url-encoded SMS>
 * This is the entry point used by an iOS Shortcuts "Message" automation (iOS gives apps no SMS access).
 */
export function parseImportUrl(url: string): string | null {
  const m = url.match(/^[a-z][a-z0-9+.-]*:\/\/import\/?\?(.*)$/i);
  if (!m) return null;
  for (const part of m[1].split('&')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i) === 'text') {
      try {
        return decodeURIComponent(part.slice(i + 1).replace(/\+/g, ' '));
      } catch {
        return null;
      }
    }
  }
  return null;
}

// Links can arrive before sign-in finishes; hold them until a listener (the signed-in app) attaches.
const queue: string[] = [];
let listener: ((text: string) => void) | null = null;

function handle(url: string | null | undefined) {
  const text = url ? parseImportUrl(url) : null;
  if (!text) return;
  if (listener) listener(text);
  else queue.push(text);
}

export function attachInbound(l: (text: string) => void): () => void {
  listener = l;
  queue.splice(0).forEach(l);
  return () => { if (listener === l) listener = null; };
}

export function startLinkListener(): () => void {
  Linking.getInitialURL().then(handle).catch(() => {});
  const sub = Linking.addEventListener('url', (e) => handle(e.url));
  return () => sub.remove();
}
