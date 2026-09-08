import assert from "node:assert/strict";
import test from "node:test";

import { billingAlertForLanguage } from "../src/lib/notification-localization";

const supportedLanguageCodes = [
  "en", "es", "fr", "de", "it", "pt-BR", "nl", "ja", "ko",
  "zh-Hans", "zh-Hant", "ar", "hi",
];

test("billing alerts have complete copy for every supported language", () => {
  const english = billingAlertForLanguage("en");

  for (const languageCode of supportedLanguageCodes) {
    const copy = billingAlertForLanguage(languageCode);
    assert.ok(copy.title.length > 0, `${languageCode} title`);
    assert.ok(copy.body.length > 0, `${languageCode} body`);
    assert.equal(copy.title.includes("Brickvalue Pro"), true, `${languageCode} brand token`);
    assert.equal(copy.body.includes("Pro"), true, `${languageCode} product token`);
  }

  assert.deepEqual(billingAlertForLanguage(null), english);
  assert.deepEqual(billingAlertForLanguage("sv"), english);
});
