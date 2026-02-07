
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
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';

interface Notification {
  id: string;
  roundId?: string;
  roundName?: string;
  type: string;
  title: string;
  message: string;
  category: string;
  read: boolean;
  createdAt: string;
}

interface GroupedNotifications {
  actionRequired: Notification[];
  upcoming: Notification[];
  information: Notification[];
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<GroupedNotifications>({
    actionRequired: [],
    upcoming: [],
    information: [],
  });

  useEffect(() => {
    console.log('[Notifications] Loading notifications');
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const { authenticatedGet } = await import('@/utils/api');
      const data = await authenticatedGet<Notification[]>('/api/notifications');
      console.log('[Notifications] Notifications loaded:', data);
      
      // Group notifications by category
      const grouped: GroupedNotifications = {
        actionRequired: [],
        upcoming: [],
        information: [],
      };
      
      data.forEach(notification => {
        if (notification.category === 'action_required') {
          grouped.actionRequired.push(notification);
        } else if (notification.category === 'upcoming') {
          grouped.upcoming.push(notification);
        } else {
          grouped.information.push(notification);
        }
      });
      
      setNotifications(grouped);
    } catch (error) {
      console.error('[Notifications] Error loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    console.log('[Notifications] User pulled to refresh');
    setRefreshing(true);
    loadNotifications();
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      console.log('[Notifications] Marking notification as read:', notificationId);
      const { authenticatedPost } = await import('@/utils/api');
      await authenticatedPost(`/api/notifications/${notificationId}/mark-read`, {});
      
      // Update local state
      setNotifications(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(category => {
          const key = category as keyof GroupedNotifications;
          updated[key] = updated[key].map(n =>
            n.id === notificationId ? { ...n, read: true } : n
          );
        });
        return updated;
      });
    } catch (error) {
      console.error('[Notifications] Error marking as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      console.log('[Notifications] Marking all notifications as read');
      const { authenticatedPost } = await import('@/utils/api');
      await authenticatedPost('/api/notifications/mark-all-read', {});
      
      // Update local state
      setNotifications(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(category => {
          const key = category as keyof GroupedNotifications;
          updated[key] = updated[key].map(n => ({ ...n, read: true }));
        });
        return updated;
      });
    } catch (error) {
      console.error('[Notifications] Error marking all as read:', error);
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    console.log('[Notifications] User tapped notification:', notification.id);
    
    // Mark as read
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    
    // Navigate to round if applicable
    if (notification.roundId) {
      router.push(`/round/${notification.roundId}`);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'contribution_due':
        return 'attach-money';
      case 'payout_upcoming':
        return 'account-balance-wallet';
      case 'proof_approved':
        return 'check-circle';
      case 'proof_rejected':
        return 'cancel';
      case 'member_joined':
        return 'person-add';
      case 'round_updated':
        return 'edit';
      default:
        return 'notifications';
    }
  };

  const renderNotificationGroup = (title: string, notificationList: Notification[]) => {
    if (notificationList.length === 0) return null;

    return (
      <View style={styles.notificationGroup}>
        <Text style={styles.groupTitle}>{title}</Text>
        {notificationList.map((notification, index) => {
          const iconName = getNotificationIcon(notification.type);
          const timeAgo = formatDate(notification.createdAt);
          
          return (
            <TouchableOpacity
              key={index}
              style={[
                commonStyles.card,
                styles.notificationCard,
                !notification.read && styles.notificationCardUnread,
              ]}
              onPress={() => handleNotificationPress(notification)}
            >
              <View style={styles.notificationIcon}>
                <IconSymbol
                  ios_icon_name="circle.fill"
                  android_material_icon_name={iconName}
                  size={24}
                  color={notification.read ? colors.textSecondary : colors.primary}
                />
              </View>
              <View style={styles.notificationContent}>
                <Text style={[commonStyles.text, styles.notificationTitle]}>
                  {notification.title}
                </Text>
                <Text style={commonStyles.textSecondary}>
                  {notification.message}
                </Text>
                {notification.roundName && (
                  <Text style={[commonStyles.textSecondary, styles.roundName]}>
                    {notification.roundName}
                  </Text>
                )}
                <Text style={[commonStyles.textSecondary, styles.timeAgo]}>
                  {timeAgo}
                </Text>
              </View>
              {!notification.read && (
                <View style={styles.unreadDot} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const totalUnread = 
    notifications.actionRequired.filter(n => !n.read).length +
    notifications.upcoming.filter(n => !n.read).length +
    notifications.information.filter(n => !n.read).length;

  if (loading) {
    return (
      <View style={[commonStyles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[commonStyles.textSecondary, styles.loadingText]}>
          Loading notifications...
        </Text>
      </View>
    );
  }

  const hasNotifications = 
    notifications.actionRequired.length > 0 ||
    notifications.upcoming.length > 0 ||
    notifications.information.length > 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Notifications',
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={commonStyles.wrapper} edges={['bottom']}>
        {hasNotifications && totalUnread > 0 && (
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.markAllButton}
              onPress={handleMarkAllAsRead}
            >
              <Text style={styles.markAllButtonText}>Mark all as read</Text>
            </TouchableOpacity>
          </View>
        )}

        <ScrollView
          style={commonStyles.container}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {hasNotifications ? (
            <>
              {renderNotificationGroup('Action Required', notifications.actionRequired)}
              {renderNotificationGroup('Upcoming', notifications.upcoming)}
              {renderNotificationGroup('Information', notifications.information)}
            </>
          ) : (
            <View style={[commonStyles.card, styles.emptyState]}>
              <IconSymbol
                ios_icon_name="bell.slash"
                android_material_icon_name="notifications-off"
                size={64}
                color={colors.textLight}
              />
              <Text style={[commonStyles.text, styles.emptyText]}>
                No notifications yet
              </Text>
              <Text style={[commonStyles.textSecondary, styles.emptySubtext]}>
                You&apos;ll see updates about your rounds here
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
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
  headerActions: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  markAllButton: {
    alignSelf: 'flex-end',
  },
  markAllButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  notificationGroup: {
    marginBottom: 24,
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    position: 'relative',
  },
  notificationCardUnread: {
    backgroundColor: colors.highlight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  notificationIcon: {
    width: 40,
    alignItems: 'center',
    paddingTop: 2,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  roundName: {
    fontSize: 14,
    marginTop: 4,
    fontStyle: 'italic',
  },
  timeAgo: {
    fontSize: 12,
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    position: 'absolute',
    top: 16,
    right: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: 8,
    textAlign: 'center',
  },
});
