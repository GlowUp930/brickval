@preconcurrency import AVFoundation
import UIKit

final class CameraPreviewView: UIView {
    override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }
    var previewLayer: AVCaptureVideoPreviewLayer {
        guard let previewLayer = layer as? AVCaptureVideoPreviewLayer else {
            preconditionFailure("CameraPreviewView requires AVCaptureVideoPreviewLayer.")
        }
        return previewLayer
    }
}
