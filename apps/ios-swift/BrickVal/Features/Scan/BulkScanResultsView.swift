import SwiftUI

struct BulkScanResultsView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(CollectionStore.self) private var collection
    @Environment(EntitlementStore.self) private var entitlements

    let items: [BulkScanResultItem]
    let store: ScanStore

    @State private var itemStates: [BulkScanItemState]
    @State private var isSaving = false
    @State private var errorMessage: String?

    private let capturedImage: UIImage?
    private let accent = BrickValStyle.ScanResult.accent
    private let canvas = BrickValStyle.ScanResult.canvas

    init(imageData: Data, items: [BulkScanResultItem], store: ScanStore) {
        self.items = items
        self.store = store
        capturedImage = UIImage(data: imageData)
        _itemStates = State(initialValue: items.map { BulkScanItemState(item: $0) })
    }

    var body: some View {
        VStack(spacing: 14) {
            header
            photoResults
                .layoutPriority(1)
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
        .onDisappear { store.reset() }
        .sensoryFeedback(.selection, trigger: selectedCount)
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
                        .accessibilityLabel("Bulk scan photo with \(items.count) identified minifigures")

                    ForEach(items) { item in
                        if let box = item.boundingBox {
                            detectionBox(for: item, box: box, imageRect: imageRect, containerSize: proxy.size)
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

    private var resultCarousel: some View {
        ScrollView(.horizontal) {
            LazyHStack(spacing: 10) {
                ForEach($itemStates) { $state in
                    resultCard($state)
                }
            }
            .padding(.horizontal, 12)
        }
        .scrollIndicators(.hidden)
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

            Button("Retake", systemImage: "camera", action: close)
                .font(.headline)
                .frame(maxWidth: .infinity, minHeight: 56)
                .background(BrickValStyle.ScanResult.surface, in: .rect(cornerRadius: 14))
                .foregroundStyle(.white)
                .disabled(isSaving)
        }
    }

    private var selectedTotal: Double {
        itemStates.filter(\.isSelected).reduce(0) { $0 + ($1.price ?? 0) }
    }

    private func price(for item: BulkScanResultItem) -> Double? {
        itemStates.first { $0.id == item.id }?.price
    }

    private var selectedCount: Int { itemStates.filter(\.isSelected).count }

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
                try await collection.add(collectionItems, isPro: entitlements.isPro)
                store.completeBulkSave(count: collectionItems.count)
                dismiss()
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }

    private func close() {
        store.reset()
        dismiss()
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
                default: ProgressView().tint(accent)
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
            default: ProgressView().tint(accent)
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
