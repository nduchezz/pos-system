import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Modal,
  TextInput, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { usersApi, AppUser, UserRole } from '../api/users.api';
import { useAuth } from '../context/AuthContext';
import { COLORS, SIZES } from '../constants/theme';

const UsersScreen: React.FC = () => {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('CASHIER');

  const load = useCallback(async () => {
    try {
      const data = await usersApi.list();
      setUsers(data);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(); };

  const resetForm = () => { setName(''); setEmail(''); setPassword(''); setPhone(''); setRole('CASHIER'); };
  const openCreate = () => { setEditingId(null); resetForm(); setModalVisible(true); };
  const openEdit = (u: AppUser) => {
    setEditingId(u.id); setName(u.name); setEmail(u.email); setPassword('');
    setPhone(u.phone || ''); setRole(u.role); setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) {
      Alert.alert('Validation', 'Name and email are required'); return;
    }
    if (!editingId && password.length < 6) {
      Alert.alert('Validation', 'Password must be at least 6 characters'); return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const updated = await usersApi.update(editingId, {
          name: name.trim(), phone: phone.trim() || undefined, role,
        });
        if (password.length >= 6) await usersApi.changePassword(editingId, password);
        setUsers((prev) => prev.map((u) => (u.id === editingId ? { ...u, ...updated } : u)));
      } else {
        const created = await usersApi.create({
          name: name.trim(), email: email.trim(), password,
          phone: phone.trim() || undefined, role,
        });
        setUsers((prev) => [...prev, created]);
      }
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDelete = (u: AppUser) => {
    if (u.id === me?.id) { Alert.alert('Error', 'You cannot deactivate yourself'); return; }
    Alert.alert('Deactivate User', `Deactivate "${u.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deactivate', style: 'destructive',
        onPress: async () => {
          try {
            await usersApi.delete(u.id);
            setUsers((prev) => prev.filter((x) => x.id !== u.id));
          } catch (err: any) { Alert.alert('Error', err.response?.data?.message || 'Failed'); }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: AppUser }) => (
    <TouchableOpacity style={styles.item} onPress={() => openEdit(item)} onLongPress={() => handleDelete(item)}>
      <View style={[styles.avatar, { backgroundColor: item.role === 'ADMIN' ? COLORS.primary : COLORS.info }]}>
        <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemMeta}>{item.email}</Text>
        <View style={styles.badges}>
          <Text style={[styles.badge, item.role === 'ADMIN' && styles.badgeAdmin]}>{item.role}</Text>
          {item.id === me?.id && <Text style={styles.badge}>You</Text>}
        </View>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList data={users} keyExtractor={(i) => i.id} renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} />
      )}
      <TouchableOpacity style={styles.fab} onPress={openCreate}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>{editingId ? 'Edit User' : 'New User'}</Text>
              <Text style={styles.label}>Name *</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} editable={!saving} placeholderTextColor={COLORS.gray} />

              <Text style={styles.label}>Email *</Text>
              <TextInput style={styles.input} value={email} onChangeText={setEmail}
                keyboardType="email-address" autoCapitalize="none" editable={!saving && !editingId} placeholderTextColor={COLORS.gray} />

              <Text style={styles.label}>{editingId ? 'New Password (optional)' : 'Password *'}</Text>
              <TextInput style={styles.input} value={password} onChangeText={setPassword}
                secureTextEntry editable={!saving} placeholderTextColor={COLORS.gray} />

              <Text style={styles.label}>Phone</Text>
              <TextInput style={styles.input} value={phone} onChangeText={setPhone}
                keyboardType="phone-pad" editable={!saving} placeholderTextColor={COLORS.gray} />

              <Text style={styles.label}>Role</Text>
              <View style={styles.roleRow}>
                {(['CASHIER', 'ADMIN'] as UserRole[]).map((r) => (
                  <TouchableOpacity key={r} style={[styles.roleChip, role === r && styles.roleChipActive]}
                    onPress={() => setRole(r)} disabled={saving}>
                    <Text style={[styles.roleText, role === r && styles.roleTextActive]}>
                      {r === 'ADMIN' ? '👑 Admin' : '🧑‍💼 Cashier'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.actions}>
                <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={() => setModalVisible(false)} disabled={saving}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.saveBtn, saving && { opacity: 0.6 }]}
                  onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator color={COLORS.white} /> :
                    <Text style={styles.saveText}>{editingId ? 'Update' : 'Create'}</Text>}
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: SIZES.md, paddingBottom: 100 },
  item: {
    backgroundColor: COLORS.white, borderRadius: 12, padding: SIZES.md,
    marginBottom: SIZES.sm, borderWidth: 1, borderColor: COLORS.border,
    flexDirection: 'row', alignItems: 'center',
  },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: SIZES.md },
  avatarText: { color: COLORS.white, fontWeight: '700', fontSize: 18 },
  itemName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  itemMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  badges: { flexDirection: 'row', gap: 6, marginTop: 4 },
  badge: { fontSize: 10, fontWeight: '700', color: COLORS.info, backgroundColor: '#E3F2FD', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeAdmin: { color: COLORS.primary, backgroundColor: '#E8F5E9' },
  arrow: { fontSize: 24, color: COLORS.gray },
  fab: { position: 'absolute', right: SIZES.lg, bottom: SIZES.lg, width: 60, height: 60, borderRadius: 30,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  fabText: { color: COLORS.white, fontSize: 32, lineHeight: 34, fontWeight: '300' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: SIZES.lg, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: SIZES.md },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginTop: SIZES.sm, marginBottom: SIZES.xs },
  input: { backgroundColor: COLORS.background, borderRadius: 10, paddingHorizontal: SIZES.md, paddingVertical: SIZES.md,
    fontSize: 15, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text },
  roleRow: { flexDirection: 'row', gap: 8 },
  roleChip: { flex: 1, paddingVertical: SIZES.md, borderRadius: 10, backgroundColor: COLORS.background,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  roleChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  roleText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  roleTextActive: { color: COLORS.white },
  actions: { flexDirection: 'row', gap: SIZES.sm, marginTop: SIZES.lg },
  btn: { flex: 1, paddingVertical: SIZES.md, borderRadius: 10, alignItems: 'center' },
  cancelBtn: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  cancelText: { color: COLORS.text, fontWeight: '600' },
  saveBtn: { backgroundColor: COLORS.primary },
  saveText: { color: COLORS.white, fontWeight: '700' },
});

export default UsersScreen;
