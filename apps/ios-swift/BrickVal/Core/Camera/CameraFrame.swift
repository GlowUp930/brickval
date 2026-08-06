import CoreVideo
import Foundation

struct CameraFrame: @unchecked Sendable {
    let pixelBuffer: CVPixelBuffer
    let timestamp: Date
}
