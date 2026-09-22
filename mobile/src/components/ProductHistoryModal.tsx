import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { inventoryApi, StockMovement } from '../api/inventory.api';
import { Product } from '../api/products.api';
import { COLORS, SIZES } from '../constants/theme';

interface Props {
  product: Product | null;
  visible: boolean;
  onClose: () => void;
}

const MOVEMENT_COLORS: Record<string, string> = {
  SALE: COLORS.danger,
  PURCHASE: COLORS.success,
  REFUND: COLORS.info,
  ADJUSTMENT: COLORS.warning,
  DAMAGE: COLORS.danger,
  LOSS: COLORS.danger,
  RETURN: COLORS.info,
};

const ProductHistoryModal: React.FC<Props> = ({ product, visible, onClose }) => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !product) return;
    setLoading(true);
    inventoryApi.productHistory(product.id)
      .then((res) => setMovements(res.movements))
      .catch(() => setMovements([]))
      .finally(() => setLoading(false));
  }, [visible, product?.id]);

  if (!product) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Stock History</Text>
          <View style={{ width: 50 }} />
        </View>

        <View style={styles.productBar}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productStock}>
            Current: {product.stockQuantity} {product.unit}
          </Text>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            data={movements}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.empty}>No movements recorded yet.</Text>
            }
            renderItem={({ item }) => {
              const isNegative = item.quantity < 0;
              return (
                <View style={styles.movement}>
                  <View
                    style={[
                      styles.movementBadge,
                      { backgroundColor: MOVEMENT_COLORS[item.movementType] || COLORS.gray },
                    ]}
                  >
                    <Text style={styles.movementBadgeText}>{item.movementType}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: SIZES.md }}>
                    <Text style={styles.movementReason}>
                      {item.reason || 'No reason'}
                    </Text>
                    <Text style={styles.movementMeta}>
                      {new Date(item.createdAt).toLocaleString()}
                    </Text>
                    {item.reference && (
                      <Text style={styles.movementRef}>Ref: {item.reference}</Text>
                    )}
                    {item.user && (
                      <Text style={styles.movementMeta}>By: {item.user.name}</Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.movementQty,
                      { color: isNegative ? COLORS.danger : COLORS.success },
                    ]}
                  >
                    {isNegative ? '' : '+'}
                    {item.quantity}
                  </Text>
                </View>
              );
            }}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SIZES.md, paddingVertical: SIZES.md,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  closeText: { color: COLORS.primary, fontSize: 15, fontWeight: '600' },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  productBar: {
    backgroundColor: COLORS.white, padding: SIZES.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  productName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  productStock: { fontSize: 13, color: COLORS.primary, marginTop: 2, fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: SIZES.md },
  movement: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, borderRadius: 10,
    padding: SIZES.md, marginBottom: SIZES.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  movementBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, minWidth: 70, alignItems: 'center' },
  movementBadgeText: { fontSize: 10, color: COLORS.white, fontWeight: '700' },
  movementReason: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  movementMeta: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  movementRef: { fontSize: 11, color: COLORS.primary, marginTop: 2, fontWeight: '600' },
  movementQty: { fontSize: 18, fontWeight: '700', marginLeft: SIZES.sm },
  empty: { textAlign: 'center', color: COLORS.gray, marginTop: SIZES.xl },
});

export default ProductHistoryModal;
