export type ScanChargeRoute = "identify" | "lookup" | "bulk-lookup";
export type ScanChargeMode = "set" | "minifig" | "part";

export function shouldChargeScan(route: ScanChargeRoute, mode: ScanChargeMode): boolean {
  if (route === "identify") {
    return mode === "minifig";
  }

  if (route === "bulk-lookup") {
    return mode === "set";
  }

  if (route === "lookup") {
    return mode === "set";
  }

  return false;
}
