import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Modal,
  TextInput, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { expensesApi, Expense, PaymentMethod } from '../api/expenses.api';
import { COLORS, SIZES } from '../constants/theme';

const CATEGORIES = ['Rent', 'Transport', 'Electricity', 'Internet', 'Salaries', 'Supplies', 'Maintenance', 'Other'];
const PAYMENT_METHODS: Array<{ v: PaymentMethod; label: string }> = [
  { v: 'CASH', label: 'Cash' },
  { v: 'MPESA', label: 'M-Pesa' },
  { v: 'CARD', label: 'Card' },
  { v: 'BANK', label: 'Bank' },
];

const ExpensesScreen: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form
  const [category, setCategory] = useState('Rent');
  const [customCategory, setCustomCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');

  const load = useCallback(async () => {
    try {
      const res = await expensesApi.list();
      setExpenses(res.expenses);
      setTotal(res.total);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load expenses');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  const openCreate = () => {
    setCategory('Rent'); setCustomCategory(''); setAmount('');
    setDescription(''); setPaymentMethod('CASH');
    setModalVisible(true);
  };

  const handleSave = async () => {
    const cat = category === 'Other' ? customCategory.trim() : category;
    if (!cat) {
      Alert.alert('Validation', 'Select or enter a category');
      return;
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Validation', 'Enter a valid amount');
      return;
    }
    setSaving(true);
    try {
      const created = await expensesApi.create({
        category: cat,
        amount: amt,
        description: description.trim() || undefined,
        paymentMethod,
      });
      setExpenses((prev) => [created, ...prev]);
      setTotal((t) => t + created.amount);
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (e: Expense) => {
    Alert.alert('Delete Expense', `Delete ${e.category} - KES ${e.amount}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await expensesApi.delete(e.id);
            setExpenses((prev) => prev.filter((x) => x.id !== e.id));
            setTotal((t) => t - e.amount);
          } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to delete');
          }
        },
      },
    ]);
  };

  const fmt = (n: number) => `KES ${n.toFixed(2)}`;

  const renderItem = ({ item }: { item: Expense }) => (
    <TouchableOpacity style={styles.item} onLongPress={() => handleDelete(item)}>
      <View style={styles.iconCircle}>
        <Text style={styles.iconText}>💸</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemCat}>{item.category}</Text>
        {item.description ? (
          <Text style={styles.itemDesc} numberOfLines={1}>{item.description}</Text>
        ) : null}
        <Text style={styles.itemMeta}>
          {new Date(item.date).toLocaleDateString()} · {item.paymentMethod}
        </Text>
      </View>
      <Text style={styles.itemAmount}>{fmt(item.amount)}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Total banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerLabel}>TOTAL EXPENSES</Text>
        <Text style={styles.bannerValue}>{fmt(total)}</Text>
        <Text style={styles.bannerSub}>{expenses.length} entries</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No expenses yet.</Text>
              <Text style={styles.emptyHint}>Tap + to record one.</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={openCreate}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>New Expense</Text>

              <Text style={styles.label}>Category</Text>
              <View style={styles.chipWrap}>
                {CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.chip, category === c && styles.chipActive]}
                    onPress={() => setCategory(c)}
                  >
                    <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {category === 'Other' && (
                <>
                  <Text style={styles.label}>Custom Category</Text>
                  <TextInput
                    style={styles.input}
                    value={customCategory}
                    onChangeText={setCustomCategory}
                    placeholder="e.g. Marketing"
                    placeholderTextColor={COLORS.gray}
                    editable={!saving}
                  />
                </>
              )}

              <Text style={styles.label}>Amount (KES) *</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={COLORS.gray}
                keyboardType="decimal-pad"
                editable={!saving}
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Optional notes"
                placeholderTextColor={COLORS.gray}
                multiline
                numberOfLines={2}
                editable={!saving}
              />

              <Text style={styles.label}>Payment Method</Text>
              <View style={styles.chipWrap}>
                {PAYMENT_METHODS.map((p) => (
                  <TouchableOpacity
                    key={p.v}
                    style={[styles.chip, paymentMethod === p.v && styles.chipActive]}
                    onPress={() => setPaymentMethod(p.v)}
                  >
                    <Text style={[styles.chipText, paymentMethod === p.v && styles.chipTextActive]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]}
                  onPress={() => setModalVisible(false)} disabled={saving}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, styles.saveBtn, saving && { opacity: 0.6 }]}
                  onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator color={COLORS.white} /> :
                    <Text style={styles.saveBtnText}>Save</Text>}
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
  banner: {
    backgroundColor: COLORS.danger, padding: SIZES.lg, alignItems: 'center',
  },
  bannerLabel: { fontSize: 11, color: '#FFCDD2', fontWeight: '700', letterSpacing: 1 },
  bannerValue: { fontSize: 28, color: COLORS.white, fontWeight: '700', marginTop: 4 },
  bannerSub: { fontSize: 12, color: '#FFCDD2', marginTop: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: SIZES.md, paddingBottom: 100 },
  item: {
    backgroundColor: COLORS.white, borderRadius: 12, padding: SIZES.md,
    marginBottom: SIZES.sm, borderWidth: 1, borderColor: COLORS.border,
    flexDirection: 'row', alignItems: 'center',
  },
  iconCircle: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFEBEE',
    alignItems: 'center', justifyContent: 'center', marginRight: SIZES.md,
  },
  iconText: { fontSize: 18 },
  itemCat: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  itemDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  itemMeta: { fontSize: 11, color: COLORS.gray, marginTop: 4 },
  itemAmount: { fontSize: 15, fontWeight: '700', color: COLORS.danger },
  empty: { alignItems: 'center', marginTop: SIZES.xxl },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, fontWeight: '600' },
  emptyHint: { fontSize: 14, color: COLORS.gray, marginTop: SIZES.xs },
  fab: {
    position: 'absolute', right: SIZES.lg, bottom: SIZES.lg,
    width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center', elevation: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8,
  },
  fabText: { color: COLORS.white, fontSize: 32, lineHeight: 34, fontWeight: '300' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: SIZES.lg, maxHeight: '90%',
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: SIZES.md },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginTop: SIZES.sm, marginBottom: SIZES.xs },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm,
    borderRadius: 20, backgroundColor: COLORS.background,
    borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 12, color: COLORS.text, fontWeight: '600' },
  chipTextActive: { color: COLORS.white },
  input: {
    backgroundColor: COLORS.background, borderRadius: 10,
    paddingHorizontal: SIZES.md, paddingVertical: SIZES.md,
    fontSize: 15, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text,
  },
  textArea: { height: 60, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: SIZES.sm, marginTop: SIZES.lg },
  modalBtn: { flex: 1, paddingVertical: SIZES.md, borderRadius: 10, alignItems: 'center' },
  cancelBtn: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  cancelBtnText: { color: COLORS.text, fontWeight: '600' },
  saveBtn: { backgroundColor: COLORS.primary },
  saveBtnText: { color: COLORS.white, fontWeight: '700' },
});

export default ExpensesScreen;
