import CoreGraphics
import Foundation

struct DetectionSamplePlan: Equatable, Sendable {
    let crop: CGRect?
    let outputSize: CGSize
}
