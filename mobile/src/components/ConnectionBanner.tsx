import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNetwork } from '../context/NetworkContext';
import { useSync } from '../context/SyncContext';
import { COLORS, SIZES } from '../constants/theme';

const ConnectionBanner: React.FC = () => {
  const { isOnline } = useNetwork();
  const { pendingCount, syncing, syncNow } = useSync();

  if (isOnline && pendingCount === 0) return null;

  return (
    <View style={[styles.banner, isOnline ? styles.online : styles.offline]}>
      <Text style={styles.icon}>{isOnline ? '🔄' : '🔴'}</Text>
      <Text style={styles.text}>
        {!isOnline
          ? 'Offline — sales will sync when online'
          : syncing
          ? `Syncing ${pendingCount} sale(s)…`
          : `${pendingCount} sale(s) pending sync`}
      </Text>
      {isOnline && pendingCount > 0 && !syncing && (
        <TouchableOpacity style={styles.syncBtn} onPress={syncNow}>
          <Text style={styles.syncBtnText}>Sync Now</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, paddingHorizontal: SIZES.md,
  },
  offline: { backgroundColor: '#C62828' },
  online: { backgroundColor: '#F57C00' },
  icon: { fontSize: 16, marginRight: 8 },
  text: { flex: 1, color: COLORS.white, fontSize: 12, fontWeight: '600' },
  syncBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: SIZES.sm, paddingVertical: 4, borderRadius: 6,
  },
  syncBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 11 },
});

export default ConnectionBanner;
