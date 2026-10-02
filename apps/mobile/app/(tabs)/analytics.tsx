import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AnalyticsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Category Breakdown</Text>
      <View style={styles.card}>
        <Text style={styles.category}>Food & Dining</Text>
        <Text style={styles.amount}>₹14,250.00 (57%)</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.category}>Shopping</Text>
        <Text style={styles.amount}>₹6,400.00 (26%)</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.category}>Transportation</Text>
        <Text style={styles.amount}>₹4,200.00 (17%)</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', padding: 16 },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  card: { backgroundColor: '#1C1C1E', padding: 16, borderRadius: 12, marginBottom: 12 },
  category: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  amount: { color: '#34C759', fontSize: 14, fontWeight: 'bold', marginTop: 4 },
});
