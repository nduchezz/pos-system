import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { reportsApi, SalesReport, ProductsReport, InventoryReport } from '../api/reports.api';
import { COLORS, SIZES } from '../constants/theme';

type Tab = 'sales' | 'products' | 'inventory';
type Period = 7 | 30 | 90;

const ReportsScreen: React.FC = () => {
  const [tab, setTab] = useState<Tab>('sales');
  const [period, setPeriod] = useState<Period>(30);
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [productsReport, setProductsReport] = useState<ProductsReport | null>(null);
  const [inventoryReport, setInventoryReport] = useState<InventoryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const to = new Date().toISOString();
      const from = new Date(Date.now() - period * 86400000).toISOString();

      const [s, p, i] = await Promise.all([
        reportsApi.sales({ from, to }),
        reportsApi.products({ from, to }),
        reportsApi.inventory(),
      ]);
      setSalesReport(s);
      setProductsReport(p);
      setInventoryReport(i);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  const fmt = (n: number) => `KES ${n.toFixed(2)}`;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Tab bar */}
      <View style={styles.tabBar}>
        {([
          { v: 'sales', label: 'Sales' },
          { v: 'products', label: 'Products' },
          { v: 'inventory', label: 'Inventory' },
        ] as Array<{ v: Tab; label: string }>).map((t) => (
          <TouchableOpacity
            key={t.v}
            style={[styles.tab, tab === t.v && styles.tabActive]}
            onPress={() => setTab(t.v)}
          >
            <Text style={[styles.tabText, tab === t.v && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Period picker (only for sales & products) */}
        {tab !== 'inventory' && (
          <View style={styles.periodRow}>
            {([7, 30, 90] as Period[]).map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.periodChip, period === p && styles.periodChipActive]}
                onPress={() => setPeriod(p)}
              >
                <Text style={[styles.periodChipText, period === p && styles.periodChipTextActive]}>
                  Last {p} days
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* SALES TAB */}
        {tab === 'sales' && salesReport && (
          <>
            <View style={styles.heroCard}>
              <Text style={styles.heroLabel}>TOTAL REVENUE</Text>
              <Text style={styles.heroValue}>{fmt(salesReport.summary.revenue)}</Text>
              <Text style={styles.heroSub}>
                {salesReport.summary.totalSales} sales · {salesReport.summary.itemsSold} items
              </Text>
            </View>

            <View style={styles.metricRow}>
              <View style={[styles.metric, { backgroundColor: '#E8F5E9' }]}>
                <Text style={styles.metricLabel}>COGS</Text>
                <Text style={styles.metricValue}>{fmt(salesReport.summary.cogs)}</Text>
              </View>
              <View style={[styles.metric, { backgroundColor: '#E3F2FD' }]}>
                <Text style={styles.metricLabel}>Gross Profit</Text>
                <Text style={styles.metricValue}>{fmt(salesReport.summary.grossProfit)}</Text>
              </View>
            </View>

            <View style={styles.metricRow}>
              <View style={[styles.metric, { backgroundColor: '#FFF3E0' }]}>
                <Text style={styles.metricLabel}>Expenses</Text>
                <Text style={styles.metricValue}>{fmt(salesReport.summary.expenses)}</Text>
              </View>
              <View style={[styles.metric, {
                backgroundColor: salesReport.summary.netProfit >= 0 ? '#E8F5E9' : '#FFEBEE',
              }]}>
                <Text style={styles.metricLabel}>Net Profit</Text>
                <Text style={[styles.metricValue, {
                  color: salesReport.summary.netProfit >= 0 ? COLORS.success : COLORS.danger,
                }]}>
                  {fmt(salesReport.summary.netProfit)}
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>By Payment Method</Text>
              {Object.entries(salesReport.byPaymentMethod).map(([method, data]) => (
                <View key={method} style={styles.row}>
                  <Text style={styles.rowLabel}>{method}</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.rowValue}>{fmt(data.amount)}</Text>
                    <Text style={styles.rowSub}>{data.count} sale(s)</Text>
                  </View>
                </View>
              ))}
              {Object.keys(salesReport.byPaymentMethod).length === 0 && (
                <Text style={styles.emptyText}>No sales in this period.</Text>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Summary</Text>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Avg Sale Value</Text>
                <Text style={styles.rowValue}>{fmt(salesReport.summary.avgSaleValue)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Total Discounts</Text>
                <Text style={styles.rowValue}>{fmt(salesReport.summary.discounts)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Tax Collected</Text>
                <Text style={styles.rowValue}>{fmt(salesReport.summary.tax)}</Text>
              </View>
            </View>
          </>
        )}

        {/* PRODUCTS TAB */}
        {tab === 'products' && productsReport && (
          <>
            <Text style={styles.subHead}>🏆 Best Selling</Text>
            {productsReport.bestSelling.slice(0, 5).map((p) => (
              <View key={p.productId} style={styles.prodRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.prodName}>{p.productName}</Text>
                  <Text style={styles.prodMeta}>SKU: {p.sku}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.prodPrimary}>{p.quantitySold} sold</Text>
                  <Text style={styles.prodSecondary}>{fmt(p.revenue)}</Text>
                </View>
              </View>
            ))}

            <Text style={styles.subHead}>💰 Most Profitable</Text>
            {productsReport.mostProfitable.slice(0, 5).map((p) => (
              <View key={p.productId} style={styles.prodRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.prodName}>{p.productName}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.prodPrimary, { color: COLORS.success }]}>
                    {fmt(p.profit)}
                  </Text>
                  <Text style={styles.prodSecondary}>profit</Text>
                </View>
              </View>
            ))}

            <Text style={styles.subHead}>🐢 Slow Moving</Text>
            {productsReport.slowMoving.slice(0, 5).map((p) => (
              <View key={p.productId} style={styles.prodRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.prodName}>{p.productName}</Text>
                </View>
                <Text style={[styles.prodPrimary, { color: COLORS.warning }]}>
                  {p.quantitySold} sold
                </Text>
              </View>
            ))}
          </>
        )}

        {/* INVENTORY TAB */}
        {tab === 'inventory' && inventoryReport && (
          <>
            <View style={styles.heroCard}>
              <Text style={styles.heroLabel}>INVENTORY VALUE (at cost)</Text>
              <Text style={styles.heroValue}>
                {fmt(inventoryReport.summary.totalBuyingValue)}
              </Text>
              <Text style={styles.heroSub}>
                {inventoryReport.summary.totalProducts} products
              </Text>
            </View>

            <View style={styles.metricRow}>
              <View style={[styles.metric, { backgroundColor: '#E3F2FD' }]}>
                <Text style={styles.metricLabel}>Potential Revenue</Text>
                <Text style={styles.metricValue}>
                  {fmt(inventoryReport.summary.totalSellingValue)}
                </Text>
              </View>
              <View style={[styles.metric, {
                backgroundColor: inventoryReport.summary.potentialProfit >= 0 ? '#E8F5E9' : '#FFEBEE',
              }]}>
                <Text style={styles.metricLabel}>Potential Profit</Text>
                <Text style={[styles.metricValue, {
                  color: inventoryReport.summary.potentialProfit >= 0 ? COLORS.success : COLORS.danger,
                }]}>
                  {fmt(inventoryReport.summary.potentialProfit)}
                </Text>
              </View>
            </View>

            <View style={styles.metricRow}>
              <View style={[styles.metric, { backgroundColor: '#FFF3E0' }]}>
                <Text style={styles.metricLabel}>Low Stock</Text>
                <Text style={styles.metricValue}>{inventoryReport.summary.lowStock}</Text>
              </View>
              <View style={[styles.metric, { backgroundColor: '#FFEBEE' }]}>
                <Text style={styles.metricLabel}>Out of Stock</Text>
                <Text style={styles.metricValue}>{inventoryReport.summary.outOfStock}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Products needing attention</Text>
              {inventoryReport.products
                .filter((p) => p.status !== 'OK')
                .slice(0, 10)
                .map((p) => (
                  <View key={p.id} style={styles.prodRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.prodName}>{p.name}</Text>
                      <Text style={styles.prodMeta}>
                        {p.stockQuantity}/{p.minStock} {p.unit}
                      </Text>
                    </View>
                    <View style={[styles.statusPill, {
                      backgroundColor: p.status === 'OUT' ? '#FFEBEE' : '#FFF3E0',
                    }]}>
                      <Text style={[styles.statusPillText, {
                        color: p.status === 'OUT' ? COLORS.danger : COLORS.warning,
                      }]}>
                        {p.status}
                      </Text>
                    </View>
                  </View>
                ))}
              {inventoryReport.products.filter((p) => p.status !== 'OK').length === 0 && (
                <Text style={styles.emptyText}>All products are healthy! 🎉</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabBar: {
    flexDirection: 'row', backgroundColor: COLORS.white,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  tab: { flex: 1, paddingVertical: SIZES.md, alignItems: 'center' },
  tabActive: { borderBottomWidth: 3, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.primary, fontWeight: '700' },
  content: { padding: SIZES.md, paddingBottom: SIZES.xl },
  periodRow: { flexDirection: 'row', gap: 6, marginBottom: SIZES.md },
  periodChip: {
    paddingHorizontal: SIZES.md, paddingVertical: 6, borderRadius: 20,
    backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border,
  },
  periodChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  periodChipText: { fontSize: 12, color: COLORS.text, fontWeight: '600' },
  periodChipTextActive: { color: COLORS.white },
  heroCard: {
    backgroundColor: COLORS.primary, borderRadius: 14,
    padding: SIZES.lg, marginBottom: SIZES.md,
  },
  heroLabel: { fontSize: 11, color: '#E8F5E9', fontWeight: '600', letterSpacing: 1 },
  heroValue: { fontSize: 28, color: COLORS.white, fontWeight: '700', marginTop: 4 },
  heroSub: { fontSize: 12, color: '#E8F5E9', marginTop: 4 },
  metricRow: { flexDirection: 'row', gap: SIZES.sm, marginBottom: SIZES.sm },
  metric: { flex: 1, borderRadius: 12, padding: SIZES.md },
  metricLabel: { fontSize: 11, color: COLORS.text, fontWeight: '600' },
  metricValue: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: 4 },
  section: {
    backgroundColor: COLORS.white, borderRadius: 12,
    padding: SIZES.md, marginTop: SIZES.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: SIZES.sm },
  subHead: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginTop: SIZES.md, marginBottom: SIZES.sm },
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: SIZES.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  rowLabel: { fontSize: 14, color: COLORS.textSecondary },
  rowValue: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  rowSub: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  prodRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: SIZES.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  prodName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  prodMeta: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  prodPrimary: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  prodSecondary: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusPillText: { fontSize: 10, fontWeight: '700' },
  emptyText: { fontSize: 13, color: COLORS.gray, textAlign: 'center', paddingVertical: SIZES.md },
});

export default ReportsScreen;
