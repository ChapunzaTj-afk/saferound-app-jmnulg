
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';

// SafeRound - Trust-first, calm, community-oriented color palette
export const colors = {
  // Primary colors - Soft, trustworthy blues and greens
  primary: '#4A90A4',      // Calm teal blue - trust and stability
  secondary: '#6B9080',    // Soft sage green - community and growth
  accent: '#A4C3B2',       // Light mint - calm and approachable
  
  // Backgrounds - Light and airy
  background: '#F8F9FA',   // Very light gray - clean and calm
  backgroundAlt: '#FFFFFF', // Pure white for cards
  
  // Text colors
  text: '#2C3E50',         // Dark blue-gray - readable but not harsh
  textSecondary: '#7F8C8D', // Medium gray - secondary information
  textLight: '#95A5A6',    // Light gray - subtle text
  
  // Status colors - Soft and non-alarming
  success: '#6B9080',      // Soft green - healthy status
  warning: '#E8B86D',      // Soft amber - needs attention
  error: '#D98880',        // Soft coral - issues (not harsh red)
  
  // UI elements
  card: '#FFFFFF',         // White cards
  border: '#E8ECEF',       // Very light border
  highlight: '#CCE3DE',    // Soft highlight color
  
  // Role colors
  organizer: '#4A90A4',    // Primary blue for organizers
  member: '#6B9080',       // Secondary green for members
};

export const buttonStyles = StyleSheet.create({
  primaryButton: {
    backgroundColor: colors.primary,
    alignSelf: 'center',
    width: '100%',
    borderRadius: 12,
    paddingVertical: 16,
  },
  secondaryButton: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 2,
    borderColor: colors.primary,
    alignSelf: 'center',
    width: '100%',
    borderRadius: 12,
    paddingVertical: 16,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'center',
    width: '100%',
    borderRadius: 12,
    paddingVertical: 16,
  },
});

export const commonStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.background,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.text,
    lineHeight: 24,
  },
  textSecondary: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 20,
  },
  section: {
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
});
