import StoreKit
import SwiftUI

struct ScanResultView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.requestReview) private var requestReview
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(CollectionStore.self) private var collection
    @Environment(EntitlementStore.self) private var entitlements
    @Environment(PreferencesStore.self) private var preferences

    let result: LookupResult
    let reset: () -> Void

    @State private var condition: CollectionCondition = .newSealed
    @State private var quantity = 1
    @State private var displayedValue = 0.0
    @State private var isSaving = false
    @State private var didSave = false
    @State private var errorMessage: String?

    private var currentValue: Double {
        condition == .used ? result.pricing.preferredUsedValue ?? 0 : result.pricing.preferredNewValue ?? 0
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: BrickValStyle.sectionSpacing) {
                    AsyncImage(url: result.imageURL) { image in
                        image.resizable().scaledToFit()
                    } placeholder: {
                        ProgressView()
                    }
                    .frame(maxWidth: .infinity, minHeight: 180, maxHeight: 280)

                    VStack(spacing: 8) {
                        Text(result.name)
                            .font(.title.bold())
                            .multilineTextAlignment(.center)
                        Text(result.identifier)
                            .foregroundStyle(.secondary)
                        Text(displayedValue, format: .currency(code: "USD"))
                            .font(.system(.largeTitle, design: .rounded).bold())
                            .contentTransition(.numericText(value: displayedValue))
                            .accessibilityLabel("Estimated market value")
                    }

                    Picker("Condition", selection: $condition) {
                        ForEach(CollectionCondition.allCases, id: \.self) { Text($0.title).tag($0) }
                    }
                    .pickerStyle(.segmented)

                    Stepper("Quantity: \(quantity)", value: $quantity, in: 1 ... 99)
                        .brickValCard()

                    if let source = result.pricing.dataSource {
                        Label(source == "sold" ? "Based on sold market data" : "Based on active listings", systemImage: source == "sold" ? "checkmark.seal" : "tag")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }

                    Button(isSaving ? "Saving…" : "Save to collection", systemImage: "plus.circle.fill", action: save)
                        .buttonStyle(.borderedProminent)
                        .controlSize(.large)
                        .disabled(isSaving)
                }
                .padding()
            }
            .navigationTitle("Scan result")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done", action: close)
                }
            }
            .task(id: condition) { revealPrice() }
            .sensoryFeedback(.success, trigger: didSave)
            .alert("Could not save", isPresented: errorBinding) { }
        }
    }

    private var errorBinding: Binding<Bool> {
        Binding(get: { errorMessage != nil }, set: { if !$0 { errorMessage = nil } })
    }

    private func revealPrice() {
        let value = currentValue
        if reduceMotion {
            displayedValue = value
        } else {
            displayedValue = 0
            withAnimation(.timingCurve(0.22, 1, 0.36, 1, duration: 0.9)) {
                displayedValue = value
            }
        }
    }

    private func save() {
        Task {
            isSaving = true
            defer { isSaving = false }
            do {
                try await collection.add(
                    result.collectionItem(quantity: quantity, condition: condition),
                    isPro: entitlements.isPro
                )
                didSave = true
                if !preferences.hasRequestedReview {
                    preferences.hasRequestedReview = true
                    requestReview()
                }
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }

    private func close() {
        reset()
        dismiss()
    }
}
