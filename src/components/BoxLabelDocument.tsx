import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { COMPANY } from '@/lib/invoiceConstants';
import { Shipment, ResolvedShipmentOrder, addressLines, isAddressIncomplete } from '@/lib/shipments';

const styles = StyleSheet.create({
  // A6 landscape ≈ a standard courier label; one label per page so they
  // can be printed straight onto label stock or cut from A4.
  page: { padding: 18, fontFamily: 'Helvetica', color: '#000000' },
  border: { borderWidth: 1.5, borderColor: '#000000', padding: 12, height: '100%' },

  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: '#000000', paddingBottom: 6, marginBottom: 8 },
  from: { fontSize: 7 },
  fromLabel: { fontSize: 6.5, letterSpacing: 1, color: '#555555' },
  wordmark: { fontSize: 11, fontWeight: 700, letterSpacing: 1 },
  ref: { fontSize: 9, fontWeight: 700, textAlign: 'right' },
  refSub: { fontSize: 7, textAlign: 'right', color: '#555555', marginTop: 2 },

  toLabel: { fontSize: 7, letterSpacing: 2, color: '#555555', marginBottom: 4 },
  toName: { fontSize: 16, fontWeight: 700, marginBottom: 4 },
  toLine: { fontSize: 11, lineHeight: 1.35 },
  phone: { fontSize: 12, fontWeight: 700, marginTop: 6 },

  warn: { fontSize: 8, color: '#b91c1c', marginTop: 6, fontWeight: 700 },

  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto', borderTopWidth: 1, borderTopColor: '#000000', paddingTop: 6 },
  footCell: { fontSize: 7.5, color: '#333333' },
  boxCount: { fontSize: 9, fontWeight: 700 },
  fragile: { fontSize: 9, fontWeight: 700, letterSpacing: 2 },
});

/**
 * One box label per order in the shipment. Deliberately money-free —
 * these go on the outside of a parcel.
 */
export default function BoxLabelDocument({
  shipment, resolved,
}: { shipment: Shipment; resolved: ResolvedShipmentOrder[] }) {
  return (
    <Document>
      {resolved.map(({ order, unitCount }, idx) => {
        const lines = addressLines(order.address);
        const incomplete = isAddressIncomplete(order.address);
        return (
          <Page key={order.id} size="A6" orientation="landscape" style={styles.page}>
            <View style={styles.border}>
              <View style={styles.topRow}>
                <View>
                  <Text style={styles.fromLabel}>FROM</Text>
                  <Text style={styles.wordmark}>OBJEXYZ</Text>
                  <Text style={styles.from}>{COMPANY.name}</Text>
                  <Text style={styles.from}>{COMPANY.addressLines[1]}, {COMPANY.addressLines[2]}</Text>
                </View>
                <View>
                  <Text style={styles.ref}>{order.name}</Text>
                  <Text style={styles.refSub}>{shipment.reference}</Text>
                  <Text style={styles.refSub}>{idx + 1} of {resolved.length}</Text>
                </View>
              </View>

              <Text style={styles.toLabel}>DELIVER TO</Text>
              <Text style={styles.toName}>{order.address?.name || order.customer}</Text>
              {lines.map((l, i) => <Text key={i} style={styles.toLine}>{l}</Text>)}
              {order.address?.phone && <Text style={styles.phone}>{order.address.phone}</Text>}
              {incomplete && <Text style={styles.warn}>! ADDRESS INCOMPLETE — CONFIRM BEFORE DISPATCH</Text>}

              <View style={styles.footer}>
                <Text style={styles.boxCount}>{unitCount} item{unitCount !== 1 ? 's' : ''}</Text>
                <Text style={styles.fragile}>FRAGILE — HANDLE WITH CARE</Text>
                <Text style={styles.footCell}>studio.objexyz.com</Text>
              </View>
            </View>
          </Page>
        );
      })}
    </Document>
  );
}
