import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTransactionStore } from '../../src/stores/transaction-store';

export default function HomeScreen() {
  const { totalSpend, recentTransactions } = useTransactionStore();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.label}>Confirmed Total Spend</Text>
        <Text style={styles.amount}>
          ₹{totalSpend.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
        <Text style={styles.subtitle}>
          {recentTransactions.length} recent confirmed transactions
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Ingestion Events</Text>
        {recentTransactions.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.merchant}>No confirmed transactions yet</Text>
            <Text style={styles.cardSub}>Approve incoming transactions from the Inbox tab.</Text>
          </View>
        ) : (
          recentTransactions.map((tx) => (
            <View key={tx.id} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.merchant}>{tx.merchant}</Text>
                <Text style={styles.cardAmount}>₹{tx.amount.toFixed(2)}</Text>
              </View>
              <Text style={styles.cardSub}>
                {tx.bank} Bank • {tx.payment_method} • {tx.category || 'General'}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', padding: 16 },
  headerCard: {
    backgroundColor: '#1C1C1E',
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
  },
  label: { color: '#8E8E93', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
  amount: { color: '#FFFFFF', fontSize: 36, fontWeight: 'bold', marginVertical: 8 },
  subtitle: { color: '#34C759', fontSize: 14, fontWeight: '600' },
  section: { marginBottom: 24 },
  sectionTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', marginBottom: 12 },
  card: {
    backgroundColor: '#1C1C1E',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  merchant: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  cardAmount: { color: '#34C759', fontSize: 16, fontWeight: 'bold' },
  cardSub: { color: '#8E8E93', fontSize: 13, marginTop: 4 },
});
