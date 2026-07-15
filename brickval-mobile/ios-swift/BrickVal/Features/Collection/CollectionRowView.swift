import SwiftUI

struct CollectionRowView: View {
    let item: CollectionItem

    var body: some View {
        HStack(spacing: 12) {
            AsyncImage(url: item.imageURL) { image in
                image.resizable().scaledToFit()
            } placeholder: {
                Image(systemName: "shippingbox")
                    .foregroundStyle(.secondary)
            }
            .frame(width: 64, height: 64)
            .background(.quaternary, in: .rect(cornerRadius: 12))

            VStack(alignment: .leading, spacing: 4) {
                Text(item.name).font(.headline).lineLimit(2)
                Text("\(item.setNumber) · \(item.condition.title)")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Text("Qty \(item.quantity)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Text(item.totalValue, format: .currency(code: "USD"))
                .bold()
        }
        .contentShape(.rect)
        .accessibilityElement(children: .combine)
    }
}
