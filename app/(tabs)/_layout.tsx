
import React from 'react';
import { Stack } from 'expo-router';
import FloatingTabBar from '@/components/FloatingTabBar';
import type { TabBarItem } from '@/components/FloatingTabBar';
import { colors } from '@/styles/commonStyles';
import { Dimensions } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

export default function TabLayout() {
  const tabs: TabBarItem[] = [
    {
      name: 'dashboard',
      route: '/(tabs)/dashboard',
      icon: 'home',
      label: 'Dashboard',
    },
    {
      name: 'calendar',
      route: '/(tabs)/calendar',
      icon: 'calendar-today',
      label: 'Calendar',
    },
    {
      name: 'profile',
      route: '/(tabs)/profile',
      icon: 'person',
      label: 'Profile',
    },
  ];

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none',
        }}
      >
        <Stack.Screen key="dashboard" name="dashboard" />
        <Stack.Screen key="calendar" name="calendar" />
        <Stack.Screen key="profile" name="profile" />
      </Stack>
      <FloatingTabBar tabs={tabs} containerWidth={screenWidth * 0.75} />
    </>
  );
}
