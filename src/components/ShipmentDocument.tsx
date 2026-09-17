import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { COMPANY } from '@/lib/invoiceConstants';
import {
  Shipment, ResolvedShipmentOrder, shipmentTotals, addressLines, isAddressIncomplete,
} from '@/lib/shipments';

function money(n: number) {
  return n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 9, fontFamily: 'Helvetica', color: '#1a1a1a' },

  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  wordmark: { fontSize: 15, fontWeight: 700, letterSpacing: 1 },
  wordmarkSub: { fontSize: 7.5, letterSpacing: 2, color: '#666666', marginTop: 2 },
  companyName: { fontSize: 9, fontWeight: 700, marginTop: 6 },
  addressLine: { fontSize: 8, color: '#555555', marginTop: 1 },
  docTitle: { fontSize: 20, textAlign: 'right' },
  docMeta: { fontSize: 9, textAlign: 'right', color: '#444444', marginTop: 3 },
  copyTag: { fontSize: 8, textAlign: 'right', marginTop: 4, letterSpacing: 1, color: '#666666' },

  summaryBar: { flexDirection: 'row', backgroundColor: '#f2f2f2', paddingVertical: 8, paddingHorizontal: 8, marginBottom: 14 },
  summaryCell: { flex: 1 },
  summaryLabel: { fontSize: 7.5, color: '#666666', letterSpacing: 1 },
  summaryValue: { fontSize: 11, fontWeight: 700, marginTop: 2 },

  note: { fontSize: 8.5, color: '#444444', marginBottom: 12 },

  orderBlock: { marginBottom: 14, borderWidth: 0.5, borderColor: '#cccccc' },
  orderHead: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#1f1f1f', paddingVertical: 6, paddingHorizontal: 8 },
  orderName: { color: '#ffffff', fontSize: 10, fontWeight: 700 },
  orderHeadRight: { color: '#ffffff', fontSize: 8.5 },
  orderMeta: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: '#dddddd' },
  metaBlock: { width: '48%' },
  metaLabel: { fontSize: 7.5, color: '#777777', letterSpacing: 1, marginBottom: 2 },
  metaText: { fontSize: 8.5, color: '#222222', lineHeight: 1.4 },
  warn: { fontSize: 8, color: '#b91c1c', marginTop: 3 },

  tHead: { flexDirection: 'row', backgroundColor: '#efefef', paddingVertical: 5, paddingHorizontal: 8 },
  th: { fontSize: 7.5, color: '#444444', letterSpacing: 1 },
  tr: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: '#eeeeee' },
  colNum: { width: '6%' },
  colItemWide: { width: '78%' },
  colItem: { width: '52%' },
  colQty: { width: '16%', textAlign: 'center' },
  colRate: { width: '13%', textAlign: 'right' },
  colAmt: { width: '13%', textAlign: 'right' },
  itemTitle: { fontSize: 8.5 },
  itemVariant: { fontSize: 7.5, color: '#777777', marginTop: 1 },

  orderFoot: { flexDirection: 'row', justifyContent: 'flex-end', paddingVertical: 6, paddingHorizontal: 8, backgroundColor: '#fafafa' },
  footLabel: { fontSize: 8.5, color: '#444444', marginRight: 8 },
  footValue: { fontSize: 9.5, fontWeight: 700 },
  collect: { fontSize: 9.5, fontWeight: 700, color: '#b91c1c' },

  checkRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingVertical: 6, paddingHorizontal: 8 },
  checkBox: { width: 10, height: 10, borderWidth: 0.8, borderColor: '#999999', marginRight: 6 },
  checkLabel: { fontSize: 8, color: '#666666' },

  signRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 },
  signCell: { width: '30%' },
  signLine: { borderTopWidth: 0.8, borderTopColor: '#999999', marginBottom: 4 },
  signLabel: { fontSize: 7.5, color: '#666666', letterSpacing: 1 },
});

export interface ShipmentDocumentProps {
  shipment: Shipment;
  resolved: ResolvedShipmentOrder[];
  /** Manager copy shows rates, totals and the amount to collect.
   *  Courier copy omits every money figure. */
  withAmounts: boolean;
}

