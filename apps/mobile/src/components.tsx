import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
export const colors = {
  ink: '#182531',
  muted: '#65716d',
  green: '#174c3c',
  background: '#f5f6f2',
  border: '#dce3dc',
};
export function Action({
  title,
  onPress,
  disabled = false,
  secondary = false,
  destructive = false,
  label,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  destructive?: boolean;
  label?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        destructive && styles.destructive,
        { opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
      ]}
    >
      <Text style={[styles.buttonText, secondary && { color: colors.ink }]}>{title}</Text>
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#8a938c"
        style={[styles.input, props.multiline && styles.multiline]}
        {...props}
      />
    </View>
  );
}
export function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.green} />
      <Text style={styles.muted}>Loading your workspace…</Text>
    </View>
  );
}
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 22, paddingBottom: 45, width: '100%', maxWidth: 750, alignSelf: 'center' },
  brand: { fontSize: 19, fontWeight: '700', color: colors.green, marginBottom: 36 },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '700',
    color: colors.green,
    marginBottom: 12,
  },
  title: {
    fontSize: 38,
    letterSpacing: -1.2,
    fontWeight: '700',
    color: colors.ink,
    lineHeight: 44,
    marginBottom: 14,
  },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 24, marginBottom: 28 },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: { fontSize: 18, fontWeight: '600', color: colors.ink, marginBottom: 18 },
  field: { marginBottom: 18, gap: 8 },
  label: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9,
    paddingHorizontal: 13,
    height: 48,
    color: colors.ink,
    fontSize: 16,
  },
  multiline: { height: 105, paddingTop: 13, textAlignVertical: 'top' },
  button: {
    backgroundColor: colors.green,
    borderRadius: 9,
    minHeight: 46,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  secondary: { backgroundColor: '#eef2ed' },
  destructive: { backgroundColor: '#be3547' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 21 },
  error: {
    backgroundColor: '#fff0f2',
    color: '#932b3c',
    borderRadius: 8,
    padding: 13,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 18,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  projectTitle: { fontSize: 17, fontWeight: '600', color: colors.ink, marginBottom: 8 },
  description: { color: colors.muted, lineHeight: 22, marginBottom: 13 },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.background,
  },
  empty: { textAlign: 'center', color: colors.muted, lineHeight: 24, paddingVertical: 25 },
});
