export interface Palette {
  bg: string; card: string; text: string; muted: string; border: string;
  primary: string; onPrimary: string; danger: string; success: string; input: string;
}
export const light: Palette = {
  bg: '#F3F5F9', card: '#FFFFFF', text: '#111827', muted: '#6B7280', border: '#E5E7EB',
  primary: '#4F46E5', onPrimary: '#FFFFFF', danger: '#DC2626', success: '#16A34A', input: '#F9FAFB',
};
export const dark: Palette = {
  bg: '#0B1020', card: '#151B2E', text: '#F3F4F6', muted: '#9CA3AF', border: '#262E45',
  primary: '#818CF8', onPrimary: '#0B1020', danger: '#F87171', success: '#4ADE80', input: '#1B2238',
};
