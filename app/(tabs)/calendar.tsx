
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { colors, commonStyles } from '@/styles/commonStyles';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

interface PayoutEvent {
  id: string;
  roundId: string;
  roundName: string;
  payoutDate: string;
  recipientUserId: string;
  recipientName: string;
  amount: number;
  currency: string;
  userRole: 'organizer' | 'member';
  status: 'scheduled' | 'completed';
}

type FilterMode = 'all' | 'organized' | 'joined';

export default function CalendarScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payouts, setPayouts] = useState<PayoutEvent[]>([]);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  useEffect(() => {
    if (user) {
      loadPayouts();
    }
  }, [user, filterMode]);

  const loadPayouts = async () => {
    try {
      setLoading(true);
      console.log('[Calendar] Loading payouts with filter:', filterMode);
      const { authenticatedGet } = await import('@/utils/api');
      const data = await authenticatedGet<{ payouts: PayoutEvent[] }>(
        `/api/calendar/payouts?filter=${filterMode}`
      );
      console.log('[Calendar] Payouts loaded:', data.payouts.length);
      setPayouts(data.payouts);
    } catch (error) {
      console.error('[Calendar] Error loading payouts:', error);
      setPayouts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPayouts();
  };

  const handleFilterModeChange = (mode: FilterMode) => {
    console.log('[Calendar] User changed filter mode to:', mode);
    setFilterMode(mode);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handlePayoutPress = (payout: PayoutEvent) => {
    console.log('[Calendar] User tapped payout:', payout.roundName);
    router.push(`/round/${payout.roundId}`);
  };

  const renderListView = () => {
    const groupedPayouts: { [key: string]: PayoutEvent[] } = {};
    
    payouts.forEach(payout => {
      const date = new Date(payout.payoutDate);
      const monthKey = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      
      if (!groupedPayouts[monthKey]) {
        groupedPayouts[monthKey] = [];
      }
      groupedPayouts[monthKey].push(payout);
    });

    const sortedMonths = Object.keys(groupedPayouts).sort((a, b) => {
      const dateA = new Date(groupedPayouts[a][0].payoutDate);
      const dateB = new Date(groupedPayouts[b][0].payoutDate);
      return dateA.getTime() - dateB.getTime();
    });

    return (
      <View style={styles.listContainer}>
        {sortedMonths.map((month, monthIndex) => (
          <View key={monthIndex} style={styles.monthSection}>
            <Text style={styles.monthSectionTitle}>{month}</Text>
            {groupedPayouts[month].map((payout, index) => (
              <TouchableOpacity
                key={index}
                style={[commonStyles.card, styles.payoutCard]}
                onPress={() => handlePayoutPress(payout)}
              >
                <View style={styles.payoutHeader}>
                  <View style={styles.payoutInfo}>
                    <Text style={commonStyles.text}>{payout.roundName}</Text>
                    <Text style={commonStyles.textSecondary}>
                      {formatDate(payout.payoutDate)}
                    </Text>
                  </View>
                  <View style={styles.payoutBadge}>
                    <Text style={styles.payoutBadgeText}>
                      {payout.userRole === 'organizer' ? 'Organizer' : 'Member'}
                    </Text>
                  </View>
                </View>
                <Text style={commonStyles.textSecondary}>
                  Recipient: {payout.recipientName}
                </Text>
                <Text style={[commonStyles.text, styles.payoutAmount]}>
                  {payout.currency} {payout.amount}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={commonStyles.wrapper} edges={['top', 'bottom']}>
        <View style={[commonStyles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[commonStyles.textSecondary, styles.loadingText]}>
            Loading calendar...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.wrapper} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={commonStyles.title}>Calendar</Text>
      </View>

      <View style={styles.controls}>
        <View style={styles.filterToggle}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterMode === 'all' && styles.filterButtonActive,
            ]}
            onPress={() => handleFilterModeChange('all')}
          >
            <Text
              style={[
                styles.filterButtonText,
                filterMode === 'all' && styles.filterButtonTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterMode === 'organized' && styles.filterButtonActive,
            ]}
            onPress={() => handleFilterModeChange('organized')}
          >
            <Text
              style={[
                styles.filterButtonText,
                filterMode === 'organized' && styles.filterButtonTextActive,
              ]}
            >
              Organized
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterMode === 'joined' && styles.filterButtonActive,
            ]}
            onPress={() => handleFilterModeChange('joined')}
          >
            <Text
              style={[
                styles.filterButtonText,
                filterMode === 'joined' && styles.filterButtonTextActive,
              ]}
            >
              Joined
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={commonStyles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {payouts.length === 0 ? (
          <View style={[commonStyles.card, styles.emptyState]}>
            <IconSymbol
              ios_icon_name="calendar"
              android_material_icon_name="calendar-today"
              size={48}
              color={colors.textSecondary}
            />
            <Text style={[commonStyles.text, styles.emptyStateTitle]}>
              No upcoming payouts
            </Text>
            <Text style={commonStyles.textSecondary}>
              Payouts from your rounds will appear here
            </Text>
          </View>
        ) : (
          renderListView()
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  controls: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  filterToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  filterButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.highlight,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterButtonTextActive: {
    color: colors.primary,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
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
    marginTop: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  listContainer: {
    marginTop: 8,
  },
  monthSection: {
    marginBottom: 24,
  },
  monthSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  payoutCard: {
    marginBottom: 12,
  },
  payoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  payoutInfo: {
    flex: 1,
  },
  payoutBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  payoutBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  payoutAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
});
