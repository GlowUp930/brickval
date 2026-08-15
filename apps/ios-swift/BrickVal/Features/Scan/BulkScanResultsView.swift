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
}

struct BulkScanResultsView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(CollectionStore.self) private var collection
    @Environment(EntitlementStore.self) private var entitlements
    @Environment(MonetizationStore.self) private var monetization
    @Environment(\.appSDKCoordinator) private var coordinator
    @Environment(\.brickValAccent) private var accent
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    let items: [BulkScanResultItem]
    let store: ScanStore

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

    private let capturedImage: UIImage?
    private let canvas = BrickValStyle.ScanResult.canvas

    init(
        imageData: Data,
        items: [BulkScanResultItem],
        reviewItems: [BulkScanReviewItem] = [],
        unresolvedRegions: [NormalizedBoundingBox] = [],
        recoveryToken: String? = nil,
        store: ScanStore
    ) {
        self.items = items
        self.store = store
        self.recoveryToken = recoveryToken
        capturedImage = UIImage(data: imageData)
        _itemStates = State(initialValue: items.map { BulkScanItemState(item: $0) })
        _reviewItems = State(initialValue: reviewItems)
        _unresolvedRegions = State(initialValue: unresolvedRegions)
        self.imageData = imageData
    }

    private let imageData: Data
    private let recoveryToken: String?

    var body: some View {
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
            photoResults
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
        .background(canvas.ignoresSafeArea())
        .preferredColorScheme(.dark)
        .presentationDetents([.large])
        .presentationDragIndicator(.hidden)
        .presentationBackground(canvas)
        .interactiveDismissDisabled(isSaving)
        .onDisappear {
            recoveryRequestID += 1
            store.reset()
        }
        .sensoryFeedback(.selection, trigger: selectedCount)
        .sensoryFeedback(.impact(flexibility: .soft), trigger: recoveryHapticTrigger)
        .alert("Could not add items", isPresented: errorBinding) {
            Button("OK", role: .cancel) { errorMessage = nil }
        } message: {
            Text(errorMessage ?? "Please try again.")
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
    private var photoResults: some View {
        if let capturedImage {
            GeometryReader { proxy in
                let imageRect = aspectFillRect(imageSize: capturedImage.size, containerSize: proxy.size)
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
                        ForEach(itemStates.map(\.item)) { item in
                            if let box = item.boundingBox {
                                detectionBox(for: item, box: box, imageRect: imageRect, containerSize: proxy.size)
                            }
                        }

                        ForEach(reviewItems) { item in
                            if let box = item.boundingBox {
                                reviewBox(box, imageRect: imageRect, containerSize: proxy.size)
                            }
                        }

                        VStack(spacing: 0) {
                            summaryPill
                                .padding(.top, 14)
                            Spacer(minLength: 150)
                            resultCarousel
                                .padding(.bottom, 12)
                        }
                    }
                }
                .frame(width: proxy.size.width, height: proxy.size.height)
                .clipped()
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(.black)
            .clipShape(.rect(cornerRadius: 18))
            .overlay { RoundedRectangle(cornerRadius: 18).stroke(BrickValStyle.ScanResult.border) }
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
        let hitWidth = max(targetRect.width, 112)
        let hitHeight = max(targetRect.height, 132)
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
        let targetRect = imageBox(selection.focusBox, in: imageRect)
        let center = CGPoint(
            x: min(max(targetRect.midX, 80), containerSize.width - 80),
            y: min(max(targetRect.midY, 80), containerSize.height - 80)
        )

        return RecoverySelectionOverlay(
            targetRect: targetRect,
            center: center,
            containerSize: containerSize,
            number: number,
            accent: accent,
            isFocused: isFocused
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
            ScrollView(.horizontal) {
                LazyHStack(spacing: 10) {
                    ForEach($itemStates) { $state in
                        resultCard($state)
                            .id(state.id)
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
        imageRect: CGRect,
        containerSize: CGSize
    ) -> some View {
        let rect = CGRect(
            x: imageRect.minX + box.x * imageRect.width,
            y: imageRect.minY + box.y * imageRect.height,
            width: box.width * imageRect.width,
            height: box.height * imageRect.height
        )
        let isSelected = itemStates.first { $0.id == item.id }?.isSelected ?? false
        return ZStack {
            RoundedRectangle(cornerRadius: 10)
                .stroke(isSelected ? accent : .white.opacity(0.55), lineWidth: 3)
                .frame(width: rect.width, height: rect.height)
                .position(x: rect.midX, y: rect.midY)
            if let price = price(for: item) {
                Text(price, format: .currency(code: "USD"))
                    .font(.caption.bold())
                    .foregroundStyle(isSelected ? .white : .black)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 5)
                    .background(isSelected ? accent : .white, in: .capsule)
                    .position(
                        x: min(max(rect.midX, 38), containerSize.width - 38),
                        y: max(rect.minY, 15)
                    )
            }
        }
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

    private func aspectFillRect(imageSize: CGSize, containerSize: CGSize) -> CGRect {
        guard imageSize.width > 0, imageSize.height > 0 else {
            return CGRect(origin: .zero, size: containerSize)
        }
        let scale = max(containerSize.width / imageSize.width, containerSize.height / imageSize.height)
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
                .disabled(selectedCount == 0 || isSaving)
                .opacity(selectedCount == 0 ? 0.45 : 1)

                HStack(spacing: 12) {
                    if canReviewMissedFigure {
                        Button(action: enterRecovery) {
                            Label(recoveryActionTitle, systemImage: recoveryActionIcon)
                                .font(.subheadline.weight(.semibold))
                                .lineLimit(2)
                                .minimumScaleFactor(0.82)
                                .frame(maxWidth: .infinity, minHeight: 56)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.orange)
                        .foregroundStyle(.black)
                        .accessibilityHint("Opens an unobstructed photo review")
                        .accessibilityIdentifier("bulkRecovery.enter")
                    }

                    Button("Retake", systemImage: "camera", action: close)
                        .font(.subheadline.weight(.semibold))
                        .frame(maxWidth: .infinity, minHeight: 56)
                        .background(BrickValStyle.ScanResult.surface, in: .rect(cornerRadius: 14))
                        .foregroundStyle(.white)
                        .overlay { RoundedRectangle(cornerRadius: 14).stroke(BrickValStyle.ScanResult.border) }
                        .disabled(isSaving)
                }
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

        if session.removeSelection(containing: normalizedPoint) {
            recoveryHapticTrigger += 1
            recoveryState = .selecting(session)
            return
        }

        guard session.canAddSelection else { return }
        let selection = BulkRecoverySelection(
            id: "selection-\(UUID().uuidString)",
            order: session.selectedCount,
            normalizedPoint: normalizedPoint,
            focusBox: BulkRecoveryTapPlanner.focusBox(for: normalizedPoint.cgPoint),
            unresolvedRegionIndex: unresolvedRegionIndex
        )
        session.toggle(selection)
        recoveryHapticTrigger += 1
        withAnimation(reduceMotion ? nil : .spring(response: 0.24, dampingFraction: 0.84)) {
            recoveryState = .selecting(session)
        }
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
            boundingBox: selection.focusBox
        )
        itemStates.insert(BulkScanItemState(item: item), at: 0)
        unresolvedRegions.removeAll { region in
            selection.normalizedPoint.x >= region.x && selection.normalizedPoint.x <= region.x + region.width
                && selection.normalizedPoint.y >= region.y && selection.normalizedPoint.y <= region.y + region.height
        }
        focusedResultID = item.id
        session.advanceAfterCandidateSelection()
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

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var focusSize: CGSize {
        CGSize(
            width: min(max(targetRect.width * 0.82, 112), min(containerSize.width - 28, 210)),
            height: min(max(targetRect.height * 0.42, 112), min(containerSize.height - 28, 190))
        )
    }

    private var clampedCenter: CGPoint {
        let size = focusSize
        return CGPoint(
            x: min(max(center.x, size.width / 2 + 14), containerSize.width - size.width / 2 - 14),
            y: min(max(center.y, size.height / 2 + 14), containerSize.height - size.height / 2 - 14)
        )
    }

    var body: some View {
        ZStack(alignment: .topLeading) {
            RecoveryFocusCorners()
                .stroke(
                    accent.opacity(isFocused || reduceMotion ? 1 : 0.72),
                    style: StrokeStyle(lineWidth: isFocused ? 4 : 3, lineCap: .round, lineJoin: .round)
                )
                .background {
                    RoundedRectangle(cornerRadius: 20)
                        .fill(accent.opacity(isFocused ? 0.045 : 0.02))
                }
            Text("\(number)")
                .font(.caption.bold().monospacedDigit())
                .foregroundStyle(.black)
                .frame(minWidth: 28, minHeight: 28)
                .background(accent, in: .circle)
                .offset(x: -4, y: -4)
        }
        .frame(width: focusSize.width, height: focusSize.height)
        .shadow(color: accent.opacity(isFocused ? 0.28 : 0.08), radius: 8)
        .position(clampedCenter)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
}

private struct RecoveryFocusCorners: Shape {
    func path(in rect: CGRect) -> Path {
        let length = min(28, min(rect.width, rect.height) * 0.24)
        var path = Path()

        path.move(to: CGPoint(x: rect.minX + length, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.minX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.minX, y: rect.minY + length))

        path.move(to: CGPoint(x: rect.maxX - length, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY + length))

        path.move(to: CGPoint(x: rect.minX, y: rect.maxY - length))
        path.addLine(to: CGPoint(x: rect.minX, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.minX + length, y: rect.maxY))

        path.move(to: CGPoint(x: rect.maxX, y: rect.maxY - length))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.maxX - length, y: rect.maxY))

        return path
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

private struct MinifigureThumbnail: View {
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
