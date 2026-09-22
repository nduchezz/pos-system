import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Modal,
  TextInput, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { productsApi, Product, Unit } from '../api/products.api';
import { categoriesApi, Category } from '../api/categories.api';
import { COLORS, SIZES } from '../constants/theme';

const UNITS: Unit[] = ['PIECE', 'BOX', 'PACKET', 'KILOGRAM', 'GRAM', 'LITRE', 'BOTTLE', 'METRE'];

const ProductsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [buyingPrice, setBuyingPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [minStock, setMinStock] = useState('5');
  const [unit, setUnit] = useState<Unit>('PIECE');

  const loadData = useCallback(async () => {
    try {
      const [prods, cats] = await Promise.all([
        productsApi.list({ search: search || undefined }),
        categoriesApi.list(),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load data');
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

  const resetForm = () => {
    setName('');
    setSku('');
    setBarcode('');
    setCategoryId(null);
    setBuyingPrice('');
    setSellingPrice('');
    setStockQuantity('');
    setMinStock('5');
    setUnit('PIECE');
  };

  const openCreateModal = () => {
    setEditingId(null);
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (product: Product) => {
    setEditingId(product.id);
    setName(product.name);
    setSku(product.sku);
    setBarcode(product.barcode || '');
    setCategoryId(product.categoryId || null);
    setBuyingPrice(String(product.buyingPrice));
    setSellingPrice(String(product.sellingPrice));
    setStockQuantity(String(product.stockQuantity));
    setMinStock(String(product.minStock));
    setUnit(product.unit);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !sku.trim()) {
      Alert.alert('Validation', 'Name and SKU are required');
      return;
    }
    const bp = parseFloat(buyingPrice);
    const sp = parseFloat(sellingPrice);
    const sq = parseInt(stockQuantity || '0', 10);
    const ms = parseInt(minStock || '5', 10);

    if (isNaN(bp) || isNaN(sp)) {
      Alert.alert('Validation', 'Buying and selling prices must be numbers');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        sku: sku.trim(),
        barcode: barcode.trim() || undefined,
        categoryId: categoryId,
        buyingPrice: bp,
        sellingPrice: sp,
        stockQuantity: isNaN(sq) ? 0 : sq,
        minStock: isNaN(ms) ? 5 : ms,
        unit,
      };

      if (editingId) {
        const updated = await productsApi.update(editingId, payload);
        setProducts((prev) =>
          prev.map((p) => (p.id === editingId ? { ...p, ...updated } : p))
        );
      } else {
        const created = await productsApi.create(payload);
        setProducts((prev) => [created, ...prev]);
      }
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (product: Product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await productsApi.delete(product.id);
              setProducts((prev) => prev.filter((p) => p.id !== product.id));
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  const getStockBadge = (p: Product) => {
    if (p.stockQuantity <= 0) {
      return { label: 'Out of Stock', bg: '#FFEBEE', color: COLORS.danger };
    }
    if (p.stockQuantity <= p.minStock) {
      return { label: `Low: ${p.stockQuantity}`, bg: '#FFF3E0', color: COLORS.warning };
    }
    return { label: `${p.stockQuantity} in stock`, bg: '#E8F5E9', color: COLORS.success };
  };

  const renderItem = ({ item }: { item: Product }) => {
    const badge = getStockBadge(item);
    return (
      <TouchableOpacity
        style={styles.item}
        onPress={() => openEditModal(item)}
        onLongPress={() => handleDelete(item)}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemSku}>SKU: {item.sku}</Text>
          {item.category ? (
            <Text style={styles.itemCat}>{item.category.name}</Text>
          ) : null}
          <View style={styles.itemBottomRow}>
            <Text style={styles.price}>KES {item.sellingPrice.toFixed(2)}</Text>
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.color }]}>
                {badge.label}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Search bar */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, SKU, barcode…"
          placeholderTextColor={COLORS.gray}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          onSubmitEditing={loadData}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => { setSearch(''); }}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No products yet.</Text>
              <Text style={styles.emptyHint}>Tap + to add your first product.</Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openCreateModal}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Create/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {editingId ? 'Edit Product' : 'New Product'}
              </Text>

              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Coca Cola 500ml"
                placeholderTextColor={COLORS.gray}
                editable={!saving}
              />

              <Text style={styles.label}>SKU *</Text>
              <TextInput
                style={styles.input}
                value={sku}
                onChangeText={setSku}
                placeholder="e.g. COKE-500"
                placeholderTextColor={COLORS.gray}
                autoCapitalize="characters"
                editable={!saving}
              />

              <Text style={styles.label}>Barcode</Text>
              <TextInput
                style={styles.input}
                value={barcode}
                onChangeText={setBarcode}
                placeholder="Optional"
                placeholderTextColor={COLORS.gray}
                keyboardType="numeric"
                editable={!saving}
              />

              <Text style={styles.label}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                <TouchableOpacity
                  style={[styles.chip, !categoryId && styles.chipActive]}
                  onPress={() => setCategoryId(null)}
                >
                  <Text style={[styles.chipText, !categoryId && styles.chipTextActive]}>None</Text>
                </TouchableOpacity>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.chip, categoryId === c.id && styles.chipActive]}
                    onPress={() => setCategoryId(c.id)}
                  >
                    <Text style={[styles.chipText, categoryId === c.id && styles.chipTextActive]}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.rowTwo}>
                <View style={{ flex: 1, marginRight: SIZES.sm }}>
                  <Text style={styles.label}>Buying Price *</Text>
                  <TextInput
                    style={styles.input}
                    value={buyingPrice}
                    onChangeText={setBuyingPrice}
                    placeholder="0.00"
                    placeholderTextColor={COLORS.gray}
                    keyboardType="decimal-pad"
                    editable={!saving}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Selling Price *</Text>
                  <TextInput
                    style={styles.input}
                    value={sellingPrice}
                    onChangeText={setSellingPrice}
                    placeholder="0.00"
                    placeholderTextColor={COLORS.gray}
                    keyboardType="decimal-pad"
                    editable={!saving}
                  />
                </View>
              </View>

              <View style={styles.rowTwo}>
                <View style={{ flex: 1, marginRight: SIZES.sm }}>
                  <Text style={styles.label}>{editingId ? 'Stock (read-only)' : 'Opening Stock'}</Text>
                  <TextInput
                    style={[styles.input, editingId && styles.inputDisabled]}
                    value={stockQuantity}
                    onChangeText={setStockQuantity}
                    placeholder="0"
                    placeholderTextColor={COLORS.gray}
                    keyboardType="number-pad"
                    editable={!saving && !editingId}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Min Stock Alert</Text>
                  <TextInput
                    style={styles.input}
                    value={minStock}
                    onChangeText={setMinStock}
                    placeholder="5"
                    placeholderTextColor={COLORS.gray}
                    keyboardType="number-pad"
                    editable={!saving}
                  />
                </View>
              </View>

              <Text style={styles.label}>Unit</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {UNITS.map((u) => (
                  <TouchableOpacity
                    key={u}
                    style={[styles.chip, unit === u && styles.chipActive]}
                    onPress={() => setUnit(u)}
                  >
                    <Text style={[styles.chipText, unit === u && styles.chipTextActive]}>
                      {u}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.cancelBtn]}
                  onPress={() => setModalVisible(false)}
                  disabled={saving}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.saveBtn, saving && { opacity: 0.6 }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.saveBtnText}>
                      {editingId ? 'Update' : 'Create'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: SIZES.md,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SIZES.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: SIZES.md,
    fontSize: 15,
    color: COLORS.text,
  },
  clearBtn: { fontSize: 18, color: COLORS.gray, paddingHorizontal: SIZES.sm },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: SIZES.md, paddingBottom: 100 },
  item: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  itemName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  itemSku: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  itemCat: { fontSize: 12, color: COLORS.primary, marginTop: 2, fontWeight: '600' },
  itemBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SIZES.sm,
  },
  price: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', marginTop: SIZES.xxl },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, fontWeight: '600' },
  emptyHint: { fontSize: 14, color: COLORS.gray, marginTop: SIZES.xs },
  fab: {
    position: 'absolute',
    right: SIZES.lg,
    bottom: SIZES.lg,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  fabText: { color: COLORS.white, fontSize: 32, lineHeight: 34, fontWeight: '300' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: SIZES.lg,
    paddingBottom: SIZES.xl,
    maxHeight: '90%',
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: SIZES.md },
  label: {
    fontSize: 13, fontWeight: '600', color: COLORS.text,
    marginBottom: SIZES.xs, marginTop: SIZES.sm,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    fontSize: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
  },
  inputDisabled: { backgroundColor: '#F0F0F0', color: COLORS.gray },
  rowTwo: { flexDirection: 'row' },
  chipRow: { flexDirection: 'row', paddingVertical: SIZES.xs },
  chip: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SIZES.sm,
    height: 36,
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  chipTextActive: { color: COLORS.white },
  modalActions: { flexDirection: 'row', gap: SIZES.sm, marginTop: SIZES.lg },
  modalBtn: { flex: 1, paddingVertical: SIZES.md, borderRadius: 10, alignItems: 'center' },
  cancelBtn: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  cancelBtnText: { color: COLORS.text, fontWeight: '600' },
  saveBtn: { backgroundColor: COLORS.primary },
  saveBtnText: { color: COLORS.white, fontWeight: '700' },
});

export default ProductsScreen;
