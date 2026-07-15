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
}
