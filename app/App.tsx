import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { SettingsProvider, useSettings } from './src/context/SettingsContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { DataProvider } from './src/context/DataContext';
import { SmsProvider } from './src/context/SmsContext';
import { startLinkListener } from './src/utils/inbound';
import AuthScreen from './src/screens/AuthScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';
import TransactionFormScreen from './src/screens/TransactionFormScreen';
import AccountsScreen from './src/screens/AccountsScreen';
import AccountFormScreen from './src/screens/AccountFormScreen';
import ImportScreen from './src/screens/ImportScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import BudgetScreen from './src/screens/BudgetScreen';
import InsightsScreen from './src/screens/InsightsScreen';
import MoreScreen from './src/screens/MoreScreen';
import BudgetWatcher from './src/context/BudgetWatcher';
import { useData } from './src/context/DataContext';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

const hidden = { tabBarItemStyle: { display: 'none' as const } };

function Main() {
  const { t, colors } = useSettings();
  const { pending } = useData();
  const icon = (e: string) => () => <Text style={{ fontSize: 20 }}>{e}</Text>;
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen name="Home" component={DashboardScreen} options={{ title: t('tabHome'), tabBarIcon: icon('📊') }} />
      <Tabs.Screen name="Transactions" component={TransactionsScreen} options={{ title: t('tabTransactions'), tabBarIcon: icon('🧾') }} />
      <Tabs.Screen name="Budget" component={BudgetScreen} options={{ title: t('tabBudget'), tabBarIcon: icon('🎯') }} />
      <Tabs.Screen name="Insights" component={InsightsScreen} options={{ title: t('tabInsights'), tabBarIcon: icon('📈') }} />
      <Tabs.Screen name="More" component={MoreScreen} options={{ title: t('tabMore'), tabBarIcon: icon('☰'), tabBarBadge: pending.length > 0 ? pending.length : undefined }} />
      {/* reachable from "More" and the Transactions screen; hidden from the bar so the tab bar stays on screen */}
      <Tabs.Screen name="Import" component={ImportScreen} options={hidden} />
      <Tabs.Screen name="Accounts" component={AccountsScreen} options={hidden} />
      <Tabs.Screen name="Settings" component={SettingsScreen} options={hidden} />
    </Tabs.Navigator>
  );
}

function Root() {
  const { t, colors, isDark, ready } = useSettings();
  const { user, loading } = useAuth();
  React.useEffect(() => startLinkListener(), []);
  const base = isDark ? DarkTheme : DefaultTheme;
  const theme = { ...base, colors: { ...base.colors, background: colors.bg, card: colors.card, text: colors.text, border: colors.border, primary: colors.primary } };

  if (!ready || loading) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}><ActivityIndicator color={colors.primary} /></View>;
  }
  return (
    <NavigationContainer theme={theme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {user ? (
        <DataProvider>
          <SmsProvider>
          <BudgetWatcher />
          <Stack.Navigator>
            <Stack.Screen name="Main" component={Main} options={{ headerShown: false }} />
            <Stack.Screen name="TransactionForm" component={TransactionFormScreen} options={{ presentation: 'modal', title: t('addTransaction') }} />
            <Stack.Screen name="AccountForm" component={AccountFormScreen} options={{ presentation: 'modal', title: t('addAccount') }} />
          </Stack.Navigator>
          </SmsProvider>
        </DataProvider>
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Auth" component={AuthScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <AuthProvider>
          <Root />
        </AuthProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
