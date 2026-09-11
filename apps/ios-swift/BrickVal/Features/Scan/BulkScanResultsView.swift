import SwiftUI
import OSLog

enum BulkRecoveryLayout {
    static let candidateRowHeight: Double = 176
    static let candidateCardWidth: Double = 124
    static let candidateCardHeight: Double = 124
}

enum BulkRecoveryTapPlanner {
    static func focusBox(for normalizedPoint: CGPoint) -> NormalizedBoundingBox {
        let x = min(max(normalizedPoint.x, 0), 1)
        let y = min(max(normalizedPoint.y, 0), 1)
        return NormalizedBoundingBox(
            x: min(max(x - 0.08, 0), 0.84),
            y: min(max(y - 0.12, 0), 0.76),
            width: 0.16,
            height: 0.24
        )
    }

    static func recognitionBox(
        for normalizedPoint: CGPoint,
        referenceBox: NormalizedBoundingBox?,
        fallbackSize: CGSize = CGSize(width: 0.16, height: 0.24)
    ) -> NormalizedBoundingBox {
        guard let referenceBox, referenceBox.width > 0, referenceBox.height > 0 else {
            let width = min(max(fallbackSize.width, 0.12), 0.24)
            let height = min(max(fallbackSize.height, 0.18), 0.34)
            let x = min(max(normalizedPoint.x - width / 2, 0), 1 - width)
            let y = min(max(normalizedPoint.y - height / 2, 0), 1 - height)
            return NormalizedBoundingBox(x: x, y: y, width: width, height: height)
        }
        let width = min(max(referenceBox.width * 1.15, 0.12), 0.24)
        let height = min(max(referenceBox.height * 1.15, 0.18), 0.34)
        let x = min(max(normalizedPoint.x - width / 2, 0), 1 - width)
        let y = min(max(normalizedPoint.y - height / 2, 0), 1 - height)
        return NormalizedBoundingBox(x: x, y: y, width: width, height: height)
    }
}

private enum BulkResultsPresentationPhase {
    case compactIntro
    case immersiveReveal
    case returningToReview
    case completedReview
}

