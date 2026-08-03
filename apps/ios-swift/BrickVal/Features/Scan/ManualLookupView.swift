import SwiftUI

struct ManualLookupView: View {
    @Environment(\.dismiss) private var dismiss
    let store: ScanStore
    @State private var identifier = ""
    @State private var itemType: ItemType = .set
    @State private var colorID: Int?
    @State private var isLoading = false
    @State private var errorMessage: String?
    @FocusState private var isIdentifierFocused: Bool

    var body: some View {
        NavigationStack {
            Form {
                Section("Item") {
                    Picker("Type", selection: $itemType) {
                        ForEach(ItemType.allCases, id: \.self) { Text($0.rawValue.capitalized).tag($0) }
                    }
                    TextField("Set, minifigure, or part number", text: $identifier)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .focused($isIdentifierFocused)
                    if itemType == .part {
                        TextField("Colour ID", value: $colorID, format: .number)
                            .keyboardType(.numberPad)
                    }
                }
                if isLoading {
                    Section {
                        HStack(spacing: 12) {
                            ProgressView()
                            VStack(alignment: .leading, spacing: 3) {
                                Text("Looking up the item")
                                    .font(.subheadline.weight(.semibold))
                                Text("Finding the current market value…")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
                if let errorMessage {
                    Section { Text(errorMessage).foregroundStyle(.red) }
                }
            }
            .navigationTitle("Manual lookup")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", action: dismiss.callAsFunction)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isLoading ? "Looking up…" : "Look up", action: lookup)
                        .disabled(
                            identifier.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ||
                            isLoading ||
                            (itemType == .part && colorID == nil)
                        )
                }
            }
            .onAppear { isIdentifierFocused = true }
        }
    }

    private func lookup() {
        isIdentifierFocused = false
        Task {
            isLoading = true
            defer { isLoading = false }
            do {
                try await store.manualLookup(
                    identifier: identifier.trimmingCharacters(in: .whitespacesAndNewlines),
                    type: itemType,
                    colorID: colorID
                )
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }
}
