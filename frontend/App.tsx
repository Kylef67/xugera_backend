import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import Dashboard from './src/screens/Dashboard';
import Categories from './src/screens/Categories';
import Transactions from './src/screens/Transactions';
import Budget from './src/screens/Budget';
import Overview from './src/screens/Overview';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <NavigationContainer>
            <StatusBar style="light" />
            <Tab.Navigator
              screenOptions={{
                headerShown: false,
                tabBarStyle: {
                  backgroundColor: '#1E1E1E',
                  borderTopWidth: 0,
                  paddingBottom: 5,
                  paddingTop: 5,
                },
                tabBarActiveTintColor: '#6B8AFE',
                tabBarInactiveTintColor: '#8E8E93',
              }}>
              <Tab.Screen
                name="Accounts"
                component={Dashboard}
                options={{
                  tabBarIcon: ({ color }) => (
                    <MaterialCommunityIcons name="wallet" size={24} color={color} />
                  ),
                }}
              />
              <Tab.Screen
                name="Categories"
                component={Categories}
                options={{
                  tabBarIcon: ({ color }) => (
                    <MaterialCommunityIcons name="chart-pie" size={24} color={color} />
                  ),
                }}
              />
              <Tab.Screen
                name="Transactions"
                component={Transactions}
                options={{
                  tabBarIcon: ({ color }) => (
                    <MaterialCommunityIcons name="receipt" size={24} color={color} />
                  ),
                }}
              />
              <Tab.Screen
                name="Budget"
                component={Budget}
                options={{
                  tabBarIcon: ({ color }) => (
                    <MaterialCommunityIcons name="chart-timeline-variant" size={24} color={color} />
                  ),
                }}
              />
              <Tab.Screen
                name="Overview"
                component={Overview}
                options={{
                  tabBarIcon: ({ color }) => (
                    <MaterialCommunityIcons name="chart-line" size={24} color={color} />
                  ),
                }}
              />
            </Tab.Navigator>
          </NavigationContainer>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
