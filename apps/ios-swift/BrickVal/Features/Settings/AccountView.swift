import ClerkKit
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
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.brickValAccent) private var accent

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                VStack(spacing: 0) {
                    if clerk.user != nil {
                        CollectorProfileEditorView()
                            .padding(.horizontal, BrickValStyle.Primitive.space20)
                            .padding(.top, BrickValStyle.Primitive.space16)
                            .padding(.bottom, BrickValStyle.Primitive.space24)
                    } else {
                        signedOutProfilePrompt(proxy: proxy)
                            .padding(.horizontal, BrickValStyle.Primitive.space20)
                            .padding(.top, BrickValStyle.Primitive.space16)
                            .padding(.bottom, BrickValStyle.Primitive.space24)
                    }

                    Divider()

                    ClerkAccountContentView()
                        .padding(.top, BrickValStyle.Primitive.space8)
                        .id(AccountSection.signIn.rawValue)
                }
            }
        }
    }

    private func signedOutProfilePrompt(proxy: ScrollViewProxy) -> some View {
        VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space16) {
            HStack(alignment: .top, spacing: BrickValStyle.Primitive.space12) {
                Image(systemName: "lock.circle.fill")
                    .font(.title2)
                    .foregroundStyle(accent)
                    .frame(width: 42, height: 42)
                    .background(accent.opacity(0.12), in: RoundedRectangle(cornerRadius: 12))

                VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space4) {
                    Text("Sign in to personalize")
                        .font(.headline)
                        .foregroundStyle(BrickValStyle.Semantic.textPrimary)
                    Text("Your default icon is available now. Sign in to choose your collector icon and background.")
                        .font(.subheadline)
                        .foregroundStyle(BrickValStyle.Semantic.textSecondary)
                }
            }

            HStack(spacing: BrickValStyle.Primitive.space12) {
                Image("AvatarClassic")
                    .resizable()
                    .scaledToFit()
                    .padding(10)
                    .frame(width: 72, height: 72)
                    .background(BrickValStyle.Primitive.gray200, in: RoundedRectangle(cornerRadius: 16))
                    .overlay {
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(BrickValStyle.Semantic.divider, lineWidth: 1)
                    }

                VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space4) {
                    Text("Classic")
                        .font(.headline)
                        .foregroundStyle(BrickValStyle.Semantic.textPrimary)
                    Text("Default collector icon")
                        .font(.caption)
                        .foregroundStyle(BrickValStyle.Semantic.textSecondary)
                }

                Spacer(minLength: BrickValStyle.Primitive.space8)
            }
            .accessibilityElement(children: .combine)
            .accessibilityLabel("Classic default collector icon")

            Button {
                withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.25)) {
                    proxy.scrollTo(AccountSection.signIn.rawValue, anchor: .top)
                }
            } label: {
                Label("Sign in", systemImage: "person.crop.circle.badge.plus")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(accent)
            .accessibilityHint("Opens the sign-in form")
        }
        .padding(BrickValStyle.Primitive.space16)
        .background(BrickValStyle.Semantic.surfaceMuted, in: RoundedRectangle(cornerRadius: 20))
        .overlay {
            RoundedRectangle(cornerRadius: 20)
                .stroke(BrickValStyle.Semantic.divider.opacity(0.45), lineWidth: 1)
        }
        .accessibilityElement(children: .contain)
    }

    private enum AccountSection: String {
        case signIn
    }
}
