import SwiftUI

enum BulkRecoveryState: Sendable {
    case idle
    case selecting
    case identifying(box: NormalizedBoundingBox)
    case choosing(box: NormalizedBoundingBox, candidates: [BulkScanReviewCandidate])
    case failed(box: NormalizedBoundingBox, message: String)

    var isActive: Bool {
        if case .idle = self { return false }
        return true
    }

    var selectedBox: NormalizedBoundingBox? {
        switch self {
        case .idle, .selecting: nil
        case .identifying(let box), .choosing(let box, _), .failed(let box, _): box
        }
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
            photoResults
                .layoutPriority(1)
            if case .choosing(_, let candidates) = recoveryState {
                recoveryCandidateChooser(candidates)
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
            ForEach(Array(unresolvedRegions.enumerated()), id: \.offset) { index, box in
                recoveryTargetButton(
                    box: box,
                    index: index,
                    imageRect: imageRect,
                    containerSize: containerSize
                )
            }

            // Keep direct finger taps on the photo so the crop follows the
            // user's actual tap instead of snapping to a broad server region.
            Color.clear
                .contentShape(Rectangle())
                .gesture(
                    SpatialTapGesture()
                        .onEnded { value in
                            beginRecovery(at: value.location, imageRect: imageRect)
                        }
                )
                .accessibilityLabel("Bulk scan photo")
                .accessibilityHint("Double tap the minifigure itself, not the surrounding area, to identify it")
                .accessibilityAddTraits(.isButton)
        }

        if let selectedBox = recoveryState.selectedBox {
            recoveryFocusOverlay(box: selectedBox, imageRect: imageRect, containerSize: containerSize)
        }
    }

