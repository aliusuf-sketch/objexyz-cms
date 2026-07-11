export interface CostRates {
  // Materials — direct
  resinPerMl: number;
  cleanPerUnit: number;
  sandPerUnit: number;
  paintMaterialPerUnit: number;
  finishMaterialPerUnit: number;
  packPerUnit: number;
  // Labor — hourly, one per activity
  laborSanding: number;
  laborPainting: number;
  laborFinishing: number;
  laborPacking: number;
  // Equipment
  printerCost: number;
  printerLifespanValue: number;
  printerLifespanUnit: 'days' | 'years';
  avgPrinterHoursPerDay: number;
  maintenancePerHr: number;
  electricityTariff: number;
  printerWatts: number;
  curingWatts: number;
  // Fulfillment
  courierCost: number;
  failureRatePct: number;
}

export const DEFAULT_COST_RATES: CostRates = {
  resinPerMl: 15,
  cleanPerUnit: 50,
  sandPerUnit: 50,
  paintMaterialPerUnit: 150,
  finishMaterialPerUnit: 100,
  packPerUnit: 100,
  laborSanding: 300,
  laborPainting: 400,
  laborFinishing: 400,
  laborPacking: 200,
  printerCost: 150000,
  printerLifespanValue: 2,
  printerLifespanUnit: 'years',
  avgPrinterHoursPerDay: 8,
  maintenancePerHr: 20,
  electricityTariff: 45,
  printerWatts: 200,
  curingWatts: 40,
  courierCost: 300,
  failureRatePct: 5,
};

export interface UsageInput {
  resinMl: number;
  printerRuntimeHrs: number;
  sandingHrs: number;
  paintingHrs: number;
  finishingHrs: number;
  packagingHrs: number;
}

export const EMPTY_USAGE: UsageInput = {
  resinMl: 0,
  printerRuntimeHrs: 0,
  sandingHrs: 0,
  paintingHrs: 0,
  finishingHrs: 0,
  packagingHrs: 0,
};

export interface DerivedRates {
  lifespanDays: number;
  lifespanHours: number;
  printerPerHr: number;
  elecPerHr: number;
}

export function deriveRates(rates: CostRates): DerivedRates {
  const lifespanDays = rates.printerLifespanUnit === 'years'
    ? rates.printerLifespanValue * 365
    : rates.printerLifespanValue;
  const lifespanHours = lifespanDays * rates.avgPrinterHoursPerDay;
  const printerPerHr = lifespanHours > 0 ? rates.printerCost / lifespanHours : 0;
  const elecPerHr = ((rates.printerWatts + rates.curingWatts) / 1000) * rates.electricityTariff;
  return { lifespanDays, lifespanHours, printerPerHr, elecPerHr };
}

export interface CostBreakdown {
  materialCost: number;
  laborCost: number;
  equipmentCost: number;
  subtotal: number;
  failureCost: number;
  totalCost: number;
  profit: number;
  marginPct: number;
}

export interface UnitCost {
  materialCost: number;
  laborCost: number;
  equipmentCost: number;
  subtotal: number;
  failureCost: number;
  // Everything except courier — courier is PKR/order, not PKR/unit, so it
  // must be added once per order (see calcCost / monthly P&L), never
  // multiplied by quantity.
  costExclCourier: number;
}

// Per-unit cost, excluding the per-order courier fee. Exact formula per
// spec — do not alter.
export function calcUnitCost(usage: UsageInput, rates: CostRates): UnitCost {
  const { printerPerHr, elecPerHr } = deriveRates(rates);

  const materialCost =
    usage.resinMl * rates.resinPerMl +
    rates.cleanPerUnit + rates.sandPerUnit +
    rates.paintMaterialPerUnit + rates.finishMaterialPerUnit + rates.packPerUnit;

  const laborCost =
    usage.sandingHrs * rates.laborSanding +
    usage.paintingHrs * rates.laborPainting +
    usage.finishingHrs * rates.laborFinishing +
    usage.packagingHrs * rates.laborPacking;

  const equipmentCost = usage.printerRuntimeHrs * (printerPerHr + rates.maintenancePerHr + elecPerHr);

  const subtotal = materialCost + laborCost + equipmentCost;
  const failureCost = subtotal * (rates.failureRatePct / 100);

  return { materialCost, laborCost, equipmentCost, subtotal, failureCost, costExclCourier: subtotal + failureCost };
}

// Full per-item cost including courier — for a single item/quote where
// "courier per order" and "courier per item" are the same thing (one item,
// one shipment). Exact formula per spec — do not alter.
export function calcCost(usage: UsageInput, rates: CostRates, sellingPrice: number): CostBreakdown {
  const u = calcUnitCost(usage, rates);
  const totalCost = u.costExclCourier + rates.courierCost;
  const profit = sellingPrice - totalCost;
  const marginPct = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;
  return { ...u, totalCost, profit, marginPct };
}
