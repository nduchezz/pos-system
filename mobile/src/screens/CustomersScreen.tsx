import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Modal,
  TextInput, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { customersApi, Customer } from '../api/customers.api';
import { COLORS, SIZES } from '../constants/theme';

const CustomersScreen: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState('0');

  const loadCustomers = useCallback(async () => {
    try {
      const data = await customersApi.list({ search: search || undefined });
      setCustomers(data);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load customers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useFocusEffect(useCallback(() => { loadCustomers(); }, [loadCustomers]));

  const onRefresh = () => { setRefreshing(true); loadCustomers(); };

  const resetForm = () => {
    setName(''); setPhone(''); setEmail(''); setAddress(''); setCreditLimit('0');
  };

  const openCreate = () => {
    setEditingId(null); resetForm(); setModalVisible(true);
  };

  const openEdit = (c: Customer) => {
    setEditingId(c.id);
    setName(c.name);
    setPhone(c.phone || '');
    setEmail(c.email || '');
    setAddress(c.address || '');
    setCreditLimit(String(c.creditLimit));
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Name is required');
      return;
    }
    const cl = parseFloat(creditLimit) || 0;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        creditLimit: cl,
      };

      if (editingId) {
        const updated = await customersApi.update(editingId, payload);
        setCustomers((prev) => prev.map((c) => (c.id === editingId ? { ...c, ...updated } : c)));
      } else {
        const created = await customersApi.create(payload);
        setCustomers((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      }
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (c: Customer) => {
    Alert.alert('Delete Customer', `Delete "${c.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await customersApi.delete(c.id);
            setCustomers((prev) => prev.filter((x) => x.id !== c.id));
          } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to delete');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Customer }) => (
    <TouchableOpacity
      style={styles.item}
      onPress={() => openEdit(item)}
      onLongPress={() => handleDelete(item)}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemName}>{item.name}</Text>
        {item.phone ? <Text style={styles.itemMeta}>📞 {item.phone}</Text> : null}
        {item.email ? <Text style={styles.itemMeta}>✉️ {item.email}</Text> : null}
        <View style={styles.badges}>
          <Text style={styles.badge}>{item._count?.sales ?? 0} sales</Text>
          {item.outstandingBalance > 0 && (
            <Text style={[styles.badge, styles.badgeWarn]}>
              Owed: KES {item.outstandingBalance.toFixed(2)}
            </Text>
          )}
        </View>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, phone, email…"
          placeholderTextColor={COLORS.gray}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No customers yet.</Text>
              <Text style={styles.emptyHint}>Tap + to add your first customer.</Text>
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
              <Text style={styles.modalTitle}>{editingId ? 'Edit Customer' : 'New Customer'}</Text>

              <Text style={styles.label}>Name *</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName}
                placeholder="e.g. Mary Wanjiku" placeholderTextColor={COLORS.gray} editable={!saving} />

              <Text style={styles.label}>Phone</Text>
              <TextInput style={styles.input} value={phone} onChangeText={setPhone}
                placeholder="07XXXXXXXX" placeholderTextColor={COLORS.gray}
                keyboardType="phone-pad" editable={!saving} />

              <Text style={styles.label}>Email</Text>
              <TextInput style={styles.input} value={email} onChangeText={setEmail}
                placeholder="email@example.com" placeholderTextColor={COLORS.gray}
                keyboardType="email-address" autoCapitalize="none" editable={!saving} />

              <Text style={styles.label}>Address</Text>
              <TextInput style={[styles.input, styles.textArea]} value={address} onChangeText={setAddress}
                placeholder="Physical address" placeholderTextColor={COLORS.gray}
                multiline numberOfLines={2} editable={!saving} />

              <Text style={styles.label}>Credit Limit (KES)</Text>
              <TextInput style={styles.input} value={creditLimit} onChangeText={setCreditLimit}
                placeholder="0" placeholderTextColor={COLORS.gray}
                keyboardType="decimal-pad" editable={!saving} />

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]}
                  onPress={() => setModalVisible(false)} disabled={saving}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, styles.saveBtn, saving && { opacity: 0.6 }]}
                  onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator color={COLORS.white} /> :
                    <Text style={styles.saveBtnText}>{editingId ? 'Update' : 'Create'}</Text>}
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
  searchWrap: { padding: SIZES.md },
  searchInput: {
    backgroundColor: COLORS.white, borderRadius: 10,
    paddingHorizontal: SIZES.md, paddingVertical: SIZES.md,
    fontSize: 15, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: SIZES.md, paddingBottom: 100 },
  item: {
    backgroundColor: COLORS.white, borderRadius: 12, padding: SIZES.md,
    marginBottom: SIZES.sm, borderWidth: 1, borderColor: COLORS.border,
    flexDirection: 'row', alignItems: 'center',
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center', marginRight: SIZES.md,
  },
  avatarText: { color: COLORS.white, fontWeight: '700', fontSize: 18 },
  itemName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  itemMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  badges: { flexDirection: 'row', gap: 6, marginTop: 4 },
  badge: {
    fontSize: 10, fontWeight: '700', color: COLORS.primary,
    backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },
  badgeWarn: { color: COLORS.warning, backgroundColor: '#FFF3E0' },
  arrow: { fontSize: 24, color: COLORS.gray, marginLeft: SIZES.sm },
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

export default CustomersScreen;