    private var recoveryStatusPanel: some View {
        VStack(alignment: .leading, spacing: 4) {
            Label(recoveryTitle, systemImage: recoveryIcon)
                .font(.headline.weight(.bold))
            Text(recoverySubtitle)
                .font(.subheadline)
                .foregroundStyle(BrickValStyle.ScanResult.textSecondary)
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

    private var isRecoverySelecting: Bool {
        if case .selecting = recoveryState { return true }
        return false
    }

    private var recoveryTransition: AnyTransition {
        reduceMotion
            ? .opacity
            : .opacity.combined(with: .scale(scale: 0.98))
    }

    private var recoveryTitle: String {
        switch recoveryState {
        case .idle: "Find a missed figure"
        case .selecting: "Select the missed minifigure"
        case .identifying: "Checking this figure…"
        case .choosing: "Choose the best match"
        case .failed: "Try that figure again"
        }
    }

    private var recoveryIcon: String {
        switch recoveryState {
        case .idle, .selecting: "hand.tap.fill"
        case .identifying: "viewfinder"
        case .choosing: "checkmark.circle.fill"
        case .failed: "exclamationmark.triangle.fill"
        }
    }

    private var recoverySubtitle: String {
        switch recoveryState {
        case .idle: "Tap near the center for the best match."
        case .selecting:
            unresolvedRegions.isEmpty
                ? "Tap the minifigure itself, not the surrounding area."
                : "Tap the minifigure itself. We’ll check the spot you choose."
        case .identifying: "Checking identity and current value."
        case .choosing: "Select the card that matches the highlighted figure."
        case .failed(_, let message): message
        }
    }

    private func recoveryTargetButton(
        box: NormalizedBoundingBox,
        index: Int,
        imageRect: CGRect,
        containerSize: CGSize
    ) -> some View {
        let targetRect = imageBox(box, in: imageRect)
        let hitWidth = max(targetRect.width, 112)
        let hitHeight = max(targetRect.height, 132)
        let center = CGPoint(
            x: min(max(targetRect.midX, hitWidth / 2), containerSize.width - hitWidth / 2),
            y: min(max(targetRect.midY, hitHeight / 2), containerSize.height - hitHeight / 2)
        )

        return Button {
            beginRecovery(box: box)
        } label: {
            // Keep the known recovery regions accessible without drawing a box
            // that could suggest the user should tap empty space.
            Color.clear
                .contentShape(Rectangle())
                .frame(width: hitWidth, height: hitHeight)
        }
        .buttonStyle(.plain)
        .position(center)
        .accessibilityLabel("Missed figure \(index + 1), identify")
        .accessibilityHint("Double tap the minifigure itself to check it")
    }

    private func recoveryFocusOverlay(
        box: NormalizedBoundingBox,
        imageRect: CGRect,
        containerSize: CGSize
    ) -> some View {
        let targetRect = imageBox(box, in: imageRect)
        let center = CGPoint(
            x: min(max(targetRect.midX, 80), containerSize.width - 80),
            y: min(max(targetRect.midY, 80), containerSize.height - 80)
        )

        return Circle()
            .fill(.black.opacity(0.18))
            .frame(width: 58, height: 58)
            .overlay {
                Circle()
                    .stroke(.orange, lineWidth: 3)
            }
        .position(center)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }

    private func recoveryCandidateChooser(_ candidates: [BulkScanReviewCandidate]) -> some View {
        ScrollView(.horizontal) {
            LazyHStack(spacing: 10) {
                ForEach(candidates.prefix(3)) { candidate in
                    recoveryCandidateCard(candidate)
                }
            }
            .padding(.horizontal, 2)
        }
        .scrollIndicators(.hidden)
        .frame(maxWidth: .infinity)
        .accessibilityLabel("Possible matches")
    }

    private var resultCarousel: some View {
        ScrollView(.horizontal) {
            LazyHStack(spacing: 10) {
                ForEach($itemStates) { $state in
                    resultCard($state)
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
        HStack(spacing: 12) {
            if case .failed(let box, _) = recoveryState {
                Button("Tap again", systemImage: "hand.tap") {
                    beginRecovery(box: box)
                }
                .buttonStyle(.borderedProminent)
                .tint(.orange)
                .foregroundStyle(.black)
            }

            Button("Retake", systemImage: "camera", action: close)
                .font(.subheadline.weight(.semibold))
                .frame(maxWidth: .infinity, minHeight: 54)
                .background(BrickValStyle.ScanResult.surface, in: .rect(cornerRadius: 14))
                .foregroundStyle(.white)

            Button("Cancel", systemImage: "xmark") {
                cancelRecovery()
            }
            .font(.subheadline.weight(.semibold))
            .frame(maxWidth: .infinity, minHeight: 54)
            .background(BrickValStyle.ScanResult.surface, in: .rect(cornerRadius: 14))
            .foregroundStyle(.white)
        }
    }

    private var canReviewMissedFigure: Bool {
        recoveryToken != nil
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
        let tapBox = unresolvedRegions.first(where: { box in
            x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height
        }) ?? NormalizedBoundingBox(
            x: min(max(x - 0.13, 0), 0.74),
            y: min(max(y - 0.15, 0), 0.70),
            width: 0.26,
            height: 0.30
        )
        beginRecovery(box: tapBox)
    }

    private func enterRecovery() {
        withAnimation(reduceMotion ? nil : .spring(response: 0.35, dampingFraction: 0.86)) {
            recoveryState = .selecting
        }
    }

    private func cancelRecovery() {
        recoveryRequestID += 1
        withAnimation(reduceMotion ? nil : .easeOut(duration: 0.18)) {
            recoveryState = .idle
        }
    }

    private func beginRecovery(box: NormalizedBoundingBox) {
        guard let recoveryToken else {
            recoveryState = .failed(
                box: box,
                message: "Recovery expired. Retake the photo to try again."
            )
            return
        }

        recoveryRequestID += 1
        let requestID = recoveryRequestID
        recoveryHapticTrigger += 1
        withAnimation(reduceMotion ? nil : .easeOut(duration: 0.16)) {
            recoveryState = .identifying(box: box)
        }

        Task { [imageData, store] in
            do {
                let candidates = try await store.recoverBulkMinifigure(
                    imageData: imageData,
                    focusBox: box,
                    recoveryToken: recoveryToken
                )
                await MainActor.run {
                    guard requestID == recoveryRequestID else { return }
                    withAnimation(reduceMotion ? nil : .spring(response: 0.3, dampingFraction: 0.86)) {
                        if candidates.isEmpty {
                            recoveryState = .failed(
                                box: box,
                                message: "Couldn’t identify this figure. Try again or retake the photo."
                            )
                        } else {
                            recoveryState = .choosing(box: box, candidates: Array(candidates.prefix(3)))
                        }
                    }
                }
            } catch is CancellationError {
                // Cancellation is expected when the user leaves recovery mode.
            } catch {
                await MainActor.run {
                    guard requestID == recoveryRequestID else { return }
                    recoveryState = .failed(
                        box: box,
                        message: "Couldn’t identify this figure. Check your connection and try again."
                    )
                }
            }
        }
    }

    private func choose(_ candidate: BulkScanReviewCandidate, for review: BulkScanReviewItem) {
        itemStates.append(BulkScanItemState(item: BulkScanResultItem(
            id: review.id,
            result: candidate.result,
            boundingBox: review.boundingBox
        )))
        reviewItems.removeAll { $0.id == review.id }
    }

    private func acceptRecovery(_ candidate: BulkScanReviewCandidate) {
        guard case .choosing(let box, _) = recoveryState else { return }
        itemStates.append(BulkScanItemState(item: BulkScanResultItem(
            id: "recovered-\(UUID().uuidString)",
            result: candidate.result,
            boundingBox: box
        )))
        unresolvedRegions.removeAll { $0 == box }
        withAnimation(reduceMotion ? nil : .spring(response: 0.35, dampingFraction: 0.86)) {
            recoveryState = unresolvedRegions.isEmpty ? .idle : .selecting
        }
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