export default function ShipmentDocument({ shipment, resolved, withAmounts }: ShipmentDocumentProps) {
  const totals = shipmentTotals(resolved);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.wordmark}>OBJEXYZ</Text>
            <Text style={styles.wordmarkSub}>STUDIO</Text>
            <Text style={styles.companyName}>{COMPANY.name}</Text>
            {COMPANY.addressLines.map((l, i) => (
              <Text key={i} style={styles.addressLine}>{l}</Text>
            ))}
          </View>
          <View>
            <Text style={styles.docTitle}>Shipping Order</Text>
            <Text style={styles.docMeta}># {shipment.reference}</Text>
            <Text style={styles.docMeta}>{shortDate(shipment.createdAt)}</Text>
            <Text style={styles.copyTag}>
              {withAmounts ? 'MANAGER COPY — INCLUDES AMOUNTS' : 'DISPATCH COPY — NO AMOUNTS'}
            </Text>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summaryBar}>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>ORDERS</Text>
            <Text style={styles.summaryValue}>{totals.orderCount}</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>TOTAL UNITS</Text>
            <Text style={styles.summaryValue}>{totals.unitCount}</Text>
          </View>
          {withAmounts && (
            <>
              <View style={styles.summaryCell}>
                <Text style={styles.summaryLabel}>VALUE SHIPPED</Text>
                <Text style={styles.summaryValue}>PKR {money(totals.itemsValue)}</Text>
              </View>
              <View style={styles.summaryCell}>
                <Text style={styles.summaryLabel}>TO COLLECT</Text>
                <Text style={[styles.summaryValue, { color: '#b91c1c' }]}>PKR {money(totals.toCollect)}</Text>
              </View>
            </>
          )}
        </View>

        {shipment.note ? <Text style={styles.note}>Note: {shipment.note}</Text> : null}

        {/* One block per order */}
        {resolved.map(({ order, items, itemsTotal, unitCount }) => {
          const incomplete = isAddressIncomplete(order.address);
          return (
            <View key={order.id} style={styles.orderBlock} wrap={false}>
              <View style={styles.orderHead}>
                <Text style={styles.orderName}>{order.name}</Text>
                <Text style={styles.orderHeadRight}>
                  {unitCount} unit{unitCount !== 1 ? 's' : ''}
                  {withAmounts ? `  ·  ${order.financialStatus}` : ''}
                </Text>
              </View>

              <View style={styles.orderMeta}>
                <View style={styles.metaBlock}>
                  <Text style={styles.metaLabel}>DELIVER TO</Text>
                  <Text style={styles.metaText}>{order.address?.name || order.customer}</Text>
                  {addressLines(order.address).map((l, i) => (
                    <Text key={i} style={styles.metaText}>{l}</Text>
                  ))}
                  {incomplete && <Text style={styles.warn}>! Address incomplete — confirm before dispatch</Text>}
                </View>
                <View style={styles.metaBlock}>
                  <Text style={styles.metaLabel}>CONTACT</Text>
                  <Text style={styles.metaText}>{order.address?.phone || '—'}</Text>
                  <Text style={[styles.metaLabel, { marginTop: 6 }]}>ORDER PLACED</Text>
                  <Text style={styles.metaText}>{shortDate(order.date)}</Text>
                </View>
              </View>

              {/* Items */}
              <View style={styles.tHead}>
                <Text style={[styles.th, styles.colNum]}>#</Text>
                <Text style={[styles.th, withAmounts ? styles.colItem : styles.colItemWide]}>Item</Text>
                <Text style={[styles.th, styles.colQty]}>Qty</Text>
                {withAmounts && <Text style={[styles.th, styles.colRate]}>Rate</Text>}
                {withAmounts && <Text style={[styles.th, styles.colAmt]}>Amount</Text>}
              </View>
              {items.map((it, i) => (
                <View key={it.key} style={styles.tr}>
                  <Text style={styles.colNum}>{i + 1}</Text>
                  <View style={withAmounts ? styles.colItem : styles.colItemWide}>
                    <Text style={styles.itemTitle}>{it.title}</Text>
                    {it.variant && <Text style={styles.itemVariant}>Size: {it.variant}</Text>}
                  </View>
                  <Text style={styles.colQty}>{it.quantity}</Text>
                  {withAmounts && <Text style={styles.colRate}>{money(it.price)}</Text>}
                  {withAmounts && <Text style={styles.colAmt}>{money(it.price * it.quantity)}</Text>}
                </View>
              ))}

              {withAmounts ? (
                <>
                  <View style={styles.orderFoot}>
                    <Text style={styles.footLabel}>Value of items in this shipment</Text>
                    <Text style={styles.footValue}>PKR {money(itemsTotal)}</Text>
                  </View>
                  <View style={styles.orderFoot}>
                    <Text style={styles.footLabel}>Outstanding on this order — collect</Text>
                    <Text style={styles.collect}>PKR {money(order.outstanding)}</Text>
                  </View>
                </>
              ) : (
                <View style={styles.checkRow}>
                  <View style={styles.checkBox} />
                  <Text style={styles.checkLabel}>Packed &amp; verified</Text>
                </View>
              )}
            </View>
          );
        })}

        {/* Sign-off */}
        <View style={styles.signRow}>
          <View style={styles.signCell}>
            <View style={styles.signLine} />
            <Text style={styles.signLabel}>PACKED BY</Text>
          </View>
          <View style={styles.signCell}>
            <View style={styles.signLine} />
            <Text style={styles.signLabel}>DISPATCHED BY</Text>
          </View>
          <View style={styles.signCell}>
            <View style={styles.signLine} />
            <Text style={styles.signLabel}>COURIER / RECEIVED BY</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
