import SwiftUI
import UIKit

struct ProWelcomeView: View {
    @Environment(EntitlementStore.self) private var entitlements
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dismiss) private var dismiss
    @State private var heroVisible = false
    @State private var detailsVisible = false

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    BrickValStyle.Primitive.brandInk,
                    BrickValStyle.Primitive.black,
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space24) {
                    header
                    hero
                    unlockedFeatures
                        .opacity(detailsVisible ? 1 : 0)
                        .offset(y: reduceMotion || detailsVisible ? 0 : 16)
                }
                .padding(.horizontal, BrickValStyle.Primitive.space24)
                .padding(.top, BrickValStyle.Primitive.space16)
                .padding(.bottom, 120)
            }
        }
        .safeAreaInset(edge: .bottom) {
            Button("Start exploring", action: finish)
                .font(.headline.weight(.bold))
                .foregroundStyle(BrickValStyle.Primitive.black)
                .frame(maxWidth: .infinity, minHeight: 54)
                .background(BrickValStyle.Semantic.builderYellow, in: Capsule())
                .padding(.horizontal, BrickValStyle.Primitive.space24)
                .padding(.vertical, BrickValStyle.Primitive.space12)
                .background(.ultraThinMaterial)
        }
        .preferredColorScheme(.dark)
        .interactiveDismissDisabled()
        .task {
            await reveal()
        }
    }

    private var header: some View {
        HStack {
            ProBadge(state: .active, compact: false)
            Spacer()
            Button(action: finish) {
                Image(systemName: "xmark")
                    .font(.headline.weight(.semibold))
                    .foregroundStyle(BrickValStyle.Primitive.white)
                    .frame(width: 44, height: 44)
                    .background(BrickValStyle.Primitive.white.opacity(0.10), in: Circle())
            }
            .accessibilityLabel("Close Pro welcome")
        }
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space16) {
            VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space8) {
                Text("Welcome to\nBrickValue Pro")
                    .font(.system(.largeTitle, design: .rounded, weight: .black))
                    .foregroundStyle(BrickValStyle.Primitive.white)
                    .fixedSize(horizontal: false, vertical: true)
                Text("Your collection has more room, and every scanner is ready when you are.")
                    .font(.title3)
                    .foregroundStyle(BrickValStyle.Primitive.white.opacity(0.72))
                    .fixedSize(horizontal: false, vertical: true)
            }

            ZStack(alignment: .bottom) {
                RoundedRectangle(cornerRadius: 28, style: .continuous)
                    .fill(BrickValStyle.Semantic.builderYellow)
                    .frame(height: 148)
                    .overlay(alignment: .topTrailing) {
                        Text("PRO UNLOCKED")
                            .font(.caption.weight(.black))
                            .foregroundStyle(BrickValStyle.Primitive.black.opacity(0.62))
                            .padding(BrickValStyle.Primitive.space16)
                    }

                Image("AvatarClassicSpace")
                    .resizable()
                    .scaledToFit()
                    .frame(height: 204)
                    .offset(y: 4)
                    .accessibilityHidden(true)
            }
            .frame(maxWidth: .infinity)
        }
        .opacity(heroVisible ? 1 : 0)
        .scaleEffect(reduceMotion || heroVisible ? 1 : 0.96, anchor: .bottom)
        .offset(y: reduceMotion || heroVisible ? 0 : 24)
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.isHeader)
    }

    private var unlockedFeatures: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Now unlocked")
                .font(.title2.weight(.bold))
                .foregroundStyle(BrickValStyle.Primitive.white)
                .padding(.bottom, BrickValStyle.Primitive.space8)

            unlockedRow("Unlimited minifigure scans", icon: "viewfinder")
            Divider().overlay(BrickValStyle.Primitive.white.opacity(0.12))
            unlockedRow("Unlimited bulk scans", icon: "square.stack.3d.up")
            Divider().overlay(BrickValStyle.Primitive.white.opacity(0.12))
            unlockedRow("Unlimited collection items", icon: "shippingbox")
            Divider().overlay(BrickValStyle.Primitive.white.opacity(0.12))
            unlockedRow("Theme and accent controls", icon: "paintpalette")
        }
    }

    private func unlockedRow(_ title: String, icon: String) -> some View {
        Label {
            Text(title)
                .font(.body.weight(.semibold))
                .foregroundStyle(BrickValStyle.Primitive.white)
        } icon: {
            Image(systemName: icon)
                .font(.headline)
                .foregroundStyle(BrickValStyle.Semantic.builderYellow)
                .frame(width: 28)
        }
        .frame(maxWidth: .infinity, minHeight: 52, alignment: .leading)
        .accessibilityLabel("\(title), unlocked")
    }

    @MainActor
    private func reveal() async {
        if reduceMotion {
            heroVisible = true
            detailsVisible = true
            return
        }

        withAnimation(.timingCurve(0.16, 1, 0.3, 1, duration: 0.58)) {
            heroVisible = true
        }
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        try? await Task.sleep(for: .milliseconds(180))
        guard !Task.isCancelled else { return }
        withAnimation(.timingCurve(0.25, 1, 0.5, 1, duration: 0.42)) {
            detailsVisible = true
        }
    }

    private func finish() {
        entitlements.dismissProWelcome()
        dismiss()
    }
}
