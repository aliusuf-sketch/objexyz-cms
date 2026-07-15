import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { COMPANY, BANK_DETAILS, DEFAULT_NOTES, DEFAULT_TERMS } from '@/lib/invoiceConstants';

export interface InvoiceLineItem {
  title: string;
  variantTitle?: string;
  quantity: number;
  rate: number;
}

export interface InvoiceData {
  invoiceNumber: string; // e.g. "INV-1008"
  orderName: string;     // e.g. "#1008"
  invoiceDate: string;   // formatted display date
  customerName: string;
  customerEmail?: string;
  currency: string;      // e.g. "PKR"
  lineItems: InvoiceLineItem[];
}

function money(n: number) {
  return n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: 'Helvetica', color: '#1a1a1a' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  wordmark: { fontSize: 16, fontWeight: 700, letterSpacing: 1 },
  companyName: { fontSize: 10, fontWeight: 700, marginTop: 8 },
  addressLine: { fontSize: 9, color: '#444444', marginTop: 1 },
  invoiceTitle: { fontSize: 26, textAlign: 'right', color: '#1a1a1a' },
  invoiceNumber: { fontSize: 10, textAlign: 'right', color: '#444444', marginTop: 4 },

  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  billToLabel: { fontSize: 9, color: '#666666' },
  billToName: { fontSize: 11, fontWeight: 700, marginTop: 2 },
  billToEmail: { fontSize: 9, color: '#666666', marginTop: 2 },
  metaRight: { alignItems: 'flex-end' },
  metaLine: { fontSize: 9, color: '#444444', marginTop: 2 },
  metaLineBold: { fontWeight: 700, color: '#1a1a1a' },

  table: { marginTop: 8 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#1f1f1f', paddingVertical: 6, paddingHorizontal: 6 },
  th: { color: '#ffffff', fontSize: 9 },
  tr: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: '#dddddd' },
  colNum: { width: '6%' },
  colDesc: { width: '48%' },
  colQty: { width: '12%', textAlign: 'right' },
  colRate: { width: '17%', textAlign: 'right' },
  colAmount: { width: '17%', textAlign: 'right' },
  itemTitle: { fontSize: 9, fontWeight: 700 },
  itemDesc: { fontSize: 8.5, color: '#666666', marginTop: 2 },

  totalsBlock: { marginTop: 4 },
  totalsRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingVertical: 4, paddingHorizontal: 6 },
  totalsLabel: { width: '30%', textAlign: 'right', fontSize: 9, color: '#444444' },
  totalsValue: { width: '20%', textAlign: 'right', fontSize: 9 },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'flex-end', backgroundColor: '#f2f2f2', paddingVertical: 8, paddingHorizontal: 6, marginTop: 2 },
  grandTotalLabel: { width: '30%', textAlign: 'right', fontSize: 10, fontWeight: 700 },
  grandTotalValue: { width: '20%', textAlign: 'right', fontSize: 10, fontWeight: 700 },

  section: { marginTop: 28 },
  sectionTitle: { fontSize: 11, fontWeight: 700, marginBottom: 6 },
  bodyText: { fontSize: 9, color: '#333333', marginTop: 2, lineHeight: 1.5 },
});

export default function InvoiceDocument({ data }: { data: InvoiceData }) {
  const subTotal = data.lineItems.reduce((s, li) => s + li.quantity * li.rate, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.wordmark}>OBJEXYZ</Text>
            <Text style={styles.companyName}>{COMPANY.name}</Text>
            {COMPANY.addressLines.map((l, i) => (
              <Text key={i} style={styles.addressLine}>{l}</Text>
            ))}
          </View>
          <View>
            <Text style={styles.invoiceTitle}>Invoice</Text>
            <Text style={styles.invoiceNumber}># {data.invoiceNumber}</Text>
          </View>
        </View>

        {/* Bill To / Meta */}
        <View style={styles.metaRow}>
          <View>
            <Text style={styles.billToLabel}>Bill To</Text>
            <Text style={styles.billToName}>{data.customerName}</Text>
            {data.customerEmail && <Text style={styles.billToEmail}>{data.customerEmail}</Text>}
          </View>
          <View style={styles.metaRight}>
            <Text style={styles.metaLine}>
              <Text style={styles.metaLineBold}>Invoice Date : </Text>{data.invoiceDate}
            </Text>
            <Text style={styles.metaLine}>
              <Text style={styles.metaLineBold}>Order Ref : </Text>{data.orderName}
            </Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colNum]}>#</Text>
            <Text style={[styles.th, styles.colDesc]}>Item &amp; Description</Text>
            <Text style={[styles.th, styles.colQty]}>Qty</Text>
            <Text style={[styles.th, styles.colRate]}>Rate</Text>
            <Text style={[styles.th, styles.colAmount]}>Amount</Text>
          </View>
          {data.lineItems.map((li, i) => (
            <View key={i} style={styles.tr}>
              <Text style={styles.colNum}>{i + 1}</Text>
              <View style={styles.colDesc}>
                <Text style={styles.itemTitle}>{li.title}</Text>
                {li.variantTitle && <Text style={styles.itemDesc}>Size: {li.variantTitle}</Text>}
              </View>
              <Text style={styles.colQty}>{li.quantity.toFixed(2)}</Text>
              <Text style={styles.colRate}>{money(li.rate)}</Text>
              <Text style={styles.colAmount}>{money(li.quantity * li.rate)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Sub Total</Text>
            <Text style={styles.totalsValue}>{money(subTotal)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{data.currency}{money(subTotal)}</Text>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.bodyText}>{DEFAULT_NOTES}</Text>
          <Text style={[styles.bodyText, { marginTop: 10 }]}>Transfer the amount to the business account below:</Text>
          <Text style={styles.bodyText}>Account Title: {BANK_DETAILS.accountTitle}</Text>
          <Text style={styles.bodyText}>Bank Name: {BANK_DETAILS.bankName}</Text>
          <Text style={styles.bodyText}>Branch Name: {BANK_DETAILS.branchName}</Text>
          <Text style={styles.bodyText}>Account: {BANK_DETAILS.account}</Text>
          <Text style={styles.bodyText}>IBAN: {BANK_DETAILS.iban}</Text>
          <Text style={styles.bodyText}>Branch Code: {BANK_DETAILS.branchCode}</Text>
          <Text style={styles.bodyText}>Swift Code: {BANK_DETAILS.swiftCode}</Text>
        </View>

        {/* Terms */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Terms &amp; Conditions</Text>
          {DEFAULT_TERMS.map((t, i) => (
            <Text key={i} style={styles.bodyText}>{t}</Text>
          ))}
        </View>
      </Page>
    </Document>
  );
}
