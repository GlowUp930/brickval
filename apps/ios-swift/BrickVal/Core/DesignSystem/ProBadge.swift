import SwiftUI

enum ProBadgeState {
    case requiresPro
    case active
}

struct ProBadge: View {
    let state: ProBadgeState
    var compact = true

    var body: some View {
        Text(state == .active ? "PRO ACTIVE" : "PRO")
            .font(compact ? .caption.weight(.black) : .subheadline.weight(.black))
            .lineLimit(1)
            .minimumScaleFactor(0.82)
            .foregroundStyle(
                LinearGradient(
                    colors: [
                        Color(red: 0.87, green: 0.97, blue: 0.94),
                        Color(red: 0.62, green: 0.80, blue: 0.82),
                        Color(red: 0.28, green: 0.42, blue: 0.56),
                    ],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .padding(.horizontal, compact ? 8 : 12)
            .padding(.vertical, compact ? 5 : 8)
            .background(BrickValStyle.Primitive.black.opacity(0.82), in: Capsule())
            .overlay {
                Capsule()
                    .stroke(BrickValStyle.Primitive.white.opacity(0.18), lineWidth: 1)
            }
            .accessibilityLabel(
                state == .active
                    ? "BrickValue Pro active"
                    : "Requires BrickValue Pro"
            )
    }
}
