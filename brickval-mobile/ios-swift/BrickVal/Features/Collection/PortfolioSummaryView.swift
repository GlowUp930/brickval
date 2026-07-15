import SwiftUI

struct PortfolioSummaryView: View {
    let value: Double
    let itemCount: Int
    let quantity: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Portfolio value")
                .font(.headline)
                .foregroundStyle(.secondary)
            Text(value, format: .currency(code: "USD").precision(.fractionLength(2)))
                .font(.system(.largeTitle, design: .rounded).bold())
                .contentTransition(.numericText(value: value))
            HStack {
                LabeledContent("Saved items", value: itemCount, format: .number)
                Divider()
                LabeledContent("Total quantity", value: quantity, format: .number)
            }
            .font(.subheadline)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .brickValCard()
    }
}
