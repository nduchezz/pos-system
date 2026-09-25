import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { COLORS, SIZES } from '../constants/theme';
import { Alert as RNAlert } from 'react-native';
import { productsRepo, categoriesRepo, customersRepo, pendingSalesRepo } from '../database';
import { syncService } from '../services/sync.service';

interface MenuItem {
  label: string;
  icon: string;
  screen: string;
  coming?: boolean;
}

const MoreScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, business, logout } = useAuth();

   const items: MenuItem[] = [
    { label: 'Sales History', icon: '🧾', screen: 'SalesHistory' },
    { label: 'Pending Sales', icon: '⏳', screen: 'PendingSales' },
    { label: 'Categories', icon: '📂', screen: 'Categories' },
    { label: 'Products', icon: '🏷️', screen: 'Products' },
    { label: 'Customers', icon: '👥', screen: 'Customers' },
    { label: 'Suppliers', icon: '🏭', screen: 'Suppliers' },
    { label: 'Expenses', icon: '💸', screen: 'Expenses' },
    { label: 'Users', icon: '👤', screen: 'Users' },
    { label: 'Settings', icon: '⚙️', screen: 'Settings' },
    { label: '🔧 Debug DB', icon: '🔍', screen: 'DEBUG_DB' },
    { label: '🔧 Force Sync', icon: '🔄', screen: 'FORCE_SYNC' },
  ];


   const handlePress = (item: MenuItem) => {
    if (item.screen === 'DEBUG_DB') {
      debugDb();
      return;
    }
    if (item.screen === 'FORCE_SYNC') {
      forceSync();
      return;
    }
    if (item.coming) {
      Alert.alert('Coming soon', `${item.label} will be added in a later phase.`);
    } else {
      navigation.navigate(item.screen);
    }
  };

  const confirmLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };
  const debugDb = async () => {
    try {
      const [pCount, cCount, cuCount, pending] = await Promise.all([
        productsRepo.count(),
        categoriesRepo.count(),
        customersRepo.count(),
        pendingSalesRepo.countPending(),
      ]);
      Alert.alert(
        'SQLite Status',
        `Products: ${pCount}\nCategories: ${cCount}\nCustomers: ${cuCount}\nPending: ${pending}`
      );
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const forceSync = async () => {
    try {
      const result = await syncService.fullSync();
      Alert.alert(
        'Sync Complete',
        `Products: ${result.catalog.products}\nCategories: ${result.catalog.categories}\nCustomers: ${result.catalog.customers}\nSales synced: ${result.sales.synced}`
      );
    } catch (err: any) {
      Alert.alert('Sync Error', err.message);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.businessCard}>
          <Text style={styles.businessName}>{business?.name}</Text>
          <Text style={styles.businessMeta}>
            {user?.name} · {user?.role}
          </Text>
          <Text style={styles.businessMeta}>{user?.email}</Text>
        </View>

        <View style={styles.menu}>
          {items.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.menuItem}
              onPress={() => handlePress(item)}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuLabel}>{item.label}</Text>
              {item.coming ? (
                <Text style={styles.comingTag}>Soon</Text>
              ) : (
                <Text style={styles.menuArrow}>›</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.version}>POS System v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SIZES.md, paddingBottom: SIZES.xl },
  businessCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: SIZES.lg,
    marginBottom: SIZES.md,
  },
  businessName: { fontSize: 20, fontWeight: '700', color: COLORS.white },
  businessMeta: { fontSize: 13, color: '#E8F5E9', marginTop: 4 },
  menu: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuIcon: { fontSize: 22, marginRight: SIZES.md },
  menuLabel: { flex: 1, fontSize: 16, color: COLORS.text, fontWeight: '500' },
  menuArrow: { fontSize: 24, color: COLORS.gray },
  comingTag: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.warning,
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  logoutBtn: {
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    paddingVertical: SIZES.md,
    alignItems: 'center',
    marginTop: SIZES.lg,
  },
  logoutText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  version: {
    textAlign: 'center',
    color: COLORS.gray,
    fontSize: 12,
    marginTop: SIZES.lg,
  },
});

export default MoreScreen;
