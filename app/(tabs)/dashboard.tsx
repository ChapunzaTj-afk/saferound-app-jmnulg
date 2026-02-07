
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

interface Round {
  id: string;
  name: string;
  description?: string;
  currency: string;
  contributionAmount: number;
  contributionFrequency: string;
  numberOfMembers: number;
  organizerId: string;
  status: string;
  role: string;
  nextImportantDate?: string;
  nextImportantAction?: string;
}

interface DashboardData {
  globalStatus: 'healthy' | 'action-needed';
  nextImportantDate?: string;
  nextImportantAction?: string;
  roundsCount: number;
  activeRounds: Round[];
}

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  useEffect(() => {
    console.log('Dashboard: User logged in, loading dashboard data');
    if (user) {
      loadDashboard();
    }
  }, [user]);

  const loadDashboard = async () => {
    try {
      console.log('[Dashboard] Fetching dashboard data from /api/dashboard');
      const { authenticatedGet } = await import('@/utils/api');
      const data = await authenticatedGet<DashboardData>('/api/dashboard');
      console.log('[Dashboard] Dashboard data loaded:', data);
      setDashboardData(data);
    } catch (error) {
      console.error('[Dashboard] Error loading dashboard:', error);
      // Fallback to empty state on error
      setDashboardData({
        globalStatus: 'healthy',
        nextImportantDate: undefined,
        nextImportantAction: undefined,
        roundsCount: 0,
        activeRounds: [],
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    console.log('Dashboard: User pulled to refresh');
    setRefreshing(true);
    loadDashboard();
  };

  const handleCreateRound = () => {
    console.log('Dashboard: User tapped Create Round button');
    router.push('/create-round');
  };

  const handleJoinRound = () => {
    console.log('Dashboard: User tapped Join Round button');
    // TODO: Implement join round flow
  };

  const handleRoundPress = (roundId: string) => {
    console.log('Dashboard: User tapped round card:', roundId);
    router.push(`/round/${roundId}`);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No upcoming dates';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `In ${diffDays} days`;
    return date.toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    if (status === 'healthy') return colors.success;
    if (status === 'action-needed') return colors.warning;
    return colors.textSecondary;
  };

  const getStatusText = (status: string) => {
    if (status === 'healthy') return 'All rounds healthy';
    if (status === 'action-needed') return 'Action needed';
    return 'Unknown status';
  };

  if (loading) {
    return (
      <View style={[commonStyles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[commonStyles.textSecondary, styles.loadingText]}>
          Loading your rounds...
        </Text>
      </View>
    );
  }

  const statusColor = getStatusColor(dashboardData?.globalStatus || 'healthy');
  const statusText = getStatusText(dashboardData?.globalStatus || 'healthy');
  const nextDateFormatted = formatDate(dashboardData?.nextImportantDate);

  return (
    <SafeAreaView style={commonStyles.wrapper} edges={['top']}>
      <ScrollView
        style={commonStyles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.header}>
          <Text style={commonStyles.title}>SafeRound</Text>
          <Text style={commonStyles.textSecondary}>
            Community savings, organized
          </Text>
        </View>

        <View style={[commonStyles.card, styles.statusCard]}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[commonStyles.text, { color: statusColor }]}>
              {statusText}
            </Text>
          </View>
          
          {dashboardData?.nextImportantDate && (
            <>
              <View style={commonStyles.divider} />
              <View style={styles.nextActionRow}>
                <IconSymbol
                  ios_icon_name="calendar"
                  android_material_icon_name="calendar-today"
                  size={20}
                  color={colors.textSecondary}
                />
                <View style={styles.nextActionText}>
                  <Text style={commonStyles.textSecondary}>Next important date</Text>
                  <Text style={[commonStyles.text, styles.nextDateText]}>
                    {nextDateFormatted}
                  </Text>
                  {dashboardData?.nextImportantAction && (
                    <Text style={commonStyles.textSecondary}>
                      {dashboardData.nextImportantAction}
                    </Text>
                  )}
                </View>
              </View>
            </>
          )}
        </View>

        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryAction]}
            onPress={handleCreateRound}
          >
            <IconSymbol
              ios_icon_name="plus.circle.fill"
              android_material_icon_name="add-circle"
              size={24}
              color="#FFFFFF"
            />
            <Text style={styles.actionButtonText}>Create Round</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryAction]}
            onPress={handleJoinRound}
          >
            <IconSymbol
              ios_icon_name="person.badge.plus"
              android_material_icon_name="group-add"
              size={24}
              color={colors.primary}
            />
            <Text style={[styles.actionButtonText, { color: colors.primary }]}>
              Join Round
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.roundsSection}>
          <Text style={commonStyles.subtitle}>Your Rounds</Text>
          
          {dashboardData?.activeRounds && dashboardData.activeRounds.length > 0 ? (
            <>
              {dashboardData.activeRounds.map((round, index) => {
                const roleColor = round.role === 'organizer' ? colors.organizer : colors.member;
                const roleText = round.role === 'organizer' ? 'Organizer' : 'Member';
                const nextDate = formatDate(round.nextImportantDate);
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={commonStyles.card}
                    onPress={() => handleRoundPress(round.id)}
                  >
                    <View style={styles.roundHeader}>
                      <Text style={[commonStyles.subtitle, styles.roundName]}>
                        {round.name}
                      </Text>
                      <View style={[styles.roleBadge, { backgroundColor: roleColor }]}>
                        <Text style={styles.roleBadgeText}>{roleText}</Text>
                      </View>
                    </View>

                    {round.description && (
                      <Text style={[commonStyles.textSecondary, styles.roundDescription]}>
                        {round.description}
                      </Text>
                    )}

                    <View style={styles.roundDetails}>
                      <View style={styles.roundDetailItem}>
                        <IconSymbol
                          ios_icon_name="dollarsign.circle"
                          android_material_icon_name="attach-money"
                          size={18}
                          color={colors.textSecondary}
                        />
                        <Text style={commonStyles.textSecondary}>
                          {round.currency} {round.contributionAmount}
                        </Text>
                        <Text style={commonStyles.textSecondary}> / </Text>
                        <Text style={commonStyles.textSecondary}>
                          {round.contributionFrequency}
                        </Text>
                      </View>

                      <View style={styles.roundDetailItem}>
                        <IconSymbol
                          ios_icon_name="person.2"
                          android_material_icon_name="group"
                          size={18}
                          color={colors.textSecondary}
                        />
                        <Text style={commonStyles.textSecondary}>
                          {round.numberOfMembers} members
                        </Text>
                      </View>
                    </View>

                    {round.nextImportantDate && (
                      <>
                        <View style={commonStyles.divider} />
                        <View style={styles.roundFooter}>
                          <Text style={commonStyles.textSecondary}>Next: </Text>
                          <Text style={[commonStyles.text, styles.nextDateSmall]}>
                            {nextDate}
                          </Text>
                        </View>
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
            </>
          ) : (
            <View style={[commonStyles.card, styles.emptyState]}>
              <IconSymbol
                ios_icon_name="circle.grid.3x3"
                android_material_icon_name="grid-on"
                size={48}
                color={colors.textLight}
                style={styles.emptyIcon}
              />
              <Text style={[commonStyles.text, styles.emptyText]}>
                No active rounds yet
              </Text>
              <Text style={[commonStyles.textSecondary, styles.emptySubtext]}>
                Create a new round or join an existing one to get started
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
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
  header: {
    marginBottom: 24,
  },
  statusCard: {
    marginBottom: 24,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  nextActionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  nextActionText: {
    marginLeft: 12,
    flex: 1,
  },
  nextDateText: {
    fontWeight: '600',
    marginTop: 4,
  },
  actionsSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryAction: {
    backgroundColor: colors.primary,
  },
  secondaryAction: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  roundsSection: {
    marginBottom: 24,
  },
  roundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  roundName: {
    flex: 1,
    marginBottom: 0,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  roundDescription: {
    marginBottom: 12,
  },
  roundDetails: {
    gap: 8,
  },
  roundDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roundFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextDateSmall: {
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
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
});
