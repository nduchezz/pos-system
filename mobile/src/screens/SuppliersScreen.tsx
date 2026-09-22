import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Modal,
  TextInput, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { suppliersApi, Supplier } from '../api/suppliers.api';
import { COLORS, SIZES } from '../constants/theme';

const SuppliersScreen: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const loadSuppliers = useCallback(async () => {
    try {
      const data = await suppliersApi.list({ search: search || undefined });
      setSuppliers(data);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load suppliers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useFocusEffect(useCallback(() => { loadSuppliers(); }, [loadSuppliers]));

  const onRefresh = () => { setRefreshing(true); loadSuppliers(); };

  const resetForm = () => {
    setName(''); setContactPerson(''); setPhone('');
    setEmail(''); setAddress(''); setNotes('');
  };

  const openCreate = () => { setEditingId(null); resetForm(); setModalVisible(true); };

  const openEdit = (s: Supplier) => {
    setEditingId(s.id);
    setName(s.name);
    setContactPerson(s.contactPerson || '');
    setPhone(s.phone || '');
    setEmail(s.email || '');
    setAddress(s.address || '');
    setNotes(s.notes || '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Name is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        contactPerson: contactPerson.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (editingId) {
        const updated = await suppliersApi.update(editingId, payload);
        setSuppliers((prev) => prev.map((s) => (s.id === editingId ? { ...s, ...updated } : s)));
      } else {
        const created = await suppliersApi.create(payload);
        setSuppliers((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      }
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (s: Supplier) => {
    Alert.alert('Delete Supplier', `Delete "${s.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await suppliersApi.delete(s.id);
            setSuppliers((prev) => prev.filter((x) => x.id !== s.id));
          } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to delete');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Supplier }) => (
    <TouchableOpacity
      style={styles.item}
      onPress={() => openEdit(item)}
      onLongPress={() => handleDelete(item)}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>🏭</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemName}>{item.name}</Text>
        {item.contactPerson ? <Text style={styles.itemMeta}>👤 {item.contactPerson}</Text> : null}
        {item.phone ? <Text style={styles.itemMeta}>📞 {item.phone}</Text> : null}
        <Text style={styles.badge}>{item._count?.products ?? 0} product(s)</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search suppliers…"
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
          data={suppliers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No suppliers yet.</Text>
              <Text style={styles.emptyHint}>Tap + to add your first supplier.</Text>
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
              <Text style={styles.modalTitle}>{editingId ? 'Edit Supplier' : 'New Supplier'}</Text>

              <Text style={styles.label}>Business Name *</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName}
                placeholder="e.g. Nairobi Beverages Ltd" placeholderTextColor={COLORS.gray} editable={!saving} />

              <Text style={styles.label}>Contact Person</Text>
              <TextInput style={styles.input} value={contactPerson} onChangeText={setContactPerson}
                placeholder="e.g. Peter Kamau" placeholderTextColor={COLORS.gray} editable={!saving} />

              <Text style={styles.label}>Phone</Text>
              <TextInput style={styles.input} value={phone} onChangeText={setPhone}
                placeholder="07XXXXXXXX" placeholderTextColor={COLORS.gray}
                keyboardType="phone-pad" editable={!saving} />

              <Text style={styles.label}>Email</Text>
              <TextInput style={styles.input} value={email} onChangeText={setEmail}
                placeholder="supplier@example.com" placeholderTextColor={COLORS.gray}
                keyboardType="email-address" autoCapitalize="none" editable={!saving} />

              <Text style={styles.label}>Address</Text>
              <TextInput style={[styles.input, styles.textArea]} value={address} onChangeText={setAddress}
                placeholder="Physical address" placeholderTextColor={COLORS.gray}
                multiline numberOfLines={2} editable={!saving} />

              <Text style={styles.label}>Notes</Text>
              <TextInput style={[styles.input, styles.textArea]} value={notes} onChangeText={setNotes}
                placeholder="Delivery days, terms, etc." placeholderTextColor={COLORS.gray}
                multiline numberOfLines={2} editable={!saving} />

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
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#E8F5E9',
    alignItems: 'center', justifyContent: 'center', marginRight: SIZES.md,
  },
  avatarText: { fontSize: 22 },
  itemName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  itemMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  badge: {
    fontSize: 10, fontWeight: '700', color: COLORS.primary,
    backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 10, marginTop: 4, alignSelf: 'flex-start',
  },
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

export default SuppliersScreen;
