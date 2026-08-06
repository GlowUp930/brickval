import Foundation
import Testing
@testable import BrickVal

struct ScanReviewCandidateTests {
    @Test func flattensPrimaryAndAlternativesIntoThreeUniqueCandidates() throws {
        let data = Data(#"""
        {
          "id":"sh0115",
          "item_type":"minifig",
          "score":0.74,
          "alternatives":[
            {"id":"sh0115","score":0.73},
            {"id":"sh0318","score":0.70},
            {"id":"coltlbm16","score":0.62},
            {"id":"sh0001","score":0.51}
          ]
        }
        """#.utf8)
        let detection = try JSONDecoder().decode(IdentificationDetection.self, from: data)

        let candidates = ScanReviewCandidate.make(from: [detection])

        #expect(candidates.map(\.identifier) == ["sh0115", "sh0318", "coltlbm16"])
        #expect(candidates.map(\.score) == [0.74, 0.70, 0.62])
    }

    @Test func preservesOtherDetectedMinifiguresWhenNoAlternativesExist() throws {
        let data = Data(#"""
        [
          {"id":"sh0115","item_type":"minifig","score":0.71},
          {"id":"sh0318","item_type":"minifig","score":0.68}
        ]
        """#.utf8)
        let detections = try JSONDecoder().decode([IdentificationDetection].self, from: data)

        let candidates = ScanReviewCandidate.make(from: detections)

        #expect(candidates.map(\.identifier) == ["sh0115", "sh0318"])
    }

    @Test func appliesLoadedResultsWithoutDroppingMissingOrDuplicateRows() {
        let candidates = [
            ScanReviewCandidate(identifier: "sh0115", score: 0.74, result: nil),
            ScanReviewCandidate(identifier: "sh0318", score: 0.70, result: nil),
        ]
        let first = lookupResult(identifier: "sh0115", name: "Spider-Man")
        let updated = lookupResult(identifier: "sh0115", name: "Spider-Man updated")
        let rows = [
            BulkMinifigLookupRow(figNumber: "SH0115", result: first, wasFound: true),
            BulkMinifigLookupRow(figNumber: "sh0115", result: updated, wasFound: true),
            BulkMinifigLookupRow(figNumber: "sh0318", result: nil, wasFound: false),
        ]

        let loaded = ScanReviewCandidate.applying(rows, to: candidates)

        #expect(loaded[0].result?.name == "Spider-Man updated")
        #expect(loaded[1].result == nil)
    }

    private func lookupResult(identifier: String, name: String) -> LookupResult {
        LookupResult(
            identifier: identifier,
            itemType: .minifig,
            name: name,
            theme: "Super Heroes",
            pieces: nil,
            yearReleased: nil,
            isObsolete: nil,
            imageURL: nil,
            pricing: LookupPricing(
                heroNewAverageUSD: nil,
                rrpUSD: nil,
                gainPercent: nil,
                dataSource: nil,
                newSoldAverageUSD: nil,
                usedSoldAverageUSD: 5.14,
                newStockAverageUSD: nil,
                usedStockAverageUSD: nil,
                brickLinkNewAverageUSD: nil,
                brickLinkUsedAverageUSD: nil
            ),
            marketHistory: [],
            colorID: nil,
            colorName: nil
        )
    }
}
