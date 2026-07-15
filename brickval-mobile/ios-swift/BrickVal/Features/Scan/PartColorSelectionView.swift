import SwiftUI

struct PartColorSelectionView: View {
    @Environment(\.dismiss) private var dismiss
    let detection: IdentificationDetection
    let store: ScanStore

    @State private var colors: [PartColorOption] = []
    @State private var query = ""
    @State private var errorMessage: String?

    private var filteredColors: [PartColorOption] {
        guard !query.isEmpty else { return colors }
        return colors.filter { $0.colorName.localizedStandardContains(query) }
    }

    var body: some View {
        NavigationStack {
            List(filteredColors) { color in
                Button(color.colorName) {
                    Task { await store.selectPartColor(color, for: detection) }
                }
            }
            .searchable(text: $query, prompt: "Search colours")
            .navigationTitle("Choose part colour")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", action: dismiss.callAsFunction)
                }
            }
            .overlay {
                if colors.isEmpty, errorMessage == nil {
                    ProgressView("Loading colours…")
                } else if let errorMessage {
                    ContentUnavailableView(
                        "Colours unavailable",
                        systemImage: "paintpalette",
                        description: Text(errorMessage)
                    )
                }
            }
            .task {
                do {
                    colors = try await store.loadPartColors()
                } catch {
                    errorMessage = "Try again in a moment, or use manual lookup with a BrickLink colour ID."
                }
            }
        }
    }
}