@MainActor
struct BulkScanResultsView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(CollectionStore.self) private var collection
    @Environment(EntitlementStore.self) private var entitlements
    @Environment(MonetizationStore.self) private var monetization
    @Environment(\.appSDKCoordinator) private var coordinator
    @Environment(\.brickValAccent) private var accent
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
    @Environment(PreferencesStore.self) private var preferences
    @Environment(CurrencyStore.self) private var currency

    @Namespace private var photoStageNamespace

    let presentation: BulkScanPresentation
    let store: ScanStore

    @State private var itemStates: [BulkScanItemState]
    @State private var unresolvedRegions: [NormalizedBoundingBox]
    @State private var focusedResultID: String?
    @State private var focusedPriceCalloutID: String?
    @State private var selectedMatchTarget: BulkMatchTarget?
    @State private var correctionRequestID = 0
    @State private var retriedRegionIDs: Set<String> = []
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var revealSession: BulkRevealSession
    @State private var presentationPhase: BulkResultsPresentationPhase = .compactIntro
    @State private var revealStage: BulkRevealVisualStage = .scanning
    @State private var jackpotTotal = 0.0
    @State private var jackpotTopFindID: String?
    @State private var displayedRevealTotal = 0.0
    @State private var displayedPricedCount = 0
    @State private var valueTransferEntryID: String?
    @State private var valueTransferValue: Double?
    @State private var totalUpdateKey: String?
    @State private var reviewInteractionReady = false
    @State private var didPlayRevealSound = false
    @State private var revealHapticTrigger = 0
    @State private var sharePayload: BulkSharePayload?
    @State private var isPreviewOfferVisible = false
    @State private var showReferral = false

    let preview: UIImage?
    @State private var capturedImage: UIImage?
    private let canvas = BrickValStyle.ScanResult.canvas

    private static let correctionLogger = Logger(
        subsystem: "com.brickval.app",
        category: "BulkMatchCorrection"
    )

    init(presentation: BulkScanPresentation, store: ScanStore, preview: UIImage? = nil) {
        self.presentation = presentation
        self.store = store
        self.preview = preview
        _capturedImage = State(initialValue: preview)
        _itemStates = State(initialValue: presentation.resolvedItems.map { BulkScanItemState(item: $0) })
        _unresolvedRegions = State(initialValue: presentation.unresolvedRegions)
        _revealSession = State(initialValue: BulkRevealSession(
            regions: presentation.regions,
            items: presentation.resolvedItems
        ))
    }

    private var imageData: Data { presentation.imageData }
    private var recoveryToken: String? { presentation.recoveryToken }

    var body: some View {
        ZStack {
            canvas.ignoresSafeArea()

            if presentation.accessMode == .lockedPreview {
                lockedPreviewLayout
                    .zIndex(1)
            } else {
                Group {
                    if dynamicTypeSize.isAccessibilitySize {
                        ScrollView { reviewLayout }
                    } else {
                        reviewLayout
                    }
                }
                    .opacity(isImmersiveReveal ? 0 : 1)
                    .allowsHitTesting(!isImmersiveReveal && reviewInteractionReady)
                    .accessibilityHidden(isImmersiveReveal || !reviewInteractionReady)
                    .zIndex(0)

                if isImmersiveReveal {
                    immersiveRevealStage
                        .transition(.opacity)
                        .zIndex(1)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .preferredColorScheme(.dark)
        .presentationDragIndicator(.hidden)
        .presentationBackground(canvas)
        .interactiveDismissDisabled(isSaving)
        .onDisappear {
            correctionRequestID += 1
            store.reset()
        }
        .task(id: "\(presentation.id.uuidString)-\(presentation.accessMode.rawValue)") {
            await runRevealProgressively()
        }
        .task(id: "\(presentation.id.uuidString)-preview-\(preview != nil)") {
            guard capturedImage == nil else { return }
            let image = await ScanPreviewPipeline.shared.image(for: presentation.imageData)
            guard !Task.isCancelled else { return }
            capturedImage = image
        }
        .task(id: presentation.id) {
            guard presentation.accessMode == .real else { return }
            await store.processBulkPresentation(presentation)
        }
        .onChange(of: presentation.revision) { _, _ in
            syncPresentation()
        }
        .onAppear {
            syncPresentation()
        }
        .sensoryFeedback(.selection, trigger: selectedCount)
        .sensoryFeedback(.success, trigger: revealHapticTrigger)
        .sheet(item: $selectedMatchTarget) { target in
            BulkMatchCorrectionSheet(
                target: target,
                accent: accent,
                onRetry: { await retryUnresolvedRegion(target.regionID) },
                onSelect: { candidate in
                    replaceMatch(for: target.regionID, with: candidate, candidates: target.candidates)
                },
                onNoneMatch: {
                    clearMatch(for: target.regionID, candidates: target.candidates)
                }
            )
        }
        .sheet(item: $sharePayload) { payload in
            BulkSharePreviewView(payload: payload)
        }
        .sheet(isPresented: $showReferral) {
            NavigationStack {
                ReferralView()
            }
        }
        .onChange(of: entitlements.isPro) { _, isPro in
            guard presentation.accessMode == .lockedPreview, isPro else { return }
            dismissPreviewForRescan()
        }
        .onChange(of: monetization.referralStatus) { _, status in
            guard presentation.accessMode == .lockedPreview,
                  (status?.bulkCreditsRemaining ?? 0) > 0
            else { return }
            dismissPreviewForRescan()
        }
        .alert("Could not add items", isPresented: errorBinding) {
            Button("OK", role: .cancel) { errorMessage = nil }
        } message: {
            Text(errorMessage ?? BrickValLocalization.localized("Something went wrong. Please try again in a moment."))
        }
    }

    private var reviewLayout: some View {
        VStack(spacing: 14) {
            header
            if let terminalError = presentation.terminalError {
                Label(terminalError, systemImage: "exclamationmark.triangle")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.orange)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                    .background(.orange.opacity(0.12), in: .rect(cornerRadius: 12))
            }
            if dynamicTypeSize.isAccessibilitySize {
                photoResults(immersive: true, showsAnalysis: false)
                    .frame(height: 300)
                summaryPill
                resultCarousel
            } else {
                reviewPhotoStage
                    .frame(maxWidth: .infinity, minHeight: 360, maxHeight: 620)
                    .layoutPriority(1)
            }
            actionButtons
        }
        .padding(.horizontal, 16)
        .padding(.top, 12)
        .padding(.bottom, 10)
    }

    private var immersiveRevealStage: some View {
        ZStack(alignment: .topTrailing) {
            immersivePhotoStage

            Button("Close", systemImage: "xmark", action: close)
                .labelStyle(.iconOnly)
                .font(.system(size: 22, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 46, height: 46)
                .background(BrickValStyle.ScanResult.surface.opacity(0.88), in: .circle)
                .overlay { Circle().stroke(BrickValStyle.ScanResult.border) }
                .padding(.top, 8)
                .padding(.trailing, 12)
                .safeAreaPadding(.top, 8)
                .disabled(isSaving)
                .accessibilityHint("Closes the bulk scan results")
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(.black)
    }

    private var lockedPreviewLayout: some View {
        ZStack(alignment: .topTrailing) {
            photoResults(immersive: true)

            VStack(spacing: 10) {
                Spacer(minLength: 0)
                if !isPreviewOfferVisible {
                    lockedPreviewProgress
                }
                lockedPreviewPlaceholderRail
                if isPreviewOfferVisible {
                    lockedPreviewOffer
                        .transition(reduceMotion ? .opacity : .move(edge: .bottom).combined(with: .opacity))
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            Button("Close", systemImage: "xmark", action: close)
                .labelStyle(.iconOnly)
                .font(.system(size: 22, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 46, height: 46)
                .background(BrickValStyle.ScanResult.surface.opacity(0.88), in: .circle)
                .overlay { Circle().stroke(BrickValStyle.ScanResult.border) }
                .padding(.top, 8)
                .padding(.trailing, 12)
                .safeAreaPadding(.top, 8)
                .disabled(isSaving)
                .accessibilityHint("Closes this preview without saving the photo")

        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(.black)
        .accessibilityIdentifier("bulkPreview.locked")
    }

    private var lockedPreviewProgress: some View {
        HStack(spacing: 8) {
            ProgressView()
                .tint(accent)
                .accessibilityHidden(true)
            Text(revealStatusTitle ?? BrickValLocalization.localized("Scanning"))
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
        .padding(.horizontal, 14)
        .frame(minHeight: 42)
        .background(.black.opacity(0.78), in: .capsule)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Bulk scan preview progress")
        .accessibilityValue(
            "\(revealSession.revealedCount) of \(presentation.regions.count) locked placeholders revealed"
        )
        .accessibilityIdentifier("bulkPreview.progress")
    }

    @ViewBuilder
    private var lockedPreviewPlaceholderRail: some View {
        let entries = Array(revealSession.revealedEntries)
        if !entries.isEmpty {
            ScrollView(.horizontal) {
                LazyHStack(spacing: 8) {
                    ForEach(entries) { entry in
                        lockedPreviewPlaceholderCard(entry)
                    }
                }
                .padding(.horizontal, 16)
            }
            .scrollIndicators(.hidden)
            .frame(height: 94)
            .animation(reduceMotion ? nil : .easeOut(duration: 0.18), value: revealSession.revealedCount)
            .accessibilityElement(children: .contain)
            .accessibilityLabel("Locked bulk scan results")
            .accessibilityValue(
                "\(entries.count) of \(presentation.regions.count) detected figures shown as placeholders"
            )
            .accessibilityIdentifier("bulkPreview.placeholderRail")
        }
    }

    private func lockedPreviewPlaceholderCard(_ entry: BulkRevealEntry) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 5) {
                Image(systemName: "lock.fill")
                    .font(.caption2.weight(.bold))
                Text("FIGURE \(entry.spatialNumber)")
                    .font(.caption2.weight(.bold).monospacedDigit())
            }
            .foregroundStyle(accent)

            VStack(alignment: .leading, spacing: 3) {
                Text("IDENTITY")
                    .font(.system(size: 8, weight: .bold))
                    .foregroundStyle(.white.opacity(0.56))
                RoundedRectangle(cornerRadius: 3)
                    .fill(.white.opacity(0.7))
                    .frame(width: 82, height: 7)
                    .blur(radius: 2.5)
                Text("PRICE")
                    .font(.system(size: 8, weight: .bold))
                    .foregroundStyle(.white.opacity(0.56))
                RoundedRectangle(cornerRadius: 3)
                    .fill(accent.opacity(0.82))
                    .frame(width: 54, height: 7)
                    .blur(radius: 2.5)
            }
        }
        .padding(10)
        .frame(width: 132, height: 86, alignment: .leading)
        .background(.black.opacity(0.86), in: .rect(cornerRadius: 14))
        .overlay {
            RoundedRectangle(cornerRadius: 14)
                .stroke(accent.opacity(0.42), lineWidth: 1)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Locked figure \(entry.spatialNumber) placeholder")
        .accessibilityValue("Identity and price hidden")
        .accessibilityIdentifier("bulkPreview.placeholderCard.\(entry.id)")
    }

    private var lockedPreviewOffer: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("\(presentation.regions.count) figures detected. Unlock identification and prices.")
                .font(.headline.weight(.semibold))
                .foregroundStyle(.white)
                .fixedSize(horizontal: false, vertical: true)

            Button {
                coordinator?.analytics.capture(PostHogEvent.bulkPreviewSubscribeTapped)
                let presented = coordinator?.presentProFeature(
                    placement: .bulkScanAttempt,
                    params: ["source": "locked_bulk_preview"]
                ) {
                    dismissPreviewForRescan()
                } ?? false
                if !presented {
                    errorMessage = BrickValLocalization.localized("Upgrade options are temporarily unavailable. Try again shortly.")
                }
            } label: {
                Text("Upgrade")
                    .font(.headline.weight(.bold))
                    .foregroundStyle(.black)
                    .frame(maxWidth: .infinity, minHeight: 52)
                    .background(accent, in: .capsule)
            }
            .buttonStyle(.plain)
            .accessibilityHint("Opens the BrickVal Pro subscription paywall")
            .accessibilityIdentifier("bulkPreview.upgrade")

            Button {
                coordinator?.analytics.capture(PostHogEvent.bulkPreviewReferralTapped)
                showReferral = true
            } label: {
                Label("Refer", systemImage: "person.2")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity, minHeight: 44)
            }
            .buttonStyle(.bordered)
            .tint(.white)
            .accessibilityHint("Opens Invite Friends to earn bulk scan credits")
            .accessibilityIdentifier("bulkPreview.refer")
        }
        .padding(16)
        .background {
            if reduceTransparency {
                RoundedRectangle(cornerRadius: 18)
                    .fill(BrickValStyle.ScanResult.surface)
            } else {
                RoundedRectangle(cornerRadius: 18)
                    .fill(.ultraThinMaterial)
            }
        }
        .overlay { RoundedRectangle(cornerRadius: 18).stroke(.white.opacity(0.18)) }
        .padding(.horizontal, 16)
        .safeAreaPadding(.bottom, 18)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("bulkPreview.unlockOffer")
    }

    @ViewBuilder
    private var reviewPhotoStage: some View {
        Group {
            if reduceMotion {
                photoResults(immersive: false, showsAnalysis: !isImmersiveReveal)
            } else {
                photoResults(immersive: false, showsAnalysis: !isImmersiveReveal)
                    .matchedGeometryEffect(id: "bulk-photo-stage", in: photoStageNamespace)
            }
        }
        .accessibilityHidden(isImmersiveReveal)
    }

    @ViewBuilder
    private var immersivePhotoStage: some View {
        if reduceMotion {
            photoResults(immersive: true)
        } else {
            photoResults(immersive: true)
                .matchedGeometryEffect(id: "bulk-photo-stage", in: photoStageNamespace)
        }
    }

    private var header: some View {
        HStack(spacing: 10) {
            Image("OnboardingLogo")
                .resizable()
                .scaledToFill()
                .frame(width: 34, height: 34)
                .clipShape(.rect(cornerRadius: 9))
                .accessibilityLabel("BrickValue app icon")
                .accessibilityIdentifier("bulkResults.appIcon")
            (dynamicTypeSize.isAccessibilitySize ? AnyLayout(VStackLayout(alignment: .leading, spacing: 4)) : AnyLayout(HStackLayout(spacing: 10))) {
                Text("BrickValue")
                    .font(.system(size: 20, weight: .bold))
                    .lineLimit(1)
                    .minimumScaleFactor(0.78)
                Text("Bulk scan")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(BrickValStyle.ScanResult.textSecondary)
                    .lineLimit(dynamicTypeSize.isAccessibilitySize ? nil : 1)
            }
            Spacer(minLength: 8)
            Button {
                sharePayload = makeSharePayload()
            } label: {
                Image(systemName: "square.and.arrow.up")
                    .font(.system(size: 22, weight: .bold))
            }
            .foregroundStyle(.white)
            .frame(width: 46, height: 46)
            .disabled(!revealComplete || selectedCount == 0 || isSaving)
            .opacity(!revealComplete || selectedCount == 0 ? 0.45 : 1)
            .accessibilityLabel("Share bulk scan result")
            .accessibilityHint("Creates a shareable value card with the scan photo")
            Button("Close", systemImage: "xmark", action: close)
                .labelStyle(.iconOnly)
                .font(.system(size: 22, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 46, height: 46)
                .background(BrickValStyle.ScanResult.surface, in: .circle)
                .overlay { Circle().stroke(BrickValStyle.ScanResult.border) }
                .disabled(isSaving)
        }
    }

    @ViewBuilder
    private func photoResults(immersive: Bool, showsAnalysis: Bool = true) -> some View {
        if let capturedImage {
            GeometryReader { proxy in
                let imageRect = BulkImageLayout.aspectFitRect(
                    imageSize: capturedImage.size,
                    containerSize: proxy.size
                )
                ZStack {
                    Image(uiImage: capturedImage)
                        .resizable()
                        .frame(width: imageRect.width, height: imageRect.height)
                        .position(x: imageRect.midX, y: imageRect.midY)
                        .accessibilityLabel(
                            presentation.accessMode == .lockedPreview
                                ? "Bulk scan photo with \(presentation.regions.count) detected minifigures; identification and prices are locked"
                                : "Bulk scan photo with \(itemStates.count) identified minifigures"
                        )

                    if !showsAnalysis {
                        EmptyView()
                    } else {
                        if presentationPhase == .compactIntro {
                            EmptyView()
                        } else if presentationPhase == .completedReview {
                            completedDetectionOverlays(imageRect: imageRect)
                            completedMatchHitTargets(
                                imageRect: imageRect,
                                containerSize: proxy.size,
                            )
                            BulkPriceTagsOverlay(
                                callouts: completedPriceCallouts,
                                imageRect: imageRect,
                                containerSize: proxy.size,
                                accent: accent,
                                reservedRects: completedPriceTagReservedRects(in: proxy.size),
                                accessibilitySize: dynamicTypeSize.isAccessibilitySize,
                                focusedID: focusedPriceCalloutID,
                                onSelect: focusPriceCallout
                            )
                        } else if presentation.accessMode == .lockedPreview {
                            BulkFocusOverlay(
                                regions: revealFocusRegions,
                                imageRect: imageRect,
                                containerSize: proxy.size,
                                accent: accent,
                                isScanning: revealStage == .scanning,
                                beamProgress: revealBeamProgress
                            )
                        } else {
                            BulkFocusOverlay(
                                regions: revealFocusRegions,
                                imageRect: imageRect,
                                containerSize: proxy.size,
                                accent: accent,
                                isScanning: revealStage == .scanning,
                                beamProgress: revealBeamProgress,
                                callout: revealCallout
                            )
                        }

                        if presentation.accessMode == .lockedPreview {
                            EmptyView()
                        } else if presentationPhase == .completedReview {
                            VStack(spacing: 0) {
                                summaryPill
                                    .padding(.top, 14)
                                Spacer(minLength: 0)
                                resultCarousel
                                    .padding(.bottom, 12)
                            }
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                        } else {
                            BulkRevealOverlay(
                                entries: revealSession.entries,
                                visibleCount: revealSession.revealedCount,
                                displayedTotal: displayedRevealTotal,
                                displayedPricedCount: displayedPricedCount,
                                currentStatus: revealStatusTitle,
                                condition: revealSession.condition,
                                stage: revealStage,
                                jackpotTotal: jackpotTotal,
                                topFind: revealSession.entries.first { $0.id == jackpotTopFindID },
                                imageRect: imageRect,
                                containerSize: proxy.size,
                                safeAreaInsets: proxy.safeAreaInsets,
                                transferEntry: valueTransferEntry,
                                transferValue: valueTransferValue,
                                totalUpdateKey: totalUpdateKey
                            )
                        }
                    }
                }
                .frame(width: proxy.size.width, height: proxy.size.height)
                .clipped()
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(.black)
            .clipShape(.rect(cornerRadius: immersive ? 0 : 18))
            .overlay {
                if !immersive {
                    RoundedRectangle(cornerRadius: 18)
                        .stroke(BrickValStyle.ScanResult.border)
                }
            }
        } else {
            ContentUnavailableView("Photo unavailable", systemImage: "photo.badge.exclamationmark")
                .frame(maxWidth: .infinity, minHeight: 360)
                .background(BrickValStyle.ScanResult.surface, in: .rect(cornerRadius: 18))
        }
    }

    @ViewBuilder
    private func completedDetectionOverlays(imageRect: CGRect) -> some View {
        ForEach(itemStates) { state in
            if let box = state.item.boundingBox {
                detectionBox(for: state.item, box: box, imageRect: imageRect)
            }
        }
        ForEach(unresolvedRegions.indices, id: \.self) { index in
            unresolvedDetectionBox(
                unresolvedRegions[index],
                imageRect: imageRect
            )
        }
    }

    @ViewBuilder
    private func completedMatchHitTargets(imageRect: CGRect, containerSize: CGSize) -> some View {
        ForEach(presentation.regions, id: \.regionId) { region in
            completedMatchHitTarget(
                region: region,
                imageRect: imageRect,
                containerSize: containerSize
            )
        }
    }

    private func completedMatchHitTarget(
        region: BulkScanRegion,
        imageRect: CGRect,
        containerSize: CGSize
    ) -> some View {
        let targetRect = imageBox(region.boundingBox, in: imageRect)
        let hitWidth = max(targetRect.width, 44)
        let hitHeight = max(targetRect.height, 44)
        let regionID = region.regionId
        return Button {
            openMatch(for: regionID)
        } label: {
            Color.clear
                .contentShape(Rectangle())
                .frame(width: hitWidth, height: hitHeight)
        }
        .buttonStyle(.plain)
        .position(
            x: min(max(targetRect.midX, hitWidth / 2), containerSize.width - hitWidth / 2),
            y: min(max(targetRect.midY, hitHeight / 2), containerSize.height - hitHeight / 2)
        )
        .accessibilityLabel(matchTargetLabel(for: regionID))
        .accessibilityHint("Opens possible matches for this figure")
        .accessibilityIdentifier("bulkMatch.region.\(regionID)")
    }

    private func completedPriceTagReservedRects(in size: CGSize) -> [CGRect] {
        let summaryHeight: CGFloat = 78
        let railHeight: CGFloat = dynamicTypeSize.isAccessibilitySize ? 370 : 150
        return [
            CGRect(x: 8, y: 8, width: max(0, size.width - 16), height: summaryHeight),
            CGRect(
                x: 0,
                y: max(0, size.height - railHeight),
                width: size.width,
                height: railHeight
            ),
        ]
    }

    private func focusPriceCallout(_ id: String) {
        focusedPriceCalloutID = id
        focusedResultID = id
    }

    private var summaryPill: some View {
        (dynamicTypeSize.isAccessibilitySize ? AnyLayout(VStackLayout(alignment: .leading, spacing: 10)) : AnyLayout(HStackLayout(spacing: 16))) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Lot value")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Color(white: 0.28))
                BrickValCurrencyText(selectedTotal)
                    .font(.title3.bold())
                    .foregroundStyle(Color(red: 0, green: 0.38, blue: 0.02))
                    .monospacedDigit()
            }

            Spacer(minLength: 8)

            Text("\(identifiedCount) identified")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Color(white: 0.28))
                .multilineTextAlignment(.trailing)
                .lineLimit(nil)
                .minimumScaleFactor(0.8)
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 10)
        .frame(minHeight: 64)
        .background(.white, in: .rect(cornerRadius: 24))
        .environment(\.colorScheme, .light)
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("bulkResults.summary")
        .accessibilityLabel("Identified value")
        .accessibilityValue("\(currency.formattedWithCode(selectedTotal, to: preferences.effectiveCurrency, locale: BrickValLocalization.effectiveLanguage.locale)), \(identifiedCount) identified")
    }

    private var resultCarousel: some View {
        ScrollViewReader { proxy in
            ScrollView(.horizontal) {
                LazyHStack(spacing: 8) {
                    ForEach($itemStates) { $state in
                        resultCard($state)
                            .id(state.id)
                    }
                    .padding(.horizontal, 12)
                }
            }
            .scrollIndicators(.hidden)
            .frame(height: dynamicTypeSize.isAccessibilitySize ? 350 : 124)
            .onChange(of: focusedResultID) { _, id in
                guard let id else { return }
                Task { @MainActor in
                    await Task.yield()
                    withAnimation(reduceMotion ? nil : .easeOut(duration: 0.24)) {
                        proxy.scrollTo(id, anchor: .leading)
                    }
                }
            }
        }
    }

    private func resultCard(_ state: Binding<BulkScanItemState>) -> some View {
        let item = state.wrappedValue.item
        let isSelected = state.wrappedValue.isSelected
        let condition = state.wrappedValue.condition
        let sourceTitle = MarketPriceSourceCopy.title(for: item.result.pricing.source(for: condition))
        let sourceDetail = MarketPriceSourceCopy.detail(for: item.result.pricing.source(for: condition))
        return HStack(spacing: 7) {
            Button {
                withAnimation(.easeOut(duration: 0.16)) {
                    state.wrappedValue.isSelected.toggle()
                }
            } label: {
                ZStack(alignment: .topTrailing) {
                    MinifigureThumbnail(
                        imageURL: item.result.imageURL,
                        identifier: item.result.identifier,
                        accent: accent
                    )
                    .frame(width: 48, height: 56)
                    .background(.white)
                    .clipShape(.rect(cornerRadius: 10))
                    .overlay {
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(isSelected ? accent : .white.opacity(0.45), lineWidth: 3)
                    }

                    Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                        .font(.title3.bold())
                        .symbolRenderingMode(.palette)
                        .foregroundStyle(.white, isSelected ? accent : .gray)
                        .offset(x: 6, y: -6)
                }
            }
            .buttonStyle(.plain)
            .accessibilityLabel(item.result.name)
            .accessibilityValue(isSelected ? "Selected" : "Not selected")
            .accessibilityHint("Double tap to toggle selection")

            VStack(alignment: .leading, spacing: 4) {
                Button {
                    openMatch(for: item.id)
                } label: {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(item.result.identifier)
                            .font(.caption2.bold())
                            .lineLimit(1)
                            .minimumScaleFactor(0.8)

                        Group {
                            if let price = price(for: item) {
                                BrickValCurrencyText(price, showsCurrencyCode: false)
                            } else {
                                Text("Price unavailable")
                            }
                        }
                        .font(.caption.bold().monospacedDigit())
                        .foregroundStyle(isSelected ? accent : .gray)

                        Text(sourceTitle)
                            .font(.caption2.weight(.medium))
                            .foregroundStyle(.white.opacity(0.62))
                            .lineLimit(dynamicTypeSize.isAccessibilitySize ? nil : 1)
                            .minimumScaleFactor(dynamicTypeSize.isAccessibilitySize ? 1 : 0.62)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .buttonStyle(.plain)
                .foregroundStyle(.white)
                .accessibilityLabel("Change match for \(item.result.name)")
                .accessibilityValue("\(sourceTitle). \(sourceDetail)")
                .accessibilityHint("Shows possible matches for this figure")

                conditionControl(state: state, selection: condition)
            }
            .foregroundStyle(.white)
        }
        .padding(8)
        .background(.black.opacity(0.72), in: .rect(cornerRadius: 12))
        .opacity(isSelected ? 1 : 0.72)
        .frame(width: dynamicTypeSize.isAccessibilitySize ? 300 : 154)
        .frame(minHeight: dynamicTypeSize.isAccessibilitySize ? 280 : 96)
    }

    private func conditionControl(state: Binding<BulkScanItemState>, selection: CollectionCondition) -> some View {
        HStack(spacing: 2) {
            conditionButton("New", condition: .newSealed, state: state, selection: selection)
            conditionButton("Used", condition: .used, state: state, selection: selection)
        }
        .padding(2)
        .background(BrickValStyle.ScanResult.surface, in: .capsule)
    }

    private func conditionButton(
        _ title: LocalizedStringResource,
        condition: CollectionCondition,
        state: Binding<BulkScanItemState>,
        selection: CollectionCondition
    ) -> some View {
        Button(title) {
            withAnimation(.easeOut(duration: 0.15)) { state.wrappedValue.condition = condition }
        }
        .font(.caption2.bold())
        .foregroundStyle(selection == condition ? .black : BrickValStyle.ScanResult.textSecondary)
        .frame(maxWidth: .infinity, minHeight: 44)
        .background(selection == condition ? accent : .clear, in: .capsule)
        .accessibilityLabel(BrickValLocalization.localized("\(BrickValLocalization.localized(title)) condition"))
        .accessibilityAddTraits(selection == condition ? .isSelected : [])
    }

    private func detectionBox(
        for item: BulkScanResultItem,
        box: NormalizedBoundingBox,
        imageRect: CGRect
    ) -> some View {
        let rect = imageBox(box, in: imageRect)
        let isSelected = itemStates.first { $0.id == item.id }?.isSelected ?? false
        return RoundedRectangle(cornerRadius: 10)
            .stroke(isSelected ? accent : .white.opacity(0.55), lineWidth: isSelected ? 2.5 : 1.5)
            .frame(width: rect.width, height: rect.height)
            .position(x: rect.midX, y: rect.midY)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }

    private func unresolvedDetectionBox(
        _ box: NormalizedBoundingBox,
        imageRect: CGRect
    ) -> some View {
        let rect = imageBox(box, in: imageRect)
        return ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 10)
                .stroke(
                    .white.opacity(0.62),
                    style: StrokeStyle(lineWidth: 1.5, dash: [5, 4])
                )
                .frame(width: rect.width, height: rect.height)

            Image(systemName: "questionmark")
                .font(.caption2.bold())
                .foregroundStyle(.black)
                .frame(width: 22, height: 22)
                .background(.white.opacity(0.86), in: .circle)
                .offset(x: min(max(0, rect.width / 2 - 11), max(0, rect.width - 22)), y: -11)
        }
        .frame(width: rect.width, height: rect.height, alignment: .topLeading)
        .position(x: rect.midX, y: rect.midY)
            .allowsHitTesting(false)
            .accessibilityHidden(true)
    }

    private func imageBox(_ box: NormalizedBoundingBox, in imageRect: CGRect) -> CGRect {
        CGRect(
            x: imageRect.minX + box.x * imageRect.width,
            y: imageRect.minY + box.y * imageRect.height,
            width: box.width * imageRect.width,
            height: box.height * imageRect.height
        )
    }

    private var actionButtons: some View {
        Button(action: saveSelected) {
            Label(
                isSaving ? "Adding…" : "Add \(selectedCount) to Collection",
                systemImage: isSaving ? "hourglass" : "plus.circle.fill"
            )
            .font(.headline)
            .multilineTextAlignment(.center)
            .fixedSize(horizontal: false, vertical: true)
            .padding(.horizontal, 12)
            .padding(.vertical, 12)
            .frame(maxWidth: .infinity, minHeight: 58)
            .background(accent, in: .rect(cornerRadius: 14))
            .foregroundStyle(.black)
        }
        .buttonStyle(.plain)
        .disabled(!revealComplete || selectedCount == 0 || isSaving)
        .opacity(!revealComplete || selectedCount == 0 ? 0.45 : 1)
    }

    private var revealComplete: Bool {
        revealSession.isComplete && presentation.isTerminal
    }

    private var isImmersiveReveal: Bool {
        presentationPhase == .immersiveReveal || presentationPhase == .returningToReview
    }

    private var presentationAnimation: Animation {
        .easeOut(duration: reduceMotion ? 0.18 : 0.45)
    }

    private var revealFocusRegions: [BulkFocusRegion] {
        revealSession.entries.map { entry in
            let state: BulkFocusState
            if revealStage == .scanning {
                state = reduceMotion ? .scanned : .pending
            } else if entry.isPreviewOnly {
                state = revealSession.revealedCount > entry.spatialNumber - 1 ||
                    revealSession.currentEntry?.id == entry.id
                    ? .preview
                    : .scanned
            } else if revealStage == .jackpot, entry.id == jackpotTopFindID {
                state = .topFind
            } else if entry.isUnresolved && revealSession.revealedCount > entry.spatialNumber - 1 {
                state = .unresolved
            } else if let currentEntry = revealSession.currentEntry, currentEntry.id == entry.id {
                state = .active
            } else if revealSession.revealedCount > entry.spatialNumber - 1 {
                state = .completed
            } else {
                state = .scanned
            }
            return BulkFocusRegion(
                id: entry.id,
                box: entry.boundingBox,
                number: entry.spatialNumber,
                state: state
            )
        }
    }

    private var revealBeamProgress: Double? {
        guard presentationPhase == .immersiveReveal,
              revealStage == .scanning,
              !reduceMotion
        else { return nil }
        return revealSession.beamProgress
    }

    private var revealCallout: BulkFocusCallout? {
        guard presentation.accessMode == .real,
              presentationPhase != .completedReview,
              revealStage == .waiting || revealStage == .presentingValue || revealStage == .transferringValue,
              let entry = revealSession.currentEntry,
              let box = entry.boundingBox
        else { return nil }

        let isLoading = !entry.isTerminal || entry.isLoading
        let price = entry.value(for: revealSession.condition)
        let visibleText = price.map {
            currency.formatted($0, to: preferences.effectiveCurrency, locale: BrickValLocalization.effectiveLanguage.locale)
        } ?? BrickValLocalization.localized("Price unavailable")
        let spokenText = price.map {
            currency.formattedWithCode($0, to: preferences.effectiveCurrency, locale: BrickValLocalization.effectiveLanguage.locale)
        }
        return BulkFocusCallout(
            id: entry.id,
            box: box,
            number: entry.spatialNumber,
            text: isLoading ? BrickValLocalization.localized("Checking price") : visibleText,
            accessibilityText: isLoading ? nil : spokenText,
            isLoading: isLoading,
            isUnavailable: price == nil
        )
    }

    private var completedPriceCallouts: [BulkFocusCallout] {
        revealSession.entries.compactMap { entry in
            guard entry.isResolved, let box = entry.boundingBox else { return nil }
            let price = entry.value(for: revealSession.condition)
            let visibleText = price.map {
                currency.formatted($0, to: preferences.effectiveCurrency, locale: BrickValLocalization.effectiveLanguage.locale)
            } ?? BrickValLocalization.localized("Price unavailable")
            let spokenText = price.map {
                currency.formattedWithCode($0, to: preferences.effectiveCurrency, locale: BrickValLocalization.effectiveLanguage.locale)
            }
            return BulkFocusCallout(
                id: entry.id,
                box: box,
                number: entry.spatialNumber,
                text: visibleText,
                accessibilityText: spokenText,
                isLoading: false,
                isUnavailable: price == nil
            )
        }
    }

    private var valueTransferEntry: BulkRevealEntry? {
        guard let valueTransferEntryID else { return nil }
        return revealSession.entries.first { $0.id == valueTransferEntryID }
    }

    private var revealStatusTitle: String? {
        if revealStage == .scanning {
            return presentation.accessMode == .lockedPreview
                ? BrickValLocalization.localized("\(presentation.regions.count) figures found")
                : BrickValLocalization.localized("Scanning your lot")
        }
        if presentation.accessMode == .lockedPreview {
            return isPreviewOfferVisible ? nil : BrickValLocalization.localized("Preparing your preview")
        }
        guard let entry = revealSession.currentEntry else { return nil }
        if revealStage == .waiting || !entry.isTerminal {
            return BrickValLocalization.localized("Checking figure \(entry.spatialNumber) of \(revealSession.entries.count)")
        }
        if revealStage == .transferringValue {
            return BrickValLocalization.localized("Adding figure \(entry.spatialNumber) of \(revealSession.entries.count)")
        }
        if entry.isTerminal {
            return BrickValLocalization.localized("Figure \(entry.spatialNumber) of \(revealSession.entries.count)")
        }
        return BrickValLocalization.localized("Checking figure \(entry.spatialNumber) of \(revealSession.entries.count)")
    }

    private func runRevealProgressively() async {
        revealSession.reset()
        syncPresentation()
        reviewInteractionReady = false
        didPlayRevealSound = false
        revealHapticTrigger = 0
        jackpotTotal = 0
        jackpotTopFindID = nil
        displayedRevealTotal = 0
        displayedPricedCount = 0
        valueTransferEntryID = nil
        valueTransferValue = nil
        totalUpdateKey = nil
        revealStage = .scanning
        presentationPhase = .compactIntro
        isPreviewOfferVisible = false

        do {
            try await Task.sleep(for: .milliseconds(reduceMotion ? 80 : 160))
            guard !Task.isCancelled else { return }
            withAnimation(presentationAnimation) {
                presentationPhase = .immersiveReveal
            }
            try await Task.sleep(
                for: .milliseconds(
                    Int((reduceMotion ? 0.18 : BulkRevealSession.returnDuration) * 1_000)
                )
            )
            guard !Task.isCancelled else { return }
            if presentation.accessMode == .lockedPreview {
                revealSession.beginPreview()
            } else {
                revealSession.begin()
            }
            guard !revealSession.isComplete else {
                if presentation.accessMode == .lockedPreview {
                    revealStage = .completed
                    isPreviewOfferVisible = true
                    coordinator?.analytics.capture(
                        PostHogEvent.bulkPreviewCompleted,
                        properties: ["detected_count": presentation.regions.count]
                    )
                    return
                }
                jackpotTotal = 0
                revealStage = .jackpot
                finishReveal()
                return
            }

            withAnimation(reduceMotion ? nil : .linear(duration: BulkRevealSession.scanPassDuration)) {
                revealStage = .scanning
                revealSession.setBeamProgress(1)
            }
            try await Task.sleep(
                for: .milliseconds(
                    Int((reduceMotion ? 0.18 : BulkRevealSession.scanPassDuration) * 1_000)
                )
            )
            guard !Task.isCancelled else { return }

            if presentation.accessMode == .lockedPreview {
                revealStage = .presentingValue
                while !revealSession.isComplete {
                    guard !Task.isCancelled else { return }
                    revealSession.commitSweepStep()
                    if !reduceMotion {
                        try await Task.sleep(for: .milliseconds(70))
                    } else {
                        await Task.yield()
                    }
                }
                guard !Task.isCancelled else { return }
                withAnimation(reduceMotion ? nil : .easeOut(duration: 0.24)) {
                    revealStage = .completed
                    isPreviewOfferVisible = true
                }
                coordinator?.analytics.capture(
                    PostHogEvent.bulkPreviewCompleted,
                    properties: ["detected_count": presentation.regions.count]
                )
                return
            }

            while !revealSession.isComplete {
                guard !Task.isCancelled else { return }
                syncPresentation()
                if !revealSession.canAdvanceCurrentEntry {
                    withAnimation(reduceMotion ? nil : .easeOut(duration: 0.18)) {
                        revealStage = .waiting
                    }
                    try await Task.sleep(for: .milliseconds(100))
                    continue
                }

                guard let entry = revealSession.currentEntry else { return }
                let value = entry.value(for: revealSession.condition)
                let revealInterval = revealSession.stepInterval
                if let value {
                    withAnimation(reduceMotion ? nil : .easeOut(duration: 0.16)) {
                        revealStage = .presentingValue
                    }
                    await Task.yield()
                    valueTransferEntryID = entry.id
                    valueTransferValue = value
                    withAnimation(reduceMotion ? nil : .easeInOut(duration: BulkRevealSession.valueTransferDuration)) {
                        revealStage = .transferringValue
                    }
                    try await Task.sleep(
                        for: .milliseconds(
                            Int((reduceMotion ? 0.18 : BulkRevealSession.valueTransferDuration) * 1_000)
                        )
                    )
                    guard !Task.isCancelled else { return }
                    withAnimation(reduceMotion ? nil : .easeOut(duration: 0.18)) {
                        displayedRevealTotal += value
                        displayedPricedCount += 1
                        totalUpdateKey = entry.id
                    }
                    valueTransferEntryID = nil
                    valueTransferValue = nil
                    let remainingInterval = max(
                        0,
                        revealInterval - (reduceMotion ? 0.18 : BulkRevealSession.valueTransferDuration)
                    )
                    if remainingInterval > 0 {
                        try await Task.sleep(for: .milliseconds(Int(remainingInterval * 1_000)))
                        guard !Task.isCancelled else { return }
                    }
                } else {
                    withAnimation(reduceMotion ? nil : .easeOut(duration: 0.16)) {
                        revealStage = .presentingValue
                    }
                    try await Task.sleep(
                        for: .milliseconds(
                            Int((reduceMotion ? 0.18 : BulkRevealSession.unavailableHoldDuration) * 1_000)
                        )
                    )
                    guard !Task.isCancelled else { return }
                    let remainingInterval = max(0, revealInterval - BulkRevealSession.unavailableHoldDuration)
                    if remainingInterval > 0 {
                        try await Task.sleep(for: .milliseconds(Int(remainingInterval * 1_000)))
                        guard !Task.isCancelled else { return }
                    }
                }

                withAnimation(reduceMotion ? nil : .easeOut(duration: 0.24)) {
                    revealSession.commitSweepStep()
                }
            }

            jackpotTotal = displayedRevealTotal
            jackpotTopFindID = revealSession.topPricedEntry?.id
            withAnimation(reduceMotion ? nil : .easeOut(duration: 0.35)) {
                revealStage = .jackpot
            }
            finishReveal()
            try await Task.sleep(
                for: .milliseconds(
                    Int((reduceMotion ? 0.80 : BulkRevealSession.jackpotDuration) * 1_000)
                )
            )
            guard !Task.isCancelled else { return }
            withAnimation(presentationAnimation) {
                presentationPhase = .returningToReview
            }
            if !reduceMotion {
                try await Task.sleep(for: .milliseconds(Int(BulkRevealSession.returnDuration * 1_000)))
            }
            guard !Task.isCancelled else { return }
            withAnimation(reduceMotion ? nil : presentationAnimation) {
                presentationPhase = .completedReview
                revealStage = .completed
                reviewInteractionReady = true
            }
        } catch {
            return
        }
    }

    private func syncPresentation() {
        let knownIDs = Set(itemStates.map(\.id))
        for item in presentation.resolvedItems where !knownIDs.contains(item.id) {
            itemStates.append(BulkScanItemState(item: item))
        }
        unresolvedRegions = presentation.unresolvedRegions

        for region in presentation.regions {
            switch presentation.regionStates[region.regionId] {
            case .pending:
                break
            case .loading:
                revealSession.markLoading(region.regionId)
            case .resolved(let item):
                revealSession.resolve(item)
            case .unresolved:
                revealSession.markUnresolved(region.regionId)
            case .none:
                break
            }
        }
    }

    private func finishReveal() {
        guard !didPlayRevealSound else { return }
        didPlayRevealSound = true
        store.playBulkRevealSound()
        revealHapticTrigger += 1
    }

    @MainActor
    private func makeSharePayload() -> BulkSharePayload? {
        guard let capturedImage, revealComplete else { return nil }
        let entries = itemStates.compactMap { state -> BulkShareEntry? in
            guard state.isSelected, let price = state.price, price > 0 else { return nil }
            return BulkShareEntry(
                id: state.id,
                identifier: state.item.result.identifier,
                name: state.item.result.name,
                price: price,
                boundingBox: state.item.boundingBox
            )
        }
        guard !entries.isEmpty else { return nil }
        let cropBox = BulkShareCropper.cropBox(for: entries.compactMap(\.boundingBox))
        let photo = BulkShareCropper.crop(capturedImage, to: cropBox) ?? capturedImage
        let selectedSources = itemStates
            .filter(\.isSelected)
            .map { $0.item.result.pricing.dataSource }
        let sharedSource: String? = {
            guard let first = selectedSources.first,
                  first != nil,
                  selectedSources.allSatisfy({ $0 == first })
            else { return nil }
            return first
        }()
        let pricingSourceTitle = MarketPriceSourceCopy.title(for: sharedSource)
        return BulkSharePayload(
            photo: photo,
            cropBox: cropBox,
            entries: entries,
            conditionTitle: shareConditionTitle,
            pricingSourceTitle: pricingSourceTitle,
            unresolvedCount: unresolvedRegions.count
        )
    }

    private var selectedTotal: Double {
        itemStates.filter(\.isSelected).reduce(0) { $0 + ($1.price ?? 0) }
    }

    private func price(for item: BulkScanResultItem) -> Double? {
        itemStates.first { $0.id == item.id }?.price
    }

    private var selectedCount: Int { itemStates.filter(\.isSelected).count }
    private var identifiedCount: Int { itemStates.count }

    private var shareConditionTitle: String {
        let selectedConditions = itemStates.filter(\.isSelected).map(\.condition)
        guard let first = selectedConditions.first else { return BrickValLocalization.localized("Used") }
        return selectedConditions.allSatisfy { $0 == first }
            ? (first == .used ? BrickValLocalization.localized("Used") : BrickValLocalization.localized("New / sealed"))
            : BrickValLocalization.localized("Mixed conditions")
    }

    private var errorBinding: Binding<Bool> {
        Binding(get: { errorMessage != nil }, set: { if !$0 { errorMessage = nil } })
    }

    private func saveSelected() {
        let collectionItems = itemStates.filter(\.isSelected).map { state in
            state.item.result.collectionItem(
                quantity: 1,
                condition: state.condition
            )
        }
        Task {
            isSaving = true
            defer { isSaving = false }
            do {
                try await collection.add(
                    collectionItems,
                    isPro: entitlements.isPro || !monetization.policy.gates.collectionCapacity,
                    freeLimit: monetization.collectionLimit
                )
                store.completeBulkSave(count: collectionItems.count)
                coordinator?.analytics.capture(
                    PostHogEvent.itemsAddedToCollection,
                    properties: [
                        "item_count": collectionItems.count,
                        "scan_type": ScanIntent.bulk.rawValue,
                    ]
                )
                dismiss()
            } catch is CollectionStoreError {
                let presented = coordinator?.presentProFeature(
                    placement: .collectionLimitReached,
                    params: [
                        "used": collection.uniqueItemCount,
                        "limit": monetization.collectionLimit,
                    ]
                ) {
                    saveSelected()
                } ?? false
                if !presented {
                    errorMessage = BrickValLocalization.localized("Upgrade options are temporarily unavailable. Try again shortly.")
                }
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }

    private func close() {
        correctionRequestID += 1
        store.reset()
        dismiss()
    }

    private func dismissPreviewForRescan() {
        guard presentation.accessMode == .lockedPreview else { return }
        coordinator?.analytics.capture(PostHogEvent.bulkPreviewRescanRequired)
        store.reset()
        dismiss()
    }

    private func matchTargetLabel(for regionID: String) -> String {
        guard presentation.regions.contains(where: { $0.regionId == regionID }) else {
            return BrickValLocalization.localized("Detected figure")
        }
        let number = revealSession.entries.first(where: { $0.id == regionID })?.spatialNumber
        let numberText = number.map(String.init) ?? ""
        switch presentation.regionStates[regionID] {
        case .resolved(let item):
            return BrickValLocalization.localized("Figure \(numberText), \(item.result.name)")
        case .unresolved:
            return BrickValLocalization.localized("Figure \(numberText), unidentified")
        case .pending, .loading, .none:
            return BrickValLocalization.localized("Detected figure \(numberText)")
        }
    }

    private func openMatch(for regionID: String) {
        guard presentationPhase == .completedReview,
              reviewInteractionReady,
              let region = presentation.regions.first(where: { $0.regionId == regionID })
        else { return }

        let target: BulkMatchTarget?
        switch presentation.regionStates[regionID] {
        case .resolved(let item):
            target = BulkMatchTarget(
                regionID: regionID,
                box: region.boundingBox,
                currentIdentifier: item.result.identifier,
                candidates: candidates(for: item),
                isUnresolved: false,
                canRetry: false
            )
        case .unresolved(let candidates):
            target = BulkMatchTarget(
                regionID: regionID,
                box: region.boundingBox,
                currentIdentifier: nil,
                candidates: Array(candidates.prefix(3)),
                isUnresolved: true,
                canRetry: recoveryToken != nil && !retriedRegionIDs.contains(regionID)
            )
        case .pending, .loading, .none:
            target = nil
        }
        guard let target else { return }
        selectedMatchTarget = target
        let state = target.isUnresolved ? "unresolved" : "resolved"
        Self.correctionLogger.info(
            "bulk_match_opened region_state=\(state, privacy: .public) candidate_count=\(target.candidates.count, privacy: .public) detected_count=\(presentation.regions.count, privacy: .public) identified_count=\(itemStates.count, privacy: .public) corrected_count=0"
        )
    }

    private func candidates(for item: BulkScanResultItem) -> [BulkScanReviewCandidate] {
        item.orderedCandidates
    }

    private func retryUnresolvedRegion(_ regionID: String) async -> [BulkScanReviewCandidate] {
        guard let recoveryToken,
              let region = presentation.regions.first(where: { $0.regionId == regionID }),
              !retriedRegionIDs.contains(regionID)
        else { return presentation.candidates(for: regionID) }

        retriedRegionIDs.insert(regionID)
        correctionRequestID += 1
        let requestID = correctionRequestID
        do {
            let candidates = try await store.recoverBulkMinifigure(
                imageData: imageData,
                focusBox: region.boundingBox,
                recoveryToken: recoveryToken
            )
            guard requestID == correctionRequestID else { return [] }
            presentation.markUnresolved(regionID, candidates: candidates)
            Self.correctionLogger.info(
                "bulk_match_retry outcome=matched candidate_count=\(candidates.count, privacy: .public) detected_count=\(presentation.regions.count, privacy: .public) identified_count=\(itemStates.count, privacy: .public)"
            )
            return Array(candidates.prefix(3))
        } catch is CancellationError {
            return []
        } catch let error as APIError where error.statusCode == 401 {
            errorMessage = BrickValLocalization.localized("This scan’s correction link has expired. Retake the photo to try again.")
            Self.correctionLogger.info("bulk_match_retry outcome=expired")
            return []
        } catch {
            errorMessage = BrickValLocalization.localized("Couldn’t check this figure. Check your connection and try again.")
            Self.correctionLogger.info("bulk_match_retry outcome=unavailable")
            return []
        }
    }

    private func replaceMatch(
        for regionID: String,
        with candidate: BulkScanReviewCandidate,
        candidates: [BulkScanReviewCandidate]
    ) {
        guard let region = presentation.regions.first(where: { $0.regionId == regionID }) else { return }
        var allCandidates = [candidate]
        allCandidates.append(contentsOf: candidates.filter { $0.id != candidate.id })
        let item = BulkScanResultItem(
            id: regionID,
            result: candidate.result,
            boundingBox: region.boundingBox,
            confidence: candidate.score,
            candidates: allCandidates
        )
        presentation.markResolved(item)
        if let index = itemStates.firstIndex(where: { $0.id == regionID }) {
            itemStates[index].item = item
        } else {
            itemStates.append(BulkScanItemState(item: item))
        }
        unresolvedRegions = presentation.unresolvedRegions
        focusedResultID = regionID
        selectedMatchTarget = nil
        jackpotTopFindID = topFindID
        Self.correctionLogger.info(
            "bulk_match_changed candidate_rank=\(allCandidates.firstIndex(where: { $0.id == candidate.id }).map { $0 + 1 } ?? 1, privacy: .public) detected_count=\(presentation.regions.count, privacy: .public) identified_count=\(itemStates.count, privacy: .public) corrected_count=1"
        )
    }

    private func clearMatch(for regionID: String, candidates: [BulkScanReviewCandidate]) {
        presentation.markUnresolved(regionID, candidates: candidates)
        itemStates.removeAll { $0.id == regionID }
        unresolvedRegions = presentation.unresolvedRegions
        selectedMatchTarget = nil
        jackpotTopFindID = topFindID
        Self.correctionLogger.info(
            "bulk_match_changed outcome=none_match detected_count=\(presentation.regions.count, privacy: .public) identified_count=\(itemStates.count, privacy: .public) corrected_count=0"
        )
    }

    private var topFindID: String? {
        itemStates
            .compactMap { state in state.price.map { (state.id, $0) } }
            .max { $0.1 < $1.1 }?.0
    }
}

private struct BulkMatchTarget: Identifiable {
    let regionID: String
    let box: NormalizedBoundingBox
    let currentIdentifier: String?
    let candidates: [BulkScanReviewCandidate]
    let isUnresolved: Bool
    let canRetry: Bool

    var id: String { regionID }
}

private struct BulkMatchCorrectionSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(PreferencesStore.self) private var preferences
    @Environment(CurrencyStore.self) private var currency

    let target: BulkMatchTarget
    let accent: Color
    let onRetry: @MainActor () async -> [BulkScanReviewCandidate]
    let onSelect: (BulkScanReviewCandidate) -> Void
    let onNoneMatch: () -> Void

    @State private var candidates: [BulkScanReviewCandidate]
    @State private var isRetrying = false
    @State private var retryFinished = false

    init(
        target: BulkMatchTarget,
        accent: Color,
        onRetry: @escaping @MainActor () async -> [BulkScanReviewCandidate],
        onSelect: @escaping (BulkScanReviewCandidate) -> Void,
        onNoneMatch: @escaping () -> Void
    ) {
        self.target = target
        self.accent = accent
        self.onRetry = onRetry
        self.onSelect = onSelect
        self.onNoneMatch = onNoneMatch
        _candidates = State(initialValue: Array(target.candidates.prefix(3)))
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    VStack(alignment: .leading, spacing: 4) {
                        Label(
                            target.isUnresolved ? "Figure not identified" : "Check this match",
                            systemImage: target.isUnresolved ? "questionmark.circle" : "checkmark.circle"
                        )
                        .font(.headline.weight(.bold))

                        Text(
                            target.isUnresolved
                                ? "Choose a possible match for the highlighted figure."
                                : "Choose a different match if this result is not the same figure."
                        )
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    }

                    if candidates.isEmpty {
                        emptyMatchContent
                    } else {
                        LazyVStack(spacing: 10) {
                            ForEach(candidates) { candidate in
                                candidateRow(candidate)
                            }
                        }
                    }

                    Button("None of these", systemImage: "questionmark") {
                        onNoneMatch()
                        dismiss()
                    }
                    .font(.subheadline.weight(.semibold))
                    .frame(maxWidth: .infinity, minHeight: 44)
                    .background(BrickValStyle.ScanResult.surface, in: .rect(cornerRadius: 12))
                    .foregroundStyle(.primary)
                    .overlay { RoundedRectangle(cornerRadius: 12).stroke(BrickValStyle.ScanResult.border) }
                    .accessibilityIdentifier("bulkMatch.noneMatch")
                }
                .padding(20)
            }
            .navigationTitle("Figure match")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
        .accessibilityIdentifier("bulkMatch.sheet")
    }

    private var emptyMatchContent: some View {
        VStack(spacing: 12) {
            Image(systemName: "person.crop.rectangle.badge.questionmark")
                .font(.largeTitle)
                .foregroundStyle(.secondary)
            Text(retryFinished ? "No match found" : "No saved alternatives")
                .font(.headline)
            Text(
                retryFinished
                    ? "This figure will stay out of the total until it can be identified."
                    : "We can check this exact detected region once more."
            )
            .font(.subheadline)
            .foregroundStyle(.secondary)
            .multilineTextAlignment(.center)

            if target.canRetry && !retryFinished {
                Button {
                    Task { await retry() }
                } label: {
                    Label(isRetrying ? "Checking…" : "Check this figure", systemImage: "arrow.triangle.2.circlepath")
                        .frame(maxWidth: .infinity, minHeight: 44)
                }
                .buttonStyle(.borderedProminent)
                .tint(accent)
                .foregroundStyle(.black)
                .disabled(isRetrying)
                .accessibilityIdentifier("bulkMatch.retry")
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 18)
    }

    private func retry() async {
        guard !isRetrying else { return }
        isRetrying = true
        let newCandidates = await onRetry()
        guard !Task.isCancelled else { return }
        withAnimation(reduceMotion ? nil : .easeOut(duration: 0.2)) {
            candidates = Array(newCandidates.prefix(3))
            retryFinished = true
            isRetrying = false
        }
    }

    private func candidateRow(_ candidate: BulkScanReviewCandidate) -> some View {
        Button {
            onSelect(candidate)
            dismiss()
        } label: {
            HStack(spacing: 12) {
                MinifigureThumbnail(
                    imageURL: candidate.result.imageURL,
                    identifier: candidate.result.identifier,
                    accent: accent
                )
                .frame(width: 64, height: 72)
                .background(.white, in: .rect(cornerRadius: 10))

                VStack(alignment: .leading, spacing: 4) {
                    Text(candidate.result.name)
                        .font(.subheadline.weight(.semibold))
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                    Text(candidate.result.identifier)
                        .font(.caption.bold().monospacedDigit())
                        .foregroundStyle(.secondary)
                    if let price = candidate.result.pricing.preferredUsedValue {
                        BrickValCurrencyText(price, showsCurrencyCode: false)
                            .font(.caption.bold().monospacedDigit())
                            .foregroundStyle(accent)
                    } else {
                        Text("Price unavailable")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer(minLength: 0)
                Image(systemName: candidate.identifier.caseInsensitiveCompare(target.currentIdentifier ?? "") == .orderedSame ? "checkmark.circle.fill" : "chevron.right")
                    .foregroundStyle(candidate.identifier.caseInsensitiveCompare(target.currentIdentifier ?? "") == .orderedSame ? accent : .secondary)
            }
            .foregroundStyle(.primary)
            .padding(10)
            .frame(maxWidth: .infinity, minHeight: 92, alignment: .leading)
            .background(BrickValStyle.ScanResult.surface, in: .rect(cornerRadius: 14))
            .overlay {
                RoundedRectangle(cornerRadius: 14)
                    .stroke(
                        candidate.identifier.caseInsensitiveCompare(target.currentIdentifier ?? "") == .orderedSame
                            ? accent.opacity(0.7)
                            : BrickValStyle.ScanResult.border
                    )
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Use \(candidate.result.name), \(candidate.result.identifier)")
        .accessibilityHint("Replaces the current figure match")
    }
}

private struct BulkScanItemState: Identifiable {
    var item: BulkScanResultItem
    var isSelected = true
    var condition: CollectionCondition = .used

    var id: String { item.id }
    var price: Double? {
        condition == .newSealed
            ? item.result.pricing.preferredNewValue
            : item.result.pricing.preferredUsedValue
    }
}

struct MinifigureThumbnail: View {
    let imageURL: URL?
    let identifier: String
    let accent: Color

    private var fallbackURL: URL? {
        URL(string: "https://img.bricklink.com/ML/\(identifier.lowercased()).jpg")
    }

    var body: some View {
        if let imageURL, imageURL != fallbackURL {
            AsyncImage(url: imageURL) { phase in
                switch phase {
                case .success(let image): thumbnail(image)
                case .failure: fallbackImage
                case .empty:
                    SkeletonPlaceholder(
                        cornerRadius: 8,
                        fill: BrickValStyle.Primitive.gray200,
                        highlight: BrickValStyle.Primitive.white
                    )
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                @unknown default:
                    EmptyView()
                }
            }
        } else {
            fallbackImage
        }
    }

    private var fallbackImage: some View {
        AsyncImage(url: fallbackURL) { phase in
            switch phase {
            case .success(let image): thumbnail(image)
            case .failure:
                Image(systemName: "person.fill.questionmark")
                    .font(.title)
                    .foregroundStyle(.gray)
            case .empty:
                SkeletonPlaceholder(
                    cornerRadius: 8,
                    fill: BrickValStyle.Primitive.gray200,
                    highlight: BrickValStyle.Primitive.white
                )
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            @unknown default:
                EmptyView()
            }
        }
    }

    private func thumbnail(_ image: Image) -> some View {
        image
            .resizable()
            .scaledToFit()
            .padding(4)
    }
}
