import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { useTransactionStore } from '../../src/stores/transaction-store';
import { getAuthSession, saveAuthSession, clearAuthSession } from '../../src/services/auth-store';
import { syncClient } from '../../src/services/sync-client';
import * as BackgroundTask from 'expo-background-task';

export default function SettingsScreen() {
  const { pendingSyncCount, lastSyncTime, isSyncing, triggerSync } = useTransactionStore();
  const [authToken, setAuthTokenState] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [inputEmail, setInputEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [authStep, setAuthStep] = useState<'email' | 'code'>('email');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authFeedback, setAuthFeedback] = useState<{
    kind: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    getAuthSession().then(({ token, email }) => {
      setAuthTokenState(token);
      setAuthEmail(email);
    });
  }, []);

  const handleRequestCode = async () => {
    const email = inputEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setAuthFeedback({ kind: 'error', message: 'Enter a valid email address.' });
      return;
    }

    setIsAuthenticating(true);
    setAuthFeedback(null);
    try {
      const result = await syncClient.sendMagicLink(email);
      setAuthStep('code');
      setAuthFeedback({
        kind: 'success',
        message: result.devOtp
          ? `Verification code sent. Development code: ${result.devOtp}`
          : 'Verification code sent. Check your email.',
      });
    } catch (error) {
      setAuthFeedback({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Unable to send verification code.',
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleVerifyCode = async () => {
    const email = inputEmail.trim().toLowerCase();
    const code = verificationCode.trim();
    if (!/^\d{6}$/.test(code) && code.length < 24) {
      setAuthFeedback({ kind: 'error', message: 'Enter the six-digit code from your email.' });
      return;
    }

    setIsAuthenticating(true);
    setAuthFeedback(null);
    try {
      const result = await syncClient.verifyMagicLink(email, code);
      await saveAuthSession(result.token, result.user?.email || email);
      setAuthTokenState(result.token);
      setAuthEmail(result.user?.email || email);
      setVerificationCode('');
      setAuthStep('email');
      setAuthFeedback({ kind: 'success', message: 'Authentication complete.' });
    } catch (error) {
      setAuthFeedback({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Unable to verify the code.',
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    await clearAuthSession();
    setAuthTokenState(null);
    setAuthEmail(null);
    setInputEmail('');
    setVerificationCode('');
    setAuthStep('email');
    setAuthFeedback({ kind: 'success', message: 'Signed out securely.' });
  };

  const handleTestBackgroundSync = async () => {
    setAuthFeedback(null);
    try {
      const triggered = await BackgroundTask.triggerTaskWorkerForTestingAsync();
      setAuthFeedback({
        kind: triggered ? 'success' : 'error',
        message: triggered
          ? 'Background sync test worker triggered.'
          : 'Background sync test worker was not triggered.',
      });
    } catch (error) {
      setAuthFeedback({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Unable to trigger background sync.',
      });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings & Sync</Text>

      {/* Auth Card */}
      <View style={styles.card}>
        <Text style={styles.label}>Authentication & Cloud Identity</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Status:</Text>
          <Text style={[styles.statusValue, authToken ? styles.badgeSynced : styles.badgePending]}>
            {authToken ? 'Authenticated' : 'Unauthenticated'}
          </Text>
        </View>
        {authEmail ? (
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>User:</Text>
            <Text style={styles.statusValue}>{authEmail}</Text>
          </View>
        ) : null}

        {authToken ? (
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Disconnect / Logout</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.authInputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Email address"
              placeholderTextColor="#636366"
              value={inputEmail}
              onChangeText={setInputEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              accessibilityLabel="Email address"
              testID="auth-email-input"
              editable={!isAuthenticating && authStep === 'email'}
            />
            {authStep === 'code' ? (
              <TextInput
                style={styles.textInput}
                placeholder="Six-digit verification code"
                placeholderTextColor="#636366"
                value={verificationCode}
                onChangeText={setVerificationCode}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                accessibilityLabel="Verification code"
                testID="auth-code-input"
                editable={!isAuthenticating}
              />
            ) : null}
            {authFeedback ? (
              <Text
                accessibilityLiveRegion="polite"
                testID="auth-feedback"
                style={authFeedback.kind === 'error' ? styles.errorText : styles.successText}
              >
                {authFeedback.message}
              </Text>
            ) : null}
            <TouchableOpacity
              style={[styles.syncButton, isAuthenticating && styles.syncButtonDisabled]}
              onPress={authStep === 'email' ? handleRequestCode : handleVerifyCode}
              disabled={isAuthenticating}
              accessibilityRole="button"
              accessibilityLabel={authStep === 'email' ? 'Send verification code' : 'Verify code and sign in'}
              testID={authStep === 'email' ? 'auth-send-code' : 'auth-verify-code'}
            >
              {isAuthenticating ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.syncButtonText}>
                  {authStep === 'email' ? 'Send Verification Code' : 'Verify & Sign In'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Sync Card */}
      <View style={styles.card}>
        <Text style={styles.label}>Offline Sync Status</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Pending Changes:</Text>
          <Text style={[styles.statusValue, pendingSyncCount > 0 ? styles.badgePending : styles.badgeSynced]}>
            {pendingSyncCount > 0 ? `${pendingSyncCount} queued` : 'Synced'}
          </Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Last Cloud Sync:</Text>
          <Text style={styles.statusValue}>
            {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : 'Not synced yet'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]}
          onPress={triggerSync}
          disabled={isSyncing}
          testID="sync-now"
        >
          {isSyncing ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.syncButtonText}>Sync Now</Text>
          )}
        </TouchableOpacity>
        {__DEV__ ? (
          <TouchableOpacity
            style={styles.testButton}
            onPress={handleTestBackgroundSync}
            accessibilityRole="button"
            accessibilityLabel="Test background sync"
            testID="test-background-sync"
          >
            <Text style={styles.testButtonText}>Test Background Sync</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Apple Shortcuts Ingestion Card */}
      <View style={styles.card}>
        <Text style={styles.label}>Apple Shortcuts Integration</Text>
        <Text style={styles.help}>
          Device credentials are generated by the API after authentication. Never paste a test or
          shared token into a production Shortcut.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', padding: 16 },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  card: { backgroundColor: '#1C1C1E', padding: 16, borderRadius: 12, marginBottom: 16 },
  label: { color: '#8E8E93', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8 },
  statusLabel: { color: '#FFFFFF', fontSize: 15 },
  statusValue: { color: '#8E8E93', fontSize: 15, fontWeight: '600' },
  badgePending: { color: '#FF9500' },
  badgeSynced: { color: '#34C759' },
  help: { color: '#8E8E93', fontSize: 13, lineHeight: 18 },
  syncButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  syncButtonDisabled: { opacity: 0.6 },
  syncButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
  logoutButton: {
    backgroundColor: '#3A3A3C',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  logoutButtonText: { color: '#FF453A', fontWeight: '600', fontSize: 14 },
  testButton: { padding: 10, alignItems: 'center', marginTop: 8 },
  testButtonText: { color: '#64D2FF', fontWeight: '600', fontSize: 13 },
  authInputContainer: { marginTop: 10 },
  successText: { color: '#34C759', fontSize: 13, lineHeight: 18, marginTop: 4 },
  errorText: { color: '#FF453A', fontSize: 13, lineHeight: 18, marginTop: 4 },
  textInput: {
    backgroundColor: '#2C2C2E',
    color: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 8,
  },
});
