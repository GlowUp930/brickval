import ClerkKit
import ClerkKitUI
import SwiftUI

struct AccountView: View {
    @Environment(\.appSDKCoordinator) private var coordinator

    var body: some View {
        accountContent
            .background(BrickValStyle.Semantic.canvas.ignoresSafeArea())
            .navigationTitle("Manage Account")
    }

    @ViewBuilder
    private var accountContent: some View {
        if let clerk = coordinator?.clerk {
            ConfiguredAccountView()
                .environment(clerk)
        } else {
            ScrollView {
                ContentUnavailableView(
                    "Account configuration missing",
                    systemImage: "person.crop.circle.badge.exclamationmark",
                    description: Text("Collector profile is saved on this device. Sign-in requires the Clerk key.")
                )
                .padding(.vertical, 48)
            }
        }
    }
}

private struct ConfiguredAccountView: View {
    @Environment(Clerk.self) private var clerk
    @Environment(\.brickValAccent) private var accent

    var body: some View {
        Group {
            if clerk.user == nil {
                signedOutAccountView
            } else {
                signedInAccountView
            }
        }
    }

    private var signedOutAccountView: some View {
        ClerkAccountContentView()
            .clerkAppIconView {
                Image("OnboardingLogo")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 76, height: 76)
                    .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
                    .accessibilityLabel("BrickValue")
            }
            .environment(\.clerkTheme, authTheme)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var signedInAccountView: some View {
        ScrollView {
            VStack(spacing: 0) {
                CollectorProfileEditorView()
                    .padding(.horizontal, BrickValStyle.Primitive.space20)
                    .padding(.top, BrickValStyle.Primitive.space16)
                    .padding(.bottom, BrickValStyle.Primitive.space24)

                Divider()

                ClerkAccountContentView()
                    .padding(.top, BrickValStyle.Primitive.space8)
            }
        }
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
