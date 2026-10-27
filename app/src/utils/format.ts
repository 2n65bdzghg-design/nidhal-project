export const money = (n: number, currency = ''): string =>
  `${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${currency ? ' ' + currency : ''}`;

export const uid = (): string => Date.now().toString(36) + Math.random().toString(36).slice(2, 9);

export const isoDay = (iso: string): string => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export function parseDay(s: string): Date | null {
  const m = s.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3], 12, 0);
  return d.getMonth() === +m[2] - 1 && d.getDate() === +m[3] ? d : null;
}

export const monthKey = (iso: string): string => isoDay(iso).slice(0, 7);

export const csvEscape = (s: string): string => `"${s.replace(/"/g, '""')}"`;
