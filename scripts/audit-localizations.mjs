import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const resourceRoot = path.join(repoRoot, "apps", "ios-swift", "BrickVal", "Resources");
const locales = [
  "en", "es", "fr", "de", "it", "pt-BR", "nl", "ja", "ko",
  "zh-Hans", "zh-Hant", "ar", "hi",
];
const placeholderPattern = /%(?:\d+\$)?(?:@|lld|ld|d|\.\d+f|f|%)/g;
const pluralKeys = [
  "%lld bonus bulk scan available",
  "%lld free scan left today",
  "%lld more friend to unlock 3 bonus bulk scans.",
  "%lld figures detected. Unlock identification and prices.",
  "%lld figures found",
  "%lld figures valued",
  "%lld identified",
  "%lld minifigures",
  "%lld unresolved",
  "%lld pcs",
  "Added %lld item to your collection",
  "Bulk scan photo with %lld detected minifigures; identification and prices are locked",
  "Bulk scan photo with %lld identified minifigures",
  "Comparing %lld detected figure",
  "Comparing %lld of %lld detected figure",
  "This removes all %lld copy of %@ from your collection.",
  "You have %lld slots left. Upgrade for an unlimited collection.",
  "Your free collection can hold %lld unique items. Upgrade to BrickValue Pro for unlimited items.",
  "We found %lld possible minifigures. Select the one that looks right.",
];

function readCatalog(name) {
  const file = path.join(resourceRoot, name);
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function valueFor(localeEntry) {
  if (localeEntry?.stringUnit?.value !== undefined) return localeEntry.stringUnit.value;
  return localeEntry?.variations?.plural?.other?.stringUnit?.value;
}

function placeholders(value) {
  return [...(value?.matchAll(placeholderPattern) ?? [])].map((match) => match[0]).sort();
}

function tokenCount(value, pattern) {
  return (value.match(pattern) ?? []).length;
}

function assertCatalog(name, catalog, { requirePlural = false } = {}) {
  if (catalog.sourceLanguage !== "en") throw new Error(`${name}: sourceLanguage must be en`);
  const entries = catalog.strings ?? {};
  if (!Object.keys(entries).length) throw new Error(`${name}: no strings found`);

  for (const [key, entry] of Object.entries(entries)) {
    const localizations = entry.localizations ?? {};
    const actualLocales = Object.keys(localizations).sort();
    if (JSON.stringify(actualLocales) !== JSON.stringify([...locales].sort())) {
      throw new Error(`${name}: ${JSON.stringify(key)} has locales ${actualLocales.join(", ")}`);
    }
    const sourceValue = valueFor(localizations.en);
    if (!sourceValue?.trim()) throw new Error(`${name}: ${JSON.stringify(key)} has an empty English value`);
    const expectedPlaceholders = placeholders(sourceValue);
    const expectedBrandTokens = tokenCount(sourceValue, /brickval/gi);
    const expectedURLs = sourceValue.match(/https?:\/\/[^\s]+/g) ?? [];

    for (const locale of locales) {
      const localized = localizations[locale];
      const value = valueFor(localized);
      if (!value?.trim()) throw new Error(`${name}: ${JSON.stringify(key)} is empty for ${locale}`);
      if (JSON.stringify(placeholders(value)) !== JSON.stringify(expectedPlaceholders)) {
        throw new Error(`${name}: ${JSON.stringify(key)} has mismatched placeholders for ${locale}`);
      }
      if (expectedBrandTokens && tokenCount(value, /brickval/gi) < expectedBrandTokens) {
        throw new Error(`${name}: ${JSON.stringify(key)} must preserve BrickVal brand tokens for ${locale}`);
      }
      const actualURLs = value.match(/https?:\/\/[^\s]+/g) ?? [];
      if (JSON.stringify(actualURLs) !== JSON.stringify(expectedURLs)) {
        throw new Error(`${name}: ${JSON.stringify(key)} has a changed URL for ${locale}`);
      }
      if (requirePlural && !localized.variations?.plural?.one?.stringUnit?.value) {
        throw new Error(`${name}: ${JSON.stringify(key)} is missing the plural one form for ${locale}`);
      }
      if (requirePlural && !localized.variations?.plural?.other?.stringUnit?.value) {
        throw new Error(`${name}: ${JSON.stringify(key)} is missing the plural other form for ${locale}`);
      }

      const sourcePlural = localizations.en?.variations?.plural;
      if (sourcePlural) {
        const localizedPlural = localized.variations?.plural ?? {};
        for (const [category, sourceVariation] of Object.entries(sourcePlural)) {
          const sourcePluralValue = sourceVariation?.stringUnit?.value;
          const localizedPluralValue = localizedPlural[category]?.stringUnit?.value;
          if (!localizedPluralValue?.trim()) {
            throw new Error(`${name}: ${JSON.stringify(key)} is missing plural ${category} for ${locale}`);
          }
          if (JSON.stringify(placeholders(localizedPluralValue)) !== JSON.stringify(placeholders(sourcePluralValue))) {
            throw new Error(`${name}: ${JSON.stringify(key)} has mismatched plural placeholders for ${locale} (${category})`);
          }
        }
      }
    }
  }
  return Object.keys(entries).length;
}

const localizable = readCatalog("Localizable.xcstrings");
const infoPlist = readCatalog("InfoPlist.xcstrings");
const localizableCount = assertCatalog("Localizable.xcstrings", localizable);
for (const key of pluralKeys) {
  if (!localizable.strings[key]) throw new Error(`Localizable.xcstrings: missing plural key ${key}`);
}
for (const key of pluralKeys) {
  const entry = localizable.strings[key];
  const actualLocales = Object.keys(entry.localizations ?? {});
  for (const locale of actualLocales) {
    const localized = entry.localizations[locale];
    if (!localized.variations?.plural?.one?.stringUnit?.value || !localized.variations?.plural?.other?.stringUnit?.value) {
      throw new Error(`Localizable.xcstrings: ${key} is missing plural forms for ${locale}`);
    }
  }
}
assertCatalog("InfoPlist.xcstrings", infoPlist);

for (const key of ["CFBundleDisplayName", "CFBundleName", "NSCameraUsageDescription", "NSPhotoLibraryUsageDescription"]) {
  if (!infoPlist.strings[key]) throw new Error(`InfoPlist.xcstrings: missing ${key}`);
}

console.log(`Localization audit passed: ${localizableCount} strings + ${Object.keys(infoPlist.strings).length} Info.plist strings across ${locales.length} locales.`);
