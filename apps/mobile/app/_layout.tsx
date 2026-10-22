import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { parseSMS } from '@expenseflow/parser-engine';
import { initializeDatabase } from '../src/db/migrator';
import { useTransactionStore } from '../src/stores/transaction-store';
import { getAuthSession } from '../src/services/auth-store';
import { insertCapturedSMSTransaction } from '../src/services/transaction-store';
import { startSyncLifecycle } from '../src/services/sync-lifecycle';

export default function RootLayout() {
  const loadData = useTransactionStore((s) => s.loadData);

  useEffect(() => {
    let stopSyncLifecycle: (() => void) | undefined;
    let mounted = true;
    // 1. Initialize Local SQLite Tables, Restore Auth Session & Load Cached Data
    const bootstrap = initializeDatabase()
      .then(() => getAuthSession())
      .then(() => loadData());

    bootstrap
      .then(() => startSyncLifecycle())
      .then((cleanup) => {
        if (mounted) stopSyncLifecycle = cleanup;
        else cleanup();
      })
      .catch((err) => console.error('Database bootstrap error:', err));

    const handleDeepLink = async (event: { url: string }) => {
      const parsedUrl = Linking.parse(event.url);
      if (parsedUrl.path === 'capture' || parsedUrl.hostname === 'capture') {
        const { rawText, sender } = parsedUrl.queryParams || {};
        if (rawText && typeof rawText === 'string') {
          await bootstrap;
          console.log('[DeepLink Capture] Received offline SMS capture payload:', rawText);
          const parsedResult = parseSMS(rawText, (sender as string) || 'BANK');
          console.log('[DeepLink Capture] Parsed transaction result:', parsedResult);
          if (parsedResult) {
            await insertCapturedSMSTransaction(parsedResult);
            await loadData();
          }
        }
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => {
      mounted = false;
      stopSyncLifecycle?.();
      subscription.remove();
    };
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#000000' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' },
          contentStyle: { backgroundColor: '#000000' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
