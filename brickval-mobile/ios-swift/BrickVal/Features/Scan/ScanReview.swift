import Foundation

struct ScanReview: Identifiable {
    let id = UUID()
    let detections: [IdentificationDetection]
}
