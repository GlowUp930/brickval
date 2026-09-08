import { NextResponse } from "next/server";
import { DISPLAY_CURRENCY_CODES, getExchangeRates, hasCompleteDisplayRates } from "@/lib/frankfurter";

export async function GET() {
  const rates = await getExchangeRates();
  if (!hasCompleteDisplayRates(rates.usd_rates)) {
    return NextResponse.json(
      { error: "exchange_rates_unavailable", message: "Currency conversion is temporarily unavailable." },
      { status: 503 }
    );
  }

  return NextResponse.json({
    baseCurrency: "USD",
    asOf: rates.as_of,
    rates: Object.fromEntries(
      DISPLAY_CURRENCY_CODES.map((code) => [code, rates.usd_rates[code]])
    ),
    stale: rates.stale ?? false,
  });
}
