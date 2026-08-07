import ClerkKitUI
import SwiftUI

struct BrickValueAuthView: View {
    @Environment(\.brickValAccent) private var accent

    let isDismissible: Bool

    var body: some View {
        AuthView(isDismissible: isDismissible)
            .clerkAppIconView {
                Image("OnboardingLogo")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 76, height: 76)
                    .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
                    .accessibilityLabel("BrickValue")
            }
            .environment(\.clerkTheme, authTheme)
    }

    private var authTheme: ClerkTheme {
        ClerkTheme(
            colors: .init(
                primary: accent,
                background: BrickValStyle.Semantic.canvas,
                input: BrickValStyle.Semantic.surfaceMuted,
                foreground: BrickValStyle.Semantic.textPrimary,
                mutedForeground: BrickValStyle.Semantic.textSecondary,
                primaryForeground: BrickValStyle.Primitive.black,
                inputForeground: BrickValStyle.Semantic.textPrimary,
                neutral: BrickValStyle.Semantic.divider,
                ring: accent,
                muted: BrickValStyle.Semantic.surfaceMuted,
                secondaryButtonBackground: BrickValStyle.Semantic.surfaceMuted,
                secondaryButtonForeground: BrickValStyle.Semantic.textPrimary,
                shadow: BrickValStyle.Primitive.black,
                border: BrickValStyle.Semantic.divider
            ),
            design: .init(borderRadius: BrickValStyle.Primitive.radius16)
        )
    }
}
