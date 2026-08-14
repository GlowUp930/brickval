import SwiftUI

struct FeedbackSurveySheet: View {
    @Environment(ProductFeedbackStore.self) private var feedback
    @Environment(\.dismiss) private var dismiss
    let survey: ProductFeedbackSurvey
    @State private var purchaseReason: PostPurchaseReason?
    @State private var acquisitionSource: AcquisitionSource?
    @State private var pmfSentiment: PMFSentiment?
    @State private var cancellationReason: CancellationReason?
    @State private var benefit = ""
    @State private var missing = ""
    @State private var additionalText = ""

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    header
                    content
                    if let errorMessage = feedback.errorMessage {
                        Text(errorMessage)
                            .font(.footnote)
                            .foregroundStyle(.red)
                    }
                }
                .padding(24)
            }
            .safeAreaInset(edge: .bottom) {
                Button(action: submit) {
                    Text(feedback.isSubmitting ? "Sending…" : actionTitle)
                        .font(.headline.weight(.bold))
                        .frame(maxWidth: .infinity, minHeight: 52)
                }
                .buttonStyle(.borderedProminent)
                .tint(BrickValStyle.Semantic.builderYellow)
                .foregroundStyle(BrickValStyle.Primitive.black)
                .disabled(feedback.isSubmitting || !canSubmit)
                .padding(.horizontal, 24)
                .padding(.vertical, 12)
                .background(.regularMaterial)
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Not now") {
                        feedback.dismissPresentedSurvey()
                        dismiss()
                    }
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.largeTitle.weight(.bold))
                .fixedSize(horizontal: false, vertical: true)
            Text(subtitle)
                .font(.body)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    @ViewBuilder
    private var content: some View {
        switch survey {
        case .cancellation:
            choiceSection("What made you decide not to continue?", choices: CancellationReason.allCases, selection: $cancellationReason) { $0.displayTitle }
            textField("Anything else? (Optional)", text: $additionalText)
        case .pmf:
            choiceSection("How would you feel if you could no longer use BrickValue?", choices: PMFSentiment.allCases, selection: $pmfSentiment) { $0.displayTitle }
            textField("What is the main benefit you get from BrickValue?", text: $benefit)
            textField("What is one thing that would make BrickValue more useful?", text: $missing)
        case .postPurchase:
            EmptyView()
        }
    }

    @ViewBuilder
    private func choiceSection<Value: CaseIterable & Equatable & RawRepresentable>(
        _ title: String,
        choices: Value.AllCases,
        selection: Binding<Value?>,
        label: @escaping (Value) -> String
    ) -> some View where Value.RawValue == String {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.headline)
                .fixedSize(horizontal: false, vertical: true)
            ForEach(Array(choices), id: \.rawValue) { choice in
                Button {
                    selection.wrappedValue = choice
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: selection.wrappedValue == choice ? "checkmark.circle.fill" : "circle")
                            .font(.title3)
                        Text(label(choice))
                            .font(.body)
                            .multilineTextAlignment(.leading)
                        Spacer(minLength: 0)
                    }
                    .foregroundStyle(selection.wrappedValue == choice ? BrickValStyle.Semantic.builderYellow : .primary)
                    .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                    .padding(.horizontal, 14)
                    .background(.white.opacity(selection.wrappedValue == choice ? 0.12 : 0.06), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .buttonStyle(.plain)
                .accessibilityLabel(label(choice))
                .accessibilityAddTraits(selection.wrappedValue == choice ? .isSelected : [])
            }
        }
    }

    private func textField(_ title: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.headline)
                .fixedSize(horizontal: false, vertical: true)
            TextField("Your answer", text: text, axis: .vertical)
                .lineLimit(3...6)
                .textFieldStyle(.plain)
                .padding(14)
                .background(.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
    }

    private var title: String {
        switch survey {
        case .cancellation: "Help us improve"
        case .pmf: "A quick question"
        case .postPurchase: ""
        }
    }

    private var subtitle: String {
        switch survey {
        case .cancellation: "Your Pro access stays active. This takes less than a minute."
        case .pmf: "Your feedback helps us focus BrickValue on what collectors need most."
        case .postPurchase: ""
        }
    }

    private var actionTitle: String {
        survey == .cancellation ? "Send feedback" : "Share feedback"
    }

    private var canSubmit: Bool {
        switch survey {
        case .cancellation: cancellationReason != nil
        case .pmf: pmfSentiment != nil && !benefit.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !missing.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        case .postPurchase: false
        }
    }

    private func submit() {
        Task {
            switch survey {
            case .cancellation:
                if let cancellationReason {
                    await feedback.submitCancellation(reason: cancellationReason, additionalText: additionalText)
                }
            case .pmf:
                if let pmfSentiment {
                    await feedback.submitPMF(sentiment: pmfSentiment, benefit: benefit, missing: missing)
                }
            case .postPurchase:
                break
            }
            if feedback.presentedSurvey == nil { dismiss() }
        }
    }
}

