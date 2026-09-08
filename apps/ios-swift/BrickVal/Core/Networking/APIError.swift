import Foundation

struct APIError: LocalizedError, Sendable {
    let endpoint: String
    let statusCode: Int
    let code: String?
    let serverMessage: String?
    let feature: ProFeature?
    let usage: UsageSnapshot?

    init(
        endpoint: String,
        statusCode: Int,
        code: String? = nil,
        serverMessage: String?,
        feature: ProFeature? = nil,
        usage: UsageSnapshot? = nil
    ) {
        self.endpoint = endpoint
        self.statusCode = statusCode
        self.code = code
        self.serverMessage = serverMessage
        self.feature = feature
        self.usage = usage
    }

    var isProLimit: Bool { statusCode == 402 && feature != nil }

    var errorDescription: String? {
        switch code {
        case "paywall":
            return BrickValLocalization.localized("You've used all your available scans. Upgrade to Brickvalue Pro to continue.")
        case "not_found":
            if endpoint.localizedCaseInsensitiveContains("minifig") {
                return BrickValLocalization.localized("We don't have data for this minifigure. Check the ID and try again.")
            }
            if endpoint.localizedCaseInsensitiveContains("part") {
                return BrickValLocalization.localized("We don't have data for this part. Try a different match.")
            }
            return BrickValLocalization.localized("We don't have data for this set number. Double-check the number and try again.")
        case "session_expired", "recovery_expired":
            return BrickValLocalization.localized("This scan session has expired. Retake the photo to try again.")
        case "rate_limited":
            return BrickValLocalization.localized("This scan is still processing. Please try again shortly.")
        case "invalid_json", "invalid_request", "invalid_action", "invalid_scan_mode", "invalid_guided_bulk_scan", "invalid_regions":
            return BrickValLocalization.localized("We couldn't complete that request. Check the details and try again.")
        case "invalid_form_data":
            return BrickValLocalization.localized("We couldn't read that photo. Choose another image and try again.")
        case "invalid_image":
            return BrickValLocalization.localized("This image couldn't be processed. Choose a valid JPEG photo and try again.")
        case "image_too_large":
            return BrickValLocalization.localized("This image couldn't be processed. Choose a smaller JPEG photo and try again.")
        case "unsupported_image":
            return BrickValLocalization.localized("This image type isn't supported. Choose a JPEG photo and try again.")
        case "missing_image":
            return BrickValLocalization.localized("Please choose a photo to scan.")
        case "invalid_set_number":
            return BrickValLocalization.localized("Enter a valid LEGO set number.")
        case "invalid_set_numbers", "missing_set_numbers":
            return BrickValLocalization.localized("Enter a valid LEGO set number.")
        case "invalid_minifigure_number", "invalid_minifigure_numbers":
            return BrickValLocalization.localized("Enter a valid minifigure number.")
        case "invalid_part_lookup":
            return BrickValLocalization.localized("Enter a valid part number and colour.")
        case "invalid_region":
            return BrickValLocalization.localized("A valid minifigure crop is required.")
        case "authentication_required", "authentication_unavailable", "unauthorized":
            return BrickValLocalization.localized("Please sign in and try again.")
        case "account_deletion_failed":
            return BrickValLocalization.localized("Your account could not be deleted. Please try again.")
        case "feedback_unavailable", "survey_unavailable":
            return BrickValLocalization.localized("Feedback is temporarily unavailable. Please try again shortly.")
        case "invalid_scan_outcome", "invalid_survey_response":
            return BrickValLocalization.localized("Please answer both questions before sending.")
        case "invalid_code", "self_referral":
            return BrickValLocalization.localized("That invite code could not be claimed.")
        case "installation_already_used":
            return BrickValLocalization.localized("This installation has already used an invite code.")
        case "detector_disabled", "detector_unavailable":
            return BrickValLocalization.localized("Something went wrong. Please try again in a moment.")
        case "device_registration_failed", "device_removal_failed":
            return BrickValLocalization.localized("Notifications are unavailable right now.")
        case "invalid_exchange_rates", "exchange_rates_unavailable":
            return BrickValLocalization.localized("Currency conversion is temporarily unavailable.")
        case "invalid_notification_device", "invalid_subscriber", "subscriber_mismatch":
            return BrickValLocalization.localized("We couldn't complete that request. Check the details and try again.")
        case "invalid_installation", "referral_unavailable", "monetization_unavailable", "usage_unavailable":
            return BrickValLocalization.localized("Something went wrong. Please try again in a moment.")
        case "upstream", "internal", "service_unavailable", "database_update_failed", "invalid_signature", "invalid_user_id", "missing_event_data", "missing_signature", "webhook_failed", "webhook_not_configured":
            return BrickValLocalization.localized("Something went wrong. Please try again in a moment.")
        default:
            switch statusCode {
            case 401:
                return BrickValLocalization.localized("Please sign in and try again.")
            case 402:
                return BrickValLocalization.localized("You've reached your scan limit. Upgrade to Brickvalue Pro to continue.")
            case 404:
                return BrickValLocalization.localized("We couldn't find what you were looking for. Check the details and try again.")
            case 429:
                return BrickValLocalization.localized("Too many requests. Please try again shortly.")
            case 400...499:
                return BrickValLocalization.localized("We couldn't complete that request. Check the details and try again.")
            default:
                return BrickValLocalization.localized("Something went wrong. Please try again in a moment.")
            }
        }
    }
}
