
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

interface CalendarEvent {
  id: string;
  roundId: string;
  roundName: string;
  date: string;
  eventType: 'payout' | 'contribution';
  isOrganizer: boolean;
  recipientName?: string;
  amount: number;
  currency: string;
}

type FilterMode = 'all' | 'organized' | 'joined';

export default function CalendarScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  useEffect(() => {
    if (user) {
      loadEvents();
    }
  }, [user, filterMode]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      console.log('[Calendar] Loading events with filter:', filterMode);
      const { authenticatedGet } = await import('@/utils/api');
      const data = await authenticatedGet<{ events: CalendarEvent[] }>(
        `/api/calendar/payouts?filter=${filterMode}`
      );
      console.log('[Calendar] Events loaded:', data.events.length);
      setEvents(data.events);
    } catch (error) {
      console.error('[Calendar] Error loading events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadEvents();
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

  const handleEventPress = (event: CalendarEvent) => {
    console.log('[Calendar] User tapped event:', event.roundName);
    router.push(`/round/${event.roundId}`);
  };

  const renderListView = () => {
    const organizerEvents = events.filter(e => e.isOrganizer);
    const memberEvents = events.filter(e => !e.isOrganizer);

    return (
      <View style={styles.listContainer}>
        {organizerEvents.length > 0 && (
          <View style={styles.viewSection}>
            <Text style={styles.viewSectionTitle}>Organizer View</Text>
            <Text style={[commonStyles.textSecondary, { marginBottom: 12 }]}>
              Upcoming payouts for rounds you organize
            </Text>
            {organizerEvents.map((event, index) => (
              <TouchableOpacity
                key={index}
                style={[commonStyles.card, styles.eventCard]}
                onPress={() => handleEventPress(event)}
              >
                <View style={styles.eventHeader}>
                  <View style={styles.eventInfo}>
                    <Text style={commonStyles.text}>{event.roundName}</Text>
                    <Text style={commonStyles.textSecondary}>
                      {formatDate(event.date)}
                    </Text>
                  </View>
                  <View style={[styles.eventBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.eventBadgeText}>Payout</Text>
                  </View>
                </View>
                <Text style={commonStyles.textSecondary}>
                  Recipient: {event.recipientName || 'TBD'}
                </Text>
                <Text style={[commonStyles.text, styles.eventAmount]}>
                  {event.currency} {event.amount}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {memberEvents.length > 0 && (
          <View style={styles.viewSection}>
            <Text style={styles.viewSectionTitle}>Member View</Text>
            <Text style={[commonStyles.textSecondary, { marginBottom: 12 }]}>
              Your upcoming contributions and expected payouts
            </Text>
            {memberEvents.map((event, index) => {
              const isContribution = event.eventType === 'contribution';
              const badgeColor = isContribution ? colors.warning : colors.success;
              const badgeText = isContribution ? 'Contribution Due' : 'Expected Payout';
              
              return (
                <TouchableOpacity
                  key={index}
                  style={[commonStyles.card, styles.eventCard]}
                  onPress={() => handleEventPress(event)}
                >
                  <View style={styles.eventHeader}>
                    <View style={styles.eventInfo}>
                      <Text style={commonStyles.text}>{event.roundName}</Text>
                      <Text style={commonStyles.textSecondary}>
                        {formatDate(event.date)}
                      </Text>
                    </View>
                    <View style={[styles.eventBadge, { backgroundColor: badgeColor }]}>
                      <Text style={styles.eventBadgeText}>{badgeText}</Text>
                    </View>
                  </View>
                  {!isContribution && event.recipientName && (
                    <Text style={commonStyles.textSecondary}>
                      You will receive payout
                    </Text>
                  )}
                  <Text style={[commonStyles.text, styles.eventAmount]}>
                    {event.currency} {event.amount}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
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
          {events.length === 0 ? (
            <View style={[commonStyles.card, styles.emptyState]}>
              <IconSymbol
                ios_icon_name="calendar"
                android_material_icon_name="calendar-today"
                size={48}
                color={colors.textSecondary}
              />
              <Text style={[commonStyles.text, styles.emptyStateTitle]}>
                No upcoming events
              </Text>
              <Text style={commonStyles.textSecondary}>
                Events from your rounds will appear here
              </Text>
            </View>
          ) : (
            renderListView()
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
  viewSection: {
    marginBottom: 32,
  },
  viewSectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  eventCard: {
    marginBottom: 12,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eventInfo: {
    flex: 1,
  },
  eventBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  eventBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  eventAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
});
