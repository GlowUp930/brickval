import SwiftUI

struct DetectionOverlayView: View {
    let observations: [DetectionObservation]

    var body: some View {
        Canvas { context, size in
            for observation in observations {
                let box = observation.boundingBox.clamped
                let rect = CGRect(
                    x: box.x * size.width,
                    y: box.y * size.height,
                    width: box.width * size.width,
                    height: box.height * size.height
                )
                let path = Path(roundedRect: rect, cornerRadius: 12)
                context.stroke(path, with: .color(.yellow), lineWidth: 3)
            }
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
}
