
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    timezone: 'UTC',
    preferredCurrency: 'USD',
  });

  useEffect(() => {
    console.log('Profile (iOS): Loading user profile');
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      console.log('Profile (iOS): Fetching user profile data');
      // TODO: Backend Integration - GET /api/users/me to fetch user profile
      setProfile({
        name: user?.name || '',
        email: user?.email || '',
        timezone: 'UTC',
        preferredCurrency: 'USD',
      });
    } catch (error) {
      console.error('Profile (iOS): Error loading profile:', error);
    }
  };

  const handleSaveProfile = async () => {
    try {
      console.log('Profile (iOS): User saved profile changes', profile);
      setLoading(true);
      // TODO: Backend Integration - PUT /api/users/me with profile data
      setEditing(false);
    } catch (error) {
      console.error('Profile (iOS): Error saving profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      console.log('Profile (iOS): User confirmed sign out');
      setShowSignOutModal(false);
      await signOut();
      router.replace('/auth');
    } catch (error) {
      console.error('Profile (iOS): Error signing out:', error);
    }
  };

  const nameDisplay = profile.name || 'User';
  const emailDisplay = profile.email || 'No email';

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Profile',
          headerLargeTitle: true,
          headerRight: editing
            ? undefined
            : () => (
                <TouchableOpacity
                  onPress={() => {
                    console.log('Profile (iOS): User tapped Edit');
                    setEditing(true);
                  }}
                >
                  <Text style={{ color: colors.primary, fontSize: 17 }}>Edit</Text>
                </TouchableOpacity>
              ),
        }}
      />
      <SafeAreaView style={commonStyles.wrapper} edges={['bottom']}>
        <ScrollView
          style={commonStyles.container}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={[commonStyles.card, styles.profileCard]}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <IconSymbol
                  ios_icon_name="person.fill"
                  android_material_icon_name="person"
                  size={48}
                  color={colors.primary}
                />
              </View>
            </View>

            {!editing ? (
              <>
                <Text style={[commonStyles.subtitle, styles.profileName]}>
                  {nameDisplay}
                </Text>
                <Text style={[commonStyles.textSecondary, styles.profileEmail]}>
                  {emailDisplay}
                </Text>
              </>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Display Name</Text>
                  <TextInput
                    style={styles.input}
                    value={profile.name}
                    onChangeText={(text) => setProfile({ ...profile, name: text })}
                    placeholder="Your name"
                    placeholderTextColor={colors.textLight}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={[styles.input, styles.inputDisabled]}
                    value={profile.email}
                    editable={false}
                    placeholderTextColor={colors.textLight}
                  />
                  <Text style={commonStyles.textSecondary}>
                    Email cannot be changed
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Time Zone</Text>
                  <TextInput
                    style={styles.input}
                    value={profile.timezone}
                    onChangeText={(text) => setProfile({ ...profile, timezone: text })}
                    placeholder="e.g., America/New_York"
                    placeholderTextColor={colors.textLight}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Preferred Currency</Text>
                  <View style={styles.currencyRow}>
                    {['USD', 'EUR', 'GBP', 'NGN'].map((curr) => (
                      <TouchableOpacity
                        key={curr}
                        style={[
                          styles.currencyButton,
                          profile.preferredCurrency === curr && styles.currencyButtonActive,
                        ]}
                        onPress={() => setProfile({ ...profile, preferredCurrency: curr })}
                      >
                        <Text
                          style={[
                            styles.currencyButtonText,
                            profile.preferredCurrency === curr && styles.currencyButtonTextActive,
                          ]}
                        >
                          {curr}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      console.log('Profile (iOS): User cancelled editing');
                      setEditing(false);
                      loadProfile();
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSaveProfile}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <IconSymbol
                          ios_icon_name="checkmark"
                          android_material_icon_name="check"
                          size={20}
                          color="#FFFFFF"
                        />
                        <Text style={styles.saveButtonText}>Save</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          <View style={styles.section}>
            <Text style={[commonStyles.subtitle, styles.sectionTitle]}>About SafeRound</Text>
            <View style={commonStyles.card}>
              <Text style={commonStyles.text}>
                SafeRound is a non-custodial platform for organizing and tracking informal community savings rounds.
              </Text>
              <View style={commonStyles.divider} />
              <Text style={commonStyles.textSecondary}>
                We never hold, move, or manage money. All contributions happen externally between members.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.signOutButton}
            onPress={() => {
              console.log('Profile (iOS): User tapped Sign Out');
              setShowSignOutModal(true);
            }}
          >
            <IconSymbol
              ios_icon_name="arrow.right.square"
              android_material_icon_name="exit-to-app"
              size={20}
              color={colors.error}
            />
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>

        <Modal
          visible={showSignOutModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSignOutModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={[commonStyles.subtitle, styles.modalTitle]}>
                Sign Out?
              </Text>
              <Text style={[commonStyles.textSecondary, styles.modalMessage]}>
                Are you sure you want to sign out of SafeRound?
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    console.log('Profile (iOS): User cancelled sign out');
                    setShowSignOutModal(false);
                  }}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmButton}
                  onPress={handleSignOut}
                >
                  <Text style={styles.modalConfirmButtonText}>Sign Out</Text>
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
    paddingBottom: 100,
  },
  profileCard: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.highlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    textAlign: 'center',
    marginBottom: 4,
  },
  profileEmail: {
    textAlign: 'center',
    marginBottom: 16,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
  },
  inputDisabled: {
    backgroundColor: colors.border,
    color: colors.textSecondary,
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  currencyButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  currencyButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.highlight,
  },
  currencyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  currencyButtonTextActive: {
    color: colors.primary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  signOutButton: {
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
  signOutButtonText: {
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
