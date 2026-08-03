import SwiftUI

struct CollectionRowView: View {
    @Environment(\.colorScheme) private var colorScheme

    let item: CollectionDisplayItem

    var body: some View {
        VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space8) {
            productImageBox

            Text(item.name)
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(BrickValStyle.Semantic.textPrimary)
                .lineLimit(2)
                .frame(minHeight: 38, alignment: .topLeading)
            Text("\(item.setNumber) · \(item.quantity) owned")
                .font(.system(size: 12))
                .foregroundStyle(BrickValStyle.Semantic.textSecondary)
                .lineLimit(1)
            Text(item.totalValue, format: .currency(code: "USD"))
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(BrickValStyle.Semantic.textPrimary)
                .monospacedDigit()
        }
        .padding(.bottom, BrickValStyle.Primitive.space8)
        .contentShape(.rect)
        .accessibilityElement(children: .combine)
    }

    private var productImageBox: some View {
        ZStack {
            RoundedRectangle(cornerRadius: BrickValStyle.CollectionLayout.cardRadius)
                .fill(productPlateFill)
                .shadow(color: BrickValStyle.Primitive.black.opacity(colorScheme == .dark ? 0.26 : 0.08), radius: 12, y: 5)

            AsyncImage(url: item.imageURL) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .scaledToFit()
                        .padding(BrickValStyle.Primitive.space12)
                case .failure:
                    Image(systemName: "shippingbox")
                        .font(.system(size: 30, weight: .light))
                        .foregroundStyle(BrickValStyle.Semantic.textSecondary)
                case .empty:
                    SkeletonPlaceholder(
                        cornerRadius: 8,
                        fill: BrickValStyle.Primitive.gray200,
                        highlight: BrickValStyle.Primitive.white
                    )
                    .frame(width: 72, height: 72)
                @unknown default:
                    EmptyView()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .frame(maxWidth: .infinity)
        .frame(height: BrickValStyle.CollectionLayout.productImageHeight)
        .clipShape(RoundedRectangle(cornerRadius: BrickValStyle.CollectionLayout.cardRadius))
        .overlay {
            RoundedRectangle(cornerRadius: BrickValStyle.CollectionLayout.cardRadius)
                .stroke(productPlateBorder, lineWidth: colorScheme == .dark ? 1.5 : 1)
        }
        .overlay(alignment: .topTrailing) {
            if item.quantity > 1 {
                Text("x\(item.quantity)")
                    .font(.system(size: 11, weight: .bold))
                    .monospacedDigit()
                    .padding(.horizontal, 7)
                    .padding(.vertical, 4)
                    .background(BrickValStyle.Semantic.textPrimary, in: .capsule)
                    .foregroundStyle(BrickValStyle.Semantic.canvas)
                    .padding(8)
            }
        }
    }

    private var productPlateFill: Color {
        colorScheme == .dark ? BrickValStyle.Primitive.white.opacity(0.96) : BrickValStyle.Primitive.white
    }

    private var productPlateBorder: Color {
        colorScheme == .dark ? BrickValStyle.Primitive.white.opacity(0.18) : BrickValStyle.Primitive.gray200
    }
}
