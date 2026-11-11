export const colors = {
  primary: '#1E4FD8', // ParkEasy Blue
  primaryDark: '#163ea8',
  primaryLight: '#4d7cf0',
  secondary: '#0f172a',
  background: '#090d16', // Dark canvas
  surface: '#131b2e', // Card background
  surfaceLight: '#1e293b',
  border: '#334155',
  borderLight: '#475569',
  text: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  success: '#10b981', // Emerald green
  successLight: '#064e3b',
  error: '#ef4444', // Red
  errorLight: '#7f1d1d',
  warning: '#f59e0b',
  warningLight: '#78350f',
  info: '#06b6d4',
  slotAvailable: '#10b981',
  slotReserved: '#f59e0b',
  slotOccupied: '#ef4444',
  slotDisabled: '#475569',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: '700', color: colors.text },
  h2: { fontSize: 22, fontWeight: '600', color: colors.text },
  h3: { fontSize: 18, fontWeight: '600', color: colors.text },
  body: { fontSize: 15, color: colors.text },
  bodySecondary: { fontSize: 13, color: colors.textSecondary },
  caption: { fontSize: 12, color: colors.textMuted },
  button: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
};
