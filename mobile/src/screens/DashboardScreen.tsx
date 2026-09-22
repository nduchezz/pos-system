import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { dashboardApi, DashboardData, ChartPoint } from '../api/dashboard.api';
import SimpleBarChart from '../components/SimpleBarChart';
import { useAuth } from '../context/AuthContext';
import { COLORS, SIZES } from '../constants/theme';

type Period = 'today' | 'week' | 'month';

const DashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, business } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [period, setPeriod] = useState<Period>('week');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [dash, chartData] = await Promise.all([
        dashboardApi.get(),
        dashboardApi.chart(period),
      ]);
      setData(dash);
      setChart(chartData);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  const changePeriod = (p: Period) => { setPeriod(p); };

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const fmt = (n: number) => `KES ${n.toFixed(2)}`;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Greeting */}
        <View style={styles.greet}>
          <Text style={styles.hello}>Hello, {user?.name?.split(' ')[0]} 👋</Text>
          <Text style={styles.bizName}>{business?.name}</Text>
        </View>

        {/* Today's Revenue */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>TODAY'S REVENUE</Text>
          <Text style={styles.heroValue}>{fmt(data?.today.grossRevenue ?? 0)}</Text>
          <Text style={styles.heroSub}>
            {data?.today.totalSales ?? 0} sales · {data?.today.totalItemsSold ?? 0} items
          </Text>
        </View>

        {/* Stat grid */}
        <View style={styles.grid}>
          <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
            <Text style={styles.statIcon}>📈</Text>
            <Text style={styles.statLabel}>Gross Profit</Text>
            <Text style={styles.statValue}>{fmt(data?.today.grossProfit ?? 0)}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}>
            <Text style={styles.statIcon}>💸</Text>
            <Text style={styles.statLabel}>Expenses</Text>
            <Text style={styles.statValue}>{fmt(data?.today.expenses ?? 0)}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
            <Text style={styles.statIcon}>💰</Text>
            <Text style={styles.statLabel}>Net Profit</Text>
            <Text style={styles.statValue}>{fmt(data?.today.netProfit ?? 0)}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FCE4EC' }]}>
            <Text style={styles.statIcon}>📦</Text>
            <Text style={styles.statLabel}>Stock Value</Text>
            <Text style={styles.statValue}>
              {fmt(data?.inventory.inventoryValue ?? 0)}
            </Text>
          </View>
        </View>

        {/* Payment methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today by Payment Method</Text>
          <View style={styles.payRow}>
            <View style={styles.payItem}>
              <Text style={styles.payIcon}>💵</Text>
              <Text style={styles.payLabel}>Cash</Text>
              <Text style={styles.payValue}>{fmt(data?.today.byPaymentMethod.CASH ?? 0)}</Text>
            </View>
            <View style={styles.payItem}>
              <Text style={styles.payIcon}>📱</Text>
              <Text style={styles.payLabel}>M-Pesa</Text>
              <Text style={styles.payValue}>{fmt(data?.today.byPaymentMethod.MPESA ?? 0)}</Text>
            </View>
            <View style={styles.payItem}>
              <Text style={styles.payIcon}>💳</Text>
              <Text style={styles.payLabel}>Card</Text>
              <Text style={styles.payValue}>{fmt(data?.today.byPaymentMethod.CARD ?? 0)}</Text>
            </View>
          </View>
        </View>

        {/* Chart */}
        <View style={styles.section}>
          <View style={styles.chartHeader}>
            <Text style={styles.sectionTitle}>Sales Trend</Text>
            <View style={styles.periodTabs}>
              {(['today', 'week', 'month'] as Period[]).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.periodTab, period === p && styles.periodTabActive]}
                  onPress={() => changePeriod(p)}
                >
                  <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <SimpleBarChart
            data={chart.map((c) => ({ label: c.label, value: c.value }))}
            formatValue={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0))}
          />
        </View>

        {/* Inventory snapshot */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Inventory Snapshot</Text>
          <View style={styles.invRow}>
            <View style={styles.invItem}>
              <Text style={styles.invValue}>{data?.inventory.totalProducts ?? 0}</Text>
              <Text style={styles.invLabel}>Products</Text>
            </View>
            <View style={styles.invItem}>
              <Text style={[styles.invValue, { color: COLORS.warning }]}>
                {data?.inventory.lowStock ?? 0}
              </Text>
              <Text style={styles.invLabel}>Low Stock</Text>
            </View>
            <View style={styles.invItem}>
              <Text style={[styles.invValue, { color: COLORS.danger }]}>
                {data?.inventory.outOfStock ?? 0}
              </Text>
              <Text style={styles.invLabel}>Out of Stock</Text>
            </View>
          </View>
        </View>

        {/* Quick actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate('POSTab')}
            >
              <Text style={styles.actionIcon}>🛒</Text>
              <Text style={styles.actionLabel}>New Sale</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate('MoreTab', { screen: 'Products' })}
            >
              <Text style={styles.actionIcon}>➕</Text>
              <Text style={styles.actionLabel}>Add Product</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate('InventoryTab')}
            >
              <Text style={styles.actionIcon}>📦</Text>
              <Text style={styles.actionLabel}>Inventory</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate('ReportsTab')}
            >
              <Text style={styles.actionIcon}>📊</Text>
              <Text style={styles.actionLabel}>Reports</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: SIZES.md, paddingBottom: SIZES.xl },
  greet: { marginBottom: SIZES.md },
  hello: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  bizName: { fontSize: 14, color: COLORS.primary, fontWeight: '600', marginTop: 2 },
  heroCard: {
    backgroundColor: COLORS.primary, borderRadius: 14,
    padding: SIZES.lg, marginBottom: SIZES.md,
  },
  heroLabel: { fontSize: 12, color: '#E8F5E9', fontWeight: '600', letterSpacing: 1 },
  heroValue: { fontSize: 32, color: COLORS.white, fontWeight: '700', marginTop: 4 },
  heroSub: { fontSize: 13, color: '#E8F5E9', marginTop: 4 },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'space-between', marginBottom: SIZES.sm,
  },
  statCard: {
    width: '48.5%', borderRadius: 12, padding: SIZES.md,
    marginBottom: SIZES.sm,
  },
  statIcon: { fontSize: 20 },
  statLabel: { fontSize: 11, color: COLORS.text, marginTop: 4, fontWeight: '600' },
  statValue: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: 2 },
  section: {
    backgroundColor: COLORS.white, borderRadius: 12,
    padding: SIZES.md, marginTop: SIZES.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: SIZES.sm },
  payRow: { flexDirection: 'row', justifyContent: 'space-between' },
  payItem: { flex: 1, alignItems: 'center' },
  payIcon: { fontSize: 22 },
  payLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4 },
  payValue: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginTop: 2 },
  chartHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: SIZES.sm,
  },
  periodTabs: { flexDirection: 'row', backgroundColor: COLORS.background, borderRadius: 8, padding: 2 },
  periodTab: { paddingHorizontal: SIZES.sm, paddingVertical: 4, borderRadius: 6 },
  periodTabActive: { backgroundColor: COLORS.primary },
  periodText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  periodTextActive: { color: COLORS.white },
  invRow: { flexDirection: 'row', justifyContent: 'space-around' },
  invItem: { alignItems: 'center' },
  invValue: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  invLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actionBtn: {
    flex: 1, alignItems: 'center', paddingVertical: SIZES.sm,
    marginHorizontal: 2,
  },
  actionIcon: { fontSize: 24 },
  actionLabel: { fontSize: 10, color: COLORS.text, marginTop: 4, fontWeight: '600', textAlign: 'center' },
});

export default DashboardScreen;
