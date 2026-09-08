import Foundation
import Testing
@testable import BrickVal

struct LocalizationTests {
    @Test func supportedLanguageMatrixIsStable() {
        #expect(BrickValLanguage.allCases.map(\.rawValue) == [
            "en", "es", "fr", "de", "it", "pt-BR", "nl", "ja", "ko",
            "zh-Hans", "zh-Hant", "ar", "hi",
        ])
    }

    @Test func deviceLanguageMatchingPrefersSupportedRegion() {
        #expect(BrickValLocalization.language(forPreferredLocalizations: ["de-DE", "en-US"]) == .german)
        #expect(BrickValLocalization.language(forPreferredLocalizations: ["es-MX", "en-US"]) == .spanish)
        #expect(BrickValLocalization.language(forPreferredLocalizations: ["pt_BR", "en-US"]) == .portugueseBrazil)
        #expect(BrickValLocalization.language(forPreferredLocalizations: ["pt-PT", "en-US"]) == .portugueseBrazil)
        #expect(BrickValLocalization.language(forPreferredLocalizations: ["zh-TW", "en-US"]) == .traditionalChinese)
        #expect(BrickValLocalization.language(forPreferredLocalizations: ["zh-CN", "en-US"]) == .simplifiedChinese)
    }

    @Test func unsupportedDeviceLanguageFallsBackToEnglish() {
        #expect(BrickValLocalization.language(forPreferredLocalizations: ["sv-SE", "en-US"]) == .english)
        #expect(BrickValLocalization.language(forPreferredLocalizations: []) == .english)
    }

    @Test @MainActor func inAppLanguageOverridePersistsAndCanReturnToSystemDefault() {
        let defaults = UserDefaults(suiteName: "LocalizationTests.\(UUID().uuidString)")!
        let first = PreferencesStore(defaults: defaults)

        #expect(first.languageOverride == nil)
        first.languageOverride = .arabic
        #expect(first.effectiveLanguage == .arabic)

        let reloaded = PreferencesStore(defaults: defaults)
        #expect(reloaded.languageOverride == .arabic)
        #expect(reloaded.effectiveLanguage == .arabic)

        reloaded.languageOverride = nil
        #expect(reloaded.languageOverride == nil)
        #expect(reloaded.effectiveLanguage == BrickValLocalization.deviceLanguage)
    }

    @Test func explicitLanguageOverrideWinsOverDeviceLanguage() {
        #expect(BrickValLocalization.effectiveLanguage(for: .japanese) == .japanese)
        #expect(BrickValLocalization.effectiveLanguage(for: .traditionalChinese) == .traditionalChinese)
    }

    @Test func pickerLabelsCoverEverySupportedLanguage() {
        #expect(BrickValLanguage.allCases.allSatisfy { !$0.displayName.isEmpty })
        #expect(BrickValLanguage.allCases.map(\.displayName).contains("العربية"))
        #expect(BrickValLanguage.allCases.map(\.displayName).contains("हिन्दी"))
    }

    @Test func arabicUsesRightToLeftLayoutDirection() {
        #expect(BrickValLanguage.arabic.isRightToLeft)
        #expect(BrickValLanguage.english.isRightToLeft == false)
    }

    @Test func apiErrorUsesStableCodeInsteadOfServerText() {
        let error = APIError(
            endpoint: "lookup",
            statusCode: 404,
            code: "not_found",
            serverMessage: "internal provider details"
        )

        #expect(error.errorDescription == "We don't have data for this set number. Double-check the number and try again.")
        #expect(error.errorDescription?.contains("internal provider") == false)
    }

    @Test func backendErrorCodesAlwaysProduceCustomerCopy() {
        let codes = [
            "invalid_json", "invalid_request", "invalid_form_data", "invalid_image",
            "invalid_set_number", "invalid_minifigure_number", "invalid_part_lookup",
            "invalid_region", "invalid_regions", "missing_image", "rate_limited", "detector_unavailable",
            "feedback_unavailable", "invalid_code", "installation_already_used",
            "device_registration_failed", "database_update_failed", "invalid_signature",
            "invalid_user_id", "missing_event_data", "missing_signature", "webhook_failed",
            "webhook_not_configured", "upstream",
        ]

        for code in codes {
            let error = APIError(
                endpoint: "localization-test",
                statusCode: 400,
                code: code,
                serverMessage: "internal provider diagnostics"
            )
            #expect(error.errorDescription?.isEmpty == false)
            #expect(error.errorDescription?.contains("internal provider") == false)
        }
    }

    @Test func notificationRegistrationCarriesLanguageCode() throws {
        let registration = BrickValNotificationDeviceRegistration(
            deviceID: "device",
            apnsToken: "token",
            environment: "sandbox",
            languageCode: "ja",
            subscriberID: nil,
            accessCohort: nil,
            accountAlertsEnabled: false
        )
        let data = try JSONEncoder().encode(registration)
        let object = try #require(JSONSerialization.jsonObject(with: data) as? [String: Any])
        #expect(object["languageCode"] as? String == "ja")
    }

    @Test func notificationPlannerAcceptsAnExplicitLocale() {
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        let reset = now.addingTimeInterval(86_400)
        let english = BrickValNotificationSchedulePlanner.scanReset(
            resetDate: reset,
            now: now,
            locale: Locale(identifier: "en")
        )
        let spanish = BrickValNotificationSchedulePlanner.scanReset(
            resetDate: reset,
            now: now,
            locale: Locale(identifier: "es")
        )

        #expect(english?.title.isEmpty == false)
        #expect(spanish?.title.isEmpty == false)
    }

    @Test func currencyDateAndPercentageFormattingUseLocale() {
        let amount = 1_234.56
        let englishCurrency = amount.formatted(.currency(code: "USD").locale(Locale(identifier: "en_US")))
        let germanCurrency = amount.formatted(.currency(code: "USD").locale(Locale(identifier: "de_DE")))
        #expect(englishCurrency != germanCurrency)

        let date = Date(timeIntervalSince1970: 1_735_689_600)
        let englishDate = date.formatted(.dateTime.month(.abbreviated).day().locale(Locale(identifier: "en_US")))
        let germanDate = date.formatted(.dateTime.month(.abbreviated).day().locale(Locale(identifier: "de_DE")))
        #expect(englishDate != germanDate)

        let englishPercent = 0.245.formatted(.percent.locale(Locale(identifier: "en_US")))
        let germanPercent = 0.245.formatted(.percent.locale(Locale(identifier: "de_DE")))
        #expect(englishPercent != germanPercent)
    }

    @Test func marketPriceSourceCopyDistinguishesSalesFromListings() {
        #expect(MarketPriceSourceCopy.title(for: "sold") == "Average sold price")
        #expect(MarketPriceSourceCopy.detail(for: "sold") == "Based on recent completed sales.")
        #expect(MarketPriceSourceCopy.title(for: "listing") == "Average asking price")
        #expect(MarketPriceSourceCopy.detail(for: "listing") == "Based on active listings—not completed sales.")
        #expect(MarketPriceSourceCopy.title(for: nil) == "Average market price")
    }
}
