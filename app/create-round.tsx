
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

interface RoundData {
  name: string;
  description: string;
  currency: string;
  contributionAmount: string;
  organizerParticipates: boolean;
  startType: 'immediate' | 'future' | 'in-progress';
  startDate?: Date;
  manualDateInput: string;
  contributionFrequency: 'weekly' | 'monthly' | 'biweekly';
  numberOfMembers: string;
  payoutOrder: 'fixed' | 'random';
  gracePeriodDays: string;
  conflictResolutionEnabled: boolean;
  paymentVerification: 'optional' | 'mandatory';
}

export default function CreateRoundScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [creating, setCreating] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [roundData, setRoundData] = useState<RoundData>({
    name: '',
    description: '',
    currency: 'USD',
    contributionAmount: '',
    organizerParticipates: true,
    startType: 'immediate',
    manualDateInput: '',
    contributionFrequency: 'monthly',
    numberOfMembers: '',
    payoutOrder: 'fixed',
    gracePeriodDays: '3',
    conflictResolutionEnabled: true,
    paymentVerification: 'optional',
  });

  const updateField = (field: keyof RoundData, value: any) => {
    console.log('Create Round: User updated field:', field, value);
    setRoundData(prev => ({ ...prev, [field]: value }));
  };

  const goToNextStep = () => {
    console.log('Create Round: User moved to step', currentStep + 1);
    setCurrentStep(prev => prev + 1);
  };

  const goToPreviousStep = () => {
    console.log('Create Round: User went back to step', currentStep - 1);
    setCurrentStep(prev => prev - 1);
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setErrorModalVisible(true);
  };

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    console.log('Create Round: Date picker event:', event.type, selectedDate);
    
    // On Android, the picker auto-closes, so we need to close it manually
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    // Handle date selection
    if (event.type === 'set' && selectedDate) {
      console.log('Create Round: Date selected:', selectedDate.toISOString());
      updateField('startDate', selectedDate);
      const formattedDate = formatDateForInput(selectedDate);
      updateField('manualDateInput', formattedDate);
      
      // On Android, close the picker after selection
      if (Platform.OS === 'android') {
        setShowDatePicker(false);
      }
    } else if (event.type === 'dismissed') {
      console.log('Create Round: Date picker dismissed');
      setShowDatePicker(false);
    }
    
    // On iOS, the date changes continuously as user scrolls, so we update in real-time
    // The modal has a "Done" button to confirm
    if (Platform.OS === 'ios' && selectedDate) {
      updateField('startDate', selectedDate);
      const formattedDate = formatDateForInput(selectedDate);
      updateField('manualDateInput', formattedDate);
    }
  };

  const formatDateForInput = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const parseManualDate = (input: string): Date | null => {
    const parts = input.split('/');
    if (parts.length !== 3) {
      return null;
    }
    
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    
    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      return null;
    }
    
    if (day < 1 || day > 31 || month < 0 || month > 11 || year < 1900 || year > 2100) {
      return null;
    }
    
    const date = new Date(year, month, day);
    
    if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
      return null;
    }
    
    return date;
  };

  const handleManualDateChange = (text: string) => {
    console.log('Create Round: Manual date input:', text);
    
    // Remove any non-numeric characters except /
    let cleaned = text.replace(/[^\d/]/g, '');
    
    // Auto-format with slashes as user types
    if (cleaned.length >= 2 && cleaned.charAt(2) !== '/' && text.length > roundData.manualDateInput.length) {
      cleaned = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
    }
    if (cleaned.length >= 5 && cleaned.charAt(5) !== '/' && text.length > roundData.manualDateInput.length) {
      cleaned = cleaned.slice(0, 5) + '/' + cleaned.slice(5);
    }
    
    // Limit to DD/MM/YYYY format
    if (cleaned.length > 10) {
      cleaned = cleaned.slice(0, 10);
    }
    
    updateField('manualDateInput', cleaned);
    
    // Try to parse the date if it's complete
    if (cleaned.length === 10) {
      const parsedDate = parseManualDate(cleaned);
      if (parsedDate) {
        console.log('Create Round: Valid date parsed:', parsedDate.toISOString());
        updateField('startDate', parsedDate);
      } else {
        console.log('Create Round: Invalid date format');
        updateField('startDate', undefined);
      }
    } else if (cleaned.length < 10) {
      // Clear the date if input is incomplete
      updateField('startDate', undefined);
    }
  };

  const handleCreateRound = async () => {
    try {
      setCreating(true);
      console.log('[Create Round] Creating round with data:', roundData);
      
      const { authenticatedPost } = await import('@/utils/api');
      
      let startDateISO: string | undefined;
      if (roundData.startType === 'immediate') {
        startDateISO = new Date().toISOString();
      } else if (roundData.startType === 'future' || roundData.startType === 'in-progress') {
        if (!roundData.startDate) {
          showError('Please select a start date');
          setCreating(false);
          return;
        }
        startDateISO = roundData.startDate.toISOString();
      }
      
      const payload = {
        name: roundData.name,
        description: roundData.description || undefined,
        currency: roundData.currency,
        contributionAmount: parseFloat(roundData.contributionAmount),
        organizerParticipates: roundData.organizerParticipates,
        contributionFrequency: roundData.contributionFrequency,
        numberOfMembers: parseInt(roundData.numberOfMembers),
        payoutOrder: roundData.payoutOrder,
        startType: roundData.startType,
        startDate: startDateISO,
        gracePeriodDays: parseInt(roundData.gracePeriodDays),
        conflictResolutionEnabled: roundData.conflictResolutionEnabled,
        paymentVerification: roundData.paymentVerification,
      };
      
      console.log('[Create Round] Sending payload:', payload);
      const createdRound = await authenticatedPost('/api/rounds', payload);
      console.log('[Create Round] Round created successfully:', createdRound);
      
      router.replace(`/round/${createdRound.id}`);
    } catch (error: any) {
      console.error('[Create Round] Error creating round:', error);
      showError(error.message || 'Failed to create round. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const canProceedStep1 = roundData.name.trim() !== '' && roundData.contributionAmount !== '';
  const canProceedStep2 = roundData.numberOfMembers !== '' && parseInt(roundData.numberOfMembers) > 0;
  const canProceedStep3 = true;

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={commonStyles.subtitle}>Step 1: Basics</Text>
      <Text style={[commonStyles.textSecondary, styles.stepDescription]}>
        Define what your round is about
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Round Name *</Text>
        <TextInput
          style={styles.input}
          value={roundData.name}
          onChangeText={(text) => updateField('name', text)}
          placeholder="e.g., Family Savings Circle"
          placeholderTextColor={colors.textLight}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={roundData.description}
          onChangeText={(text) => updateField('description', text)}
          placeholder="What is this round for?"
          placeholderTextColor={colors.textLight}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Currency</Text>
        <View style={styles.currencyRow}>
          {['$', '€', '£'].map((curr) => (
            <TouchableOpacity
              key={curr}
              style={[
                styles.currencyButton,
                roundData.currency === curr && styles.currencyButtonActive,
              ]}
              onPress={() => updateField('currency', curr)}
            >
              <Text
                style={[
                  styles.currencyButtonText,
                  roundData.currency === curr && styles.currencyButtonTextActive,
                ]}
              >
                {curr}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Contribution Amount (per person, per cycle) *</Text>
        <TextInput
          style={styles.input}
          value={roundData.contributionAmount}
          onChangeText={(text) => updateField('contributionAmount', text)}
          placeholder="100"
          placeholderTextColor={colors.textLight}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Will you participate in this round?</Text>
        <View style={styles.optionGroup}>
          {[
            { value: true, label: 'Yes, I am participating', desc: 'You will be included as a member and contribute' },
            { value: false, label: 'No, I am only organising', desc: 'You will manage the round but not contribute' },
          ].map((option) => (
            <TouchableOpacity
              key={option.value.toString()}
              style={[
                styles.optionCard,
                roundData.organizerParticipates === option.value && styles.optionCardActive,
              ]}
              onPress={() => updateField('organizerParticipates', option.value)}
            >
              <View style={styles.optionHeader}>
                <View
                  style={[
                    styles.radio,
                    roundData.organizerParticipates === option.value && styles.radioActive,
                  ]}
                />
                <Text style={styles.optionLabel}>{option.label}</Text>
              </View>
              <Text style={commonStyles.textSecondary}>{option.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.nextButton, !canProceedStep1 && styles.buttonDisabled]}
        onPress={goToNextStep}
        disabled={!canProceedStep1}
      >
        <Text style={styles.nextButtonText}>Continue</Text>
        <IconSymbol
          ios_icon_name="arrow.right"
          android_material_icon_name="arrow-forward"
          size={20}
          color="#FFFFFF"
        />
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => {
    const selectedDateText = roundData.startDate 
      ? roundData.startDate.toLocaleDateString('en-US', { 
          weekday: 'short', 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        })
      : 'Select Date';

    return (
      <View style={styles.stepContent}>
        <Text style={commonStyles.subtitle}>Step 2: Schedule</Text>
        <Text style={[commonStyles.textSecondary, styles.stepDescription]}>
          Define when the round runs and how payouts rotate
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Start Type</Text>
          <View style={styles.optionGroup}>
            {[
              { value: 'immediate', label: 'Start Immediately', desc: 'Begin as soon as members join' },
              { value: 'future', label: 'Start on a Future Date', desc: 'Schedule a specific start date' },
              { value: 'in-progress', label: 'Already in Progress', desc: 'Round has already started' },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionCard,
                  roundData.startType === option.value && styles.optionCardActive,
                ]}
                onPress={() => {
                  updateField('startType', option.value);
                  if (option.value === 'immediate') {
                    updateField('startDate', undefined);
                    updateField('manualDateInput', '');
                  }
                }}
              >
                <View style={styles.optionHeader}>
                  <View
                    style={[
                      styles.radio,
                      roundData.startType === option.value && styles.radioActive,
                    ]}
                  />
                  <Text style={styles.optionLabel}>{option.label}</Text>
                </View>
                <Text style={commonStyles.textSecondary}>{option.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {(roundData.startType === 'future' || roundData.startType === 'in-progress') && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {roundData.startType === 'future' ? 'Start Date *' : 'Start Date (Past) *'}
            </Text>
            
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => {
                console.log('Create Round: User tapped date button to open picker');
                setShowDatePicker(true);
              }}
            >
              <Text style={[
                styles.dateButtonText,
                !roundData.startDate && styles.dateButtonPlaceholder
              ]}>
                {selectedDateText}
              </Text>
              <IconSymbol
                ios_icon_name="calendar"
                android_material_icon_name="calendar-today"
                size={20}
                color={colors.primary}
              />
            </TouchableOpacity>

            <Text style={[commonStyles.textSecondary, { marginTop: 12, marginBottom: 8 }]}>
              Or enter date manually (DD/MM/YYYY):
            </Text>
            <TextInput
              style={styles.input}
              value={roundData.manualDateInput}
              onChangeText={handleManualDateChange}
              placeholder="DD/MM/YYYY"
              placeholderTextColor={colors.textLight}
              keyboardType="default"
              maxLength={10}
            />
            
            {roundData.startDate && (
              <View style={styles.selectedDateDisplay}>
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check-circle"
                  size={16}
                  color={colors.success}
                />
                <Text style={[commonStyles.textSecondary, { marginLeft: 6 }]}>
                  Selected: {roundData.startDate.toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </Text>
              </View>
            )}
          </View>
        )}



        <View style={styles.inputGroup}>
          <Text style={styles.label}>Contribution Frequency</Text>
          <View style={styles.frequencyRow}>
            {[
              { value: 'weekly', label: 'Weekly' },
              { value: 'biweekly', label: 'Bi-weekly' },
              { value: 'monthly', label: 'Monthly' },
            ].map((freq) => (
              <TouchableOpacity
                key={freq.value}
                style={[
                  styles.frequencyButton,
                  roundData.contributionFrequency === freq.value && styles.frequencyButtonActive,
                ]}
                onPress={() => updateField('contributionFrequency', freq.value)}
              >
                <Text
                  style={[
                    styles.frequencyButtonText,
                    roundData.contributionFrequency === freq.value && styles.frequencyButtonTextActive,
                  ]}
                >
                  {freq.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Number of Members *</Text>
          <TextInput
            style={styles.input}
            value={roundData.numberOfMembers}
            onChangeText={(text) => updateField('numberOfMembers', text)}
            placeholder="e.g., 10"
            placeholderTextColor={colors.textLight}
            keyboardType="numeric"
          />
          <Text style={commonStyles.textSecondary}>
            Total number of people in this round (including you)
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Payout Order</Text>
          <View style={styles.optionGroup}>
            {[
              { value: 'fixed', label: 'Fixed Order', desc: 'Members receive payouts in a set sequence' },
              { value: 'random', label: 'Random Order', desc: 'Payout order is randomized each cycle' },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionCard,
                  roundData.payoutOrder === option.value && styles.optionCardActive,
                ]}
                onPress={() => updateField('payoutOrder', option.value)}
              >
                <View style={styles.optionHeader}>
                  <View
                    style={[
                      styles.radio,
                      roundData.payoutOrder === option.value && styles.radioActive,
                    ]}
                  />
                  <Text style={styles.optionLabel}>{option.label}</Text>
                </View>
                <Text style={commonStyles.textSecondary}>{option.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.backButton} onPress={goToPreviousStep}>
            <IconSymbol
              ios_icon_name="arrow.left"
              android_material_icon_name="arrow-back"
              size={20}
              color={colors.primary}
            />
            <Text style={[styles.backButtonText]}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.nextButton, styles.nextButtonFlex, !canProceedStep2 && styles.buttonDisabled]}
            onPress={goToNextStep}
            disabled={!canProceedStep2}
          >
            <Text style={styles.nextButtonText}>Continue</Text>
            <IconSymbol
              ios_icon_name="arrow.right"
              android_material_icon_name="arrow-forward"
              size={20}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={commonStyles.subtitle}>Step 3: Rules & Trust Controls</Text>
      <Text style={[commonStyles.textSecondary, styles.stepDescription]}>
        Set expectations and reduce disputes
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Late Payment Grace Period</Text>
        <TextInput
          style={styles.input}
          value={roundData.gracePeriodDays}
          onChangeText={(text) => updateField('gracePeriodDays', text)}
          placeholder="3"
          placeholderTextColor={colors.textLight}
          keyboardType="numeric"
        />
        <Text style={commonStyles.textSecondary}>
          Number of days after due date before marking as late
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Conflict Resolution</Text>
        <TouchableOpacity
          style={styles.toggleRow}
          onPress={() => updateField('conflictResolutionEnabled', !roundData.conflictResolutionEnabled)}
        >
          <View style={styles.toggleInfo}>
            <Text style={commonStyles.text}>Enable Conflict Resolution</Text>
            <Text style={commonStyles.textSecondary}>
              Allow members to report and resolve disputes
            </Text>
          </View>
          <View
            style={[
              styles.toggle,
              roundData.conflictResolutionEnabled && styles.toggleActive,
            ]}
          >
            <View
              style={[
                styles.toggleThumb,
                roundData.conflictResolutionEnabled && styles.toggleThumbActive,
              ]}
            />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Payment Verification</Text>
        <View style={styles.optionGroup}>
          {[
            { value: 'optional', label: 'Optional', desc: 'Members can upload proof, but it&apos;s not required' },
            { value: 'mandatory', label: 'Mandatory', desc: 'Members must upload proof of payment' },
          ].map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionCard,
                roundData.paymentVerification === option.value && styles.optionCardActive,
              ]}
              onPress={() => updateField('paymentVerification', option.value)}
            >
              <View style={styles.optionHeader}>
                <View
                  style={[
                    styles.radio,
                    roundData.paymentVerification === option.value && styles.radioActive,
                  ]}
                />
                <Text style={styles.optionLabel}>{option.label}</Text>
              </View>
              <Text style={commonStyles.textSecondary}>{option.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.backButton} onPress={goToPreviousStep}>
          <IconSymbol
            ios_icon_name="arrow.left"
            android_material_icon_name="arrow-back"
            size={20}
            color={colors.primary}
          />
          <Text style={[styles.backButtonText]}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextButton, styles.nextButtonFlex]}
          onPress={goToNextStep}
        >
          <Text style={styles.nextButtonText}>Review</Text>
          <IconSymbol
            ios_icon_name="arrow.right"
            android_material_icon_name="arrow-forward"
            size={20}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep4 = () => {
    const startTypeLabel = roundData.startType === 'immediate' ? 'Start Immediately' :
      roundData.startType === 'future' ? 'Start on Future Date' : 'Already in Progress';
    const payoutOrderLabel = roundData.payoutOrder === 'fixed' ? 'Fixed Order' : 'Random Order';
    const verificationLabel = roundData.paymentVerification === 'optional' ? 'Optional' : 'Mandatory';
    const participationLabel = roundData.organizerParticipates ? 'Yes, participating' : 'No, only organising';

    return (
      <View style={styles.stepContent}>
        <Text style={commonStyles.subtitle}>Step 4: Review & Confirm</Text>
        <Text style={[commonStyles.textSecondary, styles.stepDescription]}>
          Review your round details before creating
        </Text>

        <View style={[commonStyles.card, styles.reviewCard]}>
          <Text style={styles.reviewSectionTitle}>Basics</Text>
          <View style={styles.reviewRow}>
            <Text style={commonStyles.textSecondary}>Name:</Text>
            <Text style={commonStyles.text}>{roundData.name}</Text>
          </View>
          {roundData.description && (
            <View style={styles.reviewRow}>
              <Text style={commonStyles.textSecondary}>Description:</Text>
              <Text style={commonStyles.text}>{roundData.description}</Text>
            </View>
          )}
          <View style={styles.reviewRow}>
            <Text style={commonStyles.textSecondary}>Contribution:</Text>
            <Text style={commonStyles.text}>
              {roundData.currency} {roundData.contributionAmount}
            </Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={commonStyles.textSecondary}>Your Participation:</Text>
            <Text style={commonStyles.text}>{participationLabel}</Text>
          </View>
        </View>

        <View style={[commonStyles.card, styles.reviewCard]}>
          <Text style={styles.reviewSectionTitle}>Schedule</Text>
          <View style={styles.reviewRow}>
            <Text style={commonStyles.textSecondary}>Start:</Text>
            <Text style={commonStyles.text}>{startTypeLabel}</Text>
          </View>
          {roundData.startDate && (
            <View style={styles.reviewRow}>
              <Text style={commonStyles.textSecondary}>Start Date:</Text>
              <Text style={commonStyles.text}>
                {roundData.startDate.toLocaleDateString()}
              </Text>
            </View>
          )}
          <View style={styles.reviewRow}>
            <Text style={commonStyles.textSecondary}>Frequency:</Text>
            <Text style={commonStyles.text}>
              {roundData.contributionFrequency}
            </Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={commonStyles.textSecondary}>Members:</Text>
            <Text style={commonStyles.text}>{roundData.numberOfMembers}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={commonStyles.textSecondary}>Payout Order:</Text>
            <Text style={commonStyles.text}>{payoutOrderLabel}</Text>
          </View>
        </View>

        <View style={[commonStyles.card, styles.reviewCard]}>
          <Text style={styles.reviewSectionTitle}>Rules & Trust</Text>
          <View style={styles.reviewRow}>
            <Text style={commonStyles.textSecondary}>Grace Period:</Text>
            <Text style={commonStyles.text}>{roundData.gracePeriodDays} days</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={commonStyles.textSecondary}>Conflict Resolution:</Text>
            <Text style={commonStyles.text}>
              {roundData.conflictResolutionEnabled ? 'Enabled' : 'Disabled'}
            </Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={commonStyles.textSecondary}>Payment Verification:</Text>
            <Text style={commonStyles.text}>{verificationLabel}</Text>
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.backButton} onPress={goToPreviousStep}>
            <IconSymbol
              ios_icon_name="arrow.left"
              android_material_icon_name="arrow-back"
              size={20}
              color={colors.primary}
            />
            <Text style={[styles.backButtonText]}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.createButton, styles.nextButtonFlex]}
            onPress={handleCreateRound}
            disabled={creating}
          >
            {creating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check-circle"
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.nextButtonText}>Create Round</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Create Round',
          headerBackTitle: 'Cancel',
        }}
      />
      <SafeAreaView style={commonStyles.wrapper} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.progressBar}>
            {[1, 2, 3, 4].map((step) => (
              <View
                key={step}
                style={[
                  styles.progressStep,
                  step <= currentStep && styles.progressStepActive,
                ]}
              />
            ))}
          </View>

          <ScrollView
            style={commonStyles.container}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <Modal
        visible={errorModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setErrorModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Error</Text>
            <Text style={styles.modalMessage}>{errorMessage}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setErrorModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {showDatePicker && (
        Platform.OS === 'ios' ? (
          <Modal
            visible={showDatePicker}
            transparent
            animationType="slide"
            onRequestClose={() => setShowDatePicker(false)}
          >
            <View style={styles.datePickerModalOverlay}>
              <View style={styles.datePickerModalContent}>
                <View style={styles.datePickerHeader}>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.datePickerCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.datePickerTitle}>Select Date</Text>
                  <TouchableOpacity
                    onPress={() => {
                      console.log('Create Round: User confirmed iOS date picker');
                      setShowDatePicker(false);
                    }}
                  >
                    <Text style={styles.datePickerDoneText}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={roundData.startDate || new Date()}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  minimumDate={roundData.startType === 'future' ? new Date() : undefined}
                  maximumDate={roundData.startType === 'in-progress' ? new Date() : undefined}
                  style={styles.iosDatePicker}
                />
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={roundData.startDate || new Date()}
            mode="date"
            display="default"
            onChange={handleDateChange}
            minimumDate={roundData.startType === 'future' ? new Date() : undefined}
            maximumDate={roundData.startType === 'in-progress' ? new Date() : undefined}
          />
        )
      )}
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  progressBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  progressStep: {
    flex: 1,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
  },
  progressStepActive: {
    backgroundColor: colors.primary,
  },
  stepContent: {
    paddingTop: 8,
  },
  stepDescription: {
    marginTop: 8,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 12,
  },
  currencyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  currencyButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.highlight,
  },
  currencyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  currencyButtonTextActive: {
    color: colors.primary,
  },
  optionGroup: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
  },
  optionCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.highlight,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: 12,
  },
  radioActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateButtonText: {
    fontSize: 16,
    color: colors.text,
  },
  dateButtonPlaceholder: {
    color: colors.textSecondary,
  },
  selectedDateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.highlight,
    borderRadius: 8,
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: 12,
  },
  frequencyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  frequencyButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.highlight,
  },
  frequencyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  frequencyButtonTextActive: {
    color: colors.primary,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  reviewCard: {
    marginBottom: 16,
  },
  reviewSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.backgroundAlt,
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: colors.primary,
    gap: 8,
  },
  nextButtonFlex: {
    flex: 1,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: colors.success,
    gap: 8,
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
  modalButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  datePickerModalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  datePickerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  datePickerCancelText: {
    fontSize: 17,
    color: colors.textSecondary,
  },
  datePickerDoneText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.primary,
  },
  iosDatePicker: {
    height: 216,
    backgroundColor: colors.background,
  },
});
