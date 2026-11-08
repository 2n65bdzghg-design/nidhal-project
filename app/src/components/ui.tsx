import React, { useContext } from 'react';
import { HeaderHeightContext } from '@react-navigation/elements';
import { useNavigation } from '@react-navigation/native';
import { Pressable, ScrollView, StyleProp, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '../context/SettingsContext';

export function Screen({ children, scroll = true, padded = true }: { children: React.ReactNode; scroll?: boolean; padded?: boolean }) {
  const { colors } = useSettings();
  // a visible navigation header already clears the top safe area
  const hasHeader = useContext(HeaderHeightContext) !== undefined;
  const pad = padded ? { padding: 16, gap: 14 } : undefined;
  return (
    <SafeAreaView edges={hasHeader ? ['left', 'right'] : ['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.bg }}>
      {scroll ? (
        <ScrollView contentContainerStyle={pad} keyboardShouldPersistTaps="handled">{children}</ScrollView>
      ) : (
        <View style={[{ flex: 1 }, pad]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useSettings();
  return (
    <View style={[{ backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 10 }, style]}>
      {children}
    </View>
  );
}

export function T({ children, size = 15, bold, muted, color, style, numberOfLines }: {
  children: React.ReactNode; size?: number; bold?: boolean; muted?: boolean; color?: string; style?: StyleProp<any>; numberOfLines?: number;
}) {
  const { colors, align, isRTL } = useSettings();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[{ fontSize: size, fontWeight: bold ? '700' : '400', color: color ?? (muted ? colors.muted : colors.text), textAlign: align, writingDirection: isRTL ? 'rtl' : 'ltr' }, style]}
    >
      {children}
    </Text>
  );
}

export function Button({ title, onPress, kind = 'primary', disabled, style }: {
  title: string; onPress: () => void; kind?: 'primary' | 'ghost' | 'danger'; disabled?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useSettings();
  const bg = kind === 'primary' ? colors.primary : kind === 'danger' ? colors.danger : 'transparent';
  const fg = kind === 'ghost' ? colors.primary : kind === 'danger' ? '#fff' : colors.onPrimary;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        { backgroundColor: bg, paddingVertical: 13, paddingHorizontal: 18, borderRadius: 12, alignItems: 'center', opacity: disabled ? 0.5 : pressed ? 0.8 : 1, borderWidth: kind === 'ghost' ? 1 : 0, borderColor: colors.border },
        style,
      ]}
    >
      <Text style={{ color: fg, fontWeight: '700', fontSize: 16 }}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const { colors, align, isRTL } = useSettings();
  return (
    <View style={{ gap: 6 }}>
      <T size={13} muted bold>{label}</T>
      <TextInput
        placeholderTextColor={colors.muted}
        {...props}
        style={[{ backgroundColor: colors.input, color: colors.text, borderColor: colors.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, textAlign: align, writingDirection: isRTL ? 'rtl' : 'ltr' }, props.multiline && { minHeight: 90, textAlignVertical: 'top' }, props.style]}
      />
    </View>
  );
}

export function Chip({ label, active, onPress, color }: { label: string; active: boolean; onPress: () => void; color?: string }) {
  const { colors } = useSettings();
  const tint = color ?? colors.primary;
  return (
    <Pressable
      onPress={onPress}
      style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: active ? tint : colors.border, backgroundColor: active ? tint : colors.card }}
    >
      <Text style={{ color: active ? '#fff' : colors.text, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

export function Segmented<V extends string>({ value, options, onChange }: { value: V; options: { value: V; label: string }[]; onChange: (v: V) => void }) {
  const { colors, row } = useSettings();
  return (
    <View style={{ flexDirection: row, backgroundColor: colors.input, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: colors.border }}>
      {options.map((o) => (
        <Pressable key={o.value} onPress={() => onChange(o.value)} style={{ flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center', backgroundColor: o.value === value ? colors.primary : 'transparent' }}>
          <Text style={{ color: o.value === value ? colors.onPrimary : colors.text, fontWeight: '600' }}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Wrap({ children }: { children: React.ReactNode }) {
  const { row } = useSettings();
  return <View style={{ flexDirection: row, flexWrap: 'wrap', gap: 8 }}>{children}</View>;
}

export function Credit() {
  return <T size={11} muted style={{ textAlign: 'center', marginTop: 8 }}>Nidhal Alazkawi</T>;
}

/** Visible way back from the screens that live under "More". The bottom tab bar stays available too. */
export function BackBar({ to = 'More' }: { to?: string }) {
  const { t, colors, row, lang } = useSettings();
  const nav = useNavigation<any>();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => nav.navigate(to)}
      hitSlop={10}
      style={{ flexDirection: row, alignItems: 'center', gap: 6, alignSelf: lang === 'ar' ? 'flex-end' : 'flex-start', paddingVertical: 4 }}
    >
      <Text style={{ color: colors.primary, fontSize: 26, lineHeight: 28 }}>{lang === 'ar' ? '›' : '‹'}</Text>
      <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>{t('tabMore')}</Text>
    </Pressable>
  );
}
