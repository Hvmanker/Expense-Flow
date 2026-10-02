import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Apple Shortcuts Integration</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Device Secret Token</Text>
        <Text style={styles.token}>test-device-token-123</Text>
        <Text style={styles.help}>Paste this token into your Apple Shortcut X-Device-Token header.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', padding: 16 },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  card: { backgroundColor: '#1C1C1E', padding: 16, borderRadius: 12, marginBottom: 12 },
  label: { color: '#8E8E93', fontSize: 13, textTransform: 'uppercase' },
  token: { color: '#007AFF', fontSize: 16, fontWeight: 'bold', marginVertical: 8 },
  help: { color: '#8E8E93', fontSize: 12 },
});
