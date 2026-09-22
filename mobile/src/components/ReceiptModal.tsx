import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView,
  Share, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sale } from '../api/sales.api';
import { useAuth } from '../context/AuthContext';
import { shareReceiptPdf, printReceipt, buildReceiptText } from '../utils/receiptGenerator';
import { COLORS, SIZES } from '../constants/theme';

interface Props {
  sale: Sale | null;
  visible: boolean;
  onClose: () => void;
}

const ReceiptModal: React.FC<Props> = ({ sale, visible, onClose }) => {
  const { business } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);

  if (!sale) return null;

  const fmt = (n: number) => `KES ${n.toFixed(2)}`;

  const handleShareText = async () => {
    try {
      await Share.share({
        message: buildReceiptText(sale, business),
      });
    } catch (err) {
      console.error('Share failed', err);
    }
  };

  const handleSharePdf = async () => {
    setBusy('pdf');
    try {
      await shareReceiptPdf(sale, business);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to share PDF');
    } finally {
      setBusy(null);
    }
  };

  const handlePrint = async () => {
    setBusy('print');
    try {
      await printReceipt(sale, business);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to print');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Success Badge */}
          <View style={styles.successWrap}>
            <View style={styles.successCircle}>
              <Text style={styles.successCheck}>✓</Text>
            </View>
            <Text style={styles.successText}>Sale Completed</Text>
            <Text style={styles.successSub}>Receipt: {sale.receiptNo}</Text>
          </View>

          {/* Receipt Card */}
          <View style={styles.receiptCard}>
            <View style={styles.receiptHeader}>
              <Text style={styles.businessName}>{business?.name}</Text>
              <Text style={styles.receiptMeta}>Date: {new Date(sale.createdAt).toLocaleString()}</Text>
              <Text style={styles.receiptMeta}>Cashier: {sale.user?.name || 'N/A'}</Text>
              <Text style={styles.receiptMeta}>Receipt: {sale.receiptNo}</Text>
            </View>

            <View style={styles.dashedLine} />

            <View style={styles.itemsSection}>
              <View style={styles.itemRowHeader}>
                <Text style={[styles.itemCell, { flex: 3 }]}>Item</Text>
                <Text style={[styles.itemCell, { flex: 1, textAlign: 'center' }]}>Qty</Text>
                <Text style={[styles.itemCell, { flex: 2, textAlign: 'right' }]}>Amount</Text>
              </View>
              {sale.items.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <Text style={[styles.itemCell, { flex: 3 }]} numberOfLines={2}>
                    {item.productName}
                  </Text>
                  <Text style={[styles.itemCell, { flex: 1, textAlign: 'center' }]}>
                    {item.quantity}
                  </Text>
                  <Text style={[styles.itemCell, { flex: 2, textAlign: 'right' }]}>
                    {fmt(item.subtotal)}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.dashedLine} />

            <View style={styles.totalsSection}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>{fmt(sale.subtotal)}</Text>
              </View>
              {sale.discount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Discount</Text>
                  <Text style={[styles.totalValue, { color: COLORS.danger }]}>
                    − {fmt(sale.discount)}
                  </Text>
                </View>
              )}
              {sale.tax > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Tax</Text>
                  <Text style={styles.totalValue}>{fmt(sale.tax)}</Text>
                </View>
              )}
              <View style={[styles.totalRow, styles.grandRow]}>
                <Text style={styles.grandLabel}>TOTAL</Text>
                <Text style={styles.grandValue}>{fmt(sale.grandTotal)}</Text>
              </View>
            </View>

            <View style={styles.dashedLine} />

            <View style={styles.paymentSection}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Payment Method</Text>
                <Text style={styles.totalValue}>{sale.paymentMethod}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Amount Received</Text>
                <Text style={styles.totalValue}>{fmt(sale.amountReceived)}</Text>
              </View>
              {sale.change > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Change</Text>
                  <Text style={[styles.totalValue, { color: COLORS.primary }]}>
                    {fmt(sale.change)}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.dashedLine} />

            <Text style={styles.thankYou}>
              {business?.name
                ? `Thank you for shopping at ${business.name}!`
                : 'Thank you!'}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleShareText}
              disabled={!!busy}
            >
              <Text style={styles.actionIcon}>💬</Text>
              <Text style={styles.actionText}>Share Text</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleSharePdf}
              disabled={!!busy}
            >
              {busy === 'pdf' ? (
                <ActivityIndicator color={COLORS.primary} />
              ) : (
                <>
                  <Text style={styles.actionIcon}>📄</Text>
                  <Text style={styles.actionText}>Share PDF</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handlePrint}
              disabled={!!busy}
            >
              {busy === 'print' ? (
                <ActivityIndicator color={COLORS.primary} />
              ) : (
                <>
                  <Text style={styles.actionIcon}>🖨️</Text>
                  <Text style={styles.actionText}>Print</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SIZES.md, paddingBottom: SIZES.xl },
  successWrap: { alignItems: 'center', paddingVertical: SIZES.lg },
  successCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SIZES.md,
  },
  successCheck: { color: COLORS.white, fontSize: 48, fontWeight: '300' },
  successText: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  successSub: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  receiptCard: {
    backgroundColor: COLORS.white, borderRadius: 12,
    padding: SIZES.md, borderWidth: 1, borderColor: COLORS.border,
  },
  receiptHeader: { alignItems: 'center', marginBottom: SIZES.sm },
  businessName: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  receiptMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  dashedLine: {
    borderStyle: 'dashed', borderTopWidth: 1,
    borderTopColor: COLORS.border, marginVertical: SIZES.sm,
  },
  itemsSection: { paddingVertical: 4 },
  itemRowHeader: {
    flexDirection: 'row', paddingBottom: 4,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  itemRow: { flexDirection: 'row', paddingVertical: 4 },
  itemCell: { fontSize: 12, color: COLORS.text },
  totalsSection: { paddingVertical: 4 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totalLabel: { fontSize: 13, color: COLORS.textSecondary },
  totalValue: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  grandRow: {
    marginTop: 4, paddingTop: 4,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  grandLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  grandValue: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  paymentSection: { paddingVertical: 4 },
  thankYou: {
    textAlign: 'center', fontSize: 13,
    color: COLORS.textSecondary, fontStyle: 'italic', marginTop: SIZES.sm,
  },
  actions: {
    flexDirection: 'row', gap: SIZES.sm, marginTop: SIZES.lg,
  },
  actionBtn: {
    flex: 1, paddingVertical: SIZES.md, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border,
    minHeight: 70,
  },
  actionIcon: { fontSize: 22, marginBottom: 4 },
  actionText: { fontSize: 11, fontWeight: '700', color: COLORS.text },
  doneBtn: {
    backgroundColor: COLORS.primary, borderRadius: 10,
    paddingVertical: SIZES.md, alignItems: 'center',
    marginTop: SIZES.md,
  },
  doneText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
});

export default ReceiptModal;
