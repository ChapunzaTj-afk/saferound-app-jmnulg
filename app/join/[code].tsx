
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';

interface RoundPreview {
  id: string;
  name: string;
  description?: string;
  currency: string;
  contributionAmount: number;
  contributionFrequency: string;
  startDate?: string;
  payoutOrder: string;
  numberOfMembers: number;
  currentMemberCount: number;
  gracePeriodDays: number;
  paymentVerification: string;
  organizerName: string;
}

export default function JoinRoundScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [roundPreview, setRoundPreview] = useState<RoundPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  useEffect(() => {
    console.log('[Join Round] Loading preview for code:', code);
    loadRoundPreview();
  }, [code]);

  const loadRoundPreview = async () => {
    try {
      const { apiGet } = await import('@/utils/api');
      const preview = await apiGet<RoundPreview>(`/api/rounds/preview/${code}`);
      console.log('[Join Round] Preview loaded:', preview);
      setRoundPreview(preview);
    } catch (err: any) {
      console.error('[Join Round] Error loading preview:', err);
      setError(err.message || 'Failed to load round details');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRound = async () => {
    if (!user) {
      console.log('[Join Round] User not authenticated, redirecting to auth');
      router.push('/auth');
      return;
    }

    try {
      setJoining(true);
      console.log('[Join Round] Joining round with code:', code);
      const { authenticatedPost } = await import('@/utils/api');
      const result = await authenticatedPost(`/api/rounds/join/${code}`, {});
      console.log('[Join Round] Successfully joined round:', result);
      
      setSuccessModalVisible(true);
      
      // Navigate to round after a short delay
      setTimeout(() => {
        router.replace(`/round/${result.roundId}`);
      }, 1500);
    } catch (err: any) {
      console.error('[Join Round] Error joining round:', err);
      setError(err.message || 'Failed to join round');
    } finally {
      setJoining(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  const payoutOrderText = roundPreview?.payoutOrder === 'fixed' ? 'Fixed Order' : 'Random Order';
  const verificationText = roundPreview?.paymentVerification === 'mandatory' ? 'Mandatory' : 'Optional';
  const spotsLeft = roundPreview ? roundPreview.numberOfMembers - roundPreview.currentMemberCount : 0;

  if (loading) {
    return (
      <View style={[commonStyles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[commonStyles.textSecondary, styles.loadingText]}>
          Loading round details...
        </Text>
      </View>
    );
  }

  if (error || !roundPreview) {
    return (
      <>
        <Stack.Screen options={{ title: 'Join Round' }} />
        <SafeAreaView style={commonStyles.wrapper} edges={['bottom']}>
          <View style={[commonStyles.container, styles.centerContent]}>
            <IconSymbol
              ios_icon_name="exclamationmark.triangle"
              android_material_icon_name="error"
              size={64}
              color={colors.error}
            />
            <Text style={[commonStyles.subtitle, styles.errorTitle]}>
              Unable to Load Round
            </Text>
            <Text style={[commonStyles.textSecondary, styles.errorMessage]}>
              {error || 'This invite link may be invalid or expired.'}
            </Text>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Join Round' }} />
      <SafeAreaView style={commonStyles.wrapper} edges={['bottom']}>
        <ScrollView
          style={commonStyles.container}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.header}>
            <Text style={commonStyles.title}>{roundPreview.name}</Text>
            {roundPreview.description && (
              <Text style={[commonStyles.textSecondary, styles.description]}>
                {roundPreview.description}
              </Text>
            )}
          </View>

          <View style={[commonStyles.card, styles.infoCard]}>
            <Text style={styles.sectionTitle}>Round Details</Text>
            
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <IconSymbol
                  ios_icon_name="dollarsign.circle"
                  android_material_icon_name="attach-money"
                  size={20}
                  color={colors.primary}
                />
              </View>
              <View style={styles.detailContent}>
                <Text style={commonStyles.textSecondary}>Contribution Amount</Text>
                <Text style={commonStyles.text}>
                  {roundPreview.currency} {roundPreview.contributionAmount}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <IconSymbol
                  ios_icon_name="calendar"
                  android_material_icon_name="calendar-today"
                  size={20}
                  color={colors.primary}
                />
              </View>
              <View style={styles.detailContent}>
                <Text style={commonStyles.textSecondary}>Frequency</Text>
                <Text style={commonStyles.text}>{roundPreview.contributionFrequency}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <IconSymbol
                  ios_icon_name="person.2"
                  android_material_icon_name="group"
                  size={20}
                  color={colors.primary}
                />
              </View>
              <View style={styles.detailContent}>
                <Text style={commonStyles.textSecondary}>Members</Text>
                <Text style={commonStyles.text}>
                  {roundPreview.currentMemberCount} of {roundPreview.numberOfMembers}
                </Text>
                <Text style={[commonStyles.textSecondary, styles.spotsText]}>
                  {spotsLeft} {spotsLeft === 1 ? 'spot' : 'spots'} remaining
                </Text>
              </View>
            </View>

            {roundPreview.startDate && (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <IconSymbol
                    ios_icon_name="clock"
                    android_material_icon_name="schedule"
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.detailContent}>
                  <Text style={commonStyles.textSecondary}>Start Date</Text>
                  <Text style={commonStyles.text}>{formatDate(roundPreview.startDate)}</Text>
                </View>
              </View>
            )}

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <IconSymbol
                  ios_icon_name="person.circle"
                  android_material_icon_name="person"
                  size={20}
                  color={colors.primary}
                />
              </View>
              <View style={styles.detailContent}>
                <Text style={commonStyles.textSecondary}>Organizer</Text>
                <Text style={commonStyles.text}>{roundPreview.organizerName}</Text>
              </View>
            </View>
          </View>

          <View style={[commonStyles.card, styles.infoCard]}>
            <Text style={styles.sectionTitle}>Rules & Settings</Text>
            
            <View style={styles.ruleRow}>
              <Text style={commonStyles.textSecondary}>Payout Order:</Text>
              <Text style={commonStyles.text}>{payoutOrderText}</Text>
            </View>

            <View style={styles.ruleRow}>
              <Text style={commonStyles.textSecondary}>Payment Verification:</Text>
              <Text style={commonStyles.text}>{verificationText}</Text>
            </View>

            <View style={styles.ruleRow}>
              <Text style={commonStyles.textSecondary}>Late Payment Grace Period:</Text>
              <Text style={commonStyles.text}>{roundPreview.gracePeriodDays} days</Text>
            </View>
          </View>

          <View style={[commonStyles.card, styles.disclaimerCard]}>
            <IconSymbol
              ios_icon_name="info.circle"
              android_material_icon_name="info"
              size={24}
              color={colors.warning}
              style={styles.disclaimerIcon}
            />
            <Text style={styles.disclaimerTitle}>Important Notice</Text>
            <Text style={commonStyles.textSecondary}>
              SafeRound does not hold, move, or manage money. All contributions happen externally between members. SafeRound only provides coordination and tracking tools.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.joinButton, joining && styles.buttonDisabled]}
            onPress={handleJoinRound}
            disabled={joining}
          >
            {joining ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check-circle"
                  size={24}
                  color="#FFFFFF"
                />
                <Text style={styles.joinButtonText}>Join This Round</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={successModalVisible}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <IconSymbol
              ios_icon_name="checkmark.circle.fill"
              android_material_icon_name="check-circle"
              size={64}
              color={colors.success}
            />
            <Text style={styles.modalTitle}>Success!</Text>
            <Text style={styles.modalMessage}>
              You&apos;ve joined {roundPreview.name}
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
  },
  errorTitle: {
    marginTop: 16,
    textAlign: 'center',
  },
  errorMessage: {
    marginTop: 8,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  header: {
    marginBottom: 24,
  },
  description: {
    marginTop: 8,
  },
  infoCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  detailIcon: {
    width: 40,
    alignItems: 'center',
    paddingTop: 2,
  },
  detailContent: {
    flex: 1,
  },
  spotsText: {
    fontSize: 14,
    marginTop: 2,
  },
  ruleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  disclaimerCard: {
    backgroundColor: colors.highlight,
    borderWidth: 1,
    borderColor: colors.warning,
    marginBottom: 24,
  },
  disclaimerIcon: {
    marginBottom: 8,
  },
  disclaimerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  joinButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
