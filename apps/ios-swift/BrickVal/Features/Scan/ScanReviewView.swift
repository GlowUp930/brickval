import SwiftUI

struct ScanReviewView: View {
    @Environment(\.dismiss) private var dismiss
    let review: ScanReview
    let store: ScanStore

    var body: some View {
        NavigationStack {
            List(review.detections) { detection in
                Button {
                    Task {
                        await store.selectDetection(detection)
                    }
                } label: {
                    HStack {
                        VStack(alignment: .leading) {
                            Text(detection.id).font(.headline)
                            Text(detection.itemType.rawValue.capitalized).foregroundStyle(.secondary)
                        }
                        Spacer()
                        Text(detection.score, format: .percent.precision(.fractionLength(0)))
                    }
                }
            }
            .navigationTitle(review.detections.count == 1 ? "Confirm match" : "Review scan")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", systemImage: "xmark", action: dismiss.callAsFunction)
                }
            }
            .overlay {
                if review.detections.isEmpty {
                    ContentUnavailableView("No reviewable matches", systemImage: "questionmark.square.dashed")
                }
            }
        }
    }
}
