import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, ScrollView, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { productsApi, Product } from '../api/products.api';
import { inventoryApi, InventorySummary } from '../api/inventory.api';
import StockAdjustModal from '../components/StockAdjustModal';
import ProductHistoryModal from '../components/ProductHistoryModal';
import { COLORS, SIZES } from '../constants/theme';

type FilterType = 'ALL' | 'LOW' | 'OUT' | 'IN';

const InventoryScreen: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [search, setSearch] = useState('');

  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [prods, sum] = await Promise.all([
        productsApi.list({ search: search || undefined }),
        inventoryApi.summary(),
      ]);
      setProducts(prods);
      setSummary(sum);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    if (filter === 'OUT') return p.stockQuantity <= 0;
    if (filter === 'LOW') return p.stockQuantity > 0 && p.stockQuantity <= p.minStock;
    if (filter === 'IN') return p.stockQuantity > p.minStock;
    return true;
  });

  const getStatusBadge = (p: Product) => {
    if (p.stockQuantity <= 0) return { label: 'OUT', bg: '#FFEBEE', color: COLORS.danger };
    if (p.stockQuantity <= p.minStock) return { label: 'LOW', bg: '#FFF3E0', color: COLORS.warning };
    return { label: 'IN STOCK', bg: '#E8F5E9', color: COLORS.success };
  };

  const renderItem = ({ item }: { item: Product }) => {
    const badge = getStatusBadge(item);
    return (
      <View style={styles.item}>
        <View style={{ flex: 1 }}>
          <View style={styles.itemTopRow}>
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
            </View>
          </View>
          <Text style={styles.itemSku}>SKU: {item.sku}</Text>
          <View style={styles.itemStats}>
            <Text style={styles.statLabel}>
              Stock: <Text style={styles.statValue}>{item.stockQuantity} {item.unit}</Text>
            </Text>
            <Text style={styles.statLabel}>
              Min: <Text style={styles.statValue}>{item.minStock}</Text>
            </Text>
          </View>
          <Text style={styles.itemValue}>
            Value: KES {(item.stockQuantity * item.buyingPrice).toFixed(2)}
          </Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setAdjustProduct(item)}
          >
            <Text style={styles.actionIcon}>±</Text>
            <Text style={styles.actionLabel}>Adjust</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setHistoryProduct(item)}
          >
            <Text style={styles.actionIcon}>📋</Text>
            <Text style={styles.actionLabel}>History</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Summary cards */}
      {summary && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.summaryRow}
          contentContainerStyle={{ paddingHorizontal: SIZES.md }}
        >
          <View style={[styles.summaryCard, { backgroundColor: COLORS.primary }]}>
            <Text style={styles.summaryLabelLight}>Total Products</Text>
            <Text style={styles.summaryValueLight}>{summary.totalProducts}</Text>
            <Text style={styles.summarySubLight}>{summary.totalStockUnits} units</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#1976D2' }]}>
            <Text style={styles.summaryLabelLight}>Inventory Value</Text>
            <Text style={styles.summaryValueLight}>
              KES {summary.inventoryValueBuying.toLocaleString()}
            </Text>
            <Text style={styles.summarySubLight}>at cost</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#F57C00' }]}>
            <Text style={styles.summaryLabelLight}>Low Stock</Text>
            <Text style={styles.summaryValueLight}>{summary.lowStock}</Text>
            <Text style={styles.summarySubLight}>need restocking</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: COLORS.danger }]}>
            <Text style={styles.summaryLabelLight}>Out of Stock</Text>
            <Text style={styles.summaryValueLight}>{summary.outOfStock}</Text>
            <Text style={styles.summarySubLight}>unavailable</Text>
          </View>
        </ScrollView>
      )}

      {/* Search */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search product..."
          placeholderTextColor={COLORS.gray}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={{ paddingHorizontal: SIZES.md }}
      >
        {([
          { v: 'ALL', label: 'All' },
          { v: 'IN', label: '✅ In Stock' },
          { v: 'LOW', label: '⚠️ Low' },
          { v: 'OUT', label: '❌ Out' },
        ] as Array<{ v: FilterType; label: string }>).map((f) => (
          <TouchableOpacity
            key={f.v}
            style={[styles.chip, filter === f.v && styles.chipActive]}
            onPress={() => setFilter(f.v)}
          >
            <Text style={[styles.chipText, filter === f.v && styles.chipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No products match this filter.</Text>
            </View>
          }
        />
      )}

      {/* Modals */}
      <StockAdjustModal
        product={adjustProduct}
        visible={!!adjustProduct}
        onClose={() => setAdjustProduct(null)}
        onSuccess={() => {
          setAdjustProduct(null);
          loadData();
        }}
      />

      <ProductHistoryModal
        product={historyProduct}
        visible={!!historyProduct}
        onClose={() => setHistoryProduct(null)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  summaryRow: { paddingVertical: SIZES.md, maxHeight: 130 },
  summaryCard: {
    width: 160, borderRadius: 12, padding: SIZES.md,
    marginRight: SIZES.sm, justifyContent: 'center',
  },
  summaryLabelLight: { color: '#E8F5E9', fontSize: 12, fontWeight: '600' },
  summaryValueLight: { color: COLORS.white, fontSize: 22, fontWeight: '700', marginTop: 4 },
  summarySubLight: { color: '#E8F5E9', fontSize: 11, marginTop: 2 },
  searchWrap: {
    paddingHorizontal: SIZES.md, paddingBottom: SIZES.sm,
  },
  searchInput: {
    backgroundColor: COLORS.white, borderRadius: 10,
    paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm,
    fontSize: 14, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text,
  },
  filterRow: { maxHeight: 40, marginBottom: SIZES.sm },
  chip: {
    paddingHorizontal: SIZES.md, paddingVertical: 6,
    borderRadius: 20, backgroundColor: COLORS.white,
    borderWidth: 1, borderColor: COLORS.border,
    marginRight: SIZES.sm, height: 32, justifyContent: 'center',
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 12, color: COLORS.text, fontWeight: '600' },
  chipTextActive: { color: COLORS.white },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: SIZES.md, paddingBottom: 100 },
  item: {
    backgroundColor: COLORS.white, borderRadius: 12,
    padding: SIZES.md, marginBottom: SIZES.sm,
    borderWidth: 1, borderColor: COLORS.border,
    flexDirection: 'row',
  },
  itemTopRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemName: { fontSize: 15, fontWeight: '700', color: COLORS.text, flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  itemSku: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  itemStats: { flexDirection: 'row', gap: 16, marginTop: 6 },
  statLabel: { fontSize: 12, color: COLORS.textSecondary },
  statValue: { fontWeight: '700', color: COLORS.text },
  itemValue: { fontSize: 12, color: COLORS.primary, fontWeight: '600', marginTop: 4 },
  actions: { justifyContent: 'center', gap: 6, marginLeft: SIZES.sm },
  actionBtn: {
    alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6,
    borderRadius: 8, backgroundColor: COLORS.background,
    minWidth: 60,
  },
  actionIcon: { fontSize: 16, color: COLORS.primary },
  actionLabel: { fontSize: 10, color: COLORS.text, fontWeight: '600', marginTop: 2 },
  empty: { alignItems: 'center', marginTop: SIZES.xxl },
  emptyText: { fontSize: 15, color: COLORS.textSecondary, fontWeight: '600' },
});

export default InventoryScreen;
