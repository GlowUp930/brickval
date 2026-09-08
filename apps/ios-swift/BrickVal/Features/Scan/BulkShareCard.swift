import SwiftUI
import UIKit
import UniformTypeIdentifiers

struct BulkShareEntry: Identifiable {
    let id: String
    let identifier: String
    let name: String
    let price: Double
    let boundingBox: NormalizedBoundingBox?
}

@MainActor
struct BulkSharePayload: Identifiable {
    let id = UUID()
    let photo: UIImage
    let cropBox: NormalizedBoundingBox
    let entries: [BulkShareEntry]
    let conditionTitle: String
    let pricingSourceTitle: String
    let unresolvedCount: Int

    init(
        photo: UIImage,
        cropBox: NormalizedBoundingBox,
        entries: [BulkShareEntry],
        conditionTitle: String = BrickValLocalization.localized("Used"),
        pricingSourceTitle: String = BrickValLocalization.localized("Average sold price"),
        unresolvedCount: Int = 0
    ) {
        self.photo = photo
        self.cropBox = cropBox
        self.entries = entries
        self.conditionTitle = conditionTitle
        self.pricingSourceTitle = pricingSourceTitle
        self.unresolvedCount = unresolvedCount
    }

    var total: Double {
        entries.reduce(0) { $0 + $1.price }
    }

    var topFind: BulkShareEntry? {
        entries.max { $0.price < $1.price }
    }
}

struct BulkShareImage: Transferable {
    let data: Data

    static var transferRepresentation: some TransferRepresentation {
        DataRepresentation(exportedContentType: .jpeg) { image in
            image.data
        }
    }
}

enum BulkShareCropper {
    static func cropBox(
        for boxes: [NormalizedBoundingBox],
        context: Double = 0.14
    ) -> NormalizedBoundingBox {
        guard let first = boxes.first else {
            return NormalizedBoundingBox(x: 0, y: 0, width: 1, height: 1)
        }

        let union = boxes.dropFirst().reduce(first.clamped) { current, box in
            let next = box.clamped
            let minX = min(current.x, next.x)
            let minY = min(current.y, next.y)
            let maxX = max(current.x + current.width, next.x + next.width)
            let maxY = max(current.y + current.height, next.y + next.height)
            return NormalizedBoundingBox(
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY
            )
        }

        let minX = max(0, union.x - context)
        let minY = max(0, union.y - context)
        let maxX = min(1, union.x + union.width + context)
        let maxY = min(1, union.y + union.height + context)
        return NormalizedBoundingBox(
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        )
    }

    @MainActor
    static func crop(_ image: UIImage, to normalizedBox: NormalizedBoundingBox) -> UIImage? {
        let box = normalizedBox.clamped
        let imageSize = image.size
        guard imageSize.width > 0, imageSize.height > 0 else { return nil }

        let cropRect = CGRect(
            x: box.x * imageSize.width,
            y: box.y * imageSize.height,
            width: box.width * imageSize.width,
            height: box.height * imageSize.height
        ).integral
        guard cropRect.width > 1, cropRect.height > 1 else { return nil }

        let renderer = UIGraphicsImageRenderer(size: cropRect.size)
        return renderer.image { _ in
            image.draw(
                in: CGRect(
                    x: -cropRect.minX,
                    y: -cropRect.minY,
                    width: imageSize.width,
                    height: imageSize.height
                )
            )
        }
    }
}

struct BulkShareCardView: View {
    let payload: BulkSharePayload
    let displayCurrency: BrickValCurrency
    let conversionRate: Double
    let rateAsOf: String?

    private let accent = Color(red: 0.0, green: 0.78, blue: 0.02)
    private let canvas = Color(red: 0.035, green: 0.035, blue: 0.04)

