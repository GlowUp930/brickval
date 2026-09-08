import Foundation
import RevenueCat
import StoreKit

enum PurchaseFailureCategory: String, Equatable, Sendable {
    case notAllowed
    case productUnavailable
    case network
    case store
    case configuration
    case unknown
    case cancelled
    case pending
}

struct PurchaseFailure: LocalizedError, Equatable, Sendable {
    let category: PurchaseFailureCategory
    let productID: String
    let revenueCatCode: Int?
    let underlyingDomain: String?
    let underlyingCode: Int?

    var errorDescription: String? {
        switch category {
        case .notAllowed:
            BrickValLocalization.localized("Apple couldn't authorize this purchase on this device or account. Check your App Store or Screen Time purchase settings, then try again.")
        case .productUnavailable, .configuration:
            BrickValLocalization.localized("This subscription is temporarily unavailable. Please try again later.")
        case .network:
            BrickValLocalization.localized("We couldn't connect to the App Store. Check your connection and try again.")
        case .store:
            BrickValLocalization.localized("The App Store couldn't complete this purchase. Please try again.")
        case .unknown:
            BrickValLocalization.localized("We couldn't complete this purchase. Please try again.")
        case .cancelled:
            BrickValLocalization.localized("Purchase cancelled.")
        case .pending:
            BrickValLocalization.localized("Your purchase is pending approval.")
        }
    }

    var diagnosticProperties: [String: String] {
        var properties = [
            "product_id": productID,
        ]
        if let revenueCatCode {
            properties["revenuecat_error_code"] = String(revenueCatCode)
        }
        if let underlyingDomain {
            properties["storekit_error_domain"] = underlyingDomain
        }
        if let underlyingCode {
            properties["storekit_error_code"] = String(underlyingCode)
        }
        return properties
    }

    static func from(
        revenueCatCode: Int?,
        underlyingDomain: String?,
        underlyingCode: Int?,
        productID: String
    ) -> PurchaseFailure {
        let category: PurchaseFailureCategory
        let isStoreKitPaymentNotAllowed = underlyingDomain == SKErrorDomain &&
            underlyingCode == SKError.Code.paymentNotAllowed.rawValue
        let isStoreKitCancellation = underlyingDomain == SKErrorDomain &&
            underlyingCode == SKError.Code.paymentCancelled.rawValue
        let isStoreKitConfigurationFailure = underlyingDomain == SKErrorDomain && [
            SKError.Code.clientInvalid.rawValue,
            SKError.Code.cloudServicePermissionDenied.rawValue,
            SKError.Code.privacyAcknowledgementRequired.rawValue,
            SKError.Code.overlayInvalidConfiguration.rawValue,
            SKError.Code.unsupportedPlatform.rawValue,
        ].contains(underlyingCode)
        let isStoreKitProductPurchaseNotAllowed = underlyingDomain == Self.storeKitProductPurchaseErrorDomain &&
            underlyingCode == Self.storeKitProductPurchaseNotAllowedCode

        if isStoreKitProductPurchaseNotAllowed {
            category = .notAllowed
        } else {
            switch revenueCatCode.flatMap(RevenueCat.ErrorCode.init(rawValue:)) {
            case .purchaseCancelledError:
                category = .cancelled
            case .paymentPendingError:
                category = .pending
            case .purchaseNotAllowedError where isStoreKitConfigurationFailure:
                category = .configuration
            case .purchaseNotAllowedError:
                category = .notAllowed
            case .productNotAvailableForPurchaseError:
                category = .productUnavailable
            case .networkError, .offlineConnectionError, .productRequestTimedOut, .apiEndpointBlockedError:
                category = .network
            case .storeProblemError:
                category = .store
            case .purchaseInvalidError,
                 .invalidAppleSubscriptionKeyError,
                 .insufficientPermissionsError,
                 .configurationError,
                 .invalidCredentialsError:
                category = .configuration
            default:
                if isStoreKitCancellation {
                    category = .cancelled
                } else if isStoreKitPaymentNotAllowed {
                    category = .notAllowed
                } else if isStoreKitConfigurationFailure {
                    category = .configuration
                } else {
                    category = .unknown
                }
            }
        }

        return PurchaseFailure(
            category: category,
            productID: productID,
            revenueCatCode: revenueCatCode,
            underlyingDomain: underlyingDomain,
            underlyingCode: underlyingCode
        )
    }

