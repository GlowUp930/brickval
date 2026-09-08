import SwiftUI
import UIKit

struct BulkProcessingOverlayView: View {
    let imageData: Data?
    let regions: [NormalizedBoundingBox]
    let phase: ScanPhase
    let source: BulkScanSource
    let completed: Int
    let total: Int

    @Environment(\.brickValAccent) private var accent
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var image: UIImage?
    @State private var showsAverageExplanation = false

    var body: some View {
        GeometryReader { proxy in
            let statusWidth = max(proxy.size.width - 28, 44)

            ZStack(alignment: .topLeading) {
                if let image {
                    let imageRect = BulkImageLayout.aspectFitRect(
                        imageSize: image.size,
                        containerSize: proxy.size
                    )
                    Image(uiImage: image)
                        .resizable()
                        .frame(width: imageRect.width, height: imageRect.height)
                        .position(x: imageRect.midX, y: imageRect.midY)
                    BulkFocusOverlay(
                        regions: regions.enumerated().map { index, box in
                            BulkFocusRegion(id: "processing-\(index)", box: box, number: index + 1, state: .active)
                        },
                        imageRect: imageRect,
                        containerSize: proxy.size,
                        accent: accent
                    )
                } else {
                    Color.black
                }

                VStack(alignment: .leading, spacing: 4) {
                    Label(title, systemImage: phase == .capturing ? "viewfinder" : "tag")
                        .font(.headline.weight(.bold))
                        .fixedSize(horizontal: false, vertical: true)
                        .layoutPriority(1)
                        .accessibilityIdentifier("scanner.bulkProcessing.title")
                    Text(subtitle)
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.72))
                        .fixedSize(horizontal: false, vertical: true)
                        .accessibilityIdentifier("scanner.bulkProcessing.subtitle")
                }
                .foregroundStyle(.white)
                .padding(.horizontal, 14)
                .padding(.vertical, 11)
                .frame(width: statusWidth, alignment: .leading)
                .background(.black.opacity(0.74), in: .rect(cornerRadius: 16))
                .padding(14)
                .accessibilityElement(children: .combine)
                .accessibilityLabel("\(title). \(subtitle)")
                .accessibilityIdentifier("scanner.bulkProcessing.status")
            }
            .background(.black)
            .clipShape(.rect(cornerRadius: 24))
        }
        .task(id: imageData) {
            image = imageData.flatMap(UIImage.init(data:))
        }
        .task(id: phase) {
            showsAverageExplanation = false
            guard phase == .identifying else { return }
            do {
                try await Task.sleep(for: .milliseconds(1_500))
            } catch {
                return
            }
            guard !Task.isCancelled else { return }
            withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.2)) {
                showsAverageExplanation = true
            }
        }
        .transition(reduceMotion ? .identity : .opacity)
    }

    private var title: String {
        if showsAverageExplanation, phase == .identifying {
            return BrickValLocalization.localized("Calculating average prices")
        }
        return phase == .capturing ? BrickValLocalization.localized("Finding minifigures") : BrickValLocalization.localized("Checking sold prices")
    }

    private var subtitle: String {
        if phase == .capturing {
            return source == .photoLibrary
                ? BrickValLocalization.localized("Mapping every figure in your photo")
                : BrickValLocalization.localized("Freezing your lot and its detected figures")
        }
        if total > 0 {
            return BrickValLocalization.localized("Comparing \(completed) of \(total) detected figure")
        }
        if regions.isEmpty {
            return BrickValLocalization.localized("Comparing matches and market values")
        }
        return BrickValLocalization.localized("Comparing \(regions.count) detected figure")
    }

}
