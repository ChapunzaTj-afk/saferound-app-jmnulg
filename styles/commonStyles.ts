
import { StyleSheet } from 'react-native';

export const colors = {
  // Primary colors
  primary: '#007AFF',
  secondary: '#5856D6',
  
  // Status colors
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  
  // Role colors
  organizer: '#FF6B6B',
  member: '#4ECDC4',
  
  // Background colors
  background: '#FFFFFF',
  backgroundAlt: '#F2F2F7',
  
  // Text colors
  text: '#000000',
  textSecondary: '#8E8E93',
  textLight: '#C7C7CC',
  
  // UI elements
  border: '#E5E5EA',
  highlight: '#F0F8FF',
  
  // Dark mode (for future use)
  backgroundDark: '#000000',
  backgroundAltDark: '#1C1C1E',
  textDark: '#FFFFFF',
  textSecondaryDark: '#8E8E93',
  borderDark: '#38383A',
};

export const commonStyles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  text: {
    fontSize: 16,
    color: colors.text,
  },
  textSecondary: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonSecondary: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  buttonTextSecondary: {
    color: colors.primary,
  },
  input: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
});
