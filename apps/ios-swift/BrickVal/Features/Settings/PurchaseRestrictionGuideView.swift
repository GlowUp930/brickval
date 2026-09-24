import StoreKit
import SwiftUI

struct PurchaseRestrictionGuideContext: Identifiable {
    let id = UUID()
    let placement: String?
}

struct PurchaseRestrictionGuideView: View {
    @Environment(\.dismiss) private var dismiss
    let onRetry: () -> Void
    @State private var stillBlocked = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                Image(systemName: "lock.shield")
                    .font(.system(size: 30, weight: .semibold))
                    .foregroundStyle(BrickValStyle.Semantic.textPrimary)
                    .frame(width: 60, height: 60)
                    .background(BrickValStyle.Semantic.surfaceMuted, in: RoundedRectangle(cornerRadius: 16))
                    .accessibilityHidden(true)

                VStack(alignment: .leading, spacing: 8) {
                    Text("Let's check purchase settings")
                        .font(.title2.bold())
                        .foregroundStyle(BrickValStyle.Semantic.textPrimary)
                    Text("This iPhone isn't allowing in-app purchases right now. Screen Time may be the reason.")
                        .foregroundStyle(BrickValStyle.Semantic.textSecondary)
                }

                VStack(alignment: .leading, spacing: 16) {
                    step(1, "Open Settings", "On this iPhone, open Settings → Screen Time.")
                    step(2, "Find purchase restrictions", "Tap Content & Privacy Restrictions → iTunes & App Store Purchases.")
                    step(3, "Allow in-app purchases", "Tap In-app Purchases and choose Allow.")
                }

                Label("If this iPhone is managed by family, school, or work, ask the person who manages it to allow purchases.", systemImage: "person.2")
                    .font(.subheadline)
                    .foregroundStyle(BrickValStyle.Semantic.textSecondary)
                    .padding(16)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(BrickValStyle.Semantic.surfaceMuted, in: RoundedRectangle(cornerRadius: 12))

                if stillBlocked {
                    Text("Purchases are still blocked on this iPhone. Check the settings above, then try again.")
                        .font(.subheadline)
                        .foregroundStyle(BrickValStyle.Semantic.textPrimary)
                        .accessibilityAddTraits(.updatesFrequently)
                }
            }
            .padding(24)
        }
        .safeAreaInset(edge: .bottom) {
            VStack(spacing: 8) {
                Button("Check again") {
                    if AppStore.canMakePayments {
                        onRetry()
                        dismiss()
                    } else {
                        stillBlocked = true
                    }
                }
                .buttonStyle(.borderedProminent)
                .frame(maxWidth: .infinity, minHeight: 44)

                Button("Not now") { dismiss() }
                    .frame(maxWidth: .infinity, minHeight: 44)
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 12)
            .background(.regularMaterial)
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
    }

    private func step(_ number: Int, _ title: LocalizedStringKey, _ detail: LocalizedStringKey) -> some View {
        HStack(alignment: .top, spacing: 14) {
            Text(number.formatted())
                .font(.headline)
                .foregroundStyle(.white)
                .frame(width: 32, height: 32)
                .background(BrickValStyle.Primitive.gray900, in: Circle())
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(.headline)
                Text(detail).font(.subheadline).foregroundStyle(BrickValStyle.Semantic.textSecondary)
            }
        }
        .accessibilityElement(children: .combine)
    }
}
