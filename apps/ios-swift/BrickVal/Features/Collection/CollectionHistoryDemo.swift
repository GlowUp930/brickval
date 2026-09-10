#if DEBUG
import SwiftUI

/// Public dated-sale fixtures captured from existing cache on 2026-09-08.
/// UI demos shift dates together so relative intervals remain deterministic as time passes.
enum CollectionHistoryDemo {
    static let referenceDate = ISO8601DateFormatter().date(from: "2026-09-08T12:00:00Z")!
    static let rocket: [CollectionMarketSale] = [
        CollectionMarketSale(date: "2026-09-04T06:38:20.627Z", priceUSD: 117.0997, quantity: 1),
        CollectionMarketSale(date: "2026-08-10T09:22:06.230Z", priceUSD: 121.4612, quantity: 1),
        CollectionMarketSale(date: "2026-07-31T20:37:24.370Z", priceUSD: 137.5134, quantity: 1),
        CollectionMarketSale(date: "2026-06-11T09:39:51.083Z", priceUSD: 142.9971, quantity: 1),
        CollectionMarketSale(date: "2026-06-07T17:12:00.090Z", priceUSD: 136.9308, quantity: 1),
        CollectionMarketSale(date: "2026-06-06T12:57:16.907Z", priceUSD: 144.2488, quantity: 1),
        CollectionMarketSale(date: "2026-06-05T13:22:03.793Z", priceUSD: 152.9548, quantity: 1),
        CollectionMarketSale(date: "2026-06-03T21:56:23.740Z", priceUSD: 136.3316, quantity: 1),
        CollectionMarketSale(date: "2026-06-03T11:50:42.557Z", priceUSD: 137.0886, quantity: 1),
        CollectionMarketSale(date: "2026-06-01T09:19:56.583Z", priceUSD: 138.6609, quantity: 1),
        CollectionMarketSale(date: "2026-05-31T20:26:58.250Z", priceUSD: 138.5253, quantity: 1),
        CollectionMarketSale(date: "2026-05-30T10:57:16.073Z", priceUSD: 153.9609, quantity: 1),
        CollectionMarketSale(date: "2026-05-27T09:48:07.877Z", priceUSD: 150.4569, quantity: 1),
        CollectionMarketSale(date: "2026-05-20T15:40:57.407Z", priceUSD: 134.0548, quantity: 1),
        CollectionMarketSale(date: "2026-05-11T20:13:11.710Z", priceUSD: 202.2887, quantity: 1),
        CollectionMarketSale(date: "2026-05-06T07:38:15.387Z", priceUSD: 209.1806, quantity: 1),
        CollectionMarketSale(date: "2026-05-05T00:33:10.420Z", priceUSD: 193.0724, quantity: 2),
        CollectionMarketSale(date: "2026-04-27T17:24:13.617Z", priceUSD: 205, quantity: 1),
        CollectionMarketSale(date: "2026-04-26T18:23:20.430Z", priceUSD: 181.0026, quantity: 1),
        CollectionMarketSale(date: "2026-04-24T13:56:01.883Z", priceUSD: 160, quantity: 1),
        CollectionMarketSale(date: "2026-04-10T19:22:46.897Z", priceUSD: 202.5298, quantity: 1),
        CollectionMarketSale(date: "2026-04-04T14:00:25.623Z", priceUSD: 156.0935, quantity: 1),
    ]
    static let joker: [CollectionMarketSale] = [
        CollectionMarketSale(date: "2026-09-02T06:44:24.740Z", priceUSD: 68.9124, quantity: 1),
        CollectionMarketSale(date: "2026-08-27T19:26:05.243Z", priceUSD: 149.99, quantity: 1),
        CollectionMarketSale(date: "2026-08-15T04:19:54.807Z", priceUSD: 107.533, quantity: 1),
        CollectionMarketSale(date: "2026-08-10T12:44:03.190Z", priceUSD: 80.7332, quantity: 1),
        CollectionMarketSale(date: "2026-07-31T01:54:21.913Z", priceUSD: 99.2584, quantity: 1),
        CollectionMarketSale(date: "2026-07-25T21:45:17.920Z", priceUSD: 78.501, quantity: 1),
        CollectionMarketSale(date: "2026-07-25T10:46:42.790Z", priceUSD: 149.99, quantity: 2),
        CollectionMarketSale(date: "2026-07-14T16:28:28.620Z", priceUSD: 68.544, quantity: 1),
        CollectionMarketSale(date: "2026-07-13T22:57:57.487Z", priceUSD: 149.99, quantity: 1),
        CollectionMarketSale(date: "2026-07-10T10:34:56.963Z", priceUSD: 61.8778, quantity: 1),
        CollectionMarketSale(date: "2026-07-09T00:04:46.450Z", priceUSD: 129.95, quantity: 1),
        CollectionMarketSale(date: "2026-06-07T23:18:42.750Z", priceUSD: 130, quantity: 1),
        CollectionMarketSale(date: "2026-05-20T10:48:44.547Z", priceUSD: 80.4419, quantity: 1),
        CollectionMarketSale(date: "2026-05-16T17:08:38.420Z", priceUSD: 124.9, quantity: 1),
        CollectionMarketSale(date: "2026-05-13T05:01:37.520Z", priceUSD: 63.6515, quantity: 1),
        CollectionMarketSale(date: "2026-04-21T20:46:58.140Z", priceUSD: 99, quantity: 1),
        CollectionMarketSale(date: "2026-04-17T10:09:39.400Z", priceUSD: 69.154, quantity: 2),
        CollectionMarketSale(date: "2026-03-29T17:36:52.053Z", priceUSD: 65, quantity: 1),
        CollectionMarketSale(date: "2026-03-26T04:20:03.270Z", priceUSD: 63.1601, quantity: 1),
        CollectionMarketSale(date: "2026-03-17T21:48:00.190Z", priceUSD: 125, quantity: 1),
    ]
    static func response(_ requests: [CollectionHistoryRequestItem], now: Date = .now) -> CollectionHistoryResponse {
        let shift = now.timeIntervalSince(referenceDate)
        let formatter = ISO8601DateFormatter()
        return CollectionHistoryResponse(items: requests.map { request in
            let sales = (request.identifier == "21367" ? rocket : joker).enumerated().map { index, sale in
                let country = ["US", "CA", "GB", "AU"][index % 4]
                return CollectionMarketSale(date: formatter.string(from: sale.timestamp!.addingTimeInterval(shift)), priceUSD: sale.priceUSD, quantity: sale.quantity, sellerCountryCode: country)
            }
            return CollectionHistoryResponse.Row(identifier: request.identifier, itemType: request.itemType, colorID: request.colorID,
                newSales: sales, usedSales: [], fetchedAt: formatter.string(from: now), newError: nil, usedError: nil)
        })
    }
}

