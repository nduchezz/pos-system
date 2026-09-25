import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { salesApi, PaymentMethod, Sale } from '../api/sales.api';
import { useCartStore } from '../store/cartStore';
import { useAuth } from '../context/AuthContext';
import { useNetwork } from '../context/NetworkContext';
import { useSync } from '../context/SyncContext';
import { pendingSalesRepo, productsRepo } from '../database';
import { generateUUID } from '../utils/uuid';
import { COLORS, SIZES } from '../constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: (sale: Sale) => void;
}

const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string; icon: string }> = [
  { value: 'CASH', label: 'Cash', icon: '💵' },
  { value: 'MPESA', label: 'M-Pesa', icon: '📱' },
  { value: 'CARD', label: 'Card', icon: '💳' },
  { value: 'BANK', label: 'Bank', icon: '🏦' },
  { value: 'CREDIT', label: 'Credit', icon: '📝' },
];

const CheckoutModal: React.FC<Props> = ({ visible, onClose, onSuccess }) => {
  const cart = useCartStore();
  const { business, user } = useAuth();
  const { isOnline } = useNetwork();
  const { reloadPending } = useSync();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [amountReceived, setAmountReceived] = useState('');
  const [reference, setReference] = useState('');
  const [phone, setPhone] = useState('');
  const [processing, setProcessing] = useState(false);

  const subtotal = cart.getSubtotal();
  const totalDiscount = cart.getTotalDiscount();
  const taxable = cart.getTaxable();

  const taxEnabled = business?.taxEnabled ?? false;
  const taxRate = taxEnabled ? (business?.taxRate ?? 0) : 0;
  const taxIncluded = taxEnabled ? (business?.taxIncluded ?? false) : false;
  const tax = taxRate > 0
    ? (taxIncluded ? (taxable * taxRate) / (100 + taxRate) : (taxable * taxRate) / 100)
    : 0;
  const grandTotal = taxIncluded ? taxable : taxable + tax;

  const received = parseFloat(amountReceived) || 0;
  const change = paymentMethod === 'CASH' ? received - grandTotal : 0;

  const isValid = useMemo(() => {
    if (cart.items.length === 0) return false;
    if (paymentMethod === 'CASH') return received >= grandTotal;
    if (paymentMethod === 'MPESA') return phone.trim().length >= 10;
    if (paymentMethod === 'CARD' || paymentMethod === 'BANK') return reference.trim().length > 0;
    if (paymentMethod === 'CREDIT') return true;
    return true;
  }, [cart.items.length, paymentMethod, received, grandTotal, phone, reference]);

  const buildPayload = (clientTransactionId: string) => ({
    items: cart.items.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      discount: i.discount,
    })),
    cartDiscount: cart.cartDiscount,
    paymentMethod,
    amountReceived: paymentMethod === 'CASH' ? received : grandTotal,
    paymentReference: reference || undefined,
    paymentPhone: phone || undefined,
    clientTransactionId,
  });

  const buildFakeSale = (
    clientTransactionId: string,
    localReceiptNo: string,
    status: 'PENDING' | 'COMPLETED'
  ): Sale => {
    const now = new Date().toISOString();
    return {
      id: clientTransactionId,
      receiptNo: localReceiptNo,
      subtotal,
      discount: totalDiscount,
      tax,
      grandTotal,
      status: status as any,
      paymentMethod,
      amountReceived: paymentMethod === 'CASH' ? received : grandTotal,
      change: paymentMethod === 'CASH' ? received - grandTotal : 0,
      notes: null,
      createdAt: now,
      items: cart.items.map((i, idx) => ({
        id: `local-${idx}`,
        productId: i.productId,
        productName: i.productName,
        quantity: i.quantity,
        buyingPrice: i.buyingPrice,
        sellingPrice: i.sellingPrice,
        discount: i.discount,
        subtotal: i.sellingPrice * i.quantity - i.discount,
      })),
      payments: [
        {
          id: 'local-pay',
          method: paymentMethod,
          amount: grandTotal,
          reference: reference || null,
          phoneNumber: phone || null,
          status: status === 'COMPLETED' ? 'SUCCESS' : 'PENDING',
        },
      ],
      user: { id: user?.id || 'me', name: user?.name || 'You' },
    };
  };

  const handleConfirm = async () => {
    if (!isValid) {
      Alert.alert('Checkout', 'Please complete the payment details.');
      return;
    }

    setProcessing(true);
    const clientTransactionId = generateUUID();

    try {
      // OFFLINE PATH
           if (!isOnline) {
        console.log('🔴 Offline sale — queueing...', { clientTransactionId, grandTotal });
        const localReceiptNo = `OFFLINE-${Date.now()}`;
        const payload = buildPayload(clientTransactionId);

        try {
          const queued = await pendingSalesRepo.insert({
            clientTransactionId,
            payloadJson: JSON.stringify(payload),
            localReceiptNo,
            total: grandTotal,
            createdAt: new Date().toISOString(),
          });
          console.log('✅ Queued successfully:', queued.id);
        } catch (insertErr: any) {
          console.error('❌ Queue insert failed:', insertErr.message);
          Alert.alert('Queue Error', insertErr.message);
          setProcessing(false);
          return;
        }

        for (const item of cart.items) {
          await productsRepo.decrementStock(item.productId, item.quantity);
        }

        await reloadPending();
        // ... rest of the code
        // 1. Save to SQLite queue
        await pendingSalesRepo.insert({
          clientTransactionId,
          payloadJson: JSON.stringify(payload),
          localReceiptNo,
          total: grandTotal,
          createdAt: new Date().toISOString(),
        });

        // 2. Decrement local stock for each item
        for (const item of cart.items) {
          await productsRepo.decrementStock(item.productId, item.quantity);
        }

        // 3. Reload pending list
        await reloadPending();

        // 4. Show receipt
        const fakeSale = buildFakeSale(clientTransactionId, localReceiptNo, 'PENDING');
        cart.clearCart();
        resetForm();
        setProcessing(false);
        onSuccess(fakeSale);
        Alert.alert(
          'Saved Offline',
          'This sale is queued and will sync automatically when you are online.'
        );
        return;
      }

      // ONLINE PATH
      const payload = buildPayload(clientTransactionId);
      const sale = await salesApi.create(payload);

      cart.clearCart();
      resetForm();
      onSuccess(sale);
    } catch (err: any) {
      // If network fails mid-request, fall back to offline queue
      if (!err.response) {
        const localReceiptNo = `OFFLINE-${Date.now()}`;
        const payload = buildPayload(clientTransactionId);

        await pendingSalesRepo.insert({
          clientTransactionId,
          payloadJson: JSON.stringify(payload),
          localReceiptNo,
          total: grandTotal,
          createdAt: new Date().toISOString(),
        });

        for (const item of cart.items) {
          await productsRepo.decrementStock(item.productId, item.quantity);
        }

        await reloadPending();

        const fakeSale = buildFakeSale(clientTransactionId, localReceiptNo, 'PENDING');
        cart.clearCart();
        resetForm();
        setProcessing(false);
        onSuccess(fakeSale);
        Alert.alert(
          'Saved Offline',
          'Network error — sale queued for later sync.'
        );
        return;
      }

      Alert.alert(
        'Sale Failed',
        err.response?.data?.message || err.message || 'Could not complete sale.'
      );
    } finally {
      setProcessing(false);
    }
  };

  const resetForm = () => {
    setPaymentMethod('CASH');
    setAmountReceived('');
    setReference('');
    setPhone('');
  };

  const handleClose = () => {
    if (processing) return;
    resetForm();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} disabled={processing}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Checkout</Text>
            <View style={{ width: 60 }} />
          </View>

          {!isOnline && (
            <View style={styles.offlineBanner}>
              <Text style={styles.offlineText}>
                🔴 Offline — sale will be saved and synced later
              </Text>
            </View>
          )}

          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.summaryCard}>
              <Text style={styles.sectionTitle}>Order Summary</Text>
              {cart.items.map((item) => (
                <View key={item.productId} style={styles.summaryRow}>
                  <Text style={styles.summaryLabel} numberOfLines={1}>
                    {item.productName} × {item.quantity}
                  </Text>
                  <Text style={styles.summaryValue}>
                    KES {(item.sellingPrice * item.quantity).toFixed(2)}
                  </Text>
                </View>
              ))}
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>KES {subtotal.toFixed(2)}</Text>
              </View>
              {totalDiscount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Discount</Text>
                  <Text style={[styles.summaryValue, { color: COLORS.danger }]}>
                    − KES {totalDiscount.toFixed(2)}
                  </Text>
                </View>
              )}
              {taxRate > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    Tax {taxIncluded ? '(incl.)' : `(${taxRate}%)`}
                  </Text>
                  <Text style={styles.summaryValue}>KES {tax.toFixed(2)}</Text>
                </View>
              )}
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>TOTAL</Text>
                <Text style={styles.totalValue}>KES {grandTotal.toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment Method</Text>
              <View style={styles.paymentGrid}>
                {PAYMENT_METHODS.map((m) => (
                  <TouchableOpacity
                    key={m.value}
                    style={[styles.paymentTile, paymentMethod === m.value && styles.paymentTileActive]}
                    onPress={() => setPaymentMethod(m.value)}
                    disabled={processing}
                  >
                    <Text style={styles.paymentIcon}>{m.icon}</Text>
                    <Text style={[styles.paymentLabel, paymentMethod === m.value && styles.paymentLabelActive]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment Details</Text>

              {paymentMethod === 'CASH' && (
                <>
                  <Text style={styles.label}>Amount Received (KES)</Text>
                  <TextInput
                    style={styles.input}
                    value={amountReceived}
                    onChangeText={setAmountReceived}
                    placeholder="0.00"
                    placeholderTextColor={COLORS.gray}
                    keyboardType="decimal-pad"
                    editable={!processing}
                  />
                  <View style={styles.quickAmounts}>
                    {[grandTotal, 100, 200, 500, 1000].map((amt, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.quickBtn}
                        onPress={() => setAmountReceived(String(Math.round(amt)))}
                      >
                        <Text style={styles.quickBtnText}>
                          {idx === 0 ? 'Exact' : amt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {received >= grandTotal && (
                    <View style={styles.changeBox}>
                      <Text style={styles.changeLabel}>Change</Text>
                      <Text style={styles.changeValue}>KES {change.toFixed(2)}</Text>
                    </View>
                  )}
                </>
              )}

              {paymentMethod === 'MPESA' && (
                <>
                  <Text style={styles.label}>Customer Phone Number</Text>
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="07XXXXXXXX"
                    placeholderTextColor={COLORS.gray}
                    keyboardType="phone-pad"
                    editable={!processing}
                  />
                  <Text style={styles.label}>M-Pesa Reference Code</Text>
                  <TextInput
                    style={styles.input}
                    value={reference}
                    onChangeText={setReference}
                    placeholder="e.g. QDC12XYZ89"
                    placeholderTextColor={COLORS.gray}
                    autoCapitalize="characters"
                    editable={!processing}
                  />
                  <Text style={styles.helperText}>
                    Enter the M-Pesa confirmation code from the customer's SMS.
                  </Text>
                </>
              )}

              {(paymentMethod === 'CARD' || paymentMethod === 'BANK') && (
                <>
                  <Text style={styles.label}>
                    {paymentMethod === 'CARD' ? 'Card Transaction ID' : 'Bank Reference'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={reference}
                    onChangeText={setReference}
                    placeholder="Transaction reference"
                    placeholderTextColor={COLORS.gray}
                    editable={!processing}
                  />
                </>
              )}

              {paymentMethod === 'CREDIT' && (
                <View style={styles.noticeBox}>
                  <Text style={styles.noticeText}>
                    Credit sales will be added to the customer's outstanding balance.
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.confirmBtn, (!isValid || processing) && styles.confirmBtnDisabled]}
              onPress={handleConfirm}
              disabled={!isValid || processing}
            >
              {processing ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.confirmBtnText}>
                  Confirm — KES {grandTotal.toFixed(2)}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SIZES.md, paddingVertical: SIZES.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.white,
  },
  cancelText: { color: COLORS.primary, fontSize: 15, fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  offlineBanner: {
    backgroundColor: '#C62828', paddingVertical: 8, paddingHorizontal: SIZES.md,
  },
  offlineText: { color: COLORS.white, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  scrollContent: { padding: SIZES.md, paddingBottom: SIZES.xxl },
  summaryCard: {
    backgroundColor: COLORS.white, borderRadius: 12,
    padding: SIZES.md, borderWidth: 1, borderColor: COLORS.border,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: SIZES.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel: { flex: 1, fontSize: 14, color: COLORS.textSecondary, marginRight: 8 },
  summaryValue: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SIZES.sm },
  totalRow: {
    marginTop: SIZES.sm, paddingTop: SIZES.sm,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  totalLabel: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  totalValue: { fontSize: 20, fontWeight: '700', color: COLORS.primary },
  section: {
    backgroundColor: COLORS.white, borderRadius: 12, padding: SIZES.md,
    marginTop: SIZES.md, borderWidth: 1, borderColor: COLORS.border,
  },
  paymentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.sm },
  paymentTile: {
    width: '31%', paddingVertical: SIZES.md, borderRadius: 10,
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  paymentTileActive: { backgroundColor: '#E8F5E9', borderColor: COLORS.primary, borderWidth: 2 },
  paymentIcon: { fontSize: 22, marginBottom: 4 },
  paymentLabel: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  paymentLabelActive: { color: COLORS.primary },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginTop: SIZES.sm, marginBottom: SIZES.xs },
  input: {
    backgroundColor: COLORS.background, borderRadius: 10,
    paddingHorizontal: SIZES.md, paddingVertical: SIZES.md,
    fontSize: 16, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text,
  },
  quickAmounts: { flexDirection: 'row', gap: 6, marginTop: SIZES.sm, flexWrap: 'wrap' },
  quickBtn: { paddingHorizontal: SIZES.md, paddingVertical: 8, borderRadius: 8, backgroundColor: '#E8F5E9' },
  quickBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  changeBox: {
    marginTop: SIZES.md, padding: SIZES.md, borderRadius: 10,
    backgroundColor: '#FFF3E0', borderWidth: 1, borderColor: '#FFB74D',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  changeLabel: { fontSize: 15, fontWeight: '700', color: '#E65100' },
  changeValue: { fontSize: 20, fontWeight: '700', color: '#E65100' },
  helperText: { fontSize: 12, color: COLORS.gray, marginTop: SIZES.xs },
  noticeBox: {
    padding: SIZES.md, borderRadius: 10,
    backgroundColor: '#FFF3E0', borderWidth: 1, borderColor: '#FFB74D',
  },
  noticeText: { fontSize: 13, color: '#E65100', lineHeight: 20 },
  footer: {
    padding: SIZES.md, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.white,
  },
  confirmBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: SIZES.md, alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmBtnText: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
});

export default CheckoutModal;
