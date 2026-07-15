import Charts
import SwiftUI

struct ItemDetailView: View {
    @Environment(CollectionStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let item: CollectionItem
    @State private var showDeleteConfirmation = false
    @State private var errorMessage: String?

    var body: some View {
        List {
            Section {
                AsyncImage(url: item.imageURL) { image in
                    image.resizable().scaledToFit()
                } placeholder: {
                    ProgressView()
                }
                .frame(maxWidth: .infinity, minHeight: 220, maxHeight: 320)
                .listRowBackground(Color.clear)
            }
            Section("Value") {
                LabeledContent("Total", value: item.totalValue, format: .currency(code: "USD"))
                LabeledContent("Each", value: item.marketValueUSD ?? 0, format: .currency(code: "USD"))
                LabeledContent("Quantity", value: item.quantity, format: .number)
                LabeledContent("Condition", value: item.condition.title)
            }
            Section("Item") {
                LabeledContent("Number", value: item.setNumber)
                LabeledContent("Type", value: item.itemType.rawValue.capitalized)
                if let year = item.yearReleased { LabeledContent("Released", value: year, format: .number.grouping(.never)) }
                if let pieces = item.pieces { LabeledContent("Pieces", value: pieces, format: .number) }
                if let color = item.colorName { LabeledContent("Colour", value: color) }
            }
            if !item.marketHistory.isEmpty {
                Section("Market history") {
                    Chart(item.marketHistory) { point in
                        LineMark(x: .value("Date", point.date), y: .value("Price", point.priceUSD))
                            .foregroundStyle(.tint)
                    }
                    .frame(height: 220)
                    .accessibilityLabel("Market history for \(item.name)")
                }
            }
            Section {
                Button("Remove from collection", systemImage: "trash", role: .destructive) {
                    showDeleteConfirmation = true
                }
            }
        }
        .navigationTitle(item.name)
        .navigationBarTitleDisplayMode(.inline)
        .confirmationDialog("Remove this item?", isPresented: $showDeleteConfirmation, titleVisibility: .visible) {
            Button("Remove", role: .destructive) { Task { await remove() } }
        }
        .alert("Could not remove item", isPresented: errorBinding) { }
    }

    private var errorBinding: Binding<Bool> {
        Binding(get: { errorMessage != nil }, set: { if !$0 { errorMessage = nil } })
    }

    private func remove() async {
        do {
            try await store.remove(item)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
