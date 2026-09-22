import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal, ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { productsApi, Product } from '../api/products.api';
import { categoriesApi, Category } from '../api/categories.api';
import { Sale } from '../api/sales.api';
import { useCartStore } from '../store/cartStore';
import { useAuth } from '../context/AuthContext';
import CheckoutModal from '../components/CheckoutModal';
import ReceiptModal from '../components/ReceiptModal';
import { COLORS, SIZES } from '../constants/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - SIZES.md * 3) / 2;

const POSScreen: React.FC = () => {
  const { business } = useAuth();
  const cart = useCartStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [cartVisible, setCartVisible] = useState(false);
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [receiptVisible, setReceiptVisible] = useState(false);

  const loadProducts = useCallback(async () => {
    try {
      const [prods, cats] = await Promise.all([
        productsApi.list({ search: search || undefined, categoryId: selectedCategory || undefined }),
        categoriesApi.list(),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory]);

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [loadProducts])
  );

  const handleProductPress = (product: Product) => {
    if (product.stockQuantity <= 0) {
      Alert.alert('Out of Stock', `${product.name} is out of stock.`);
      return;
    }
    cart.addItem(product);
  };

  // Tax calculation
  const taxEnabled = business?.taxEnabled ?? false;
  const taxRate = taxEnabled ? (business?.taxRate ?? 0) : 0;
  const taxIncluded = taxEnabled ? (business?.taxIncluded ?? false) : false;

  const subtotal = cart.getSubtotal();
  const totalDiscount = cart.getTotalDiscount();
  const taxable = cart.getTaxable();
  const tax = taxRate > 0
    ? (taxIncluded ? (taxable * taxRate) / (100 + taxRate) : (taxable * taxRate) / 100)
    : 0;
  const total = taxIncluded ? taxable : taxable + tax;
  const itemCount = cart.getItemCount();

  const renderProductCard = ({ item }: { item: Product }) => {
    const inCart = cart.items.find((c) => c.productId === item.id);
    const outOfStock = item.stockQuantity <= 0;

    return (
      <TouchableOpacity
        style={[
          styles.productCard,
          outOfStock && styles.productCardDisabled,
          inCart && styles.productCardInCart,
        ]}
        onPress={() => handleProductPress(item)}
        disabled={outOfStock}
      >
        {inCart && (
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>{inCart.quantity}</Text>
          </View>
        )}
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.productPrice}>KES {item.sellingPrice}</Text>
        <Text
          style={[
            styles.productStock,
            item.stockQuantity <= item.minStock && { color: COLORS.warning },
            outOfStock && { color: COLORS.danger },
          ]}
        >
          {outOfStock ? 'Out of stock' : `Stock: ${item.stockQuantity}`}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search products or scan barcode..."
          placeholderTextColor={COLORS.gray}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryRow}
        contentContainerStyle={{ paddingHorizontal: SIZES.md }}
      >
        <TouchableOpacity
          style={[styles.chip, !selectedCategory && styles.chipActive]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[styles.chipText, !selectedCategory && styles.chipTextActive]}>All</Text>
        </TouchableOpacity>
        {categories.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[styles.chip, selectedCategory === c.id && styles.chipActive]}
            onPress={() => setSelectedCategory(c.id)}
          >
            <Text style={[styles.chipText, selectedCategory === c.id && styles.chipTextActive]}>
              {c.name}
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
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={2}
          renderItem={renderProductCard}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No products found.</Text>
              <Text style={styles.emptyHint}>Add products first in More → Products.</Text>
            </View>
          }
        />
      )}

      {itemCount > 0 && (
        <TouchableOpacity style={styles.cartBar} onPress={() => setCartVisible(true)}>
          <View style={styles.cartBarLeft}>
            <View style={styles.cartCountBubble}>
              <Text style={styles.cartCountText}>{itemCount}</Text>
            </View>
            <Text style={styles.cartBarLabel}>View Cart</Text>
          </View>
          <Text style={styles.cartBarTotal}>KES {total.toFixed(2)}</Text>
        </TouchableOpacity>
      )}

      {/* CART MODAL */}
      <Modal
        visible={cartVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCartVisible(false)}
      >
        <View style={styles.cartModalOverlay}>
          <View style={styles.cartModalContent}>
            <View style={styles.cartHeader}>
              <Text style={styles.cartTitle}>Cart ({itemCount} items)</Text>
              <TouchableOpacity onPress={() => setCartVisible(false)}>
                <Text style={styles.cartClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={cart.items}
              keyExtractor={(item) => item.productId}
              style={{ maxHeight: 350 }}
              renderItem={({ item }) => (
                <View style={styles.cartItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cartItemName}>{item.productName}</Text>
                    <Text style={styles.cartItemPrice}>
                      KES {item.sellingPrice} × {item.quantity} = KES{' '}
                      {(item.sellingPrice * item.quantity).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.qtyControls}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => cart.decrementQty(item.productId)}
                    >
                      <Text style={styles.qtyBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => cart.incrementQty(item.productId)}
                    >
                      <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => cart.removeItem(item.productId)}
                  >
                    <Text style={styles.removeBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={<Text style={styles.emptyCart}>Cart is empty</Text>}
            />

            <View style={styles.totalsSection}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>KES {subtotal.toFixed(2)}</Text>
              </View>
              {totalDiscount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Discount</Text>
                  <Text style={[styles.totalValue, { color: COLORS.danger }]}>
                    − KES {totalDiscount.toFixed(2)}
                  </Text>
                </View>
              )}
              {taxRate > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>
                    Tax {taxIncluded ? '(incl.)' : `(${taxRate}%)`}
                  </Text>
                  <Text style={styles.totalValue}>KES {tax.toFixed(2)}</Text>
                </View>
              )}
              <View style={[styles.totalRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>TOTAL</Text>
                <Text style={styles.grandTotalValue}>KES {total.toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.cartActions}>
              <TouchableOpacity
                style={[styles.cartBtn, styles.clearBtn]}
                onPress={() => {
                  Alert.alert('Clear Cart', 'Remove all items?', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Clear',
                      style: 'destructive',
                      onPress: () => {
                        cart.clearCart();
                        setCartVisible(false);
                      },
                    },
                  ]);
                }}
              >
                <Text style={styles.clearBtnText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cartBtn, styles.checkoutBtn]}
                onPress={() => {
                  setCartVisible(false);
                  setCheckoutVisible(true);
                }}
              >
                <Text style={styles.checkoutBtnText}>Checkout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CHECKOUT MODAL */}
      <CheckoutModal
        visible={checkoutVisible}
        onClose={() => setCheckoutVisible(false)}
        onSuccess={(sale) => {
          setCheckoutVisible(false);
          setCompletedSale(sale);
          setReceiptVisible(true);
          loadProducts();
        }}
      />

      {/* RECEIPT MODAL */}
      <ReceiptModal
        sale={completedSale}
        visible={receiptVisible}
        onClose={() => {
          setReceiptVisible(false);
          setCompletedSale(null);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: SIZES.md, paddingTop: SIZES.md },
  searchInput: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    fontSize: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
  },
  categoryRow: { marginVertical: SIZES.sm, maxHeight: 44 },
  chip: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SIZES.sm,
    height: 36,
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  chipTextActive: { color: COLORS.white },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  gridContent: { padding: SIZES.md, paddingBottom: 120 },
  gridRow: { justifyContent: 'space-between', marginBottom: SIZES.md },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 100,
  },
  productCardDisabled: { opacity: 0.4 },
  productCardInCart: { borderColor: COLORS.primary, borderWidth: 2 },
  productName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  productPrice: { fontSize: 15, fontWeight: '700', color: COLORS.primary, marginTop: SIZES.xs },
  productStock: { fontSize: 11, color: COLORS.success, marginTop: SIZES.xs, fontWeight: '600' },
  cartBadge: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: COLORS.primary, borderRadius: 12,
    minWidth: 24, height: 24,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  cartBadgeText: { color: COLORS.white, fontWeight: '700', fontSize: 12 },
  empty: { alignItems: 'center', marginTop: SIZES.xxl },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, fontWeight: '600' },
  emptyHint: { fontSize: 14, color: COLORS.gray, marginTop: SIZES.xs },
  cartBar: {
    position: 'absolute', bottom: SIZES.md, left: SIZES.md, right: SIZES.md,
    backgroundColor: COLORS.primary, borderRadius: 12, padding: SIZES.md,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    elevation: 6, shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8,
  },
  cartBarLeft: { flexDirection: 'row', alignItems: 'center' },
  cartCountBubble: {
    backgroundColor: COLORS.white, borderRadius: 14,
    minWidth: 28, height: 28,
    alignItems: 'center', justifyContent: 'center',
    marginRight: SIZES.sm, paddingHorizontal: 6,
  },
  cartCountText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  cartBarLabel: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
  cartBarTotal: { color: COLORS.white, fontWeight: '700', fontSize: 17 },
  cartModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  cartModalContent: {
    backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: SIZES.lg, maxHeight: '90%',
  },
  cartHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: SIZES.md,
  },
  cartTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  cartClose: { fontSize: 22, color: COLORS.gray, padding: 4 },
  cartItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: SIZES.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  cartItemName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  cartItemPrice: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', marginHorizontal: SIZES.sm },
  qtyBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  qtyBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  qtyText: { minWidth: 30, textAlign: 'center', fontWeight: '700', fontSize: 15, color: COLORS.text },
  removeBtn: { padding: 6 },
  removeBtnText: { color: COLORS.danger, fontWeight: '700', fontSize: 16 },
  emptyCart: { textAlign: 'center', color: COLORS.gray, padding: SIZES.lg },
  totalsSection: {
    marginTop: SIZES.md, paddingTop: SIZES.md,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalLabel: { fontSize: 14, color: COLORS.textSecondary },
  totalValue: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  grandTotalRow: {
    marginTop: SIZES.sm, paddingTop: SIZES.sm,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  grandTotalLabel: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  grandTotalValue: { fontSize: 20, fontWeight: '700', color: COLORS.primary },
  cartActions: { flexDirection: 'row', gap: SIZES.sm, marginTop: SIZES.lg },
  cartBtn: { flex: 1, paddingVertical: SIZES.md, borderRadius: 10, alignItems: 'center' },
  clearBtn: { backgroundColor: '#FFEBEE' },
  clearBtnText: { color: COLORS.danger, fontWeight: '700' },
  checkoutBtn: { backgroundColor: COLORS.primary },
  checkoutBtnText: { color: COLORS.white, fontWeight: '700' },
});

export default POSScreen;
