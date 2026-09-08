import SwiftUI

struct ScanReviewView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @Environment(\.brickValAccent) private var accent
    @Environment(PreferencesStore.self) private var preferences
    @Environment(CurrencyStore.self) private var currency

    let review: ScanReview
    let store: ScanStore

    @State private var candidates: [ScanReviewCandidate]
    @State private var selectedID: String?
    @State private var isLoading: Bool
    @State private var isConfirming = false
    @State private var loadError: String?
    @State private var isEntranceVisible = false

    init(review: ScanReview, store: ScanStore) {
        self.review = review
        self.store = store
        let initialCandidate = review.candidates.max { lhs, rhs in lhs.score < rhs.score }
        _candidates = State(initialValue: review.candidates)
        _selectedID = State(initialValue: initialCandidate?.id)
        _isLoading = State(initialValue: review.candidates.contains { $0.result == nil })
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color(uiColor: .systemBackground)
                    .ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 22) {
                        heading

                        if candidates.isEmpty {
                            ContentUnavailableView(
                                "No reviewable matches",
                                systemImage: "questionmark.square.dashed",
                                description: Text("Try a closer, brighter photo.")
                            )
                        } else {
                            candidateContent
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 14)
                    .padding(.bottom, 120)
                }
                .scrollIndicators(.hidden)
            }
            .safeAreaInset(edge: .bottom, spacing: 0) {
                bottomAction
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Retake", systemImage: "xmark") {
                        store.reset()
                        dismiss()
                    }
                    .labelStyle(.iconOnly)
                    .accessibilityLabel("Retake scan")
                }
            }
            .task {
                await loadCandidatesIfNeeded()
                guard !Task.isCancelled else { return }
                withAnimation(reduceMotion ? nil : .easeOut(duration: 0.34)) {
                    isEntranceVisible = true
                }
            }
        }
    }

    private var heading: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(candidates.count == 1 ? "CONFIRM MATCH" : "CONFIDENCE FIRST")
                .font(.caption.weight(.semibold))
                .foregroundStyle(accent)
                .textCase(.uppercase)
                .tracking(0.7)

            Text(candidates.count == 1 ? "Confirm a match" : "Choose a match")
                .font(.system(.largeTitle, design: .rounded, weight: .bold))
                .fixedSize(horizontal: false, vertical: true)

            Text(
                candidates.count == 1
                    ? "Review the result before continuing."
                    : "We found \(candidates.count) possible minifigures. Select the one that looks right."
            )
            .font(.subheadline)
            .foregroundStyle(.secondary)
            .fixedSize(horizontal: false, vertical: true)
        }
    }

    @ViewBuilder
    private var candidateContent: some View {
        if let topCandidate {
            VStack(alignment: .leading, spacing: 16) {
                Text(candidates.count == 1 ? "Likely match" : "Most likely match")
                    .font(.headline)

                featuredCard(topCandidate)

                if !otherCandidates.isEmpty {
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Other possibilities")
                            .font(.headline)
                            .padding(.top, 4)

                        candidateSurfaces {
                            ForEach(otherCandidates) { candidate in
                                candidateRow(candidate)
                            }
                        }
                    }
                    .opacity(isLoading || isEntranceVisible ? 1 : 0)
                    .offset(y: isLoading || isEntranceVisible ? 0 : 6)
                    .animation(otherCandidatesLiftAnimation, value: isEntranceVisible)
                }
            }
        }
    }

    @ViewBuilder
    private func candidateSurfaces<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        if #available(iOS 26.0, *) {
            GlassEffectContainer(spacing: 12) {
                content()
            }
        } else {
            content()
        }
    }

    private func featuredCard(_ candidate: ScanReviewCandidate) -> some View {
        let isSelected = selectedID == candidate.id

        return Button {
            select(candidate)
        } label: {
            VStack(alignment: .leading, spacing: 14) {
                HStack(alignment: .top, spacing: 16) {
                    candidateImage(candidate)
                        .frame(width: dynamicTypeSize.isAccessibilitySize ? 92 : 108,
                               height: dynamicTypeSize.isAccessibilitySize ? 92 : 108)
                        .scaleEffect(isLoading || isEntranceVisible ? 1 : 0.82)
                        .opacity(isLoading || isEntranceVisible ? 1 : 0)
                        .animation(imageLiftAnimation, value: isEntranceVisible)

                    VStack(alignment: .leading, spacing: 6) {
                        HStack(spacing: 8) {
                            Text(candidates.first?.id == candidate.id ? "BEST MATCH" : "STRONG MATCH")
                                .font(.caption2.weight(.bold))
                                .foregroundStyle(.black)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 5)
                                .background(accent, in: Capsule())

                            Text(candidate.score, format: .percent.precision(.fractionLength(0)).locale(BrickValLocalization.effectiveLanguage.locale))
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(accent)
                        }

                        candidateName(candidate, font: .headline, featured: true)

                        Text(candidate.identifier)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .opacity(isLoading || isEntranceVisible ? 1 : 0)
                    .offset(y: isLoading || isEntranceVisible ? 0 : 5)
                    .animation(detailsLiftAnimation, value: isEntranceVisible)
                }

                HStack {
                    Label("Used value", systemImage: "tag.fill")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                    Spacer()

                    candidatePrice(candidate, font: .title3.weight(.bold))
                }
                .opacity(isLoading || isEntranceVisible ? 1 : 0)
                .offset(y: isLoading || isEntranceVisible ? 0 : 5)
                .animation(detailsLiftAnimation, value: isEntranceVisible)
            }
            .padding(18)
            .frame(maxWidth: .infinity, alignment: .leading)
            .modifier(ReviewSurfaceModifier(interactive: true))
            .overlay {
                RoundedRectangle(cornerRadius: 20)
                    .stroke(isSelected ? accent : .clear, lineWidth: 2)
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(accessibilityLabel(for: candidate))
        .accessibilityValue(isSelected ? "Selected" : "Not selected")
        .accessibilityHint("Select this match")
    }

    private func candidateRow(_ candidate: ScanReviewCandidate) -> some View {
        let isSelected = selectedID == candidate.id

        return Button {
            select(candidate)
        } label: {
            HStack(spacing: 14) {
                candidateImage(candidate)
                    .frame(width: 52, height: 52)

                VStack(alignment: .leading, spacing: 4) {
                    candidateName(candidate, font: .subheadline.weight(.semibold), featured: false)

                    Text(candidate.identifier)
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    HStack(spacing: 10) {
                        Label(
                            candidate.score.formatted(.percent.precision(.fractionLength(0)).locale(BrickValLocalization.effectiveLanguage.locale)),
                            systemImage: "checkmark.seal.fill"
                        )
                        .foregroundStyle(isSelected ? accent : .secondary)

                    candidatePrice(candidate, font: .caption.weight(.semibold), accent: false)
                    }
                }

                Spacer(minLength: 4)

                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundStyle(isSelected ? accent : .secondary)
                    .scaleEffect(isSelected ? 1 : 0.92)
                    .accessibilityHidden(true)
            }
            .padding(.vertical, 10)
            .contentShape(Rectangle())
            .modifier(ReviewSurfaceModifier(interactive: true, cornerRadius: 16))
            .overlay {
                RoundedRectangle(cornerRadius: 16)
                    .stroke(isSelected ? accent : .clear, lineWidth: 1.5)
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(accessibilityLabel(for: candidate))
        .accessibilityValue(isSelected ? "Selected" : "Not selected")
        .accessibilityHint("Select this match")
    }

    @ViewBuilder
    private func candidateName(_ candidate: ScanReviewCandidate, font: Font, featured: Bool) -> some View {
        if let result = candidate.result {
            Text(result.name)
                .font(font)
                .foregroundStyle(.primary)
                .multilineTextAlignment(.leading)
                .fixedSize(horizontal: false, vertical: true)
        } else if isLoading {
            SkeletonPlaceholder(cornerRadius: 4)
                .frame(height: featured ? 22 : 18)
        } else {
            Text(candidate.identifier)
                .font(font)
                .foregroundStyle(.primary)
        }
    }

    @ViewBuilder
    private func candidatePrice(
        _ candidate: ScanReviewCandidate,
        font: Font,
        accent: Bool = true
    ) -> some View {
        if let result = candidate.result,
           let price = result.pricing.preferredUsedValue ?? result.pricing.preferredNewValue {
            BrickValCurrencyText(price)
                .font(font)
                .foregroundStyle(accent ? self.accent : .primary)
        } else if isLoading {
            SkeletonPlaceholder(cornerRadius: 4)
                .frame(width: 72, height: 16)
        } else {
            Text("Price unavailable")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }

    @ViewBuilder
    private func candidateImage(_ candidate: ScanReviewCandidate) -> some View {
        if let url = candidate.result?.imageURL {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .scaledToFit()
                        .padding(5)
                case .empty:
                    SkeletonPlaceholder(cornerRadius: 6)
                default:
                    fallbackImage
                }
            }
        } else if isLoading {
            SkeletonPlaceholder(cornerRadius: 6)
        } else {
            fallbackImage
        }
    }

    private var fallbackImage: some View {
        Image(systemName: "person.crop.square")
            .font(.title)
            .foregroundStyle(.secondary)
    }

    private var bottomAction: some View {
        VStack(spacing: 8) {
            if let loadError {
                Text(loadError)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
            }

            confirmationButton
        }
        .padding(.horizontal, 20)
        .padding(.top, 10)
        .padding(.bottom, 8)
        .background(.background)
    }

    @ViewBuilder
    private var confirmationButton: some View {
        let isEnabled = selectedCandidate != nil && !isConfirming

        if #available(iOS 26.0, *) {
            Button {
                confirmSelection()
            } label: {
                buttonLabel
            }
            .buttonStyle(.glassProminent)
            .tint(accent)
            .disabled(!isEnabled)
        } else {
            Button {
                confirmSelection()
            } label: {
                buttonLabel
                    .foregroundStyle(isEnabled ? .black : .secondary)
                    .frame(maxWidth: .infinity)
                    .frame(height: 54)
                    .background(
                        isEnabled ? accent : Color(uiColor: .tertiarySystemFill),
                        in: RoundedRectangle(cornerRadius: 16)
                    )
            }
            .buttonStyle(.plain)
            .disabled(!isEnabled)
        }
    }

    private var buttonLabel: some View {
        HStack {
            if isConfirming {
                ProgressView()
                    .tint(.black)
                Text("Opening match")
            } else {
                Text("Use this match")
                Spacer()
                Image(systemName: "arrow.right")
            }
        }
        .font(.headline)
        .padding(.horizontal, 20)
        .accessibilityLabel(isConfirming ? "Opening selected match" : "Use selected match")
    }

    private var topCandidate: ScanReviewCandidate? {
        candidates.max { lhs, rhs in lhs.score < rhs.score }
    }

    private var otherCandidates: [ScanReviewCandidate] {
        guard let topCandidate else { return [] }
        return candidates.filter { $0.id != topCandidate.id }
    }

    private var selectedCandidate: ScanReviewCandidate? {
        candidates.first { $0.id == selectedID }
    }

    private func select(_ candidate: ScanReviewCandidate) {
        let animation: Animation? = reduceMotion ? nil : .easeOut(duration: 0.24)
        withAnimation(animation) {
            selectedID = candidate.id
        }
    }

    private var imageLiftAnimation: Animation? {
        reduceMotion ? nil : .easeOut(duration: 0.34)
    }

    private var detailsLiftAnimation: Animation? {
        reduceMotion ? nil : .easeOut(duration: 0.30).delay(0.08)
    }

    private var otherCandidatesLiftAnimation: Animation? {
        reduceMotion ? nil : .easeOut(duration: 0.30).delay(0.16)
    }

    private func confirmSelection() {
        guard let selectedCandidate, !isConfirming else { return }
        isConfirming = true
        Task {
            await store.selectReviewCandidate(selectedCandidate)
            isConfirming = false
        }
    }

    private func loadCandidatesIfNeeded() async {
        guard candidates.contains(where: { $0.result == nil }) else {
            isLoading = false
            return
        }

        do {
            candidates = try await store.loadReviewCandidates(candidates)
        } catch is CancellationError {
            return
        } catch {
            loadError = BrickValLocalization.localized("Some match details could not be loaded. You can still choose a match.")
        }
        isLoading = false
    }

    private func accessibilityLabel(for candidate: ScanReviewCandidate) -> String {
        let confidence = candidate.score.formatted(.percent.precision(.fractionLength(0)).locale(BrickValLocalization.effectiveLanguage.locale))
        guard let result = candidate.result else {
            return BrickValLocalization.localized("\(candidate.identifier), \(confidence) match confidence")
        }
        let price = (result.pricing.preferredUsedValue ?? result.pricing.preferredNewValue).map {
            currency.formattedWithCode($0, to: preferences.effectiveCurrency, locale: BrickValLocalization.effectiveLanguage.locale)
        } ?? BrickValLocalization.localized("Price unavailable")
        return BrickValLocalization.localized("\(result.name), \(candidate.identifier), \(confidence) match confidence, \(price)")
    }
}

private struct ReviewSurfaceModifier: ViewModifier {
    let interactive: Bool
    var cornerRadius: CGFloat = 20

    func body(content: Content) -> some View {
        if #available(iOS 26.0, *) {
            if interactive {
                content.glassEffect(.regular.interactive(), in: .rect(cornerRadius: cornerRadius))
            } else {
                content.glassEffect(.regular, in: .rect(cornerRadius: cornerRadius))
            }
        } else {
            content.background(
                Color(uiColor: .secondarySystemBackground),
                in: RoundedRectangle(cornerRadius: cornerRadius)
            )
        }
    }
}
