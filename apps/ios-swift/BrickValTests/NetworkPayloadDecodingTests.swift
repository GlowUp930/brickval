import Foundation
import Testing
@testable import BrickVal

struct NetworkPayloadDecodingTests {
    @Test func decodesMinifigureLookupPayload() throws {
        let data = Data(#"""
        {
          "figInfo":{"name":"Wolfpack Beastmaster","image_url":"//img.bricklink.com/ML/coltlbm01.jpg","fig_number":"coltlbm01","year_released":2025},
          "pricing":{"new_sold_avg_usd":12.5,"used_sold_avg_usd":9.25,"data_source":"sold"}
        }
        """#.utf8)

        let result = try JSONDecoder().decode(MinifigLookupPayload.self, from: data).normalized
        #expect(result.identifier == "coltlbm01")
        #expect(result.imageURL?.absoluteString == "https://img.bricklink.com/ML/coltlbm01.jpg")
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

    @Test func bulkResultItemsCollapseOverlappingDuplicateDetections() throws {
        let detectionsData = Data(#"""
        [
          {
            "id":"fig-a","item_type":"minifig","score":0.94,"regionId":"figure-a",
            "bounding_box":{"left":100,"top":80,"right":300,"bottom":480,"imageWidth":1000,"imageHeight":1000}
          },
          {
            "id":"fig-a","item_type":"minifig","score":0.91,"regionId":"figure-a-duplicate",
            "bounding_box":{"left":100,"top":160,"right":300,"bottom":400,"imageWidth":1000,"imageHeight":1000}
          },
          {
            "id":"fig-b","item_type":"minifig","score":0.92,"regionId":"figure-b",
            "bounding_box":{"left":430,"top":390,"right":650,"bottom":790,"imageWidth":1000,"imageHeight":1000}
          },
          {
            "id":"fig-b","item_type":"minifig","score":0.89,"regionId":"figure-b-duplicate",
            "bounding_box":{"left":426,"top":394,"right":646,"bottom":794,"imageWidth":1000,"imageHeight":1000}
          }
        ]
        """#.utf8)
        let detections = try JSONDecoder().decode([IdentificationDetection].self, from: detectionsData)

        let items = BulkScanResultItem.make(
            detections: detections,
            results: [lookupFixture(identifier: "fig-a"), lookupFixture(identifier: "fig-b")]
        )

        #expect(items.map(\.id) == ["figure-a", "figure-b"])
    }

    @Test func bulkResultItemsPreserveSpatiallyDistinctCopies() throws {
        let detectionsData = Data(#"""
        [
          {
            "id":"fig-a","item_type":"minifig","score":0.94,"regionId":"figure-a-left",
            "bounding_box":{"left":50,"top":100,"right":250,"bottom":500,"imageWidth":1000,"imageHeight":1000}
          },
          {
            "id":"fig-a","item_type":"minifig","score":0.91,"regionId":"figure-a-right",
            "bounding_box":{"left":600,"top":100,"right":800,"bottom":500,"imageWidth":1000,"imageHeight":1000}
          }
        ]
        """#.utf8)
        let detections = try JSONDecoder().decode([IdentificationDetection].self, from: detectionsData)

        let items = BulkScanResultItem.make(
            detections: detections,
            results: [lookupFixture(identifier: "fig-a")]
        )

        #expect(items.map(\.id) == ["figure-a-left", "figure-a-right"])
    }

    @Test func decodesCombinedBulkScanResponse() throws {
        let data = Data(#"""
        {
          "items":[{
            "detection":{
              "id":"sc123","item_type":"minifig","score":0.96,"regionId":"local-1",
              "bounding_box":{"left":100,"top":80,"right":300,"bottom":480,"imageWidth":1000,"imageHeight":1000}
            },
            "result":{
              "figInfo":{"name":"Driver","image_url":"//img.bricklink.com/a.jpg","fig_number":"sc123","year_released":2020},
              "pricing":{"used_sold_avg_usd":8.25}
            }
          }],
          "unresolvedCount":0,
          "partial":false,
          "timings":{"preprocessing_ms":80,"identification_ms":1200,"pricing_ms":200,"total_ms":1480,"provider_requests":2},
          "usage":null
        }
        """#.utf8)

        let payload = try JSONDecoder().decode(BulkMinifigScanPayload.self, from: data)

        #expect(payload.items.map(\.normalized.id) == ["local-1"])
        #expect(payload.items.first?.normalized.result.imageURL?.absoluteString == "https://img.bricklink.com/a.jpg")
        #expect(payload.timings.providerRequests == 2)
        #expect(payload.unresolvedCount == 0)
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
