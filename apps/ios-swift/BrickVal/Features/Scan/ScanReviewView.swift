import SwiftUI

struct ScanReviewView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    let review: ScanReview
    let store: ScanStore

    @State private var candidates: [ScanReviewCandidate]
    @State private var isLoading: Bool
    @State private var loadError: String?

    init(review: ScanReview, store: ScanStore) {
        self.review = review
        self.store = store
        _candidates = State(initialValue: review.candidates)
        _isLoading = State(initialValue: review.candidates.contains { $0.result == nil })
    }

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 0) {
                Text(candidates.count == 1 ? "Confirm match" : "Choose a match")
                    .font(.title2.bold())
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.horizontal)
                    .padding(.vertical, 12)

                List(candidates) { candidate in
                    Button {
                        Task {
                            await store.selectReviewCandidate(candidate)
                        }
                    } label: {
                        candidateRow(candidate)
                    }
                    .accessibilityLabel(accessibilityLabel(for: candidate))
                    .accessibilityHint("Select this minifigure")
                }
                .overlay {
                    if candidates.isEmpty {
                        ContentUnavailableView("No reviewable matches", systemImage: "questionmark.square.dashed")
                    }
                }
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Retake", systemImage: "xmark") {
                        store.reset()
                        dismiss()
                    }
                    .labelStyle(.iconOnly)
                    .font(.body)
                }
            }
            .safeAreaInset(edge: .bottom) {
                if let loadError {
                    Text(loadError)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                        .padding(.vertical, 8)
                        .frame(maxWidth: .infinity)
                        .background(.bar)
                }
            }
            .task {
                guard candidates.contains(where: { $0.result == nil }) else {
                    isLoading = false
                    return
                }
                do {
                    candidates = try await store.loadReviewCandidates(candidates)
                } catch is CancellationError {
                    return
                } catch {
                    loadError = "Details could not be loaded. You can still choose a match."
                }
                isLoading = false
            }
        }
    }

    @ViewBuilder
    private func candidateRow(_ candidate: ScanReviewCandidate) -> some View {
        if dynamicTypeSize.isAccessibilitySize {
            accessibilityCandidateRow(candidate)
        } else {
            standardCandidateRow(candidate)
        }
    }

    private func standardCandidateRow(_ candidate: ScanReviewCandidate) -> some View {
        HStack(spacing: 14) {
            candidateImage(candidate)
                .frame(width: 72, height: 72)

            VStack(alignment: .leading, spacing: 5) {
                if let result = candidate.result {
                    Text(result.name)
                        .font(.headline)
                        .foregroundStyle(.primary)
                        .lineLimit(3)
                        .fixedSize(horizontal: false, vertical: true)
                    Text(result.identifier)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    if let price = result.pricing.preferredUsedValue ?? result.pricing.preferredNewValue {
                        Text(price, format: .currency(code: "USD"))
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(BrickValStyle.ScanResult.accent)
                    }
                } else if isLoading {
                    SkeletonPlaceholder(cornerRadius: 4).frame(height: 18)
                    SkeletonPlaceholder(cornerRadius: 4).frame(width: 92, height: 14)
                } else {
                    Text(candidate.identifier)
                        .font(.headline)
                        .foregroundStyle(.primary)
                }
                Text(candidate.score, format: .percent.precision(.fractionLength(0)))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer(minLength: 8)
            Image(systemName: "chevron.right")
                .foregroundStyle(.secondary)
                .accessibilityHidden(true)
        }
        .padding(.vertical, 4)
    }

    private func accessibilityCandidateRow(_ candidate: ScanReviewCandidate) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 12) {
                candidateImage(candidate)
                    .frame(width: 60, height: 60)
                VStack(alignment: .leading, spacing: 4) {
                    Text(candidate.identifier)
                        .font(.headline)
                    Text(candidate.score, format: .percent.precision(.fractionLength(0)))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer(minLength: 8)
                Image(systemName: "chevron.right")
                    .foregroundStyle(.secondary)
                    .accessibilityHidden(true)
            }

            if let result = candidate.result {
                Text(result.name)
                    .font(.headline)
                    .foregroundStyle(.primary)
                    .fixedSize(horizontal: false, vertical: true)
                if let price = result.pricing.preferredUsedValue ?? result.pricing.preferredNewValue {
                    Text(price, format: .currency(code: "USD"))
                        .font(.headline)
                        .foregroundStyle(BrickValStyle.ScanResult.accent)
                }
            } else if isLoading {
                SkeletonPlaceholder(cornerRadius: 4).frame(height: 22)
            }
        }
        .padding(.vertical, 6)
    }

    @ViewBuilder
    private func candidateImage(_ candidate: ScanReviewCandidate) -> some View {
        if let url = candidate.result?.imageURL {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let image):
                    image.resizable().scaledToFit()
                case .empty:
                    SkeletonPlaceholder(cornerRadius: 6)
                default:
                    Image(systemName: "person.crop.square")
                        .font(.title)
                        .foregroundStyle(.secondary)
                }
            }
        } else if isLoading {
            SkeletonPlaceholder(cornerRadius: 6)
        } else {
            Image(systemName: "person.crop.square")
                .font(.title)
                .foregroundStyle(.secondary)
        }
    }

    private func accessibilityLabel(for candidate: ScanReviewCandidate) -> String {
        let confidence = candidate.score.formatted(.percent.precision(.fractionLength(0)))
        guard let result = candidate.result else {
            return "\(candidate.identifier), \(confidence) match confidence"
        }
        let price = (result.pricing.preferredUsedValue ?? result.pricing.preferredNewValue)?
            .formatted(.currency(code: "USD")) ?? "price unavailable"
        return "\(result.name), \(result.identifier), \(confidence) match confidence, \(price)"
    }
}
