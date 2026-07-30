import Foundation
import Testing
@testable import BrickVal

struct NetworkPayloadDecodingTests {
    @Test func decodesMinifigureLookupPayload() throws {
        let data = Data(#"""
        {
          "figInfo":{"name":"Wolfpack Beastmaster","image_url":"https://example.com/fig.png","fig_number":"coltlbm01","year_released":2025},
          "pricing":{"new_sold_avg_usd":12.5,"used_sold_avg_usd":9.25,"data_source":"sold"}
        }
        """#.utf8)

        let result = try JSONDecoder().decode(MinifigLookupPayload.self, from: data).normalized
        #expect(result.identifier == "coltlbm01")
        #expect(result.imageURL?.absoluteString == "https://example.com/fig.png")
        #expect(result.pricing.preferredUsedValue == 9.25)
    }

    @Test func decodesPartLookupPayload() throws {
        let data = Data(#"""
        {
          "partInfo":{"name":"Brick 2 x 4","image_url":"https://example.com/part.png","part_number":"3001","year_released":1950,"color_id":5,"color_name":"Red"},
          "pricing":{"new_stock_avg_usd":0.4,"used_stock_avg_usd":0.2,"data_source":"listing"}
        }
        """#.utf8)

        let result = try JSONDecoder().decode(PartLookupPayload.self, from: data).normalized
        #expect(result.identifier == "3001")
        #expect(result.colorID == 5)
        #expect(result.imageURL?.absoluteString == "https://example.com/part.png")
    }

    @Test func decodesSetLookupPayload() throws {
        let data = Data(#"""
        {
          "setInfo":{"set_number":"10307","name":"Eiffel Tower","image_url":"https://example.com/set.png","year_released":2022,"is_obsolete":false},
          "pricing":{"hero_new_avg_usd":700,"rrp_usd":629.99,"data_source":"sold"}
        }
        """#.utf8)

        let result = try JSONDecoder().decode(SetLookupPayload.self, from: data).normalized(fallbackIdentifier: "10307")
        #expect(result.identifier == "10307")
        #expect(result.yearReleased == 2022)
        #expect(result.pricing.preferredNewValue == 700)
    }

    @Test func timestampsHostedDetectorObservationsLocally() throws {
        let data = Data(#"""
        {
          "confidence":0.91,
          "boundingBox":{"x":0.2,"y":0.15,"width":0.4,"height":0.6},
          "detectionFrameCoverage":0.24,
          "fullyVisible":true,
          "regionId":"figure-1"
        }
        """#.utf8)

        let before = Date.now
        let observation = try JSONDecoder().decode(DetectionObservation.self, from: data)
        #expect(observation.regionID == "figure-1")
        #expect(observation.timestamp >= before)
    }

    @Test func decodesAndNormalizesBulkIdentificationBoundingBox() throws {
        let data = Data(#"""
        {
          "id":"sh0115",
          "item_type":"minifig",
          "score":0.94,
          "regionId":"region-1",
          "bounding_box":{
            "left":100,"top":50,"right":300,"bottom":450,
            "imageWidth":1000,"imageHeight":500
          }
        }
        """#.utf8)

        let detection = try JSONDecoder().decode(IdentificationDetection.self, from: data)
        let box = try #require(detection.boundingBox?.normalized)
        #expect(box.x == 0.1)
        #expect(box.y == 0.1)
        #expect(box.width == 0.2)
        #expect(box.height == 0.8)
    }

    @Test func bulkResultItemsPreserveDuplicateDetectionsAndDropMissingLookups() throws {
        let detectionsData = Data(#"""
        [
          {"id":"sh0115","item_type":"minifig","score":0.94,"regionId":"region-1"},
          {"id":"sh0115","item_type":"minifig","score":0.91,"regionId":"region-2"},
          {"id":"missing","item_type":"minifig","score":0.85,"regionId":"region-3"},
          {"id":"3001","item_type":"part","score":0.80,"regionId":"region-4"}
        ]
        """#.utf8)
        let detections = try JSONDecoder().decode([IdentificationDetection].self, from: detectionsData)
        let result = lookupFixture(identifier: "sh0115")

        let items = BulkScanResultItem.make(detections: detections, results: [result])

        #expect(items.map(\.id) == ["region-1", "region-2"])
        #expect(items.allSatisfy { $0.result.identifier == "sh0115" })
    }

    private func lookupFixture(identifier: String) -> LookupResult {
        LookupResult(
            identifier: identifier,
            itemType: .minifig,
            name: "Test Minifigure",
            theme: "Test",
            pieces: nil,
            yearReleased: nil,
            isObsolete: nil,
            imageURL: nil,
            pricing: LookupPricing(
                heroNewAverageUSD: nil,
                rrpUSD: nil,
                gainPercent: nil,
                dataSource: "sold",
                newSoldAverageUSD: 12,
                usedSoldAverageUSD: 8,
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
