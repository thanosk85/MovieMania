import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type Props = {
  value: number | null;
  onChange?: (rating: number) => void;
  disabled?: boolean;
};

export function StarRating({ value, onChange, disabled }: Props) {
  const theme = useTheme();
  const filled = theme.accent;
  const empty = theme.textSecondary;

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Η βαθμολογία σου" style={styles.row}>
      {[1, 2, 3, 4, 5].map((n) => {
        const selected = value === n;
        return (
          <Pressable
            key={n}
            accessibilityRole="radio"
            accessibilityLabel={`${n} από 5 αστέρια`}
            accessibilityState={{ checked: selected, busy: disabled }}
            hitSlop={4}
            onPress={() => !disabled && onChange?.(n)}
            style={styles.star}>
            <Text importantForAccessibility="no" style={[styles.glyph, { color: value && n <= value ? filled : empty }]}>
              {value && n <= value ? '★' : '☆'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4, justifyContent: 'center' },
  star: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  glyph: { fontSize: 32 },
});
