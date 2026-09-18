import SwiftUI

struct BulkModeBoostEffect: View {
    @Environment(\.brickValAccent) private var accent
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    let trigger: Int

    @State private var progress = 0.0
    @State private var opacity = 0.0

    var body: some View {
        GeometryReader { proxy in
            orbitPulse
                .frame(width: proxy.size.width * 0.5, height: proxy.size.height)
                .position(
                    x: proxy.size.width * 0.75,
                    y: proxy.size.height * 0.5
                )
        }
        .frame(maxWidth: .infinity, minHeight: 72, maxHeight: 86)
        .opacity(opacity)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
        .task(id: trigger) {
            await play()
        }
    }

    private var orbitPulse: some View {
        ZStack {
            ForEach(0..<3, id: \.self) { index in
                Circle()
                    .stroke(
                        accent.opacity(0.28 - Double(index) * 0.06),
                        lineWidth: 1.5
                    )
                    .frame(
                        width: 30 + CGFloat(index) * 22,
                        height: 30 + CGFloat(index) * 22
                    )
                    .scaleEffect(0.72 + progress * 0.9)
                    .opacity(max(0, 1 - progress * 1.2))
            }

            Image(systemName: "square.stack.3d.up.fill")
                .font(.system(size: 27, weight: .bold))
                .foregroundStyle(accent)
                .scaleEffect(0.82 + progress * 0.2)
                .offset(y: -progress * 7)
        }
    }

    private func play() async {
        guard trigger > 0 else { return }

        progress = 0
        opacity = reduceMotion ? 1 : 0

        if reduceMotion {
            withAnimation(.easeOut(duration: 0.12)) {
                opacity = 1
            }
            try? await Task.sleep(for: .milliseconds(220))
            guard !Task.isCancelled else { return }
            withAnimation(.easeOut(duration: 0.12)) {
                opacity = 0
            }
            return
        }

        withAnimation(.easeOut(duration: 0.46)) {
            progress = 1
            opacity = 1
        }
        try? await Task.sleep(for: .milliseconds(500))
        guard !Task.isCancelled else { return }
        withAnimation(.easeOut(duration: 0.14)) {
            opacity = 0
        }
    }
}
