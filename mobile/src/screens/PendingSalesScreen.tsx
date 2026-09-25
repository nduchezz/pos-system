import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useSync } from '../context/SyncContext';
import { useNetwork } from '../context/NetworkContext';
import { pendingSalesRepo } from '../database';
import { COLORS, SIZES } from '../constants/theme';

const PendingSalesScreen: React.FC = () => {
  const { pendingSales, reloadPending, syncNow, syncing } = useSync();
  const { isOnline } = useNetwork();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    await reloadPending();
    setLoading(false);
    setRefreshing(false);
  }, [reloadPending]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  const handleDelete = (clientTransactionId: string, localReceiptNo: string) => {
    Alert.alert(
      'Delete Pending Sale',
      `Delete ${localReceiptNo}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await pendingSalesRepo.remove(clientTransactionId);
            await reloadPending();
          },
        },
      ]
    );
  };

  const handleSync = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Cannot sync while offline.');
      return;
    }
    await syncNow();
    await reloadPending();
  };

  const renderItem = ({ item }: any) => {
    const statusColor =
      item.status === 'failed'
        ? COLORS.danger
        : item.status === 'syncing'
        ? COLORS.info
        : COLORS.warning;

    return (
      <TouchableOpacity
        style={styles.item}
        onLongPress={() => handleDelete(item.clientTransactionId, item.localReceiptNo)}
      >
        <View style={{ flex: 1 }}>
          <View style={styles.topRow}>
            <Text style={styles.receiptNo}>{item.localReceiptNo}</Text>
            <View style={[styles.badge, { backgroundColor: statusColor }]}>
              <Text style={styles.badgeText}>
                {item.status.toUpperCase()}
                {item.retries > 0 ? ` (${item.retries})` : ''}
              </Text>
            </View>
          </View>
          <Text style={styles.meta}>
            {new Date(item.createdAt).toLocaleString()}
          </Text>
          {item.lastError ? (
            <Text style={styles.errorText} numberOfLines={2}>
              ⚠️ {item.lastError}
            </Text>
          ) : null}
        </View>
        <Text style={styles.amount}>KES {item.total.toFixed(2)}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {pendingSales.length > 0 && (
        <TouchableOpacity
          style={[styles.syncBtn, syncing && { opacity: 0.6 }]}
          onPress={handleSync}
          disabled={syncing || !isOnline}
        >
          {syncing ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.syncBtnText}>
              {isOnline ? `Sync ${pendingSales.length} Sale(s) Now` : 'Offline — Cannot Sync'}
            </Text>
          )}
        </TouchableOpacity>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={pendingSales}
          keyExtractor={(item) => item.clientTransactionId}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>✅</Text>
              <Text style={styles.emptyText}>No pending sales</Text>
              <Text style={styles.emptyHint}>All sales have been synced to the server.</Text>
            </View>
          }
        />
      )}

      <Text style={styles.hint}>Long-press a sale to delete it</Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  syncBtn: {
    backgroundColor: COLORS.primary, margin: SIZES.md,
    paddingVertical: SIZES.md, borderRadius: 12, alignItems: 'center',
  },
  syncBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
  listContent: { padding: SIZES.md, paddingBottom: SIZES.xl },
  item: {
    backgroundColor: COLORS.white, borderRadius: 12, padding: SIZES.md,
    marginBottom: SIZES.sm, borderWidth: 1, borderColor: COLORS.border,
    flexDirection: 'row', alignItems: 'center',
  },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  receiptNo: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginRight: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 9, fontWeight: '700', color: COLORS.white },
  meta: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  errorText: { fontSize: 11, color: COLORS.danger, marginTop: 4 },
  amount: { fontSize: 15, fontWeight: '700', color: COLORS.primary, marginLeft: SIZES.sm },
  empty: { alignItems: 'center', marginTop: SIZES.xxl },
  emptyIcon: { fontSize: 48, marginBottom: SIZES.md },
  emptyText: { fontSize: 18, color: COLORS.text, fontWeight: '700' },
  emptyHint: { fontSize: 13, color: COLORS.textSecondary, marginTop: SIZES.xs, textAlign: 'center' },
  hint: {
    textAlign: 'center', fontSize: 11, color: COLORS.gray,
    paddingVertical: SIZES.sm,
  },
});

export default PendingSalesScreen;
