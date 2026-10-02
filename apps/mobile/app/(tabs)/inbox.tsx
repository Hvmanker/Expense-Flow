import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';

const PENDING_TRANSACTIONS = [
  {
    id: 'tx_1',
    merchant: 'Starbucks',
    amount: 450.0,
    bank: 'HDFC',
    aiSuggestion: 'Food & Dining',
    time: '12:00 PM',
  },
  {
    id: 'tx_2',
    merchant: 'Swiggy Bangalore',
    amount: 1200.0,
    bank: 'ICICI',
    aiSuggestion: 'Food & Dining',
    time: ' Yesterday',
  },
];

export default function InboxScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pending Approval ({PENDING_TRANSACTIONS.length})</Text>
      <FlatList
        data={PENDING_TRANSACTIONS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.merchant}>{item.merchant}</Text>
              <Text style={styles.amount}>₹{item.amount.toFixed(2)}</Text>
            </View>
            <Text style={styles.bank}>{item.bank} Bank • {item.time}</Text>
            <View style={styles.aiBadge}>
              <Text style={styles.aiText}>AI Suggestion: {item.aiSuggestion}</Text>
            </View>
            <TouchableOpacity style={styles.button}>
              <Text style={styles.buttonText}>Confirm Purpose & Category</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', padding: 16 },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  card: { backgroundColor: '#1C1C1E', padding: 16, borderRadius: 12, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  merchant: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  amount: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  bank: { color: '#8E8E93', fontSize: 13, marginTop: 4 },
  aiBadge: { backgroundColor: '#0A2540', padding: 8, borderRadius: 6, marginVertical: 10 },
  aiText: { color: '#007AFF', fontSize: 12, fontWeight: '600' },
  button: { backgroundColor: '#007AFF', padding: 12, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
});
