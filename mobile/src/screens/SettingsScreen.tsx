import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Switch, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { businessApi } from '../api/business.api';
import { COLORS, SIZES } from '../constants/theme';

const SettingsScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('');
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxRate, setTaxRate] = useState('0');
  const [taxIncluded, setTaxIncluded] = useState(false);

  const load = useCallback(async () => {
    try {
      const b = await businessApi.get();
      setName(b.name);
      setOwnerName(b.ownerName);
      setPhone(b.phone);
      setEmail(b.email);
      setAddress(b.address || '');
      setReceiptFooter(b.receiptFooter || '');
      setTaxEnabled(b.taxEnabled);
      setTaxRate(String(b.taxRate));
      setTaxIncluded(b.taxIncluded);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load settings');
    } finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleSave = async () => {
    if (!name.trim() || !ownerName.trim()) {
      Alert.alert('Validation', 'Business name and owner name are required'); return;
    }
    setSaving(true);
    try {
      await businessApi.update({
        name: name.trim(), ownerName: ownerName.trim(),
        phone: phone.trim(), email: email.trim(),
        address: address.trim() || '', receiptFooter: receiptFooter.trim() || '',
        taxEnabled, taxRate: parseFloat(taxRate) || 0, taxIncluded,
      });
      Alert.alert('Success', 'Settings saved. Log out and back in to refresh tax settings.');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Business Information</Text>
            <Text style={styles.label}>Business Name *</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} editable={!saving} placeholderTextColor={COLORS.gray} />

            <Text style={styles.label}>Owner Name *</Text>
            <TextInput style={styles.input} value={ownerName} onChangeText={setOwnerName} editable={!saving} placeholderTextColor={COLORS.gray} />

            <Text style={styles.label}>Phone</Text>
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" editable={!saving} placeholderTextColor={COLORS.gray} />

            <Text style={styles.label}>Email</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" editable={!saving} placeholderTextColor={COLORS.gray} />

            <Text style={styles.label}>Address</Text>
            <TextInput style={[styles.input, styles.textArea]} value={address} onChangeText={setAddress}
              multiline numberOfLines={2} editable={!saving} placeholderTextColor={COLORS.gray} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tax Settings</Text>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Enable Tax</Text>
              <Switch value={taxEnabled} onValueChange={setTaxEnabled}
                trackColor={{ false: COLORS.border, true: COLORS.primary }} />
            </View>
            {taxEnabled && (
              <>
                <Text style={styles.label}>Tax Rate (%)</Text>
                <TextInput style={styles.input} value={taxRate} onChangeText={setTaxRate}
                  keyboardType="decimal-pad" editable={!saving} placeholderTextColor={COLORS.gray} />
                <View style={[styles.switchRow, { marginTop: SIZES.sm }]}>
                  <Text style={styles.switchLabel}>Price includes tax</Text>
                  <Switch value={taxIncluded} onValueChange={setTaxIncluded}
                    trackColor={{ false: COLORS.border, true: COLORS.primary }} />
                </View>
                <Text style={styles.hint}>
                  {taxIncluded ? 'Tax is already included in your product prices.'
                    : 'Tax will be added on top of the selling price.'}
                </Text>
              </>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Receipt Settings</Text>
            <Text style={styles.label}>Footer Message</Text>
            <TextInput style={[styles.input, styles.textArea]} value={receiptFooter}
              onChangeText={setReceiptFooter} multiline numberOfLines={3}
              editable={!saving} placeholder="Thank you for shopping with us!" placeholderTextColor={COLORS.gray} />
          </View>

          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveBtnText}>Save Settings</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: SIZES.md, paddingBottom: SIZES.xl },
  section: { backgroundColor: COLORS.white, borderRadius: 12, padding: SIZES.md, marginBottom: SIZES.md, borderWidth: 1, borderColor: COLORS.border },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: SIZES.sm },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.text, marginTop: SIZES.sm, marginBottom: SIZES.xs },
  input: { backgroundColor: COLORS.background, borderRadius: 10, paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm,
    fontSize: 15, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text },
  textArea: { height: 60, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SIZES.sm },
  switchLabel: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  hint: { fontSize: 11, color: COLORS.gray, marginTop: SIZES.xs, fontStyle: 'italic' },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: SIZES.md, alignItems: 'center', marginTop: SIZES.sm },
  saveBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
});

export default SettingsScreen;