struct PostPurchaseSurveyCard: View {
    @Environment(ProductFeedbackStore.self) private var feedback
    @State private var reason: PostPurchaseReason?
    @State private var source: AcquisitionSource?
    @State private var otherText = ""

    var body: some View {
        guard feedback.postPurchaseContext != nil else { return AnyView(EmptyView()) }
        return AnyView(
            VStack(alignment: .leading, spacing: 14) {
                Text("One quick question")
                    .font(.title3.weight(.bold))
                    .foregroundStyle(BrickValStyle.Primitive.white)
                Text("What convinced you to upgrade? Select one answer, then tell us where you found BrickValue.")
                    .font(.subheadline)
                    .foregroundStyle(BrickValStyle.Primitive.white.opacity(0.72))
                    .fixedSize(horizontal: false, vertical: true)
                compactPicker("What convinced you?", values: PostPurchaseReason.allCases, selection: $reason) { $0.displayTitle }
                compactPicker("Where did you first hear about us?", values: AcquisitionSource.allCases, selection: $source) { $0.displayTitle }
                if reason == .other || source == .other {
                    TextField("Anything else? (Optional)", text: $otherText, axis: .vertical)
                        .lineLimit(2...4)
                        .textFieldStyle(.plain)
                        .padding(12)
                        .background(.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                HStack {
                    Button("Not now") { feedback.skipPostPurchase() }
                        .buttonStyle(.bordered)
                        .tint(.white.opacity(0.75))
                    Spacer()
                    Button {
                        guard let reason, let source else { return }
                        Task { await feedback.submitPostPurchase(reason: reason, source: source, otherText: otherText) }
                    } label: {
                        Text(feedback.isSubmitting ? "Sending…" : "Share")
                            .font(.subheadline.weight(.bold))
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(BrickValStyle.Semantic.builderYellow)
                    .foregroundStyle(BrickValStyle.Primitive.black)
                    .disabled(feedback.isSubmitting || reason == nil || source == nil)
                }
                if let errorMessage = feedback.errorMessage {
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundStyle(.red)
                }
            }
            .padding(16)
            .background(.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
        )
    }

    private func compactPicker<Value: CaseIterable & Equatable & RawRepresentable>(
        _ title: String,
        values: Value.AllCases,
        selection: Binding<Value?>,
        label: @escaping (Value) -> String
    ) -> some View where Value.RawValue == String {
        Menu {
            ForEach(Array(values), id: \.rawValue) { value in
                Button {
                    selection.wrappedValue = value
                } label: {
                    Label(label(value), systemImage: selection.wrappedValue == value ? "checkmark" : "")
                }
            }
        } label: {
            HStack {
                Text(selection.wrappedValue.map(label) ?? title)
                    .foregroundStyle(selection.wrappedValue == nil ? .secondary : .primary)
                Spacer()
                Image(systemName: "chevron.up.chevron.down")
                    .font(.caption.weight(.bold))
            }
            .padding(.horizontal, 12)
            .frame(minHeight: 44)
            .background(.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
        .accessibilityLabel(title)
    }
}