    init(
        payload: BulkSharePayload,
        displayCurrency: BrickValCurrency = .usd,
        conversionRate: Double = 1,
        rateAsOf: String? = nil
    ) {
        self.payload = payload
        self.displayCurrency = displayCurrency
        self.conversionRate = conversionRate > 0 ? conversionRate : 1
        self.rateAsOf = rateAsOf
    }

    var body: some View {
        GeometryReader { proxy in
            VStack(spacing: 0) {
                photoPanel(size: proxy.size)
                valuePanel
            }
            .background(canvas)
            .clipShape(.rect(cornerRadius: 28))
        }
        .aspectRatio(9.0 / 16.0, contentMode: .fit)
    }

    private func photoPanel(size: CGSize) -> some View {
        GeometryReader { proxy in
            ZStack(alignment: .topLeading) {
                Image(uiImage: payload.photo)
                    .resizable()
                    .scaledToFill()
                    .frame(width: proxy.size.width, height: proxy.size.height)
                    .clipped()

                LinearGradient(
                    colors: [.black.opacity(0.52), .clear, .black.opacity(0.1)],
                    startPoint: .top,
                    endPoint: .bottom
                )

                HStack(spacing: 8) {
                    Image("LaunchLogo")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 30, height: 30)
                        .clipShape(.rect(cornerRadius: 8))
                    Text("BrickValue")
                        .font(.system(size: 20, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                }
                .padding(18)

                ForEach(payload.entries) { entry in
                    if let box = relativeBox(for: entry.boundingBox) {
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(accent, lineWidth: 2)
                            .frame(
                                width: proxy.size.width * box.width,
                                height: proxy.size.height * box.height
                            )
                            .position(
                                x: proxy.size.width * (box.x + box.width / 2),
                                y: proxy.size.height * (box.y + box.height / 2)
                            )
                        Text(formattedAmount(entry.price))
                            .font(.system(size: 13, weight: .bold, design: .rounded))
                            .foregroundStyle(.black)
                            .padding(.horizontal, 10)
                            .frame(minHeight: 28)
                            .background(accent, in: .capsule)
                            .position(
                                x: proxy.size.width * (box.x + box.width / 2),
                                y: max(30, proxy.size.height * box.y + 18)
                            )
                    }
                }
            }
        }
        .frame(height: size.width * 0.82)
        .clipped()
    }

    private var valuePanel: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("BULK SCAN REVEAL")
                .font(.system(size: 12, weight: .bold, design: .rounded))
                .tracking(1.4)
                .foregroundStyle(accent)

            Text("Your minifigures are worth")
                .font(.system(size: 20, weight: .semibold, design: .rounded))
                .foregroundStyle(.white.opacity(0.82))

            Text(formatted(payload.total))
                .font(.system(size: 46, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
                .minimumScaleFactor(0.75)

            if displayCurrency != .usd {
                HStack(spacing: 4) {
                    Text("Converted from USD")
                    if let rateAsOf {
                        Text("·")
                        Text(rateAsOf)
                    }
                }
                .font(.system(size: 11, weight: .medium, design: .rounded))
                .foregroundStyle(.white.opacity(0.52))
                .lineLimit(1)
                .minimumScaleFactor(0.72)
            }

            HStack {
                Text("\(payload.entries.count) minifigures")
                Spacer()
                if let topFind = payload.topFind {
                    Text(topFindLabel(topFind))
                        .lineLimit(1)
                        .minimumScaleFactor(0.72)
                }
            }
            .font(.system(size: 14, weight: .medium, design: .rounded))
            .foregroundStyle(.white.opacity(0.58))

            HStack(spacing: 8) {
                Text(payload.conditionTitle)
                Text("·")
                Text(payload.pricingSourceTitle)
                if payload.unresolvedCount > 0 {
                    Text("·")
                    Text("\(payload.unresolvedCount) unresolved")
                }
            }
            .font(.system(size: 11, weight: .medium, design: .rounded))
            .foregroundStyle(.white.opacity(0.52))
            .lineLimit(2)

            Divider()
                .overlay(.white.opacity(0.16))

            HStack {
                Text("\(payload.conditionTitle) value · \(payload.pricingSourceTitle)")
                Spacer()
                Text("Scan yours with BrickValue")
            }
            .font(.system(size: 11, weight: .medium, design: .rounded))
            .foregroundStyle(.white.opacity(0.46))
        }
        .padding(24)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(canvas)
    }

    private func relativeBox(for box: NormalizedBoundingBox?) -> NormalizedBoundingBox? {
        guard let box else { return nil }
        let crop = payload.cropBox
        guard crop.width > 0, crop.height > 0 else { return nil }
        return NormalizedBoundingBox(
            x: (box.x - crop.x) / crop.width,
            y: (box.y - crop.y) / crop.height,
            width: box.width / crop.width,
            height: box.height / crop.height
        ).clamped
    }

    private func topFindLabel(_ entry: BulkShareEntry) -> String {
        let price = formatted(entry.price)
        return BrickValLocalization.localized("Top find \(entry.name) · \(price)")
    }

    private func formatted(_ usdValue: Double) -> String {
        "\(formattedAmount(usdValue)) · \(displayCurrency.code)"
    }

    private func formattedAmount(_ usdValue: Double) -> String {
        (usdValue * conversionRate).formatted(
            .currency(code: displayCurrency.code).locale(BrickValLocalization.effectiveLanguage.locale)
        )
    }
}

@MainActor
struct BulkSharePreviewView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(PreferencesStore.self) private var preferences
    @Environment(CurrencyStore.self) private var currency

