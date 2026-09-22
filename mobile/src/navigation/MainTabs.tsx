import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import DashboardScreen from '../screens/DashboardScreen';
import MoreScreen from '../screens/MoreScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import ProductsScreen from '../screens/ProductsScreen';
import POSScreen from '../screens/POSScreen';
import InventoryScreen from '../screens/InventoryScreen';
import SalesHistoryScreen from '../screens/SalesHistoryScreen';
import CustomersScreen from '../screens/CustomersScreen';
import SuppliersScreen from '../screens/SuppliersScreen';
import ReportsScreen from '../screens/ReportsScreen';
import ExpensesScreen from '../screens/ExpensesScreen';
import { COLORS } from '../constants/theme';
import UsersScreen from '../screens/UsersScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const MoreStack = createNativeStackNavigator();

// Placeholder for tabs we haven't built yet
const Placeholder: React.FC = () => null;

// More stack with all nested screens
const MoreStackNavigator = () => (
  <MoreStack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: COLORS.primary },
      headerTintColor: COLORS.white,
      headerTitleStyle: { fontWeight: '700' },
    }}
  >
    <MoreStack.Screen name="MoreHome" component={MoreScreen} options={{ title: 'More' }} />
    <MoreStack.Screen name="SalesHistory" component={SalesHistoryScreen} options={{ title: 'Sales History' }} />
    <MoreStack.Screen name="Categories" component={CategoriesScreen} options={{ title: 'Categories' }} />
    <MoreStack.Screen name="Products" component={ProductsScreen} options={{ title: 'Products' }} />
    <MoreStack.Screen name="Customers" component={CustomersScreen} options={{ title: 'Customers' }} />
    <MoreStack.Screen name="Suppliers" component={SuppliersScreen} options={{ title: 'Suppliers' }} />

    <MoreStack.Screen name="Expenses" component={ExpensesScreen} options={{ title: 'Expenses' }} />
    <MoreStack.Screen
      name="Users"
      component={UsersScreen}
      options={{ title: 'Users' }}
    />
    <MoreStack.Screen
      name="Settings"
      component={SettingsScreen}
      options={{ title: 'Settings' }}
    />
  </MoreStack.Navigator>

);

const MainTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: COLORS.white,
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          height: 60,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          headerTitle: 'Dashboard',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🏠</Text>,
        }}
      />
      <Tab.Screen
        name="POSTab"
        component={POSScreen}
        options={{
          title: 'POS',
          headerTitle: 'Point of Sale',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🛒</Text>,
        }}
      />
      <Tab.Screen
        name="InventoryTab"
        component={InventoryScreen}
        options={{
          title: 'Inventory',
          headerTitle: 'Inventory',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>📦</Text>,
        }}
      />
      <Tab.Screen
        name="ReportsTab"
        component={ReportsScreen}
        options={{
          title: 'Reports',
          headerTitle: 'Reports',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>📊</Text>,
        }}
      />
      <Tab.Screen
        name="MoreTab"
        component={MoreStackNavigator}
        options={{
          title: 'More',
          headerShown: false,
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>☰</Text>,
        }}
      />
    </Tab.Navigator>
  );
};

export default MainTabs;