struct CollectionHistoryDemoView: View {
    @State private var store = CollectionStore(repository: CollectionRepository(fileURL: URL.temporaryDirectory.appending(path: "history-demo-\(UUID().uuidString).json")))
    @State private var ready = false
    var body: some View {
        Group {
            if ready {
                AppShellView().environment(store)
            } else {
                ProgressView()
            }
        }
        .task {
            guard !ready else { return }
            var items = [
                CollectionItem(setNumber: "21367", itemType: .set, name: "Tintin Moon Rocket", theme: "Ideas", marketValueUSD: 150),
                CollectionItem(setNumber: "70919", itemType: .set, name: "The Joker Manor", theme: "Batman", marketValueUSD: 120)
            ]
            let arguments = ProcessInfo.processInfo.arguments
            if let index = arguments.firstIndex(of: "-collectionPerformanceHoldings"), index + 1 < arguments.count,
               let count = Int(arguments[index + 1]), (2...200).contains(count) {
                items = (0..<count).map { index in
                    let number = index < 2 ? "21367" : index < 4 ? "70919" : "fixture-\(index / 2)"
                    var item = CollectionItem(setNumber: number, itemType: .set,
                        name: index < 2 ? "Tintin Moon Rocket" : "The Joker Manor \(index / 2)", theme: "Performance fixture",
                        imageURL: URL(string: "https://img.bricklink.com/ItemImage/SN/0/\(index < 2 ? "21367" : "70919")-1.png"),
                        marketValueUSD: 150, condition: index.isMultiple(of: 2) ? .newSealed : .used)
                    let row = CollectionHistoryDemo.response([CollectionHistoryRequestItem(item)]).items[0]
                    item.marketSales = row.newSales
                    item.marketHistoryFetchedAt = row.fetchedAt
                    item.marketHistoryMetadataVersion = CollectionItem.marketHistoryMetadataVersionCurrent
                    return item
                }
                items.reverse()
            }
            try? await store.add(items, isPro: true)
            await store.waitForPreparedHistory()
            ready = true
        }
    }
}
#endif
