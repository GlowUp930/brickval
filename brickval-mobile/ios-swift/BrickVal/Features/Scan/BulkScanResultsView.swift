import SwiftUI

struct BulkScanResultsView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(CollectionStore.self) private var collection
    @Environment(EntitlementStore.self) private var entitlements

    let results: [LookupResult]
    let unresolved: [IdentificationDetection]
    let store: ScanStore

    @State private var savedIDs: Set<String> = []
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            List {
                if !results.isEmpty {
                    Section("Valued minifigures") {
                        ForEach(results) { result in
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(result.name).font(.headline)
                                    Text(result.identifier).foregroundStyle(.secondary)
                                    Text(result.pricing.preferredNewValue ?? 0, format: .currency(code: "USD"))
                                }
                                Spacer()
                                Button(savedIDs.contains(result.id) ? "Saved" : "Save") {
                                    save(result)
                                }
                                .disabled(savedIDs.contains(result.id))
                            }
                        }
                    }
                }

                if !unresolved.isEmpty {
                    Section("Needs review") {
                        ForEach(unresolved) { detection in
                            Button {
                                Task { await store.selectDetection(detection) }
                            } label: {
                                HStack {
                                    VStack(alignment: .leading) {
                                        Text(detection.id).font(.headline)
                                        Text(detection.itemType.rawValue.capitalized)
                                            .foregroundStyle(.secondary)
                                    }
                                    Spacer()
                                    Image(systemName: "chevron.right")
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Bulk scan results")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        store.reset()
                        dismiss()
                    }
                }
            }
            .alert("Could not save", isPresented: Binding(
                get: { errorMessage != nil },
                set: { if !$0 { errorMessage = nil } }
            )) {
                Button("OK", role: .cancel) { errorMessage = nil }
            } message: {
                Text(errorMessage ?? "Try again.")
            }
        }
    }

    private func save(_ result: LookupResult) {
        Task {
            do {
                try await collection.add(
                    result.collectionItem(quantity: 1, condition: .newSealed),
                    isPro: entitlements.isPro
                )
                savedIDs.insert(result.id)
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }
}
