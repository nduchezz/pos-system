import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { salesApi, Sale } from '../api/sales.api';
import ReceiptModal from '../components/ReceiptModal';
import { COLORS, SIZES } from '../constants/theme';

const SalesHistoryScreen: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const loadSales = useCallback(async () => {
    try {
      const data = await salesApi.list({ limit: 100 });
      setSales(data);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load sales');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSales();
    }, [loadSales])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadSales();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return COLORS.success;
      case 'REFUNDED': return COLORS.warning;
      case 'CANCELLED': return COLORS.danger;
      default: return COLORS.gray;
    }
  };

  const renderItem = ({ item }: { item: Sale }) => (
    <TouchableOpacity style={styles.saleItem} onPress={() => setSelectedSale(item)}>
      <View style={{ flex: 1 }}>
        <View style={styles.topRow}>
          <Text style={styles.receiptNo}>{item.receiptNo}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.meta}>
          {new Date(item.createdAt).toLocaleString()}
        </Text>
        <Text style={styles.meta}>
          {item.user?.name || 'N/A'} • {item.items.length} item(s) • {item.paymentMethod}
        </Text>
        {item.customer && (
          <Text style={styles.customer}>Customer: {item.customer.name}</Text>
        )}
      </View>
      <View style={styles.amountCol}>
        <Text style={styles.amount}>KES {item.grandTotal.toFixed(2)}</Text>
        <Text style={styles.viewHint}>Tap to view →</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={sales}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No sales yet.</Text>
              <Text style={styles.emptyHint}>Complete a sale in the POS tab.</Text>
            </View>
          }
        />
      )}

      <ReceiptModal
        sale={selectedSale}
        visible={!!selectedSale}
        onClose={() => setSelectedSale(null)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: SIZES.md, paddingBottom: 40 },
  saleItem: {
    backgroundColor: COLORS.white, borderRadius: 12,
    padding: SIZES.md, marginBottom: SIZES.sm,
    borderWidth: 1, borderColor: COLORS.border,
    flexDirection: 'row', alignItems: 'center',
  },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  receiptNo: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginRight: 8 },
  statusBadge: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },
  statusText: { fontSize: 9, fontWeight: '700', color: COLORS.white },
  meta: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  customer: { fontSize: 11, color: COLORS.primary, marginTop: 2, fontWeight: '600' },
  amountCol: { alignItems: 'flex-end', marginLeft: SIZES.sm },
  amount: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  viewHint: { fontSize: 10, color: COLORS.gray, marginTop: 4 },
  empty: { alignItems: 'center', marginTop: SIZES.xxl },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, fontWeight: '600' },
  emptyHint: { fontSize: 14, color: COLORS.gray, marginTop: SIZES.xs },
});

export default SalesHistoryScreen;
