import SwiftUI

struct SkeletonPlaceholder: View {
    let cornerRadius: CGFloat
    let fill: Color
    let highlight: Color

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var shimmerProgress: CGFloat = -1.2

    init(
        cornerRadius: CGFloat = 8,
        fill: Color = Color.primary.opacity(0.10),
        highlight: Color = Color.primary.opacity(0.16)
    ) {
        self.cornerRadius = cornerRadius
        self.fill = fill
        self.highlight = highlight
    }

    var body: some View {
        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
            .fill(fill)
            .overlay {
                GeometryReader { proxy in
                    LinearGradient(
                        colors: [.clear, highlight, .clear],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                    .frame(width: max(80, proxy.size.width * 0.45))
                    .offset(x: shimmerProgress * max(proxy.size.width, 80))
                }
                .clipped()
            }
            .onAppear {
                guard !reduceMotion else { return }
                withAnimation(.linear(duration: 1.25).repeatForever(autoreverses: false)) {
                    shimmerProgress = 1.25
                }
            }
            .accessibilityHidden(true)
    }
}