    let payload: BulkSharePayload
    @State private var renderedData: Data?
    @State private var renderedImage: UIImage?
    @State private var isRendering = true

    init(payload: BulkSharePayload) {
        self.payload = payload
        _renderedData = State(initialValue: nil)
        _renderedImage = State(initialValue: nil)
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 18) {
                Text("Share your bulk scan")
                    .font(.title2.bold())
                    .frame(maxWidth: .infinity, alignment: .leading)

                Text("A preview is ready. Your photo stays on this device until you choose to share it.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)

                Group {
                    if isRendering {
                        ProgressView("Preparing share card…")
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else {
                        BulkShareCardView(
                            payload: payload,
                            displayCurrency: currency.displayCurrency(for: preferences.effectiveCurrency),
                            conversionRate: currency.rate(for: preferences.effectiveCurrency) ?? 1,
                            rateAsOf: currency.formattedRateDate(locale: BrickValLocalization.effectiveLanguage.locale)
                        )
                            .frame(maxHeight: .infinity)
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)

                if let renderedData, let renderedImage {
                    ShareLink(
                        item: BulkShareImage(data: renderedData),
                        preview: SharePreview(
                            "BrickValue bulk scan",
                            image: Image(uiImage: renderedImage)
                        )
                    ) {
                        Label("Share result", systemImage: "square.and.arrow.up")
                            .font(.headline)
                            .frame(maxWidth: .infinity, minHeight: 54)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.green)
                    .foregroundStyle(.black)
                    .accessibilityHint("Shares the preview as a static image")
                }
            }
            .padding(20)
            .navigationTitle("Share")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .task {
                await renderCard()
            }
        }
    }

    private func renderCard() async {
        let renderer = ImageRenderer(
            content: BulkShareCardView(
                payload: payload,
                displayCurrency: currency.displayCurrency(for: preferences.effectiveCurrency),
                conversionRate: currency.rate(for: preferences.effectiveCurrency) ?? 1,
                rateAsOf: currency.formattedRateDate(locale: BrickValLocalization.effectiveLanguage.locale)
            )
                .frame(width: 360, height: 640)
        )
        renderer.scale = 3
        let image = renderer.uiImage
        renderedImage = image
        renderedData = image?.jpegData(compressionQuality: 0.9)
        isRendering = false
    }
}
