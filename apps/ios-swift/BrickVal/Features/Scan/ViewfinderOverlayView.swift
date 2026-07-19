import SwiftUI

struct ViewfinderOverlayView: View {
    var body: some View {
        RoundedRectangle(cornerRadius: 28)
            .stroke(.white.opacity(0.82), style: StrokeStyle(lineWidth: 2, dash: [12, 8]))
            .padding(38)
            .allowsHitTesting(false)
            .accessibilityHidden(true)
    }
}
