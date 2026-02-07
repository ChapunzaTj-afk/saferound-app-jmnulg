
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';

interface RoundMember {
  id: string;
  userId: string;
  userName: string;
  role: string;
  payoutPosition?: number;
  joinedAt: string;
}

interface RoundDetail {
  id: string;
  name: string;
  description?: string;
  currency: string;
  contributionAmount: number;
  contributionFrequency: string;
  numberOfMembers: number;
  payoutOrder: string;
  startType: string;
  startDate?: string;
  gracePeriodDays: number;
  conflictResolutionEnabled: boolean;
  paymentVerification: string;
  organizerId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  members?: RoundMember[];
}

export default function RoundDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [round, setRound] = useState<RoundDetail | null>(null);
  const [members, setMembers] = useState<RoundMember[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    console.log('[Round Detail] Loading round:', id);
    loadRound();
    loadMembers();
  }, [id]);

  const loadRound = async () => {
    try {
      console.log('[Round Detail] Fetching round data from /api/rounds/' + id);
      const { authenticatedGet } = await import('@/utils/api');
      const data = await authenticatedGet<RoundDetail>(`/api/rounds/${id}`);
      console.log('[Round Detail] Round data loaded:', data);
      setRound(data);
      setLoading(false);
    } catch (error) {
      console.error('[Round Detail] Error loading round:', error);
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    try {
      console.log('[Round Detail] Fetching members from /api/rounds/' + id + '/members');
      const { authenticatedGet } = await import('@/utils/api');
      const data = await authenticatedGet<RoundMember[]>(`/api/rounds/${id}/members`);
      console.log('[Round Detail] Members loaded:', data);
      setMembers(data);
    } catch (error) {
      console.error('[Round Detail] Error loading members:', error);
    }
  };

  const handleDeleteRound = async () => {
    try {
      console.log('[Round Detail] Deleting round:', id);
      setDeleting(true);
      const { authenticatedDelete } = await import('@/utils/api');
      await authenticatedDelete(`/api/rounds/${id}`);
      console.log('[Round Detail] Round deleted successfully');
      setShowDeleteModal(false);
      router.back();
    } catch (error) {
      console.error('[Round Detail] Error deleting round:', error);
      setDeleting(false);
    }
  };

  const isOrganizer = round?.organizerId === user?.id;

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Round Details' }} />
        <View style={[commonStyles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[commonStyles.textSecondary, styles.loadingText]}>
            Loading round details...
          </Text>
        </View>
      </>
    );
  }

  if (!round) {
    return (
      <>
        <Stack.Screen options={{ title: 'Round Details' }} />
        <SafeAreaView style={commonStyles.wrapper} edges={['bottom']}>
          <ScrollView
            style={commonStyles.container}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={[commonStyles.card, styles.emptyState]}>
              <IconSymbol
                ios_icon_name="exclamationmark.triangle"
                android_material_icon_name="error"
                size={48}
                color={colors.error}
                style={styles.emptyIcon}
              />
              <Text style={[commonStyles.text, styles.emptyText]}>
                Round not found
              </Text>
              <Text style={[commonStyles.textSecondary, styles.emptySubtext]}>
                This round may have been deleted or you don't have access
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: round.name }} />
      <SafeAreaView style={commonStyles.wrapper} edges={['bottom']}>
        <ScrollView
          style={commonStyles.container}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={commonStyles.card}>
            <View style={styles.roundHeader}>
              <Text style={commonStyles.subtitle}>{round.name}</Text>
              <View style={[styles.statusBadge, { backgroundColor: round.status === 'active' ? colors.success : colors.textSecondary }]}>
                <Text style={styles.statusBadgeText}>{round.status}</Text>
              </View>
            </View>
            {round.description && (
              <Text style={[commonStyles.textSecondary, styles.description]}>
                {round.description}
              </Text>
            )}
          </View>

          <View style={commonStyles.card}>
            <Text style={[commonStyles.subtitle, styles.sectionTitle]}>Details</Text>
            <View style={styles.detailRow}>
              <Text style={commonStyles.textSecondary}>Contribution:</Text>
              <Text style={commonStyles.text}>
                {round.currency} {round.contributionAmount} / {round.contributionFrequency}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={commonStyles.textSecondary}>Members:</Text>
              <Text style={commonStyles.text}>{round.numberOfMembers}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={commonStyles.textSecondary}>Payout Order:</Text>
              <Text style={commonStyles.text}>{round.payoutOrder}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={commonStyles.textSecondary}>Grace Period:</Text>
              <Text style={commonStyles.text}>{round.gracePeriodDays} days</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={commonStyles.textSecondary}>Payment Verification:</Text>
              <Text style={commonStyles.text}>{round.paymentVerification}</Text>
            </View>
          </View>

          <View style={commonStyles.card}>
            <Text style={[commonStyles.subtitle, styles.sectionTitle]}>Members ({members.length})</Text>
            {members.length > 0 ? (
              members.map((member) => (
                <View key={member.id} style={styles.memberRow}>
                  <View style={styles.memberInfo}>
                    <Text style={commonStyles.text}>{member.userName || 'Unknown'}</Text>
                    <Text style={commonStyles.textSecondary}>{member.role}</Text>
                  </View>
                  {member.payoutPosition && (
                    <View style={styles.positionBadge}>
                      <Text style={styles.positionText}>#{member.payoutPosition}</Text>
                    </View>
                  )}
                </View>
              ))
            ) : (
              <Text style={commonStyles.textSecondary}>No members yet</Text>
            )}
          </View>

          {isOrganizer && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => setShowDeleteModal(true)}
            >
              <IconSymbol
                ios_icon_name="trash"
                android_material_icon_name="delete"
                size={20}
                color={colors.error}
              />
              <Text style={styles.deleteButtonText}>Delete Round</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <Modal
          visible={showDeleteModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDeleteModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={[commonStyles.subtitle, styles.modalTitle]}>
                Delete Round?
              </Text>
              <Text style={[commonStyles.textSecondary, styles.modalMessage]}>
                Are you sure you want to delete "{round.name}"? This action cannot be undone.
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowDeleteModal(false)}
                  disabled={deleting}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmButton}
                  onPress={handleDeleteRound}
                  disabled={deleting}
                >
                  {deleting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalConfirmButtonText}>Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 20 : 0,
    paddingBottom: 100,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    textAlign: 'center',
  },
  roundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  description: {
    marginTop: 8,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  memberInfo: {
    flex: 1,
  },
  positionBadge: {
    backgroundColor: colors.highlight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  positionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.error,
    backgroundColor: colors.backgroundAlt,
    marginBottom: 24,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  modalMessage: {
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.error,
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
