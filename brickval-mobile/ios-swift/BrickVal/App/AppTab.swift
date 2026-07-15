import SwiftUI

enum AppTab: String, CaseIterable, Identifiable {
    case collection
    case scan
    case settings

    var id: Self { self }

    var title: String {
        switch self {
        case .collection: "Collection"
        case .scan: "Scan"
        case .settings: "Settings"
        }
    }

    var systemImage: String {
        switch self {
        case .collection: "shippingbox"
        case .scan: "viewfinder"
        case .settings: "gearshape"
        }
    }
}
