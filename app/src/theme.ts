export interface Palette {
  bg: string; card: string; text: string; muted: string; border: string;
  primary: string; onPrimary: string; danger: string; success: string; input: string;
}
export const light: Palette = {
  bg: '#F0F7F6', card: '#FFFFFF', text: '#111827', muted: '#6B7280', border: '#E5E7EB',
  primary: '#0D9488', onPrimary: '#FFFFFF', danger: '#DC2626', success: '#16A34A', input: '#F9FAFB',
};
export const dark: Palette = {
  bg: '#08121A', card: '#101C26', text: '#F3F4F6', muted: '#9CA3AF', border: '#1F3340',
  primary: '#2DD4BF', onPrimary: '#042F2E', danger: '#F87171', success: '#4ADE80', input: '#142431',
};
