
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
  TextInput,
  Share,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
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
  contributionStatus?: string;
}

interface TimelineEvent {
  id: string;
  eventType: string;
  userName?: string;
  eventData?: any;
  createdAt: string;
}

interface Contribution {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: string;
  proofStatus?: string;
}

interface PaymentProof {
  id: string;
  proofType: string;
  proofUrl?: string;
  referenceText?: string;
  status: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

interface ContributionProgress {
  total: number;
  paid: number;
  pending: number;
  late: number;
}

interface RoundOverview {
  contributionProgress: ContributionProgress;
  nextPayoutDate?: string;
  nextRecipient?: string;
  nextImportantDate?: string;
  nextImportantAction?: string;
  memberCount: { current: number; total: number };
  userRole: string;
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
}

type TabType = 'overview' | 'contributions' | 'members' | 'timeline' | 'settings';

export default function RoundDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [round, setRound] = useState<RoundDetail | null>(null);
  const [overview, setOverview] = useState<RoundOverview | null>(null);
  const [members, setMembers] = useState<RoundMember[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [proofModalVisible, setProofModalVisible] = useState(false);
  const [selectedContribution, setSelectedContribution] = useState<Contribution | null>(null);
  const [proofType, setProofType] = useState<'image' | 'file' | 'reference'>('reference');
  const [proofReference, setProofReference] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [viewProofsModalVisible, setViewProofsModalVisible] = useState(false);
  const [proofs, setProofs] = useState<PaymentProof[]>([]);
  const [loadingProofs, setLoadingProofs] = useState(false);

  useEffect(() => {
    console.log('[Round Detail] Loading round:', id);
    loadRound();
    loadOverview();
    loadMembers();
    loadTimeline();
    loadContributions();
    loadInviteCode();
  }, [id]);

  const loadRound = async () => {
    try {
      const { authenticatedGet } = await import('@/utils/api');
      const data = await authenticatedGet<RoundDetail>(`/api/rounds/${id}`);
      console.log('[Round Detail] Round loaded:', data);
      setRound(data);
    } catch (error) {
      console.error('[Round Detail] Error loading round:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOverview = async () => {
    try {
      const { authenticatedGet } = await import('@/utils/api');
      const data = await authenticatedGet<RoundOverview>(`/api/rounds/${id}/overview`);
      console.log('[Round Detail] Overview loaded:', data);
      setOverview(data);
    } catch (error) {
      console.error('[Round Detail] Error loading overview:', error);
    }
  };

  const loadMembers = async () => {
    try {
      const { authenticatedGet } = await import('@/utils/api');
      const data = await authenticatedGet<RoundMember[]>(`/api/rounds/${id}/members`);
      console.log('[Round Detail] Members loaded:', data);
      setMembers(data);
    } catch (error) {
      console.error('[Round Detail] Error loading members:', error);
    }
  };

  const loadTimeline = async () => {
    try {
      const { authenticatedGet } = await import('@/utils/api');
      const data = await authenticatedGet<TimelineEvent[]>(`/api/rounds/${id}/timeline`);
      console.log('[Round Detail] Timeline loaded:', data);
      setTimeline(data);
    } catch (error) {
      console.error('[Round Detail] Error loading timeline:', error);
    }
  };

  const loadContributions = async () => {
    try {
      const { authenticatedGet } = await import('@/utils/api');
      const data = await authenticatedGet<Contribution[]>(`/api/rounds/${id}/contributions`);
      console.log('[Round Detail] Contributions loaded:', data);
      setContributions(data);
    } catch (error) {
      console.error('[Round Detail] Error loading contributions:', error);
    }
  };

  const loadInviteCode = async () => {
    if (!isOrganizer) return;
    
    try {
      const { authenticatedGet } = await import('@/utils/api');
      const data = await authenticatedGet<{ code: string; inviteUrl: string }>(`/api/rounds/${id}/invite-code`);
      console.log('[Round Detail] Invite code loaded:', data);
      setInviteCode(data.code);
      setInviteLink(data.inviteUrl);
    } catch (error) {
      console.error('[Round Detail] Error loading invite code:', error);
    }
  };

  const [copySuccessModalVisible, setCopySuccessModalVisible] = useState(false);

  const handleCopyCode = async () => {
    if (!inviteCode) return;
    
    try {
      await Clipboard.setStringAsync(inviteCode);
      console.log('[Round Detail] Invite code copied to clipboard');
      setCopySuccessModalVisible(true);
      setTimeout(() => setCopySuccessModalVisible(false), 2000);
    } catch (error) {
      console.error('[Round Detail] Error copying code:', error);
    }
  };

  const handleShareInvite = async () => {
    if (!inviteLink || !inviteCode) {
      await loadInviteCode();
    }
    
    if (inviteLink && inviteCode) {
      try {
        await Share.share({
          message: `Join my SafeRound: ${round?.name}\n\nInvite Code: ${inviteCode}\nLink: ${inviteLink}`,
          title: 'Join SafeRound',
        });
      } catch (error) {
        console.error('[Round Detail] Error sharing invite:', error);
      }
    }
  };

  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleDeleteRound = async () => {
    try {
      setDeleting(true);
      console.log('[Round Detail] Archiving round:', id);
      const { authenticatedDelete } = await import('@/utils/api');
      await authenticatedDelete(`/api/rounds/${id}/archive`, {});
      console.log('[Round Detail] Round archived successfully');
      setDeleteModalVisible(false);
      router.replace('/(tabs)/dashboard');
    } catch (error: any) {
      console.error('[Round Detail] Error archiving round:', error);
      setDeleteModalVisible(false);
      setErrorMessage(error.message || 'Failed to archive round. Only the organizer can archive rounds.');
      setErrorModalVisible(true);
    } finally {
      setDeleting(false);
    }
  };

  const handleMarkAsPaid = async (contributionId: string) => {
    try {
      console.log('[Round Detail] Marking contribution as paid:', contributionId);
      const { authenticatedPost } = await import('@/utils/api');
      await authenticatedPost(`/api/contributions/${contributionId}/mark-paid`, {});
      console.log('[Round Detail] Contribution marked as paid');
      await loadContributions();
      await loadOverview();
      await loadTimeline();
    } catch (error) {
      console.error('[Round Detail] Error marking as paid:', error);
    }
  };

  const handleUploadProof = async () => {
    if (!selectedContribution) return;
    
    try {
      setUploadingProof(true);
      console.log('[Round Detail] Uploading proof for contribution:', selectedContribution.id);
      const { authenticatedPost } = await import('@/utils/api');
      
      const payload: any = {
        proofType,
      };
      
      if (proofType === 'reference') {
        payload.referenceText = proofReference;
      } else {
        payload.proofUrl = 'https://example.com/proof.jpg';
      }
      
      await authenticatedPost(`/api/contributions/${selectedContribution.id}/upload-proof`, payload);
      console.log('[Round Detail] Proof uploaded successfully');
      
      setProofModalVisible(false);
      setProofReference('');
      setSelectedContribution(null);
      
      await loadContributions();
      await loadOverview();
      await loadTimeline();
    } catch (error) {
      console.error('[Round Detail] Error uploading proof:', error);
    } finally {
      setUploadingProof(false);
    }
  };

  const handleViewProofs = async (contribution: Contribution) => {
    try {
      setLoadingProofs(true);
      setViewProofsModalVisible(true);
      console.log('[Round Detail] Loading proofs for contribution:', contribution.id);
      const { authenticatedGet } = await import('@/utils/api');
      const data = await authenticatedGet<PaymentProof[]>(`/api/contributions/${contribution.id}/proofs`);
      console.log('[Round Detail] Proofs loaded:', data);
      setProofs(data);
    } catch (error) {
      console.error('[Round Detail] Error loading proofs:', error);
      setProofs([]);
    } finally {
      setLoadingProofs(false);
    }
  };

  const handleApproveProof = async (proofId: string) => {
    try {
      console.log('[Round Detail] Approving proof:', proofId);
      const { authenticatedPost } = await import('@/utils/api');
      await authenticatedPost(`/api/payment-proofs/${proofId}/approve`, {});
      console.log('[Round Detail] Proof approved');
      
      if (selectedContribution) {
        await handleViewProofs(selectedContribution);
      }
      await loadContributions();
      await loadOverview();
      await loadTimeline();
    } catch (error) {
      console.error('[Round Detail] Error approving proof:', error);
    }
  };

  const handleRejectProof = async (proofId: string, reason: string) => {
    try {
      console.log('[Round Detail] Rejecting proof:', proofId);
      const { authenticatedPost } = await import('@/utils/api');
      await authenticatedPost(`/api/payment-proofs/${proofId}/reject`, { reason });
      console.log('[Round Detail] Proof rejected');
      
      if (selectedContribution) {
        await handleViewProofs(selectedContribution);
      }
      await loadContributions();
      await loadOverview();
      await loadTimeline();
    } catch (error) {
      console.error('[Round Detail] Error rejecting proof:', error);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'member_joined':
        return 'person-add';
      case 'contribution_recorded':
        return 'attach-money';
      case 'proof_uploaded':
        return 'upload';
      case 'proof_approved':
        return 'check-circle';
      case 'proof_rejected':
        return 'cancel';
      case 'round_created':
        return 'add-circle';
      case 'round_updated':
        return 'edit';
      default:
        return 'info';
    }
  };

  const getEventText = (event: TimelineEvent) => {
    const userName = event.userName || 'Someone';
    switch (event.eventType) {
      case 'member_joined':
        return `${userName} joined the round`;
      case 'contribution_recorded':
        return `${userName} marked contribution as paid`;
      case 'proof_uploaded':
        return `${userName} uploaded payment proof`;
      case 'proof_approved':
        return `Payment proof approved for ${userName}`;
      case 'proof_rejected':
        return `Payment proof rejected for ${userName}`;
      case 'round_created':
        return 'Round created';
      case 'round_updated':
        return 'Round settings updated';
      default:
        return 'Activity recorded';
    }
  };

  const getContributionStatusColor = (status?: string) => {
    switch (status) {
      case 'paid':
        return colors.success;
      case 'late':
        return colors.error;
      case 'pending':
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  };

  const getContributionStatusText = (status?: string) => {
    switch (status) {
      case 'paid':
        return 'Paid';
      case 'late':
        return 'Late';
      case 'pending':
        return 'Due';
      default:
        return 'Unknown';
    }
  };

  const isOrganizer = round?.organizerId === user?.id;

  if (loading || !round) {
    return (
      <View style={[commonStyles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[commonStyles.textSecondary, styles.loadingText]}>
          Loading round details...
        </Text>
      </View>
    );
  }

  const renderOverview = () => {
    if (!overview) return null;

    const progressPercentage = overview.contributionProgress.total > 0
      ? (overview.contributionProgress.paid / overview.contributionProgress.total) * 100
      : 0;

    const userContributions = contributions.filter(c => c.userId === user?.id);
    const nextDueContribution = userContributions.find(c => c.status === 'pending' || c.status === 'late');

    return (
      <View style={styles.tabContent}>
        {nextDueContribution && (
          <View style={[commonStyles.card, styles.quickActionCard]}>
            <View style={styles.quickActionHeader}>
              <IconSymbol
                ios_icon_name="exclamationmark.circle.fill"
                android_material_icon_name="error"
                size={24}
                color={nextDueContribution.status === 'late' ? colors.error : colors.warning}
              />
              <Text style={[commonStyles.subtitle, styles.quickActionTitle]}>
                {nextDueContribution.status === 'late' ? 'Payment Overdue' : 'Payment Due'}
              </Text>
            </View>
            <Text style={[commonStyles.text, styles.quickActionAmount]}>
              {round.currency} {nextDueContribution.amount}
            </Text>
            <Text style={commonStyles.textSecondary}>
              Due: {formatDate(nextDueContribution.dueDate)}
            </Text>
            <View style={styles.quickActionButtons}>
              <TouchableOpacity
                style={[styles.quickActionButton, styles.quickActionButtonPrimary]}
                onPress={() => handleMarkAsPaid(nextDueContribution.id)}
              >
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check-circle"
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.quickActionButtonText}>Record Payment</Text>
              </TouchableOpacity>
              {round.paymentVerification !== 'none' && (
                <TouchableOpacity
                  style={[styles.quickActionButton, styles.quickActionButtonSecondary]}
                  onPress={() => {
                    setSelectedContribution(nextDueContribution);
                    setProofModalVisible(true);
                  }}
                >
                  <IconSymbol
                    ios_icon_name="arrow.up.doc.fill"
                    android_material_icon_name="upload"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={[styles.quickActionButtonText, { color: colors.primary }]}>
                    Upload Proof
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        <View style={[commonStyles.card, styles.progressCard]}>
          <Text style={styles.cardTitle}>Contribution Progress</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
          </View>
          <View style={styles.progressStats}>
            <View style={styles.progressStat}>
              <Text style={styles.progressNumber}>{overview.contributionProgress.paid}</Text>
              <Text style={commonStyles.textSecondary}>Paid</Text>
            </View>
            <View style={styles.progressStat}>
              <Text style={styles.progressNumber}>{overview.contributionProgress.pending}</Text>
              <Text style={commonStyles.textSecondary}>Pending</Text>
            </View>
            <View style={styles.progressStat}>
              <Text style={[styles.progressNumber, { color: colors.error }]}>
                {overview.contributionProgress.late}
              </Text>
              <Text style={commonStyles.textSecondary}>Late</Text>
            </View>
          </View>
        </View>

        {overview.nextImportantDate && (
          <View style={[commonStyles.card, styles.nextActionCard]}>
            <IconSymbol
              ios_icon_name="calendar"
              android_material_icon_name="calendar-today"
              size={24}
              color={colors.primary}
            />
            <View style={styles.nextActionContent}>
              <Text style={commonStyles.textSecondary}>Next Important Date</Text>
              <Text style={[commonStyles.text, styles.nextActionDate]}>
                {formatDate(overview.nextImportantDate)}
              </Text>
              {overview.nextImportantAction && (
                <Text style={commonStyles.textSecondary}>
                  {overview.nextImportantAction}
                </Text>
              )}
            </View>
          </View>
        )}

        <View style={[commonStyles.card, styles.infoCard]}>
          <Text style={styles.cardTitle}>Round Details</Text>
          <View style={styles.infoRow}>
            <Text style={commonStyles.textSecondary}>Contribution Amount:</Text>
            <Text style={commonStyles.text}>
              {round.currency} {round.contributionAmount}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={commonStyles.textSecondary}>Frequency:</Text>
            <Text style={commonStyles.text}>{round.contributionFrequency}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={commonStyles.textSecondary}>Start Date:</Text>
            <Text style={commonStyles.text}>{formatDate(round.startDate)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={commonStyles.textSecondary}>Members:</Text>
            <Text style={commonStyles.text}>
              {overview.memberCount.current} of {overview.memberCount.total}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={commonStyles.textSecondary}>Payout Order:</Text>
            <Text style={commonStyles.text}>
              {round.payoutOrder === 'fixed' ? 'Fixed' : 'Random'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderContributions = () => {
    const userContributions = contributions.filter(c => c.userId === user?.id);
    const otherContributions = contributions.filter(c => c.userId !== user?.id);
    
    return (
      <View style={styles.tabContent}>
        <View style={[commonStyles.card, styles.contributionHeaderCard]}>
          <Text style={styles.cardTitle}>Payment Tracking</Text>
          <Text style={commonStyles.textSecondary}>
            Record your payments and upload proof to keep the round transparent
          </Text>
        </View>

        {userContributions.length > 0 && (
          <View style={styles.contributionSection}>
            <Text style={styles.subsectionTitle}>Your Contributions</Text>
            {userContributions.map((contribution, index) => {
              const statusColor = getContributionStatusColor(contribution.status);
              const statusText = getContributionStatusText(contribution.status);
              const isPaid = contribution.status === 'paid' || contribution.status === 'verified';
              const canUploadProof = !isPaid && round?.paymentVerification !== 'none';
              
              return (
                <View key={index} style={[commonStyles.card, styles.contributionCard]}>
                  <View style={styles.contributionHeader}>
                    <View>
                      <Text style={commonStyles.text}>
                        {round?.currency} {contribution.amount}
                      </Text>
                      <Text style={commonStyles.textSecondary}>
                        Due: {formatDate(contribution.dueDate)}
                      </Text>
                      {contribution.paidDate && (
                        <Text style={commonStyles.textSecondary}>
                          Paid: {formatDate(contribution.paidDate)}
                        </Text>
                      )}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                      <Text style={styles.statusBadgeText}>{statusText}</Text>
                    </View>
                  </View>
                  
                  {contribution.proofStatus && (
                    <Text style={[commonStyles.textSecondary, styles.proofStatus]}>
                      Proof: {contribution.proofStatus}
                    </Text>
                  )}
                  
                  <View style={styles.contributionActions}>
                    {!isPaid && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.actionButtonHighlight]}
                        onPress={() => handleMarkAsPaid(contribution.id)}
                      >
                        <IconSymbol
                          ios_icon_name="checkmark.circle"
                          android_material_icon_name="check-circle"
                          size={18}
                          color="#FFFFFF"
                        />
                        <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>
                          Record Payment
                        </Text>
                      </TouchableOpacity>
                    )}
                    
                    {canUploadProof && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.actionButtonHighlight]}
                        onPress={() => {
                          setSelectedContribution(contribution);
                          setProofModalVisible(true);
                        }}
                      >
                        <IconSymbol
                          ios_icon_name="arrow.up.doc"
                          android_material_icon_name="upload"
                          size={18}
                          color="#FFFFFF"
                        />
                        <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>
                          Upload Proof
                        </Text>
                      </TouchableOpacity>
                    )}
                    
                    {contribution.proofStatus && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => {
                          setSelectedContribution(contribution);
                          handleViewProofs(contribution);
                        }}
                      >
                        <IconSymbol
                          ios_icon_name="eye"
                          android_material_icon_name="visibility"
                          size={18}
                          color={colors.textSecondary}
                        />
                        <Text style={styles.actionButtonText}>View Proofs</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
        
        {isOrganizer && otherContributions.length > 0 && (
          <View style={styles.contributionSection}>
            <Text style={styles.subsectionTitle}>All Member Contributions</Text>
            {otherContributions.map((contribution, index) => {
              const statusColor = getContributionStatusColor(contribution.status);
              const statusText = getContributionStatusText(contribution.status);
              
              return (
                <View key={index} style={[commonStyles.card, styles.contributionCard]}>
                  <View style={styles.contributionHeader}>
                    <View>
                      <Text style={commonStyles.text}>{contribution.userName}</Text>
                      <Text style={commonStyles.textSecondary}>
                        {round?.currency} {contribution.amount}
                      </Text>
                      <Text style={commonStyles.textSecondary}>
                        Due: {formatDate(contribution.dueDate)}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                      <Text style={styles.statusBadgeText}>{statusText}</Text>
                    </View>
                  </View>
                  
                  {contribution.proofStatus && (
                    <View style={styles.contributionActions}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.actionButtonHighlight]}
                        onPress={() => {
                          setSelectedContribution(contribution);
                          handleViewProofs(contribution);
                        }}
                      >
                        <IconSymbol
                          ios_icon_name="eye"
                          android_material_icon_name="visibility"
                          size={18}
                          color="#FFFFFF"
                        />
                        <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>
                          Review Proof
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
        
        {contributions.length === 0 && (
          <View style={[commonStyles.card, styles.emptyState]}>
            <Text style={commonStyles.textSecondary}>No contributions yet</Text>
          </View>
        )}
      </View>
    );
  };

  const renderMembers = () => (
    <View style={styles.tabContent}>
      {isOrganizer && (
        <View style={[commonStyles.card, styles.inviteCardProminent]}>
          <View style={styles.inviteCardHeader}>
            <IconSymbol
              ios_icon_name="person.badge.plus.fill"
              android_material_icon_name="group-add"
              size={32}
              color={colors.primary}
            />
            <Text style={styles.inviteCardTitle}>Invite Members</Text>
          </View>
          <Text style={commonStyles.textSecondary}>
            Share this code with members to join your round
          </Text>
          {inviteCode ? (
            <>
              <View style={styles.inviteCodeContainer}>
                <Text style={styles.inviteCodeText}>{inviteCode}</Text>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={handleCopyCode}
                >
                  <IconSymbol
                    ios_icon_name="doc.on.doc"
                    android_material_icon_name="content-copy"
                    size={20}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.shareButton}
                onPress={handleShareInvite}
              >
                <IconSymbol
                  ios_icon_name="square.and.arrow.up"
                  android_material_icon_name="share"
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.shareButtonText}>Share Invite Link</Text>
              </TouchableOpacity>
            </>
          ) : (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 16 }} />
          )}
        </View>
      )}

      <Text style={styles.sectionTitle}>Current Members ({members.length})</Text>
      {members.map((member, index) => {
        const statusColor = getContributionStatusColor(member.contributionStatus);
        const statusText = getContributionStatusText(member.contributionStatus);
        
        return (
          <View key={index} style={[commonStyles.card, styles.memberCard]}>
            <View style={styles.memberHeader}>
              <View style={styles.memberInfo}>
                <Text style={commonStyles.text}>{member.userName}</Text>
                {member.role === 'organizer' && (
                  <View style={styles.organizerBadge}>
                    <Text style={styles.organizerBadgeText}>Organizer</Text>
                  </View>
                )}
              </View>
              {member.contributionStatus && (
                <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                  <Text style={styles.statusBadgeText}>{statusText}</Text>
                </View>
              )}
            </View>
            <View style={styles.memberDetails}>
              {member.payoutPosition !== undefined && (
                <Text style={commonStyles.textSecondary}>
                  Payout Position: #{member.payoutPosition}
                </Text>
              )}
              <Text style={commonStyles.textSecondary}>
                Joined: {formatDate(member.joinedAt)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );

  const renderTimeline = () => (
    <View style={styles.tabContent}>
      {timeline.length > 0 ? (
        <>
          {timeline.map((event, index) => {
            const iconName = getEventIcon(event.eventType);
            const eventText = getEventText(event);
            
            return (
              <View key={index} style={[commonStyles.card, styles.timelineCard]}>
                <View style={styles.timelineIcon}>
                  <IconSymbol
                    ios_icon_name="circle.fill"
                    android_material_icon_name={iconName}
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={commonStyles.text}>{eventText}</Text>
                  <Text style={commonStyles.textSecondary}>
                    {formatDateTime(event.createdAt)}
                  </Text>
                </View>
              </View>
            );
          })}
        </>
      ) : (
        <View style={[commonStyles.card, styles.emptyState]}>
          <Text style={commonStyles.textSecondary}>No activity yet</Text>
        </View>
      )}
    </View>
  );

  const renderSettings = () => (
    <View style={styles.tabContent}>
      <View style={[commonStyles.card, styles.settingsCard]}>
        <Text style={styles.cardTitle}>Round Settings</Text>
        <View style={styles.settingRow}>
          <Text style={commonStyles.textSecondary}>Grace Period:</Text>
          <Text style={commonStyles.text}>{round.gracePeriodDays} days</Text>
        </View>
        <View style={styles.settingRow}>
          <Text style={commonStyles.textSecondary}>Payment Verification:</Text>
          <Text style={commonStyles.text}>
            {round.paymentVerification === 'mandatory' ? 'Mandatory' : 'Optional'}
          </Text>
        </View>
        <View style={styles.settingRow}>
          <Text style={commonStyles.textSecondary}>Conflict Resolution:</Text>
          <Text style={commonStyles.text}>
            {round.conflictResolutionEnabled ? 'Enabled' : 'Disabled'}
          </Text>
        </View>
      </View>

      {isOrganizer && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => setDeleteModalVisible(true)}
        >
          <IconSymbol
            ios_icon_name="trash"
            android_material_icon_name="delete"
            size={20}
            color={colors.error}
          />
          <Text style={styles.deleteButtonText}>Archive Round</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: round.name,
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={commonStyles.wrapper} edges={['bottom']}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.tabBar}
          contentContainerStyle={styles.tabBarContent}
        >
          <TouchableOpacity
            style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
              Overview
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'contributions' && styles.tabActive]}
            onPress={() => setActiveTab('contributions')}
          >
            <Text style={[styles.tabText, activeTab === 'contributions' && styles.tabTextActive]}>
              Contributions
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'members' && styles.tabActive]}
            onPress={() => setActiveTab('members')}
          >
            <Text style={[styles.tabText, activeTab === 'members' && styles.tabTextActive]}>
              Members
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'timeline' && styles.tabActive]}
            onPress={() => setActiveTab('timeline')}
          >
            <Text style={[styles.tabText, activeTab === 'timeline' && styles.tabTextActive]}>
              Timeline
            </Text>
          </TouchableOpacity>
          {isOrganizer && (
            <TouchableOpacity
              style={[styles.tab, activeTab === 'settings' && styles.tabActive]}
              onPress={() => setActiveTab('settings')}
            >
              <Text style={[styles.tabText, activeTab === 'settings' && styles.tabTextActive]}>
                Settings
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <ScrollView
          style={commonStyles.container}
          contentContainerStyle={styles.scrollContent}
        >
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'contributions' && renderContributions()}
          {activeTab === 'members' && renderMembers()}
          {activeTab === 'timeline' && renderTimeline()}
          {activeTab === 'settings' && renderSettings()}
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Archive Round?</Text>
            <Text style={styles.modalMessage}>
              This will archive the round and remove it from active rounds. This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonDanger]}
                onPress={handleDeleteRound}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonTextDanger}>Archive</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={proofModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setProofModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Upload Payment Proof</Text>
            <Text style={styles.modalMessage}>
              Provide proof of your payment for this contribution
            </Text>
            
            <View style={styles.proofTypeSelector}>
              <TouchableOpacity
                style={[
                  styles.proofTypeButton,
                  proofType === 'reference' && styles.proofTypeButtonActive,
                ]}
                onPress={() => setProofType('reference')}
              >
                <Text
                  style={[
                    styles.proofTypeButtonText,
                    proofType === 'reference' && styles.proofTypeButtonTextActive,
                  ]}
                >
                  Reference
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.proofTypeButton,
                  proofType === 'image' && styles.proofTypeButtonActive,
                ]}
                onPress={() => setProofType('image')}
              >
                <Text
                  style={[
                    styles.proofTypeButtonText,
                    proofType === 'image' && styles.proofTypeButtonTextActive,
                  ]}
                >
                  Image
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.proofTypeButton,
                  proofType === 'file' && styles.proofTypeButtonActive,
                ]}
                onPress={() => setProofType('file')}
              >
                <Text
                  style={[
                    styles.proofTypeButtonText,
                    proofType === 'file' && styles.proofTypeButtonTextActive,
                  ]}
                >
                  File
                </Text>
              </TouchableOpacity>
            </View>
            
            {proofType === 'reference' && (
              <TextInput
                style={styles.proofInput}
                value={proofReference}
                onChangeText={setProofReference}
                placeholder="e.g., Transaction ID, Check number"
                placeholderTextColor={colors.textLight}
                multiline
                numberOfLines={3}
              />
            )}
            
            {(proofType === 'image' || proofType === 'file') && (
              <Text style={[commonStyles.textSecondary, styles.uploadNote]}>
                File upload coming soon. For now, use reference text.
              </Text>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => {
                  setProofModalVisible(false);
                  setProofReference('');
                  setSelectedContribution(null);
                }}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleUploadProof}
                disabled={uploadingProof || (proofType === 'reference' && !proofReference.trim())}
              >
                {uploadingProof ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonTextPrimary}>Upload</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={copySuccessModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCopySuccessModalVisible(false)}
      >
        <View style={styles.toastOverlay}>
          <View style={styles.toastContent}>
            <IconSymbol
              ios_icon_name="checkmark.circle.fill"
              android_material_icon_name="check-circle"
              size={24}
              color={colors.success}
            />
            <Text style={styles.toastText}>Invite code copied!</Text>
          </View>
        </View>
      </Modal>

      <Modal
        visible={viewProofsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setViewProofsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.proofsModalContent]}>
            <Text style={styles.modalTitle}>Payment Proofs</Text>
            
            {loadingProofs ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : proofs.length > 0 ? (
              <ScrollView style={styles.proofsList}>
                {proofs.map((proof, index) => {
                  const statusColor = 
                    proof.status === 'approved' ? colors.success :
                    proof.status === 'rejected' ? colors.error :
                    colors.warning;
                  
                  return (
                    <View key={index} style={[commonStyles.card, styles.proofCard]}>
                      <View style={styles.proofHeader}>
                        <Text style={commonStyles.text}>
                          {proof.proofType.charAt(0).toUpperCase() + proof.proofType.slice(1)}
                        </Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                          <Text style={styles.statusBadgeText}>
                            {proof.status.charAt(0).toUpperCase() + proof.status.slice(1)}
                          </Text>
                        </View>
                      </View>
                      
                      {proof.referenceText && (
                        <Text style={[commonStyles.textSecondary, styles.proofReference]}>
                          {proof.referenceText}
                        </Text>
                      )}
                      
                      {proof.proofUrl && (
                        <Text style={[commonStyles.textSecondary, styles.proofUrl]}>
                          {proof.proofUrl}
                        </Text>
                      )}
                      
                      <Text style={[commonStyles.textSecondary, styles.proofDate]}>
                        Uploaded: {formatDateTime(proof.createdAt)}
                      </Text>
                      
                      {proof.reviewedAt && (
                        <Text style={[commonStyles.textSecondary, styles.proofDate]}>
                          Reviewed: {formatDateTime(proof.reviewedAt)}
                        </Text>
                      )}
                      
                      {proof.rejectionReason && (
                        <Text style={[commonStyles.textSecondary, styles.rejectionReason]}>
                          Reason: {proof.rejectionReason}
                        </Text>
                      )}
                      
                      {isOrganizer && proof.status === 'pending' && (
                        <View style={styles.proofActions}>
                          <TouchableOpacity
                            style={[styles.proofActionButton, styles.approveButton]}
                            onPress={() => handleApproveProof(proof.id)}
                          >
                            <Text style={styles.approveButtonText}>Approve</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.proofActionButton, styles.rejectButton]}
                            onPress={() => handleRejectProof(proof.id, 'Invalid proof')}
                          >
                            <Text style={styles.rejectButtonText}>Reject</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            ) : (
              <Text style={commonStyles.textSecondary}>No proofs uploaded yet</Text>
            )}
            
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonSecondary, styles.closeButton]}
              onPress={() => {
                setViewProofsModalVisible(false);
                setProofs([]);
                setSelectedContribution(null);
              }}
            >
              <Text style={styles.modalButtonTextSecondary}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={errorModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setErrorModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <IconSymbol
              ios_icon_name="exclamationmark.triangle.fill"
              android_material_icon_name="error"
              size={48}
              color={colors.error}
              style={{ marginBottom: 16 }}
            />
            <Text style={styles.modalTitle}>Error</Text>
            <Text style={styles.modalMessage}>{errorMessage}</Text>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonPrimary, { width: '100%' }]}
              onPress={() => setErrorModalVisible(false)}
            >
              <Text style={styles.modalButtonTextPrimary}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
  tabBar: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  tabBarContent: {
    paddingHorizontal: 12,
    gap: 4,
  },
  tab: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginHorizontal: 2,
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
  },
  tabContent: {
    gap: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  quickActionCard: {
    backgroundColor: colors.highlight,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  quickActionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  quickActionTitle: {
    marginBottom: 0,
  },
  quickActionAmount: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  quickActionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  quickActionButtonPrimary: {
    backgroundColor: colors.success,
  },
  quickActionButtonSecondary: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  quickActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  progressCard: {},
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  progressStat: {
    alignItems: 'center',
  },
  progressNumber: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  nextActionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  nextActionContent: {
    marginLeft: 16,
    flex: 1,
  },
  nextActionDate: {
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 4,
  },
  infoCard: {},
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  inviteCardProminent: {
    backgroundColor: colors.highlight,
    borderWidth: 2,
    borderColor: colors.primary,
    marginBottom: 24,
  },
  inviteCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  inviteCardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  inviteCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 12,
    marginBottom: 12,
  },
  inviteCodeText: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: colors.primary,
    letterSpacing: 2,
  },
  copyButton: {
    padding: 8,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  memberCard: {},
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  organizerBadge: {
    backgroundColor: colors.organizer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  organizerBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
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
  },
  memberDetails: {
    gap: 4,
  },
  timelineCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineIcon: {
    width: 40,
    alignItems: 'center',
    paddingTop: 2,
  },
  timelineContent: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  settingsCard: {},
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundAlt,
    borderWidth: 2,
    borderColor: colors.error,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
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
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonSecondary: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 2,
    borderColor: colors.border,
  },
  modalButtonDanger: {
    backgroundColor: colors.error,
  },
  modalButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  modalButtonTextDanger: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalButtonPrimary: {
    backgroundColor: colors.primary,
  },
  modalButtonTextPrimary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  contributionHeaderCard: {
    backgroundColor: colors.highlight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  contributionSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  contributionCard: {
    marginBottom: 12,
  },
  contributionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  proofStatus: {
    fontSize: 14,
    marginBottom: 8,
  },
  contributionActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonHighlight: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  proofTypeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  proofTypeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  proofTypeButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.highlight,
  },
  proofTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  proofTypeButtonTextActive: {
    color: colors.primary,
  },
  proofInput: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  uploadNote: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  proofsModalContent: {
    maxHeight: '80%',
  },
  proofsList: {
    maxHeight: 400,
    marginBottom: 16,
  },
  proofCard: {
    marginBottom: 12,
  },
  proofHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  proofReference: {
    fontSize: 14,
    marginBottom: 4,
  },
  proofUrl: {
    fontSize: 12,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  proofDate: {
    fontSize: 12,
    marginTop: 4,
  },
  rejectionReason: {
    fontSize: 14,
    color: colors.error,
    marginTop: 4,
  },
  proofActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  proofActionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: colors.success,
  },
  approveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  rejectButton: {
    backgroundColor: colors.error,
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    width: '100%',
  },
  toastOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  toastText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});
