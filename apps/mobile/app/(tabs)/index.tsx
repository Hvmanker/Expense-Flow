import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function HomeScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.label}>August Total Spend</Text>
        <Text style={styles.amount}>₹24,850.00</Text>
        <Text style={styles.subtitle}>14 captured transactions</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Ingestion Events</Text>
        <View style={styles.card}>
          <Text style={styles.merchant}>Starbucks</Text>
          <Text style={styles.cardSub}>HDFC Bank • UPI • ₹450.00</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.merchant}>Swiggy</Text>
          <Text style={styles.cardSub}>ICICI Bank • Debit Card • ₹1,200.00</Text>
        </View>
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
  label: { color: '#8E8E93', fontSize: 14, textTransform: 'uppercase' },
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
  merchant: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  cardSub: { color: '#8E8E93', fontSize: 13, marginTop: 4 },
});
