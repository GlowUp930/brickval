import SwiftUI

struct BulkPriceTagsOverlay: View {
    let callouts: [BulkFocusCallout]
    let imageRect: CGRect
    let containerSize: CGSize
    let accent: Color
    let reservedRects: [CGRect]
    let accessibilitySize: Bool
    let focusedID: String?
    let onSelect: (String) -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var density: BulkPriceTagDensity {
        BulkPriceTagDensity.forResultCount(callouts.count, accessibilitySize: accessibilitySize)
    }

    private var placements: [BulkPriceTagPlacement] {
        let items = callouts.enumerated().map { index, callout in
            let box = imageBox(callout.box)
            return BulkPriceTagLayoutItem(
                id: callout.id,
                number: callout.number ?? index + 1,
                anchor: box.center,
                obstacle: box,
                text: callout.text,
                density: callout.id == focusedID ? .regular : density
            )
        }
        return BulkPriceTagPlacementPlanner.placements(
            for: items,
            in: imageRect.insetBy(dx: 8, dy: 8),
            reservedRects: reservedRects,
            minimumSpacing: 4
        )
    }

    var body: some View {
        let resolvedPlacements = placements
        let calloutByID = Dictionary(uniqueKeysWithValues: callouts.map { ($0.id, $0) })
        ZStack {
            ForEach(resolvedPlacements) { placement in
                Path { path in
                    path.move(to: placement.labelAnchor)
                    path.addLine(to: placement.anchor)
                }
                .stroke(
                    accent.opacity(placement.isCollapsed ? 0.36 : 0.48),
                    style: StrokeStyle(lineWidth: 1, dash: placement.isCollapsed ? [2, 2] : [])
                )
                .accessibilityHidden(true)
            }

            ForEach(resolvedPlacements) { placement in
                if let callout = calloutByID[placement.id] {
                    priceTag(callout, placement: placement)
                }
            }
        }
        .frame(width: containerSize.width, height: containerSize.height)
        .animation(
            reduceMotion ? nil : .timingCurve(0.25, 1.0, 0.5, 1.0, duration: 0.18),
            value: resolvedPlacements
        )
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Bulk scan prices")
        .accessibilityIdentifier("bulkResults.priceTags")
    }

    private func priceTag(_ callout: BulkFocusCallout, placement: BulkPriceTagPlacement) -> some View {
        let isFocused = callout.id == focusedID
        let spokenPrice = callout.accessibilityText ?? callout.text
        let displayText = placement.isCollapsed
            ? "\(placement.number)"
            : callout.text
        let foreground: Color = callout.isUnavailable || placement.isCollapsed ? .white : .black
        let background: Color = callout.isUnavailable
            ? .white.opacity(0.25)
            : placement.isCollapsed
                ? .black.opacity(0.84)
                : accent

        return Button {
            onSelect(callout.id)
        } label: {
            Text(displayText)
                .font(
                    .system(
                        size: placement.isCollapsed ? max(placement.density.fontSize, 10) : placement.density.fontSize,
                        weight: .bold,
                        design: .rounded
                    )
                    .monospacedDigit()
                )
                .foregroundStyle(foreground)
                .lineLimit(1)
                .minimumScaleFactor(0.62)
                .frame(width: placement.frame.width, height: placement.frame.height)
                .background(
                    background,
                    in: RoundedRectangle(cornerRadius: placement.frame.height / 2)
                )
                .overlay {
                    RoundedRectangle(cornerRadius: placement.frame.height / 2)
                        .stroke(isFocused ? .white : .white.opacity(0.22), lineWidth: isFocused ? 2 : 1)
                }
        }
        .buttonStyle(.plain)
        .frame(
            width: max(placement.frame.width, 44),
            height: max(placement.frame.height, 44)
        )
        .contentShape(Rectangle())
        .position(x: placement.frame.midX, y: placement.frame.midY)
        .accessibilityLabel(
            callout.isUnavailable
                ? "Figure \(placement.number), price unavailable"
                : "Figure \(placement.number), price \(spokenPrice)"
        )
        .accessibilityHint("Double tap to focus this figure's price")
        // Keep the established callout identifier so existing UI automation and
        // VoiceOver users retain the same target while the layout engine moves it.
        .accessibilityIdentifier("bulkResults.priceCallout.\(callout.id)")
        .transition(reduceMotion ? .opacity : .opacity.combined(with: .scale(scale: 0.92)))
    }

    private func imageBox(_ box: NormalizedBoundingBox) -> CGRect {
        CGRect(
            x: imageRect.minX + box.x * imageRect.width,
            y: imageRect.minY + box.y * imageRect.height,
            width: box.width * imageRect.width,
            height: box.height * imageRect.height
        )
    }
}

private extension CGRect {
    var center: CGPoint { CGPoint(x: midX, y: midY) }
}
