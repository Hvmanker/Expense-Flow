import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useTransactionStore } from '../../src/stores/transaction-store';

export default function InboxScreen() {
  const { pendingTransactions, confirmItem, ignoreItem, isLoading } = useTransactionStore();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pending Approval ({pendingTransactions.length})</Text>

      {pendingTransactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>🎉 All caught up!</Text>
          <Text style={styles.emptySubtitle}>No pending transactions awaiting review.</Text>
        </View>
      ) : (
        <FlatList
          data={pendingTransactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.merchant}>{item.merchant}</Text>
                <Text style={styles.amount}>₹{item.amount.toFixed(2)}</Text>
              </View>
              <Text style={styles.bank}>
                {item.bank} Bank • {item.payment_method}
              </Text>
              <View style={styles.aiBadge}>
                <Text style={styles.aiText}>
                  AI Suggestion: {item.ai_category || 'Miscellaneous'} (
                  {Math.round((item.ai_confidence || 0.9) * 100)}% match)
                </Text>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.button, styles.confirmButton]}
                  onPress={() =>
                    confirmItem(
                      item.id,
                      item.ai_category || 'Food & Dining',
                      item.purpose || 'Expense'
                    )
                  }
                >
                  <Text style={styles.buttonText}>Approve & Confirm</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.ignoreButton]}
                  onPress={() => ignoreItem(item.id)}
                >
                  <Text style={[styles.buttonText, styles.ignoreText]}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
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
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  button: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  confirmButton: { backgroundColor: '#007AFF' },
  ignoreButton: { backgroundColor: '#2C2C2E' },
  buttonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  ignoreText: { color: '#8E8E93' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  emptySubtitle: { color: '#8E8E93', fontSize: 14, marginTop: 8 },
});
