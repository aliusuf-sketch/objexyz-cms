'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ReceivableOrderVM, CustomReceivableItem } from '@/lib/receivables';

// Debounce free-text/numeric edits (amount received, dispute note) so we
// don't fire a request per keystroke; toggles/removals/additions save
// immediately — this mirrors the "always-saved, no Save button" behavior
// of the original prototype.
const DEBOUNCE_MS = 500;

export function useReceivables() {
  const [orders, setOrders] = useState<ReceivableOrderVM[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [localWarning, setLocalWarning] = useState(false);
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // The save endpoint replaces removedLineItemKeys rather than appending,
  // so every removal must send the COMPLETE set. Removed items are filtered
  // out of the view model's `items`, so we seed this from the VM's explicit
  // removedLineItemKeys on each load — tracking only this session's
  // removals would resurrect anything removed before the last refresh.
  const removedKeysByOrder = useRef<Record<string, Set<string>>>({});

  const fetchOrders = useCallback((isSync = false) => {
    if (isSync) setSyncing(true); else setLoading(true);
    setError('');
    return fetch('/api/shopify/receivables')
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return; }
        if (data.localDataError) setLocalWarning(true);
        const fetched: ReceivableOrderVM[] = data.orders || [];
        setOrders(fetched);
        removedKeysByOrder.current = Object.fromEntries(
          fetched.map(o => [o.id, new Set(o.removedLineItemKeys || [])])
        );
      })
      .catch(e => setError(String(e)))
      .finally(() => { setLoading(false); setSyncing(false); });
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  function patchOrder(id: string, updater: (o: ReceivableOrderVM) => ReceivableOrderVM) {
    setOrders(prev => prev.map(o => o.id === id ? updater(o) : o));
  }

  function save(orderId: string, body: Record<string, unknown>, immediate = true) {
    const fire = () => fetch('/api/local/receivable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, ...body }),
    }).catch(() => { /* optimistic UI already updated; a failed save just won't survive a refresh */ });

    if (immediate) { fire(); return; }
    if (debounceTimers.current[orderId]) clearTimeout(debounceTimers.current[orderId]);
    debounceTimers.current[orderId] = setTimeout(fire, DEBOUNCE_MS);
  }

  const toggleItem = useCallback((order: ReceivableOrderVM, key: string) => {
    let uncheckedKeys: string[] = [];
    patchOrder(order.id, o => {
      const items = o.items.map(i => i.key === key ? { ...i, checked: !i.checked } : i);
      const shipping = o.shipping && o.shipping.key === key ? { ...o.shipping, checked: !o.shipping.checked } : o.shipping;
      uncheckedKeys = [
        ...items.filter(i => !i.checked).map(i => i.key),
        ...(shipping && !shipping.checked ? [shipping.key] : []),
      ];
      return { ...o, items, shipping };
    });
    save(order.id, { uncheckedLineItemKeys: uncheckedKeys });
  }, []);

  const removeItem = useCallback((order: ReceivableOrderVM, key: string) => {
    const target = order.items.find(i => i.key === key);
    const isCustom = target?.isCustom || false;
    let remainingCustom: CustomReceivableItem[] = [];

    patchOrder(order.id, o => {
      const items = o.items.filter(i => i.key !== key);
      const shipping = o.shipping && o.shipping.key === key ? null : o.shipping;
      remainingCustom = items.filter(i => i.isCustom).map(i => ({ key: i.key, title: i.title, price: i.price }));
      return { ...o, items, shipping };
    });

    if (isCustom) {
      save(order.id, { customItems: remainingCustom });
    } else {
      if (!removedKeysByOrder.current[order.id]) removedKeysByOrder.current[order.id] = new Set();
      removedKeysByOrder.current[order.id].add(key);
      save(order.id, { removedLineItemKeys: Array.from(removedKeysByOrder.current[order.id]) });
    }
  }, []);

  const addItem = useCallback((order: ReceivableOrderVM, title: string, price: number) => {
    const key = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    let customItems: CustomReceivableItem[] = [];
    patchOrder(order.id, o => {
      const newItem = { key, title, price, checked: true, isCustom: true };
      customItems = [
        ...o.items.filter(i => i.isCustom).map(i => ({ key: i.key, title: i.title, price: i.price })),
        { key, title, price },
      ];
      return { ...o, items: [...o.items, newItem] };
    });
    save(order.id, { customItems });
  }, []);

  const setDisputed = useCallback((order: ReceivableOrderVM, disputed: boolean) => {
    patchOrder(order.id, o => ({ ...o, disputed, locked: o.financialStatus === 'PAID' && !disputed }));
    save(order.id, { disputed });
  }, []);

  const setDisputeNote = useCallback((order: ReceivableOrderVM, disputeNote: string) => {
    patchOrder(order.id, o => ({ ...o, disputeNote }));
    save(order.id, { disputeNote }, false);
  }, []);

  const setAmountReceived = useCallback((order: ReceivableOrderVM, amountReceived: number) => {
    patchOrder(order.id, o => ({ ...o, amountReceived }));
    save(order.id, { amountReceived }, false);
  }, []);

  const resetOrder = useCallback((order: ReceivableOrderVM) => {
    delete removedKeysByOrder.current[order.id];
    patchOrder(order.id, o => ({
      ...o,
      disputed: false,
      disputeNote: '',
      amountReceived: 0,
      locked: o.financialStatus === 'PAID',
      items: o.items.filter(i => !i.isCustom).map(i => ({ ...i, checked: true })),
      shipping: o.shipping ? { ...o.shipping, checked: true } : o.shipping,
    }));
    save(order.id, {
      disputed: false,
      disputeNote: '',
      amountReceived: 0,
      removedLineItemKeys: [],
      uncheckedLineItemKeys: [],
      customItems: [],
    });
  }, []);

  return {
    orders, loading, syncing, error, localWarning,
    sync: () => fetchOrders(true),
    toggleItem, removeItem, addItem, setDisputed, setDisputeNote, setAmountReceived, resetOrder,
  };
}
