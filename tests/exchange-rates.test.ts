import assert from "node:assert/strict";
import test from "node:test";

import {
  DISPLAY_CURRENCY_CODES,
  buildExchangeRates,
  hasCompleteDisplayRates,
  isRecent,
  normalizeCachedRates,
  parseFrankfurterRows,
} from "../src/lib/frankfurter";

const expectedCodes = [
  "USD", "EUR", "GBP", "AUD", "CAD", "NZD", "JPY", "CNY", "HKD", "TWD",
  "KRW", "SGD", "INR", "BRL", "MXN", "CHF", "SEK", "NOK", "DKK", "PLN",
  "CZK", "AED", "SAR", "ZAR",
];

test("the mobile rate contract contains exactly the 24 supported currencies", () => {
  assert.deepEqual([...DISPLAY_CURRENCY_CODES], expectedCodes);
});

test("Frankfurter rows produce a complete USD-based payload and latest rate date", () => {
  const rows = expectedCodes
    .filter((code) => code !== "USD")
    .map((quote, index) => ({
      date: index === 0 ? "2026-09-03" : "2026-09-04",
      quote,
      rate: 0.5 + index / 100,
    }));

  const parsed = parseFrankfurterRows(rows);
  assert.ok(parsed);
  assert.equal(parsed.asOf, "2026-09-04");
  assert.equal(parsed.rates.USD, 1);
  assert.equal(Object.keys(parsed.rates).length, expectedCodes.length);
  assert.equal(hasCompleteDisplayRates(parsed.rates), true);
});

test("invalid or incomplete Frankfurter responses are rejected", () => {
  assert.equal(parseFrankfurterRows([{ date: "2026-09-04", quote: "EUR", rate: 0.86 }]), null);
  assert.equal(
    hasCompleteDisplayRates({ USD: 1, EUR: Number.NaN }),
    false
  );
});

test("marketplace conversion fields preserve correct USD arithmetic", () => {
  const rates = buildExchangeRates(
    { USD: 1, EUR: 0.8, GBP: 0.75, AUD: 1.6 },
    "2026-09-04",
    false
  );

  assert.equal(rates.usd_rates.USD, 1);
  assert.equal(rates.eur_to_usd, 1.25);
  assert.equal(rates.aud_to_usd, 0.625);
  assert.equal(rates.eur_to_aud, 2);
  assert.equal(rates.as_of, "2026-09-04");
});

test("rate cache distinguishes daily refresh from seven-day retention", () => {
  assert.equal(isRecent(new Date().toISOString()), true);
  assert.equal(isRecent(new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()), false);

  const rates = buildExchangeRates(
    { USD: 1, EUR: 0.86, GBP: 0.74, AUD: 1.4 },
    "2026-09-04",
    false
  );
  const cached = normalizeCachedRates({
    rates,
    fetched_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  });
  assert.ok(cached);
  assert.equal(cached.rates.stale, false);
  assert.equal(cached.rates.usd_rates.AUD, 1.4);
});
