import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { parseSMS } from '@expenseflow/parser-engine';

export default function RootLayout() {
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const parsedUrl = Linking.parse(event.url);
      if (parsedUrl.path === 'capture' || parsedUrl.hostname === 'capture') {
        const { rawText, sender } = parsedUrl.queryParams || {};
        if (rawText && typeof rawText === 'string') {
          console.log('[DeepLink Capture] Received offline SMS capture payload via Apple Shortcut fallback:', rawText);
          const parsedResult = parseSMS(rawText, (sender as string) || 'BANK');
          console.log('[DeepLink Capture] Parsed transaction result:', parsedResult);
        }
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => {
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
