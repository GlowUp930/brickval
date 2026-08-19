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

    var body: some View {
        GeometryReader { proxy in
            ZStack(alignment: .top) {
                if let image {
                    let imageRect = aspectFillRect(imageSize: image.size, containerSize: proxy.size)
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
                    Text(subtitle)
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.72))
                }
                .foregroundStyle(.white)
                .padding(.horizontal, 14)
                .padding(.vertical, 11)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(.black.opacity(0.74), in: .rect(cornerRadius: 16))
                .padding(14)
                .accessibilityElement(children: .combine)
                .accessibilityLabel("\(title). \(subtitle)")
            }
            .background(.black)
            .clipShape(.rect(cornerRadius: 24))
        }
        .task(id: imageData) {
            image = imageData.flatMap(UIImage.init(data:))
        }
        .transition(reduceMotion ? .opacity : .opacity.combined(with: .scale(scale: 0.985)))
    }

    private var title: String {
        phase == .capturing ? "Finding minifigures" : "Checking sold prices"
    }

    private var subtitle: String {
        if phase == .capturing {
            return source == .photoLibrary ? "Mapping every figure in your photo" : "Freezing your lot and its detected figures"
        }
        if total > 0 {
            return "Comparing \(completed) of \(total) detected figure\(total == 1 ? "" : "s")"
        }
        return regions.isEmpty ? "Comparing matches and market values" : "Comparing \(regions.count) detected figure\(regions.count == 1 ? "" : "s")"
    }

    private func aspectFillRect(imageSize: CGSize, containerSize: CGSize) -> CGRect {
        guard imageSize.width > 0, imageSize.height > 0 else { return CGRect(origin: .zero, size: containerSize) }
        let scale = max(containerSize.width / imageSize.width, containerSize.height / imageSize.height)
        let size = CGSize(width: imageSize.width * scale, height: imageSize.height * scale)
        return CGRect(
            x: (containerSize.width - size.width) / 2,
            y: (containerSize.height - size.height) / 2,
            width: size.width,
            height: size.height
        )
    }
}
