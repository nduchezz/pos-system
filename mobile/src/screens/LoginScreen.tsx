import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS, SIZES } from '../constants/theme';

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Validation', 'Please enter email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Login failed.';
      Alert.alert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>POS</Text>
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={COLORS.gray}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
                placeholderTextColor={COLORS.gray}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.showPasswordBtn}>
                <Text style={styles.showPasswordText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.loginButtonText}>Sign In</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>Test Credentials</Text>
          <Text style={styles.footerText}>john@demoshop.com / password123</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { flexGrow: 1, padding: SIZES.lg, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: SIZES.xl },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SIZES.md,
  },
  logoText: { color: COLORS.white, fontSize: 24, fontWeight: 'bold' },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.text, marginBottom: SIZES.xs },
  subtitle: { fontSize: 15, color: COLORS.textSecondary },
  form: { marginBottom: SIZES.lg },
  inputGroup: { marginBottom: SIZES.md },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: SIZES.xs },
  input: {
    backgroundColor: COLORS.white, borderRadius: 10,
    paddingHorizontal: SIZES.md, paddingVertical: SIZES.md,
    fontSize: 16, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text,
  },
  passwordContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  passwordInput: {
    flex: 1, paddingHorizontal: SIZES.md, paddingVertical: SIZES.md,
    fontSize: 16, color: COLORS.text,
  },
  showPasswordBtn: { paddingHorizontal: SIZES.md, paddingVertical: SIZES.md },
  showPasswordText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  loginButton: {
    backgroundColor: COLORS.primary, borderRadius: 10,
    paddingVertical: SIZES.md, alignItems: 'center', marginTop: SIZES.md,
  },
  loginButtonDisabled: { opacity: 0.6 },
  loginButtonText: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
  footer: {
    alignItems: 'center', paddingTop: SIZES.lg,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  footerTitle: { fontSize: 13, color: COLORS.textSecondary, marginBottom: SIZES.xs },
  footerText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
});

export default LoginScreen;
