import SwiftUI

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
            x: min(max(x - 0.13, 0), 0.74),
            y: min(max(y - 0.15, 0), 0.70),
            width: 0.26,
            height: 0.30
        )
    }

    static func recognitionBox(
        for normalizedPoint: CGPoint,
        referenceBox: NormalizedBoundingBox?
    ) -> NormalizedBoundingBox {
        guard let referenceBox else { return focusBox(for: normalizedPoint) }
        let contextX = max(referenceBox.width * 0.30, 0.08)
        let contextY = max(referenceBox.height * 0.30, 0.08)
        let x = max(0, referenceBox.x - contextX)
        let y = max(0, referenceBox.y - contextY)
        return NormalizedBoundingBox(
            x: x,
            y: y,
            width: min(1, referenceBox.width + contextX * 2),
            height: min(1, referenceBox.height + contextY * 2)
        ).clamped
    }
}

private enum BulkResultsPresentationPhase {
    case compactIntro
    case immersiveReveal
    case completedReview
}

struct BulkScanResultsView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(CollectionStore.self) private var collection
    @Environment(EntitlementStore.self) private var entitlements
    @Environment(MonetizationStore.self) private var monetization
    @Environment(\.appSDKCoordinator) private var coordinator
    @Environment(\.brickValAccent) private var accent
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    @Namespace private var photoStageNamespace

    let items: [BulkScanResultItem]
    let store: ScanStore
    private let source: BulkScanSource

    @State private var itemStates: [BulkScanItemState]
    @State private var reviewItems: [BulkScanReviewItem]
    @State private var unresolvedRegions: [NormalizedBoundingBox]
    @State private var recoveryState: BulkRecoveryState = .idle
    @State private var recoveryRequestID = 0
    @State private var recoveryHapticTrigger = 0
    @State private var recoveryConfirmation: String?
    @State private var focusedResultID: String?
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var revealSession: BulkRevealSession
    @State private var presentationPhase: BulkResultsPresentationPhase = .compactIntro
    @State private var didPlayRevealSound = false
    @State private var sharePayload: BulkSharePayload?
    @State private var activeResultPage = 0

    private let capturedImage: UIImage?
    private let canvas = BrickValStyle.ScanResult.canvas

    init(
        imageData: Data,
        items: [BulkScanResultItem],
        reviewItems: [BulkScanReviewItem] = [],
        unresolvedRegions: [NormalizedBoundingBox] = [],
        recoveryToken: String? = nil,
        source: BulkScanSource = .camera,
        store: ScanStore
    ) {
        self.items = items
        self.store = store
        self.source = source
        self.recoveryToken = recoveryToken
        capturedImage = UIImage(data: imageData)
        let orderedItems = items.sorted { lhs, rhs in
            guard let left = lhs.boundingBox, let right = rhs.boundingBox else {
                return lhs.id < rhs.id
            }
            let rowDelta = left.y - right.y
            return abs(rowDelta) > 0.10 ? rowDelta < 0 : left.x < right.x
        }
        _itemStates = State(initialValue: orderedItems.map { BulkScanItemState(item: $0) })
        _revealSession = State(initialValue: BulkRevealSession(items: orderedItems))
        _reviewItems = State(initialValue: reviewItems)
        _unresolvedRegions = State(initialValue: unresolvedRegions)
        self.imageData = imageData
    }

    private let imageData: Data
    private let recoveryToken: String?

    var body: some View {
        ZStack {
            canvas.ignoresSafeArea()

            reviewLayout
                .opacity(isImmersiveReveal ? 0 : 1)
                .allowsHitTesting(!isImmersiveReveal)
                .zIndex(0)

            if isImmersiveReveal {
                immersiveRevealStage
                    .transition(.opacity)
                    .zIndex(1)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .preferredColorScheme(.dark)
        .presentationDragIndicator(.hidden)
        .presentationBackground(canvas)
        .interactiveDismissDisabled(isSaving)
        .onDisappear {
            recoveryRequestID += 1
            store.reset()
        }
        .task(id: revealKey) {
            await runReveal()
        }
        .sensoryFeedback(.selection, trigger: selectedCount)
        .sensoryFeedback(.impact(flexibility: .soft), trigger: recoveryHapticTrigger)
        .sheet(item: $sharePayload) { payload in
            BulkSharePreviewView(payload: payload)
        }
        .alert("Could not add items", isPresented: errorBinding) {
            Button("OK", role: .cancel) { errorMessage = nil }
        } message: {
            Text(errorMessage ?? "Please try again.")
        }
    }

    private var reviewLayout: some View {
        VStack(spacing: 14) {
            header
            if recoveryState.isActive {
                recoveryStatusPanel
                    .transition(recoveryTransition)
            }
            if let recoveryConfirmation, !recoveryState.isActive {
                recoveryConfirmationBanner(recoveryConfirmation)
                    .transition(recoveryTransition)
            }
            reviewPhotoStage
                .layoutPriority(1)
            if !currentRecoveryCandidates.isEmpty {
                recoveryCandidateChooser(currentRecoveryCandidates)
                    .transition(recoveryTransition)
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
                .font(.title3.bold())
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

    @ViewBuilder
    private var reviewPhotoStage: some View {
        if reduceMotion {
            photoResults(immersive: false)
        } else {
            photoResults(immersive: false)
                .matchedGeometryEffect(id: "bulk-photo-stage", in: photoStageNamespace)
        }
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
            Image(systemName: "viewfinder")
                .font(.title3.bold())
                .foregroundStyle(.black)
                .frame(width: 38, height: 38)
                .background(accent, in: .rect(cornerRadius: 9))
                .accessibilityHidden(true)
            Text("BrickVal")
                .font(.title2.bold())
            Text("Bulk scan")
                .font(.headline)
                .foregroundStyle(BrickValStyle.ScanResult.textSecondary)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
            Spacer(minLength: 8)
            Button {
                sharePayload = makeSharePayload()
            } label: {
                Image(systemName: "square.and.arrow.up")
                    .font(.title3.bold())
            }
            .foregroundStyle(.white)
            .frame(width: 46, height: 46)
            .disabled(!revealComplete || selectedCount == 0 || isSaving)
            .opacity(!revealComplete || selectedCount == 0 ? 0.45 : 1)
            .accessibilityLabel("Share bulk scan result")
            .accessibilityHint("Creates a shareable value card with the scan photo")
            Button("Close", systemImage: "xmark", action: close)
                .labelStyle(.iconOnly)
                .font(.title3.bold())
                .foregroundStyle(.white)
                .frame(width: 46, height: 46)
                .background(BrickValStyle.ScanResult.surface, in: .circle)
                .overlay { Circle().stroke(BrickValStyle.ScanResult.border) }
                .disabled(isSaving)
        }
    }

    @ViewBuilder
    private func photoResults(immersive: Bool) -> some View {
        if let capturedImage {
            GeometryReader { proxy in
                let imageRect = aspectFitRect(imageSize: capturedImage.size, containerSize: proxy.size)
                ZStack {
                    Image(uiImage: capturedImage)
                        .resizable()
                        .frame(width: imageRect.width, height: imageRect.height)
                        .position(x: imageRect.midX, y: imageRect.midY)
                        .accessibilityLabel("Bulk scan photo with \(itemStates.count) identified minifigures")

                    if recoveryState.isActive {
                        recoveryPhotoContent(imageRect: imageRect, containerSize: proxy.size)
                            .transition(recoveryTransition)
                    } else {
                        if presentationPhase == .completedReview {
                            ForEach(itemStates) { state in
                                if let box = state.item.boundingBox {
                                    detectionBox(for: state.item, box: box, imageRect: imageRect)
                                }
                            }
                        } else {
                            BulkFocusOverlay(
                                regions: revealFocusRegions,
                                imageRect: imageRect,
                                containerSize: proxy.size,
                                accent: accent
                            )

                            ForEach(revealSession.entries) { entry in
                                if let box = entry.boundingBox {
                                    sweepDetectionBox(
                                        for: entry,
                                        box: box,
                                        imageRect: imageRect,
                                        containerSize: proxy.size
                                    )
                                }
                            }
                        }

                        if presentationPhase == .completedReview {
                            ForEach(reviewItems) { item in
                                if let box = item.boundingBox {
                                    reviewBox(box, imageRect: imageRect, containerSize: proxy.size)
                                }
                            }
                        }

                        if presentationPhase == .completedReview {
                            ZStack(alignment: .bottomTrailing) {
                                VStack(spacing: 0) {
                                    summaryPill
                                        .padding(.top, 14)
                                    Spacer(minLength: 150)
                                    resultCarousel
                                        .padding(.bottom, 12)
                                }

                                if canReviewMissedFigure && !recoveryState.isActive {
                                    compactMissedFigureButton
                                        .padding(.trailing, 12)
                                        .padding(.bottom, 116)
                                }
                            }
                        } else {
                            BulkRevealOverlay(
                                entries: revealSession.entries,
                                visibleCount: revealSession.revealedCount,
                                revealedTotal: revealedTotal
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

    private var summaryPill: some View {
            HStack(spacing: 9) {
            Text(selectedTotal, format: .currency(code: "USD"))
                .foregroundStyle(accent)
            Text("·")
                .foregroundStyle(.gray)
                Text("\(selectedCount) selected")
                    .foregroundStyle(.gray)
            }
        .font(.title3.bold())
        .padding(.horizontal, 20)
        .frame(minHeight: 54)
        .background(.white, in: .capsule)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Selected value")
        .accessibilityValue("\(selectedTotal.formatted(.currency(code: "USD"))), \(selectedCount) selected")
    }

    private var compactMissedFigureButton: some View {
        Button(action: enterRecovery) {
            Label("Missed", systemImage: "plus")
                .font(.caption.weight(.semibold))
                .labelStyle(.titleAndIcon)
                .foregroundStyle(.white)
                .padding(.horizontal, 12)
                .frame(minHeight: 44)
        }
        .buttonStyle(.plain)
        .background(.black.opacity(0.78), in: .capsule)
        .overlay { Capsule().stroke(.white.opacity(0.24)) }
        .accessibilityLabel(recoveryActionTitle)
        .accessibilityHint("Opens an unobstructed photo review")
        .accessibilityIdentifier("bulkRecovery.enter")
    }

    @ViewBuilder
    private func recoveryPhotoContent(imageRect: CGRect, containerSize: CGSize) -> some View {
        if isRecoverySelecting {
            Color.clear
                .contentShape(Rectangle())
                .gesture(
                    SpatialTapGesture()
                        .onEnded { value in
                            beginRecovery(at: value.location, imageRect: imageRect)
                        }
                )
                .accessibilityHidden(true)

            ForEach(Array(unresolvedRegions.enumerated()), id: \.offset) { index, box in
                recoveryTargetButton(
                    box: box,
                    index: index,
                    imageRect: imageRect,
                    containerSize: containerSize
                )
            }
        }

        if let session = recoveryState.session {
            ForEach(Array(session.selections.enumerated()), id: \.element.id) { index, selection in
                recoverySelectionOverlay(
                    selection: selection,
                    number: index + 1,
                    isFocused: selection.id == recoveryState.currentSelection?.id,
                    imageRect: imageRect,
                    containerSize: containerSize
                )
            }
        }
    }

    private var recoveryStatusPanel: some View {
        VStack(alignment: .leading, spacing: 4) {
            Label(recoveryTitle, systemImage: recoveryIcon)
                .font(.headline.weight(.bold))
            Text(recoverySubtitle)
                .font(.subheadline)
                .foregroundStyle(BrickValStyle.ScanResult.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .foregroundStyle(.white)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 14)
        .padding(.vertical, 11)
        .background(BrickValStyle.ScanResult.surface, in: .rect(cornerRadius: 14))
        .overlay {
            RoundedRectangle(cornerRadius: 14)
                .stroke(BrickValStyle.ScanResult.border)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(recoveryTitle). \(recoverySubtitle)")
    }

    private func recoveryConfirmationBanner(_ message: String) -> some View {
        Label {
            VStack(alignment: .leading, spacing: 2) {
                Text(message)
                    .font(.subheadline.weight(.semibold))
                Text("Review the updated card below before saving.")
                    .font(.caption)
                    .foregroundStyle(BrickValStyle.ScanResult.textSecondary)
            }
        } icon: {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(accent)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(BrickValStyle.ScanResult.surface, in: .rect(cornerRadius: 14))
        .overlay {
            RoundedRectangle(cornerRadius: 14)
                .stroke(BrickValStyle.ScanResult.border)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(message). Review the updated card below before saving.")
    }

    private var isRecoverySelecting: Bool {
        if case .selecting = recoveryState { true } else { false }
    }

    private var recoveryTransition: AnyTransition {
        reduceMotion
            ? .opacity
            : .opacity.combined(with: .scale(scale: 0.98))
    }

    private var recoveryTitle: String {
        switch recoveryState {
        case .idle: "Find a missed figure"
        case .selecting: "Tap each missed minifigure"
        case .processing(let session): "Checking \(session.completedCount) of \(session.totalCount) figures"
        case .reviewing(let session):
            "Match \(min(session.reviewIndex + 1, max(session.reviewableOutcomes.count, 1))) of \(max(session.reviewableOutcomes.count, 1))"
        case .failed: "Couldn’t finish checking"
        case .completed: "Recovery complete"
        }
    }

    private var recoveryIcon: String {
        switch recoveryState {
        case .idle, .selecting: "hand.tap.fill"
        case .processing: "hourglass"
        case .reviewing: "checkmark.circle.fill"
        case .failed: "exclamationmark.triangle.fill"
        case .completed: "checkmark.circle.fill"
        }
    }

    private var recoverySubtitle: String {
        switch recoveryState {
        case .idle: "Tap near the center for the best match."
        case .selecting(let session):
            session.selectedCount == 0
                ? "Tap the center of each figure. Tap a number again to remove it."
                : "\(session.selectedCount) selected. Tap another figure or check them together."
        case .processing: "Recognition is running in the background. You can cancel."
        case .reviewing: "Choose the card that matches the highlighted figure."
        case .failed(_, let message): message
        case .completed(let addedCount, let skippedCount):
            "Added \(addedCount) figures · \(skippedCount) couldn’t be matched"
        }
    }

    private func recoveryTargetButton(
        box: NormalizedBoundingBox,
        index: Int,
        imageRect: CGRect,
        containerSize: CGSize
    ) -> some View {
        let isSelected = recoveryState.session?.selections.contains {
            $0.unresolvedRegionIndex == index || $0.focusBox.contains(BulkRecoveryPoint(box.center))
        } == true
        let targetRect = imageBox(box, in: imageRect)
        let hitWidth = max(targetRect.width, 44)
        let hitHeight = max(targetRect.height, 44)
        let center = CGPoint(
            x: min(max(targetRect.midX, hitWidth / 2), containerSize.width - hitWidth / 2),
            y: min(max(targetRect.midY, hitHeight / 2), containerSize.height - hitHeight / 2)
        )

        return Button {
            toggleRecovery(at: box.center, unresolvedRegionIndex: index)
        } label: {
            // Keep the known recovery regions accessible without drawing a box
            // that could suggest the user should tap empty space.
            Color.clear
                .contentShape(Rectangle())
                .frame(width: hitWidth, height: hitHeight)
        }
        .buttonStyle(.plain)
        .position(center)
        .accessibilityLabel("Missed figure \(index + 1)")
        .accessibilityValue(isSelected ? "Selected" : "Not selected")
        .accessibilityHint(isSelected ? "Double tap to remove this figure" : "Double tap to select this figure")
        .accessibilityIdentifier("bulkRecovery.target.\(index + 1)")
    }

    private func recoverySelectionOverlay(
        selection: BulkRecoverySelection,
        number: Int,
        isFocused: Bool,
        imageRect: CGRect,
        containerSize: CGSize
    ) -> some View {
        let targetRect = imageBox(selection.recognitionBox, in: imageRect)
        let anchor = CGPoint(
            x: imageRect.minX + selection.visualAnchor.x * imageRect.width,
            y: imageRect.minY + selection.visualAnchor.y * imageRect.height
        )
        let center = CGPoint(
            x: min(max(anchor.x, 40), containerSize.width - 40),
            y: min(max(anchor.y, 40), containerSize.height - 40)
        )

        return RecoverySelectionOverlay(
            targetRect: targetRect,
            center: center,
            containerSize: containerSize,
            number: number,
            accent: accent,
            isFocused: isFocused,
            confirmedValue: recoveryState.session?.confirmedValues[selection.id]
        )
        .id(selection.id)
    }

    private func recoveryCandidateChooser(_ candidates: [BulkScanReviewCandidate]) -> some View {
        VStack(spacing: 8) {
            ScrollView(.horizontal) {
                LazyHStack(spacing: 10) {
                    ForEach(candidates.prefix(3)) { candidate in
                        recoveryCandidateCard(candidate)
                    }
                }
                .padding(.horizontal, 2)
            }
            .scrollIndicators(.hidden)

            Button("None match", systemImage: "questionmark") {
                skipCurrentRecoveryMatch()
            }
            .font(.subheadline.weight(.semibold))
            .frame(maxWidth: .infinity, minHeight: 42)
            .background(BrickValStyle.ScanResult.surface, in: .rect(cornerRadius: 12))
            .foregroundStyle(.white)
            .overlay { RoundedRectangle(cornerRadius: 12).stroke(BrickValStyle.ScanResult.border) }
            .accessibilityIdentifier("bulkRecovery.noneMatch")
        }
        .frame(maxWidth: .infinity)
        .frame(height: CGFloat(recoveryState.candidateChooserHeight), alignment: .top)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Possible matches for the highlighted figure")
    }

    private var resultCarousel: some View {
        ScrollViewReader { proxy in
            VStack(spacing: 8) {
                if isDenseResultSet {
                    densePageControl
                }
                ScrollView(.horizontal) {
                    LazyHStack(spacing: 10) {
                        if isDenseResultSet {
                            ForEach(activePageIDs, id: \.self) { id in
                                if let index = itemStates.firstIndex(where: { $0.id == id }) {
                                    resultCard($itemStates[index])
                                        .id(id)
                                }
                            }
                        } else {
                            ForEach($itemStates) { $state in
                                resultCard($state)
                                    .id(state.id)
                            }
                        }
                        ForEach(reviewItems) { review in
                            ForEach(review.candidates) { candidate in
                                reviewCandidateCard(candidate, review: review)
                            }
                        }
                    }
                    .padding(.horizontal, 12)
                }
                .scrollIndicators(.hidden)
            }
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

    private func reviewCandidateCard(
        _ candidate: BulkScanReviewCandidate,
        review: BulkScanReviewItem
    ) -> some View {
        Button {
            choose(candidate, for: review)
        } label: {
            candidateCard(candidate, badge: "Review")
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Review candidate \(candidate.result.name)")
        .accessibilityHint("Double tap to use this match")
    }

    private func recoveryCandidateCard(_ candidate: BulkScanReviewCandidate) -> some View {
        Button {
            acceptRecovery(candidate)
        } label: {
            candidateCard(candidate, badge: nil)
                .frame(
                    width: CGFloat(BulkRecoveryLayout.candidateCardWidth),
                    height: CGFloat(BulkRecoveryLayout.candidateCardHeight)
                )
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Recovered candidate \(candidate.result.name)")
        .accessibilityHint("Double tap to add this match")
    }

    private func candidateCard(
        _ candidate: BulkScanReviewCandidate,
        badge: String?
    ) -> some View {
        VStack(spacing: 5) {
            MinifigureThumbnail(
                imageURL: candidate.result.imageURL,
                identifier: candidate.result.identifier,
                accent: accent
            )
            .frame(width: 82, height: 64)
            .background(.white)
            .clipShape(.rect(cornerRadius: 9))
            Text(candidate.result.identifier)
                .font(.caption.bold())
                .lineLimit(1)
            reviewPrice(candidate.result)
        }
        .foregroundStyle(.white)
        .padding(8)
        .background(.black.opacity(0.78), in: .rect(cornerRadius: 12))
        .overlay(alignment: .topLeading) {
            if let badge {
                Text(badge)
                    .font(.caption2.bold())
                    .foregroundStyle(.black)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 3)
                    .background(.orange, in: .capsule)
                    .offset(x: 5, y: -8)
            }
        }
    }

    private func resultCard(_ state: Binding<BulkScanItemState>) -> some View {
        let item = state.wrappedValue.item
        let isSelected = state.wrappedValue.isSelected
        let condition = state.wrappedValue.condition
        return VStack(spacing: 6) {
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
                    .frame(width: 82, height: 76)
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

            Group {
                if let price = price(for: item) {
                    Text(price, format: .currency(code: "USD"))
                } else {
                    Text("No data")
                }
            }
            .font(.subheadline.bold())
            .foregroundStyle(isSelected ? .white : .gray)

            conditionControl(state: state, selection: condition)
        }
        .padding(8)
        .background(.black.opacity(0.72), in: .rect(cornerRadius: 12))
        .opacity(isSelected ? 1 : 0.72)
        .frame(width: 116)
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
        _ title: String,
        condition: CollectionCondition,
        state: Binding<BulkScanItemState>,
        selection: CollectionCondition
    ) -> some View {
        Button(title) {
            withAnimation(.easeOut(duration: 0.15)) { state.wrappedValue.condition = condition }
        }
        .font(.caption2.bold())
        .foregroundStyle(selection == condition ? .black : BrickValStyle.ScanResult.textSecondary)
        .frame(maxWidth: .infinity, minHeight: 25)
        .background(selection == condition ? accent : .clear, in: .capsule)
        .accessibilityLabel("\(title) condition")
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

    private func sweepDetectionBox(
        for entry: BulkRevealEntry,
        box: NormalizedBoundingBox,
        imageRect: CGRect,
        containerSize: CGSize
    ) -> some View {
        let rect = imageBox(box, in: imageRect)
        let isCurrent = revealSession.currentEntry?.id == entry.id
        let isLatestRevealed = revealSession.revealedCount > 0
            && revealSession.revealedCount == entry.spatialNumber
        let price = entry.value(for: revealSession.condition)

        return ZStack {
            if isLatestRevealed, let price {
                Text(price, format: .currency(code: "USD"))
                    .font(.caption.bold().monospacedDigit())
                    .foregroundStyle(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 5)
                    .background(accent, in: .capsule)
                    .position(
                        x: min(max(rect.midX, 40), containerSize.width - 40),
                        y: max(rect.minY, 18)
                    )
                    .transition(reduceMotion ? .opacity : .opacity.combined(with: .scale(scale: 0.86)))
            }

            if isCurrent, !reduceMotion {
                RoundedRectangle(cornerRadius: 10)
                    .stroke(accent.opacity(0.72), lineWidth: 2)
                    .frame(width: rect.width + 8, height: rect.height + 8)
                    .position(x: rect.midX, y: rect.midY)
                    .transition(.opacity)
            }
        }
        .animation(reduceMotion ? nil : .easeOut(duration: 0.20), value: isLatestRevealed)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }

    private func reviewBox(
        _ box: NormalizedBoundingBox,
        imageRect: CGRect,
        containerSize: CGSize
    ) -> some View {
        let rect = imageBox(box, in: imageRect)
        return reviewOutline(rect: rect, symbol: "?")
    }

    private func reviewOutline(rect: CGRect, symbol: String) -> some View {
        ZStack {
            RoundedRectangle(cornerRadius: 10)
                .stroke(.orange, style: StrokeStyle(lineWidth: 3, dash: [8, 6]))
                .frame(width: rect.width, height: rect.height)
            Image(systemName: symbol)
                .font(.headline.bold())
                .foregroundStyle(.black)
                .frame(width: 28, height: 28)
                .background(.orange, in: .circle)
        }
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

    private func aspectFitRect(imageSize: CGSize, containerSize: CGSize) -> CGRect {
        guard imageSize.width > 0, imageSize.height > 0 else {
            return CGRect(origin: .zero, size: containerSize)
        }
        let scale = min(containerSize.width / imageSize.width, containerSize.height / imageSize.height)
        let renderedSize = CGSize(width: imageSize.width * scale, height: imageSize.height * scale)
        return CGRect(
            x: (containerSize.width - renderedSize.width) / 2,
            y: (containerSize.height - renderedSize.height) / 2,
            width: renderedSize.width,
            height: renderedSize.height
        )
    }

    private var actionButtons: some View {
        VStack(spacing: 12) {
            if recoveryState.isActive {
                recoveryBottomActions
            } else {
                Button(action: saveSelected) {
                    Label(
                        isSaving ? "Adding…" : "Add \(selectedCount) to Collection",
                        systemImage: isSaving ? "hourglass" : "plus.circle.fill"
                    )
                    .font(.headline)
                    .frame(maxWidth: .infinity, minHeight: 58)
                    .background(accent, in: .rect(cornerRadius: 14))
                    .foregroundStyle(.black)
                }
                .buttonStyle(.plain)
                .disabled(!revealComplete || selectedCount == 0 || isSaving)
                .opacity(!revealComplete || selectedCount == 0 ? 0.45 : 1)
            }
        }
    }

    private var recoveryBottomActions: some View {
        VStack(spacing: 10) {
            switch recoveryState {
            case .selecting(let session):
                Button(action: checkSelectedFigures) {
                    Label("Check \(session.selectedCount) figures", systemImage: "sparkles")
                        .font(.headline)
                        .frame(maxWidth: .infinity, minHeight: 58)
                        .background(accent, in: .rect(cornerRadius: 14))
                        .foregroundStyle(.black)
                }
                .buttonStyle(.plain)
                .disabled(session.selectedCount == 0)
                .opacity(session.selectedCount == 0 ? 0.45 : 1)
                .accessibilityIdentifier("bulkRecovery.check")

            case .processing:
                ProgressView()
                    .tint(accent)
                    .frame(maxWidth: .infinity, minHeight: 44)
                    .accessibilityLabel(recoveryTitle)

            case .reviewing:
                EmptyView()

            case .failed(let session, _):
                Button("Retry", systemImage: "arrow.clockwise") {
                    retryRecovery(session: session)
                }
                .buttonStyle(.borderedProminent)
                .tint(accent)
                .foregroundStyle(.black)
                .frame(maxWidth: .infinity, minHeight: 48)
                .accessibilityIdentifier("bulkRecovery.retry")

            case .idle, .completed:
                EmptyView()
            }

            HStack(spacing: 12) {
                Button("Retake", systemImage: "camera", action: close)
                    .font(.subheadline.weight(.semibold))
                    .frame(maxWidth: .infinity, minHeight: 54)
                    .background(BrickValStyle.ScanResult.surface, in: .rect(cornerRadius: 14))
                    .foregroundStyle(.white)
                    .disabled(isSaving)
                    .accessibilityIdentifier("bulkRecovery.retake")

                Button("Cancel", systemImage: "xmark") {
                    cancelRecovery()
                }
                .font(.subheadline.weight(.semibold))
                .frame(maxWidth: .infinity, minHeight: 54)
                .background(BrickValStyle.ScanResult.surface, in: .rect(cornerRadius: 14))
                .foregroundStyle(.white)
                .disabled(isSaving)
                .accessibilityIdentifier("bulkRecovery.cancel")
            }
        }
    }

    private var canReviewMissedFigure: Bool {
        recoveryToken != nil
    }

    private var revealKey: String {
        items.map(\.id).joined(separator: "|")
    }

    private var revealComplete: Bool {
        revealSession.isComplete
    }

    private var isImmersiveReveal: Bool {
        presentationPhase == .immersiveReveal && !recoveryState.isActive
    }

    private var presentationAnimation: Animation {
        .easeOut(duration: reduceMotion ? 0.18 : 0.45)
    }

    private var revealFocusRegions: [BulkFocusRegion] {
        revealSession.entries.map { entry in
            let state: BulkFocusState
            if let currentEntry = revealSession.currentEntry, currentEntry.id == entry.id {
                state = .active
            } else if revealSession.revealedCount > entry.spatialNumber - 1 {
                state = .completed
            } else {
                state = .pending
            }
            return BulkFocusRegion(
                id: entry.id,
                box: entry.boundingBox,
                number: entry.spatialNumber,
                state: state
            )
        }
    }

    private var isDenseResultSet: Bool { itemStates.count > 10 }

    private var resultPageCount: Int {
        max(1, (itemStates.count + 9) / 10)
    }

    private var activePageItems: [BulkScanItemState] {
        let start = min(activeResultPage * 10, max(itemStates.count - 1, 0))
        return Array(itemStates.dropFirst(start).prefix(10))
    }

    private var activePageIDs: [String] { activePageItems.map(\.id) }

    private var densePageControl: some View {
        HStack(spacing: 12) {
            Button {
                withAnimation(reduceMotion ? nil : .easeOut(duration: 0.18)) {
                    activeResultPage = max(0, activeResultPage - 1)
                }
            } label: {
                Image(systemName: "chevron.left")
                    .frame(width: 44, height: 36)
            }
            .disabled(activeResultPage == 0)

            Text("\(activeResultPage * 10 + 1)–\(min((activeResultPage + 1) * 10, itemStates.count)) of \(itemStates.count)")
                .font(.caption.weight(.semibold).monospacedDigit())
                .foregroundStyle(.white)
                .accessibilityLabel("Showing results \(activeResultPage * 10 + 1) through \(min((activeResultPage + 1) * 10, itemStates.count)) of \(itemStates.count)")

            Button {
                withAnimation(reduceMotion ? nil : .easeOut(duration: 0.18)) {
                    activeResultPage = min(resultPageCount - 1, activeResultPage + 1)
                }
            } label: {
                Image(systemName: "chevron.right")
                    .frame(width: 44, height: 36)
            }
            .disabled(activeResultPage >= resultPageCount - 1)
        }
        .foregroundStyle(.white)
        .frame(maxWidth: .infinity)
        .background(BrickValStyle.ScanResult.surface, in: .capsule)
        .overlay { Capsule().stroke(BrickValStyle.ScanResult.border) }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("bulkResults.pageControl")
    }

    private var revealedTotal: Double {
        revealSession.revealedTotal
    }

    private func runReveal() async {
        guard !items.isEmpty else { return }
        revealSession.reset()
        didPlayRevealSound = false
        presentationPhase = .compactIntro

        do {
            try await Task.sleep(for: .milliseconds(reduceMotion ? 120 : 360))
            guard !Task.isCancelled else { return }
            withAnimation(presentationAnimation) {
                presentationPhase = .immersiveReveal
            }
            if !reduceMotion {
                try await Task.sleep(for: .milliseconds(450))
            }
            guard !Task.isCancelled else { return }
            revealSession.begin()
            while !revealComplete {
                guard !Task.isCancelled else { return }
                try await Task.sleep(for: .milliseconds(Int(revealSession.stepInterval * 1_000)))
                guard !Task.isCancelled else { return }
                withAnimation(reduceMotion ? nil : .easeOut(duration: 0.24)) {
                    revealSession.commitSweepStep()
                }
            }
            finishReveal()
        } catch {
            return
        }
    }

    private func finishReveal() {
        guard !didPlayRevealSound else { return }
        didPlayRevealSound = true
        store.playBulkRevealSound()
        withAnimation(presentationAnimation) {
            presentationPhase = .completedReview
        }
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
        return BulkSharePayload(
            photo: photo,
            cropBox: cropBox,
            entries: entries,
            conditionTitle: shareConditionTitle,
            pricingSourceTitle: "Sold-market data",
            reviewCount: reviewItems.count,
            unresolvedCount: unresolvedRegions.count
        )
    }

    private var currentRecoveryCandidates: [BulkScanReviewCandidate] {
        guard case .reviewing(let session) = recoveryState else { return [] }
        return session.currentReviewOutcome?.candidates ?? []
    }

    private var recoveryActionTitle: String {
        let count = unresolvedRegions.count
        if count == 1 { return "Review missed figure" }
        if count > 1 { return "Review \(count) missed figures" }
        return "Add missed figure"
    }

    private var recoveryActionIcon: String {
        unresolvedRegions.isEmpty ? "plus" : "hand.tap"
    }

    private var selectedTotal: Double {
        itemStates.filter(\.isSelected).reduce(0) { $0 + ($1.price ?? 0) }
    }

    private func price(for item: BulkScanResultItem) -> Double? {
        itemStates.first { $0.id == item.id }?.price
    }

    private var selectedCount: Int { itemStates.filter(\.isSelected).count }

    private var shareConditionTitle: String {
        let selectedConditions = itemStates.filter(\.isSelected).map(\.condition)
        guard let first = selectedConditions.first else { return "Used" }
        return selectedConditions.allSatisfy { $0 == first }
            ? (first == .used ? "Used" : "New / sealed")
            : "Mixed conditions"
    }

    @ViewBuilder
    private func reviewPrice(_ result: LookupResult) -> some View {
        if let price = result.pricing.preferredUsedValue {
            Text(price, format: .currency(code: "USD"))
                .font(.caption2)
        } else {
            Text("No price")
                .font(.caption2)
        }
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
                    errorMessage = "Upgrade options are temporarily unavailable. Try again shortly."
                }
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }

    private func close() {
        recoveryRequestID += 1
        store.reset()
        dismiss()
    }

    private func beginRecovery(at location: CGPoint, imageRect: CGRect) {
        guard isRecoverySelecting, recoveryToken != nil else { return }
        let x = min(max((location.x - imageRect.minX) / imageRect.width, 0), 1)
        let y = min(max((location.y - imageRect.minY) / imageRect.height, 0), 1)
        let point = CGPoint(x: x, y: y)
        let regionIndex = unresolvedRegions.firstIndex { region in
            point.x >= region.x && point.x <= region.x + region.width
                && point.y >= region.y && point.y <= region.y + region.height
        }
        toggleRecovery(at: point, unresolvedRegionIndex: regionIndex)
    }

    private func enterRecovery() {
        recoveryConfirmation = nil
        withAnimation(reduceMotion ? nil : .spring(response: 0.35, dampingFraction: 0.86)) {
            recoveryState = .selecting(BulkRecoverySession())
        }
    }

    private func cancelRecovery() {
        recoveryRequestID += 1
        withAnimation(reduceMotion ? nil : .easeOut(duration: 0.18)) {
            switch recoveryState {
            case .processing(let session):
                // Keep the numbered selections so the user can adjust and retry.
                recoveryState = .selecting(session)
            case .selecting, .reviewing, .failed:
                // Leaving an active review returns to the unchanged result list.
                recoveryState = .idle
            case .idle, .completed:
                break
            }
        }
    }

    private func toggleRecovery(at point: CGPoint, unresolvedRegionIndex: Int?) {
        guard case .selecting(var session) = recoveryState else { return }
        let normalizedPoint = BulkRecoveryPoint(point)

        if session.removeSelection(near: normalizedPoint) {
            recoveryHapticTrigger += 1
            recoveryState = .selecting(session)
            return
        }

        guard session.canAddSelection else { return }
        let referenceBox = unresolvedRegionIndex.flatMap { index in
            unresolvedRegions.indices.contains(index) ? unresolvedRegions[index] : nil
        } ?? nearestKnownDetectionBox(to: normalizedPoint)
        let selection = BulkRecoverySelection(
            id: "selection-\(UUID().uuidString)",
            order: session.selectedCount,
            normalizedPoint: normalizedPoint,
            focusBox: BulkRecoveryTapPlanner.recognitionBox(
                for: normalizedPoint.cgPoint,
                referenceBox: referenceBox
            ),
            visualAnchor: normalizedPoint,
            unresolvedRegionIndex: unresolvedRegionIndex
        )
        session.toggle(selection)
        recoveryHapticTrigger += 1
        withAnimation(reduceMotion ? nil : .spring(response: 0.24, dampingFraction: 0.84)) {
            recoveryState = .selecting(session)
        }
    }

    private func nearestKnownDetectionBox(to point: BulkRecoveryPoint) -> NormalizedBoundingBox? {
        let candidates = itemStates.compactMap(\.item.boundingBox) + reviewItems.compactMap(\.boundingBox)
        guard let nearest = candidates.min(by: { lhs, rhs in
            distance(from: lhs.center, to: point) < distance(from: rhs.center, to: point)
        }), distance(from: nearest.center, to: point) <= 0.18 else { return nil }
        return nearest
    }

    private func distance(from point: CGPoint, to other: BulkRecoveryPoint) -> Double {
        let dx = point.x - other.x
        let dy = point.y - other.y
        return (dx * dx + dy * dy).squareRoot()
    }

    private func checkSelectedFigures() {
        guard case .selecting(var session) = recoveryState else { return }
        guard let recoveryToken else {
            recoveryState = .failed(session, message: "Recovery expired. Retake the photo to try again.")
            return
        }

        session.beginProcessing()
        recoveryRequestID += 1
        let requestID = recoveryRequestID
        recoveryState = .processing(session)

        Task { [imageData, store] in
            let outcomes = await store.recoverBulkMinifigures(
                imageData: imageData,
                selections: session.selections,
                recoveryToken: recoveryToken,
                onProgress: { completed, _ in
                    guard requestID == recoveryRequestID,
                          case .processing(var progressSession) = recoveryState
                    else { return }
                    progressSession.updateProgress(completed)
                    recoveryState = .processing(progressSession)
                }
            )

            guard requestID == recoveryRequestID else { return }
            var completedSession = session
            completedSession.record(outcomes)

            withAnimation(reduceMotion ? nil : .spring(response: 0.3, dampingFraction: 0.86)) {
                if completedSession.reviewableOutcomes.isEmpty {
                    let allExpired = !outcomes.isEmpty && outcomes.allSatisfy {
                        if case .skipped(_, .expired) = $0 { return true }
                        return false
                    }
                    let allUnavailable = !outcomes.isEmpty && outcomes.allSatisfy {
                        if case .skipped(_, .unavailable) = $0 { return true }
                        return false
                    }
                    if allExpired {
                        recoveryState = .failed(completedSession, message: "Recovery expired. Retake the photo to try again.")
                    } else if allUnavailable {
                        recoveryState = .failed(completedSession, message: "Couldn’t check these figures. Check your connection and try again.")
                    } else {
                        finishRecovery(completedSession)
                    }
                } else {
                    recoveryState = .reviewing(completedSession)
                }
            }
        }
    }

    private func retryRecovery(session: BulkRecoverySession) {
        recoveryState = .selecting(session)
        checkSelectedFigures()
    }

    private func choose(_ candidate: BulkScanReviewCandidate, for review: BulkScanReviewItem) {
        let item = BulkScanResultItem(
            id: review.id,
            result: candidate.result,
            boundingBox: review.boundingBox
        )
        itemStates.insert(BulkScanItemState(item: item), at: 0)
        activeResultPage = 0
        reviewItems.removeAll { $0.id == review.id }
        focusedResultID = item.id
        recoveryConfirmation = "Added \(candidate.result.name) to review"
    }

    private func acceptRecovery(_ candidate: BulkScanReviewCandidate) {
        guard case .reviewing(var session) = recoveryState,
              case .matched(let selection, _) = session.currentReviewOutcome
        else { return }
        let item = BulkScanResultItem(
            id: "recovered-\(selection.id)",
            result: candidate.result,
            boundingBox: selection.recognitionBox
        )
        itemStates.insert(BulkScanItemState(item: item), at: 0)
        unresolvedRegions.removeAll { region in
            selection.normalizedPoint.x >= region.x && selection.normalizedPoint.x <= region.x + region.width
                && selection.normalizedPoint.y >= region.y && selection.normalizedPoint.y <= region.y + region.height
        }
        focusedResultID = item.id
        session.advanceAfterCandidateSelection(value: candidate.result.pricing.preferredUsedValue)
        activeResultPage = 0
        if session.currentReviewOutcome == nil {
            finishRecovery(session)
        } else {
            recoveryState = .reviewing(session)
        }
    }

    private func skipCurrentRecoveryMatch() {
        guard case .reviewing(var session) = recoveryState else { return }
        session.skipCurrentCandidate()
        if session.currentReviewOutcome == nil {
            finishRecovery(session)
        } else {
            recoveryState = .reviewing(session)
        }
    }

    private func finishRecovery(_ session: BulkRecoverySession) {
        let skipped = session.skippedCount
        recoveryConfirmation = skipped == 0
            ? "Added \(session.acceptedCount) figures"
            : "Added \(session.acceptedCount) figures · \(skipped) couldn’t be matched"
        recoveryHapticTrigger += 1
        recoveryState = .idle
    }
}

private struct RecoverySelectionOverlay: View {
    let targetRect: CGRect
    let center: CGPoint
    let containerSize: CGSize
    let number: Int
    let accent: Color
    let isFocused: Bool
    let confirmedValue: Double?

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var glowSize: CGFloat {
        min(max(max(targetRect.width, targetRect.height) * 0.34, 46), 92)
    }

    private var clampedCenter: CGPoint {
        let inset = glowSize / 2 + 8
        return CGPoint(
            x: min(max(center.x, inset), containerSize.width - inset),
            y: min(max(center.y, inset), containerSize.height - inset)
        )
    }

    var body: some View {
        VStack(spacing: 3) {
            ZStack(alignment: .topTrailing) {
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [
                                accent.opacity(isFocused ? 0.72 : 0.38),
                                accent.opacity(isFocused ? 0.22 : 0.10),
                                .clear,
                            ],
                            center: .center,
                            startRadius: 0,
                            endRadius: glowSize / 2
                        )
                    )
                    .frame(width: glowSize, height: glowSize)
                    .overlay {
                        Circle()
                            .stroke(accent.opacity(isFocused ? 0.72 : 0.34), lineWidth: 1.5)
                            .padding(glowSize * 0.18)
                    }
                Text("\(number)")
                    .font(.caption2.bold().monospacedDigit())
                    .foregroundStyle(.black)
                    .frame(minWidth: 24, minHeight: 24)
                    .background(accent, in: .circle)
                    .offset(x: 3, y: -3)
            }

            if let confirmedValue {
                Text(confirmedValue, format: .currency(code: "USD"))
                    .font(.caption2.bold().monospacedDigit())
                    .foregroundStyle(.white)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 3)
                    .background(.black.opacity(0.78), in: .capsule)
            }
        }
        .frame(minWidth: 44, minHeight: 44)
        .shadow(color: accent.opacity(isFocused ? 0.36 : 0.14), radius: isFocused ? 16 : 8)
        .opacity(isFocused || confirmedValue != nil ? 1 : 0.82)
        .scaleEffect(reduceMotion ? 1 : (isFocused ? 1.06 : 1))
        .animation(reduceMotion ? nil : .easeOut(duration: 0.22), value: isFocused)
        .position(clampedCenter)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
}

private struct BulkScanItemState: Identifiable {
    let item: BulkScanResultItem
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
