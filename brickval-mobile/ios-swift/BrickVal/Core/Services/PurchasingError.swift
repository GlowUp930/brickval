import Foundation

enum PurchasingError: LocalizedError {
    case storeKitProductMissing

    var errorDescription: String? {
        switch self {
        case .storeKitProductMissing: "The subscription product is not available from the App Store."
        }
    }
}