    static func from(error: Error, productID: String) -> PurchaseFailure {
        if let purchasingError = error as? PurchasingError,
           case .storeKitProductMissing = purchasingError {
            return PurchaseFailure(
                category: .productUnavailable,
                productID: productID,
                revenueCatCode: nil,
                underlyingDomain: nil,
                underlyingCode: nil
            )
        }

        if let storeKitError = error as? StoreKitError {
            switch storeKitError {
            case .userCancelled:
                return Self.from(
                    revenueCatCode: RevenueCat.ErrorCode.purchaseCancelledError.rawValue,
                    underlyingDomain: nil,
                    underlyingCode: nil,
                    productID: productID
                )
            case .networkError:
                return Self.from(
                    revenueCatCode: RevenueCat.ErrorCode.networkError.rawValue,
                    underlyingDomain: nil,
                    underlyingCode: nil,
                    productID: productID
                )
            case .notAvailableInStorefront:
                return Self.from(
                    revenueCatCode: RevenueCat.ErrorCode.productNotAvailableForPurchaseError.rawValue,
                    underlyingDomain: nil,
                    underlyingCode: nil,
                    productID: productID
                )
            case .notEntitled, .systemError, .unknown:
                return Self.from(
                    revenueCatCode: RevenueCat.ErrorCode.storeProblemError.rawValue,
                    underlyingDomain: nil,
                    underlyingCode: nil,
                    productID: productID
                )
#if compiler(>=6.1)
            case .unsupported:
                return Self.from(
                    revenueCatCode: RevenueCat.ErrorCode.purchaseInvalidError.rawValue,
                    underlyingDomain: nil,
                    underlyingCode: nil,
                    productID: productID
                )
#endif
            @unknown default:
                break
            }
        }

        let directError = error as NSError
        if directError.domain == NSURLErrorDomain {
            return Self.from(
                revenueCatCode: RevenueCat.ErrorCode.networkError.rawValue,
                underlyingDomain: nil,
                underlyingCode: nil,
                productID: productID
            )
        }

        if let purchaseError = error as? StoreKit.Product.PurchaseError {
            switch purchaseError {
            case .purchaseNotAllowed:
                return Self.from(
                    revenueCatCode: RevenueCat.ErrorCode.purchaseNotAllowedError.rawValue,
                    underlyingDomain: nil,
                    underlyingCode: nil,
                    productID: productID
                )
            case .productUnavailable:
                return Self.from(
                    revenueCatCode: RevenueCat.ErrorCode.productNotAvailableForPurchaseError.rawValue,
                    underlyingDomain: nil,
                    underlyingCode: nil,
                    productID: productID
                )
            default:
                break
            }
        }

        let errorObject = error as NSError
        let revenueCatCode = Self.revenueCatCode(from: error, errorObject: errorObject)
        let rootError = errorObject.userInfo["rc_root_error"] as? [String: Any]
        let storeKitError = rootError?["storeKitError"] as? [String: Any]
        let deepestError = Self.deepestUnderlyingError(from: errorObject)
        let underlyingDomain = rootError?["domain"] as? String ??
            (deepestError.domain == SKErrorDomain ? deepestError.domain : nil)
        let underlyingCode = Self.integerValue(storeKitError?["skErrorCode"]) ??
            Self.integerValue(rootError?["code"]) ??
            (deepestError.domain == SKErrorDomain ? deepestError.code : nil)

        return Self.from(
            revenueCatCode: revenueCatCode,
            underlyingDomain: underlyingDomain,
            underlyingCode: underlyingCode,
            productID: productID
        )
    }

    private static func revenueCatCode(from error: Error, errorObject: NSError) -> Int? {
        if let errorCode = error as? RevenueCat.ErrorCode {
            return errorCode.rawValue
        }

        let hasRevenueCatMetadata = errorObject.userInfo["rc_code_name"] != nil ||
            errorObject.userInfo["rc_root_error"] != nil ||
            errorObject.domain.localizedCaseInsensitiveContains("revenuecat")
        guard hasRevenueCatMetadata else { return nil }
        return RevenueCat.ErrorCode(rawValue: errorObject.code)?.rawValue
    }

    private static func deepestUnderlyingError(from error: NSError) -> NSError {
        var current = error
        var visited = Set<String>()

        while let underlying = current.userInfo[NSUnderlyingErrorKey] as? Error {
            let next = underlying as NSError
            let identity = "\(next.domain):\(next.code):\(next.localizedDescription)"
            guard visited.insert(identity).inserted else { break }
            current = next
        }

        return current
    }

    private static func integerValue(_ value: Any?) -> Int? {
        if let value = value as? Int {
            return value
        }
        if let value = value as? NSNumber {
            return value.intValue
        }
        return nil
    }

    private static let storeKitProductPurchaseErrorDomain = "StoreKit.Product.PurchaseError"
    private static let storeKitProductPurchaseNotAllowedCode = 2
}

enum PurchasingError: LocalizedError {
    case storeKitProductMissing

    var errorDescription: String? {
        switch self {
        case .storeKitProductMissing:
            BrickValLocalization.localized("The subscription product is not available from the App Store.")
        }
    }
}
