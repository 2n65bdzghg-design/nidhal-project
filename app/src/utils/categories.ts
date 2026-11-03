export interface Category {
  id: string;
  icon: string;
  color: string;
  income?: boolean;
  /** lowercase keywords (English + Arabic) used to auto-categorise a merchant / message */
  keywords: string[];
}

export const CATEGORIES: Category[] = [
  { id: 'food', icon: '🍔', color: '#F59E0B', keywords: ['restaurant', 'cafe', 'coffee', 'starbucks', 'mcdonald', 'kfc', 'burger', 'pizza', 'albaik', 'hungerstation', 'jahez', 'talabat', 'مطعم', 'كافيه', 'قهوة', 'ستاربكس', 'البيك', 'هنقرستيشن', 'جاهز', 'طلبات', 'ماكدونالدز'] },
  { id: 'groceries', icon: '🛒', color: '#10B981', keywords: ['supermarket', 'grocery', 'carrefour', 'panda', 'lulu', 'danube', 'tamimi', 'othaim', 'hypermarket', 'بقالة', 'سوبرماركت', 'كارفور', 'بنده', 'لولو', 'الدانوب', 'التميمي', 'العثيم'] },
  { id: 'transport', icon: '🚕', color: '#3B82F6', keywords: ['uber', 'careem', 'taxi', 'metro', 'bus', 'parking', 'toll', 'bolt', 'اوبر', 'أوبر', 'كريم', 'تاكسي', 'مترو', 'موقف'] },
  { id: 'fuel', icon: '⛽', color: '#6366F1', keywords: ['fuel', 'petrol', 'gas station', 'aramco', 'adnoc', 'enoc', 'sasco', 'وقود', 'بنزين', 'محطة', 'ساسكو', 'أرامكو'] },
  { id: 'shopping', icon: '🛍️', color: '#EC4899', keywords: ['amazon', 'noon', 'ikea', 'zara', 'h&m', 'mall', 'shein', 'extra', 'jarir', 'namshi', 'أمازون', 'نون', 'ايكيا', 'زارا', 'مول', 'شي إن', 'اكسترا', 'جرير'] },
  { id: 'bills', icon: '💡', color: '#EF4444', keywords: ['electricity', 'water', 'stc', 'zain', 'mobily', 'etisalat', 'du ', 'internet', 'bill', 'sadad', 'utility', 'كهرباء', 'مياه', 'اتصالات', 'فاتورة', 'سداد', 'زين', 'موبايلي', 'انترنت'] },
  { id: 'health', icon: '💊', color: '#14B8A6', keywords: ['pharmacy', 'hospital', 'clinic', 'doctor', 'nahdi', 'dawaa', 'صيدلية', 'مستشفى', 'عيادة', 'النهدي', 'الدواء'] },
  { id: 'entertainment', icon: '🎬', color: '#8B5CF6', keywords: ['netflix', 'spotify', 'cinema', 'vox', 'shahid', 'playstation', 'steam', 'youtube', 'نتفلكس', 'سبوتيفاي', 'سينما', 'شاهد', 'بلايستيشن'] },
  { id: 'travel', icon: '✈️', color: '#0EA5E9', keywords: ['airline', 'airways', 'flydubai', 'flynas', 'hotel', 'booking', 'airbnb', 'saudia', 'طيران', 'فندق', 'الخطوط', 'حجز', 'فلاي'] },
  { id: 'education', icon: '🎓', color: '#A855F7', keywords: ['school', 'university', 'course', 'udemy', 'tuition', 'مدرسة', 'جامعة', 'دورة', 'رسوم دراسية'] },
  { id: 'investment', icon: '📈', color: '#0891B2', keywords: ['invest', 'brokerage', 'stocks', 'mutual fund', 'etf', 'sarwa', 'tadawul', 'binance', 'استثمار', 'أسهم', 'اسهم', 'صندوق', 'سروة', 'تداول'] },
  { id: 'transfer', icon: '🔁', color: '#64748B', keywords: ['transfer', 'sent to', 'iban', 'atm', 'cash withdrawal', 'withdrawal', 'حوالة', 'تحويل', 'سحب نقدي', 'صراف'] },
  { id: 'salary', icon: '💰', color: '#22C55E', income: true, keywords: ['salary', 'payroll', 'wage', 'راتب', 'الراتب'] },
  { id: 'otherIncome', icon: '📥', color: '#84CC16', income: true, keywords: ['refund', 'deposit', 'cashback', 'received', 'استرداد', 'إيداع', 'ايداع', 'استرجاع'] },
  { id: 'other', icon: '📦', color: '#94A3B8', keywords: [] },
];

export const categoryById = (id: string): Category =>
  CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];

export function guessCategory(text: string, isIncome: boolean): string {
  const hay = text.toLowerCase();
  const pool = CATEGORIES.filter((c) => !!c.income === isIncome && c.keywords.length);
  for (const c of pool) {
    if (c.keywords.some((k) => hay.includes(k))) return c.id;
  }
  // an "expense" message can still mention transfer/ATM words, and vice versa
  return isIncome ? 'otherIncome' : 'other';
}
