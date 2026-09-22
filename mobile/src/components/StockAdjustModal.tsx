import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { productsApi, Product } from '../api/products.api';
import { MovementType } from '../api/inventory.api';
import { COLORS, SIZES } from '../constants/theme';

interface Props {
  product: Product | null;
  visible: boolean;
  onClose: () => void;
  onSuccess: (updated: Product) => void;
}

const MOVEMENT_TYPES: Array<{ value: MovementType; label: string; sign: 1 | -1 }> = [
  { value: 'PURCHASE', label: 'Purchase (Add)', sign: 1 },
  { value: 'RETURN', label: 'Customer Return (Add)', sign: 1 },
  { value: 'ADJUSTMENT', label: 'Adjustment', sign: 1 },
  { value: 'DAMAGE', label: 'Damage (Reduce)', sign: -1 },
  { value: 'LOSS', label: 'Loss/Theft (Reduce)', sign: -1 },
];

const StockAdjustModal: React.FC<Props> = ({ product, visible, onClose, onSuccess }) => {
  const [quantity, setQuantity] = useState('');
  const [movementType, setMovementType] = useState<MovementType>('PURCHASE');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setQuantity('');
    setMovementType('PURCHASE');
    setReason('');
  };

  const handleClose = () => {
    if (saving) return;
    reset();
    onClose();
  };

  const handleSave = async () => {
    if (!product) return;
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Validation', 'Enter a positive quantity');
      return;
    }

    const type = MOVEMENT_TYPES.find((m) => m.value === movementType)!;
    const signedQty = qty * type.sign;

    if (product.stockQuantity + signedQty < 0) {
      Alert.alert('Error', 'Not enough stock to reduce');
      return;
    }

    setSaving(true);
    try {
      const updated = await productsApi.adjustStock(product.id, {
        quantity: signedQty,
        movementType,
        reason: reason.trim() || type.label,
      });
      onSuccess(updated);
      reset();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to adjust stock');
    } finally {
      setSaving(false);
    }
  };

  if (!product) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Adjust Stock</Text>
                <Text style={styles.subtitle}>{product.name}</Text>
              </View>
              <TouchableOpacity onPress={handleClose} disabled={saving}>
                <Text style={styles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.currentStock}>
              <Text style={styles.currentStockLabel}>Current Stock</Text>
              <Text style={styles.currentStockValue}>
                {product.stockQuantity} {product.unit}
              </Text>
            </View>

            <Text style={styles.label}>Movement Type</Text>
            <View style={styles.typeGrid}>
              {MOVEMENT_TYPES.map((m) => (
                <TouchableOpacity
                  key={m.value}
                  style={[
                    styles.typeTile,
                    movementType === m.value && (m.sign === 1 ? styles.typeTileAdd : styles.typeTileReduce),
                  ]}
                  onPress={() => setMovementType(m.value)}
                  disabled={saving}
                >
                  <Text
                    style={[
                      styles.typeText,
                      movementType === m.value && { color: COLORS.white, fontWeight: '700' },
                    ]}
                  >
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Quantity</Text>
            <TextInput
              style={styles.input}
              value={quantity}
              onChangeText={setQuantity}
              placeholder="0"
              placeholderTextColor={COLORS.gray}
              keyboardType="number-pad"
              editable={!saving}
              autoFocus
            />

            <Text style={styles.label}>Reason (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={reason}
              onChangeText={setReason}
              placeholder="e.g. Restock from supplier"
              placeholderTextColor={COLORS.gray}
              multiline
              numberOfLines={2}
              editable={!saving}
            />

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.btn, styles.cancelBtn]}
                onPress={handleClose}
                disabled={saving}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.saveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  content: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: SIZES.lg, maxHeight: '90%',
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SIZES.md },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  closeX: { fontSize: 22, color: COLORS.gray, padding: 4 },
  currentStock: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.background, borderRadius: 10,
    padding: SIZES.md, marginBottom: SIZES.md,
  },
  currentStockLabel: { fontSize: 14, color: COLORS.textSecondary },
  currentStockValue: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginTop: SIZES.sm, marginBottom: SIZES.xs },
  input: {
    backgroundColor: COLORS.background, borderRadius: 10,
    paddingHorizontal: SIZES.md, paddingVertical: SIZES.md,
    fontSize: 16, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text,
  },
  textArea: { height: 70, textAlignVertical: 'top' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  typeTile: {
    paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm,
    borderRadius: 20, backgroundColor: COLORS.background,
    borderWidth: 1, borderColor: COLORS.border,
  },
  typeTileAdd: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeTileReduce: { backgroundColor: COLORS.danger, borderColor: COLORS.danger },
  typeText: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  actions: { flexDirection: 'row', gap: SIZES.sm, marginTop: SIZES.lg },
  btn: { flex: 1, paddingVertical: SIZES.md, borderRadius: 10, alignItems: 'center' },
  cancelBtn: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  cancelText: { color: COLORS.text, fontWeight: '600' },
  saveBtn: { backgroundColor: COLORS.primary },
  saveText: { color: COLORS.white, fontWeight: '700' },
});

export default StockAdjustModal;
