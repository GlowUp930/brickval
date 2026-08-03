import SwiftUI

struct CollectionLoadingView: View {
    private let gridColumns = [
        GridItem(.flexible(), spacing: BrickValStyle.CollectionLayout.gridGap),
        GridItem(.flexible(), spacing: BrickValStyle.CollectionLayout.gridGap),
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            summarySkeleton
                .padding(.top, BrickValStyle.CollectionLayout.heroTop)

            SkeletonPlaceholder(cornerRadius: BrickValStyle.CollectionLayout.cardRadius)
                .frame(maxWidth: .infinity)
                .frame(height: BrickValStyle.CollectionLayout.chartHeight)
                .padding(.top, BrickValStyle.CollectionLayout.chartTop)

            HStack {
                SkeletonPlaceholder(cornerRadius: 5)
                    .frame(width: 104, height: 22)
                Spacer()
                SkeletonPlaceholder(cornerRadius: 5)
                    .frame(width: 76, height: 18)
            }
            .padding(.top, BrickValStyle.CollectionLayout.sectionTop)

            LazyVGrid(columns: gridColumns, alignment: .leading, spacing: BrickValStyle.Primitive.space16) {
                ForEach(0 ..< 4, id: \.self) { _ in
                    CollectionRowLoadingView()
                }
            }
            .padding(.top, BrickValStyle.Primitive.space16)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Loading collection")
    }

    private var summarySkeleton: some View {
        VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space8) {
            SkeletonPlaceholder(cornerRadius: 4)
                .frame(width: 128, height: 12)
            SkeletonPlaceholder(cornerRadius: 6)
                .frame(width: 178, height: 42)
            HStack(spacing: BrickValStyle.Primitive.space8) {
                SkeletonPlaceholder(cornerRadius: 4)
                    .frame(width: 74, height: 16)
                SkeletonPlaceholder(cornerRadius: 4)
                    .frame(width: 82, height: 16)
                SkeletonPlaceholder(cornerRadius: 4)
                    .frame(width: 64, height: 16)
            }
        }
    }
}

private struct CollectionRowLoadingView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space8) {
            SkeletonPlaceholder(cornerRadius: BrickValStyle.CollectionLayout.cardRadius)
                .frame(maxWidth: .infinity)
                .frame(height: BrickValStyle.CollectionLayout.productImageHeight)
            SkeletonPlaceholder(cornerRadius: 4)
                .frame(maxWidth: .infinity)
                .frame(height: 16)
            SkeletonPlaceholder(cornerRadius: 4)
                .frame(width: 112, height: 12)
            SkeletonPlaceholder(cornerRadius: 4)
                .frame(width: 70, height: 17)
        }
        .padding(.bottom, BrickValStyle.Primitive.space8)
        .accessibilityHidden(true)
    }
}
