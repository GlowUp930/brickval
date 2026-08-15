import SwiftUI

struct OfferCodeRedemptionStatusView: View {
    let state: OfferCodeRedemptionState
    let onCheckAccess: () -> Void

    var body: some View {
        switch state {
        case .idle, .presenting:
            EmptyView()
        case .confirming:
            HStack(spacing: 8) {
                ProgressView()
                    .controlSize(.small)
                Text("Checking your Pro access...")
            }
            .font(.footnote)
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity, alignment: .leading)
        case .failed(let message):
            VStack(alignment: .leading, spacing: 8) {
                Text(message)
                    .font(.footnote)
                    .foregroundStyle(.secondary)

                Button("Check access", action: onCheckAccess)
                    .font(.subheadline.weight(.semibold))
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}
