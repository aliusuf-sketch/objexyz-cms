import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';

interface Row {
  order: string;
  date: string;
  customer: string;
  item: string;
  amount: number;
}

function money(n: number) {
  return n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: 'Helvetica', color: '#1a1a1a' },
  title: { fontSize: 18, fontWeight: 700 },
  subtitle: { fontSize: 9, color: '#666666', marginTop: 2, marginBottom: 20 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#1f1f1f', paddingVertical: 6, paddingHorizontal: 6 },
  th: { color: '#ffffff', fontSize: 9 },
  tr: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: '#dddddd' },
  colOrder: { width: '12%' },
  colDate: { width: '14%' },
  colCustomer: { width: '24%' },
  colItem: { width: '34%' },
  colAmount: { width: '16%', textAlign: 'right' },
  totalRow: { flexDirection: 'row', backgroundColor: '#f2f2f2', paddingVertical: 8, paddingHorizontal: 6, marginTop: 2 },
  totalLabel: { width: '84%', textAlign: 'right', fontSize: 10, fontWeight: 700 },
  totalValue: { width: '16%', textAlign: 'right', fontSize: 10, fontWeight: 700 },
});

export default function ReceivablesDocument({ rows, total }: { rows: Row[]; total: number }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>OBJEXYZ — Pending Receivables</Text>
        <Text style={styles.subtitle}>Generated {new Date().toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' })}</Text>

        <View style={styles.tableHeader}>
          <Text style={[styles.th, styles.colOrder]}>Order</Text>
          <Text style={[styles.th, styles.colDate]}>Date</Text>
          <Text style={[styles.th, styles.colCustomer]}>Customer</Text>
          <Text style={[styles.th, styles.colItem]}>Item</Text>
          <Text style={[styles.th, styles.colAmount]}>Amount (PKR)</Text>
        </View>
        {rows.map((r, i) => (
          <View key={i} style={styles.tr}>
            <Text style={styles.colOrder}>{r.order}</Text>
            <Text style={styles.colDate}>{r.date}</Text>
            <Text style={styles.colCustomer}>{r.customer}</Text>
            <Text style={styles.colItem}>{r.item}</Text>
            <Text style={styles.colAmount}>{money(r.amount)}</Text>
          </View>
        ))}
        {rows.length === 0 && (
          <View style={styles.tr}><Text>No receivable items.</Text></View>
        )}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalValue}>{money(total)}</Text>
        </View>
      </Page>
    </Document>
  );
}
