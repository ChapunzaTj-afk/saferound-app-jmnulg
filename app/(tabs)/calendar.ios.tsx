
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
import { Stack, useRouter } from 'expo-router';
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

type ViewMode = 'calendar' | 'list';
type FilterMode = 'all' | 'organized' | 'joined';

export default function CalendarScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payouts, setPayouts] = useState<PayoutEvent[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date());

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  const getPayoutsForMonth = (month: Date) => {
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    
    return payouts.filter(payout => {
      const payoutDate = new Date(payout.payoutDate);
      return payoutDate >= monthStart && payoutDate <= monthEnd;
    });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek };
  };

  const getPayoutsForDay = (day: number) => {
    const targetDate = new Date(
      selectedMonth.getFullYear(),
      selectedMonth.getMonth(),
      day
    );
    
    return payouts.filter(payout => {
      const payoutDate = new Date(payout.payoutDate);
      return (
        payoutDate.getDate() === day &&
        payoutDate.getMonth() === targetDate.getMonth() &&
        payoutDate.getFullYear() === targetDate.getFullYear()
      );
    });
  };

  const goToPreviousMonth = () => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handlePayoutPress = (payout: PayoutEvent) => {
    console.log('[Calendar] User tapped payout:', payout.roundName);
    router.push(`/round/${payout.roundId}`);
  };

  const renderCalendarView = () => {
    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(selectedMonth);
    const monthPayouts = getPayoutsForMonth(selectedMonth);
    const weeks = [];
    let days = [];

    const emptyDays = Array(startingDayOfWeek).fill(null);
    days.push(...emptyDays);

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
      
      if (days.length === 7) {
        weeks.push(days);
        days = [];
      }
    }

    if (days.length > 0) {
      while (days.length < 7) {
        days.push(null);
      }
      weeks.push(days);
    }

    return (
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={goToPreviousMonth} style={styles.monthNavButton}>
            <IconSymbol
              ios_icon_name="chevron.left"
              android_material_icon_name="chevron-left"
              size={24}
              color={colors.primary}
            />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{formatMonthYear(selectedMonth)}</Text>
          <TouchableOpacity onPress={goToNextMonth} style={styles.monthNavButton}>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={24}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.weekdayHeader}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
            <View key={index} style={styles.weekdayCell}>
              <Text style={styles.weekdayText}>{day}</Text>
            </View>
          ))}
        </View>

        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.weekRow}>
            {week.map((day, dayIndex) => {
              const dayPayouts = day ? getPayoutsForDay(day) : [];
              const hasPayouts = dayPayouts.length > 0;
              const isToday = day && 
                new Date().getDate() === day &&
                new Date().getMonth() === selectedMonth.getMonth() &&
                new Date().getFullYear() === selectedMonth.getFullYear();

              return (
                <TouchableOpacity
                  key={dayIndex}
                  style={[
                    styles.dayCell,
                    !day && styles.dayCellEmpty,
                    isToday && styles.dayCellToday,
                  ]}
                  disabled={!day || !hasPayouts}
                  onPress={() => {
                    if (day && hasPayouts) {
                      console.log('[Calendar] User tapped day:', day, 'with', dayPayouts.length, 'payouts');
                    }
                  }}
                >
                  {day && (
                    <>
                      <Text style={[styles.dayText, isToday && styles.dayTextToday]}>
                        {day}
                      </Text>
                      {hasPayouts && (
                        <View style={styles.payoutIndicator}>
                          <Text style={styles.payoutIndicatorText}>{dayPayouts.length}</Text>
                        </View>
                      )}
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {monthPayouts.length > 0 && (
          <View style={styles.monthPayoutsList}>
            <Text style={styles.monthPayoutsTitle}>
              Payouts this month ({monthPayouts.length})
            </Text>
            {monthPayouts.map((payout, index) => (
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
        )}
      </View>
    );
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
      <>
        <Stack.Screen options={{ title: 'Calendar', headerShown: true }} />
        <SafeAreaView style={commonStyles.wrapper} edges={['bottom']}>
          <View style={[commonStyles.container, styles.centerContent]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[commonStyles.textSecondary, styles.loadingText]}>
              Loading calendar...
            </Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Calendar', headerShown: true }} />
      <SafeAreaView style={commonStyles.wrapper} edges={['bottom']}>
        <View style={styles.controls}>
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                viewMode === 'list' && styles.toggleButtonActive,
              ]}
              onPress={() => setViewMode('list')}
            >
              <IconSymbol
                ios_icon_name="list.bullet"
                android_material_icon_name="view-list"
                size={20}
                color={viewMode === 'list' ? '#FFFFFF' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.toggleButtonText,
                  viewMode === 'list' && styles.toggleButtonTextActive,
                ]}
              >
                List
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                viewMode === 'calendar' && styles.toggleButtonActive,
              ]}
              onPress={() => setViewMode('calendar')}
            >
              <IconSymbol
                ios_icon_name="calendar"
                android_material_icon_name="calendar-today"
                size={20}
                color={viewMode === 'calendar' ? '#FFFFFF' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.toggleButtonText,
                  viewMode === 'calendar' && styles.toggleButtonTextActive,
                ]}
              >
                Calendar
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.filterToggle}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                filterMode === 'all' && styles.filterButtonActive,
              ]}
              onPress={() => setFilterMode('all')}
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
              onPress={() => setFilterMode('organized')}
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
              onPress={() => setFilterMode('joined')}
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
            <>
              {viewMode === 'calendar' && renderCalendarView()}
              {viewMode === 'list' && renderListView()}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  controls: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  toggleButtonTextActive: {
    color: '#FFFFFF',
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
  calendarContainer: {
    marginTop: 8,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthNavButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  weekdayHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.backgroundAlt,
    marginHorizontal: 2,
    position: 'relative',
  },
  dayCellEmpty: {
    backgroundColor: 'transparent',
  },
  dayCellToday: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  dayTextToday: {
    color: colors.primary,
    fontWeight: '600',
  },
  payoutIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  payoutIndicatorText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  monthPayoutsList: {
    marginTop: 24,
  },
  monthPayoutsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
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
