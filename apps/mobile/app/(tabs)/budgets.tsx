import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function BudgetsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Monthly Budgets</Text>
      <View style={styles.card}>
        <Text style={styles.budgetName}>Dining & Takeout</Text>
        <Text style={styles.progress}>₹14,250 / ₹18,000 Spent</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', padding: 16 },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  card: { backgroundColor: '#1C1C1E', padding: 16, borderRadius: 12, marginBottom: 12 },
  budgetName: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  progress: { color: '#FF9500', fontSize: 14, fontWeight: 'bold', marginTop: 4 },
});
