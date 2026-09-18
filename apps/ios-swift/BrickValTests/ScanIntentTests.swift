import Foundation
import Testing
import UIKit
@testable import BrickVal

struct ScanIntentTests {
    @Test
    func modeTitlesUseScannerLanguageInsteadOfCargoTranslations() {
        let expectedBulkTitles: [String: String] = [
            "ar": "مسح جماعي",
            "de": "Mehrfachscan",
            "en": "Bulk",
            "es": "Lote",
            "fr": "Lot",
            "hi": "बल्क स्कैन",
            "it": "Lotto",
            "ja": "一括",
            "ko": "일괄",
            "nl": "Batch",
            "pt-BR": "Em lote",
            "zh-Hans": "批量",
            "zh-Hant": "批量"
        ]

        for (identifier, expected) in expectedBulkTitles {
            #expect(
                ScanIntent.bulk.title(locale: Locale(identifier: identifier)) == expected,
                "Unexpected Bulk title for \(identifier)"
            )
        }
    }

    @Test
    func lightningIconClearsTheLocalizedBulkLabel() {
        let label = ScanIntent.bulk.title(locale: Locale(identifier: "de"))
        let labelWidth = (label as NSString).size(
            withAttributes: [.font: UIFont.preferredFont(forTextStyle: .body)]
        ).width
        let iconX = BulkModePickerLayout.iconCenterX(
            controlWidth: 340,
            layoutDirection: .leftToRight,
            label: label
        )
        let bulkCenter = 340 * 0.75

        #expect(iconX + 15 * 0.5 + 6 <= bulkCenter - labelWidth * 0.5)
    }
}
