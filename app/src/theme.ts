export interface Palette {
  bg: string; card: string; text: string; muted: string; border: string;
  primary: string; onPrimary: string; danger: string; success: string; input: string;
}
export const light: Palette = {
  bg: '#F1F5FB', card: '#FFFFFF', text: '#111827', muted: '#6B7280', border: '#E5E7EB',
  primary: '#2563EB', onPrimary: '#FFFFFF', danger: '#DC2626', success: '#16A34A', input: '#F9FAFB',
};
export const dark: Palette = {
  bg: '#0A1220', card: '#111B2D', text: '#F3F4F6', muted: '#9CA3AF', border: '#22304A',
  primary: '#60A5FA', onPrimary: '#0B1B3A', danger: '#F87171', success: '#4ADE80', input: '#16233A',
};
