import SwiftUI

struct FeedbackSurveySheet: View {
    @Environment(ProductFeedbackStore.self) private var feedback
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    let survey: ProductFeedbackSurvey

    @State private var postPurchaseReasons = Set<PostPurchaseReason>()
    @State private var acquisitionSource: AcquisitionSource?
    @State private var pmfSentiment: PMFSentiment?
    @State private var pmfBenefits = Set<String>()
    @State private var pmfImprovements = Set<String>()
    @State private var cancellationReasons = Set<CancellationReason>()
    @State private var additionalText = ""
    @State private var showsNoteField = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    FeedbackHeader(
                        emoji: heroEmoji,
                        title: title,
                        subtitle: subtitle
                    )
                    content
                    if let errorMessage = feedback.errorMessage {
                        Text(errorMessage)
                            .font(.footnote)
                            .foregroundStyle(.red)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                .padding(.horizontal, 24)
                .padding(.top, 20)
                .padding(.bottom, 108)
            }
            .safeAreaInset(edge: .bottom) {
                Button(action: submit) {
                    Text(feedback.isSubmitting ? "Sending…" : actionTitle)
                        .font(.headline.weight(.bold))
                        .frame(maxWidth: .infinity, minHeight: 52)
                }
                .buttonStyle(FeedbackPrimaryButtonStyle(isEnabled: canSubmit && !feedback.isSubmitting))
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
        .presentationDragIndicator(.visible)
        .preferredColorScheme(.dark)
    }

    @ViewBuilder
    private var content: some View {
        switch survey {
        case .cancellation:
            FeedbackSection(
                title: "What got in the way?",
                subtitle: "Choose any that fit. This takes a few taps."
            ) {
                FeedbackMultiChoiceGrid(
                    values: CancellationReason.allCases,
                    selection: $cancellationReasons,
                    title: { $0.feedbackTitle },
                    emoji: { $0.feedbackEmoji }
                )
            }

            optionalNote
        case .pmf:
            FeedbackSection(
                title: "How would you feel without BrickValue?",
                subtitle: "Pick the emoji that fits best."
            ) {
                FeedbackSentimentGrid(
                    values: PMFSentiment.allCases,
                    selection: $pmfSentiment,
                    title: { $0.feedbackTitle },
                    emoji: { $0.feedbackEmoji }
                )
            }

            FeedbackSection(
                title: "What do you value most?",
                subtitle: "Choose up to three."
            ) {
                FeedbackMultiChoiceGrid(
                    values: PMFFeedbackOptions.benefits,
                    selection: $pmfBenefits,
                    title: { PMFFeedbackOptions.title(forBenefit: $0) },
                    emoji: { PMFFeedbackOptions.benefitEmoji(for: $0) }
                )
            }

            FeedbackSection(
                title: "What should we improve next?",
                subtitle: "Choose any that would help."
            ) {
                FeedbackMultiChoiceGrid(
                    values: PMFFeedbackOptions.improvements,
                    selection: $pmfImprovements,
                    title: { PMFFeedbackOptions.title(forImprovement: $0) },
                    emoji: { PMFFeedbackOptions.improvementEmoji(for: $0) }
                )
            }
        case .postPurchase:
            EmptyView()
        }
    }

    @ViewBuilder
    private var optionalNote: some View {
        VStack(alignment: .leading, spacing: 12) {
            Button {
                if reduceMotion {
                    showsNoteField.toggle()
                } else {
                    withAnimation(.snappy(duration: 0.2)) {
                        showsNoteField.toggle()
                    }
                }
            } label: {
                Label(
                    showsNoteField ? "Hide note" : "Add a note (optional)",
                    systemImage: showsNoteField ? "minus.circle" : "plus.circle"
                )
                .font(.subheadline.weight(.semibold))
            }
            .buttonStyle(.plain)
            .foregroundStyle(BrickValStyle.Semantic.builderYellow)

            if showsNoteField {
                TextField("Anything else?", text: $additionalText, axis: .vertical)
                    .lineLimit(2...5)
                    .textFieldStyle(.plain)
                    .padding(14)
                    .background(.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .transition(reduceMotion ? .opacity : .opacity.combined(with: .move(edge: .top)))
            }
        }
    }

    private var title: LocalizedStringResource {
        switch survey {
        case .cancellation: "Help us improve"
        case .pmf: "A quick question"
        case .postPurchase: ""
        }
    }

    private var subtitle: LocalizedStringResource {
        switch survey {
        case .cancellation: "Your Pro access stays active. Share what happened in a few taps."
        case .pmf: "Your feedback helps us focus BrickValue on what collectors need most."
        case .postPurchase: ""
        }
    }

    private var heroEmoji: String {
        switch survey {
        case .cancellation: "🧱"
        case .pmf: "💬"
        case .postPurchase: "🎉"
        }
    }

    private var actionTitle: String {
        survey == .cancellation ? BrickValLocalization.localized("Send feedback") : BrickValLocalization.localized("Share feedback")
    }

    private var canSubmit: Bool {
        switch survey {
        case .cancellation:
            !cancellationReasons.isEmpty
        case .pmf:
            pmfSentiment != nil && !pmfBenefits.isEmpty && !pmfImprovements.isEmpty
        case .postPurchase:
            false
        }
    }

    private func submit() {
        Task {
            switch survey {
            case .cancellation:
                await feedback.submitCancellation(
                    reasons: cancellationReasons,
                    additionalText: additionalText
                )
            case .pmf:
                if let pmfSentiment {
                    await feedback.submitPMF(
                        sentiment: pmfSentiment,
                        benefits: pmfBenefits,
                        improvements: pmfImprovements
                    )
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
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    @State private var reasons = Set<PostPurchaseReason>()
    @State private var source: AcquisitionSource?
    @State private var otherText = ""
    @State private var showsNoteField = false

    @ViewBuilder
    var body: some View {
        if feedback.postPurchaseContext != nil {
            VStack(alignment: .leading, spacing: 16) {
                FeedbackHeader(
                    emoji: "🧱",
                    title: "One quick question",
                    subtitle: "Help us understand what makes BrickValue worth keeping."
                )

                FeedbackSection(
                    title: "What convinced you to upgrade?",
                    subtitle: "Choose any that apply."
                ) {
                    FeedbackMultiChoiceGrid(
                        values: PostPurchaseReason.allCases,
                        selection: $reasons,
                        title: { $0.feedbackTitle },
                        emoji: { $0.feedbackEmoji }
                    )
                }

                FeedbackSection(
                    title: "Where did you first hear about BrickValue?",
                    subtitle: "Choose one."
                ) {
                    FeedbackSingleChoiceGrid(
                        values: AcquisitionSource.allCases,
                        selection: $source,
                        title: { $0.feedbackTitle },
                        emoji: { $0.feedbackEmoji }
                    )
                }

                if reasons.contains(.other) || source == .other {
                    Button {
                        if reduceMotion {
                            showsNoteField.toggle()
                        } else {
                            withAnimation(.snappy(duration: 0.2)) {
                                showsNoteField.toggle()
                            }
                        }
                    } label: {
                        Label(
                            showsNoteField ? "Hide note" : "Add a note (optional)",
                            systemImage: showsNoteField ? "minus.circle" : "plus.circle"
                        )
                        .font(.subheadline.weight(.semibold))
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(BrickValStyle.Semantic.builderYellow)

                    if showsNoteField {
                        TextField("Anything else?", text: $otherText, axis: .vertical)
                            .lineLimit(2...4)
                            .textFieldStyle(.plain)
                            .padding(12)
                            .background(.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                            .transition(reduceMotion ? .opacity : .opacity.combined(with: .move(edge: .top)))
                    }
                }

                HStack(spacing: 12) {
                    Button("Not now") { feedback.skipPostPurchase() }
                        .buttonStyle(.bordered)
                        .tint(.white.opacity(0.75))

                    Button {
                        guard let source, !reasons.isEmpty else { return }
                        Task {
                            await feedback.submitPostPurchase(
                                reasons: reasons,
                                source: source,
                                otherText: otherText
                            )
                        }
                    } label: {
                        Text(feedback.isSubmitting ? "Sending…" : "Share")
                            .font(.subheadline.weight(.bold))
                    }
                    .buttonStyle(FeedbackPrimaryButtonStyle(isEnabled: !feedback.isSubmitting && !reasons.isEmpty && source != nil))
                    .disabled(feedback.isSubmitting || reasons.isEmpty || source == nil)
                }

                if let errorMessage = feedback.errorMessage {
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .padding(16)
            .background(.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
        }
    }
}

private struct FeedbackHeader: View {
    let emoji: String
    let title: LocalizedStringResource
    let subtitle: LocalizedStringResource

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            Text(emoji)
                .font(.largeTitle)
                .frame(width: 52, height: 52)
                .background(BrickValStyle.Semantic.builderYellow.opacity(0.16), in: Circle())
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 6) {
                Text(title)
                    .font(.largeTitle.weight(.bold))
                    .fixedSize(horizontal: false, vertical: true)
                Text(subtitle)
                    .font(.body)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }
}

private struct FeedbackSection<Content: View>: View {
    let title: LocalizedStringResource
    let subtitle: LocalizedStringResource
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)
                    .fixedSize(horizontal: false, vertical: true)
                Text(subtitle)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            content()
        }
    }
}

private struct FeedbackMultiChoiceGrid<Value: Hashable>: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    let values: [Value]
    @Binding var selection: Set<Value>
    let title: (Value) -> String
    let emoji: (Value) -> String

    var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 145), spacing: 10)], spacing: 10) {
            ForEach(values, id: \.self) { value in
                let isSelected = selection.contains(value)
                Button {
                    updateSelection(value)
                } label: {
                    FeedbackChoiceTile(
                        title: title(value),
                        emoji: emoji(value),
                        isSelected: isSelected
                    )
                }
                .buttonStyle(.plain)
                .accessibilityLabel(title(value))
                .accessibilityValue(isSelected ? "Selected" : "Not selected")
                .accessibilityHint("Double-tap to \(isSelected ? "remove" : "select") this answer")
                .accessibilityAddTraits(isSelected ? .isSelected : [])
            }
        }
        .animation(reduceMotion ? nil : .snappy(duration: 0.18), value: selection)
    }

    private func updateSelection(_ value: Value) {
        if reduceMotion {
            toggle(value)
        } else {
            withAnimation(.snappy(duration: 0.18)) {
                toggle(value)
            }
        }
    }

    private func toggle(_ value: Value) {
        if selection.contains(value) {
            selection.remove(value)
        } else {
            selection.insert(value)
        }
    }
}

private struct FeedbackSingleChoiceGrid<Value: Hashable>: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    let values: [Value]
    @Binding var selection: Value?
    let title: (Value) -> String
    let emoji: (Value) -> String

    var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 145), spacing: 10)], spacing: 10) {
            ForEach(values, id: \.self) { value in
                let isSelected = selection == value
                Button {
                    if reduceMotion {
                        selection = value
                    } else {
                        withAnimation(.snappy(duration: 0.18)) {
                            selection = value
                        }
                    }
                } label: {
                    FeedbackChoiceTile(
                        title: title(value),
                        emoji: emoji(value),
                        isSelected: isSelected
                    )
                }
                .buttonStyle(.plain)
                .accessibilityLabel(title(value))
                .accessibilityValue(isSelected ? "Selected" : "Not selected")
                .accessibilityHint("Double-tap to select this answer")
                .accessibilityAddTraits(isSelected ? .isSelected : [])
            }
        }
        .animation(reduceMotion ? nil : .snappy(duration: 0.18), value: selection)
    }
}

private struct FeedbackSentimentGrid: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    let values: [PMFSentiment]
    @Binding var selection: PMFSentiment?
    let title: (PMFSentiment) -> String
    let emoji: (PMFSentiment) -> String

    var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 145), spacing: 10)], spacing: 10) {
            ForEach(values, id: \.self) { value in
                let isSelected = selection == value
                Button {
                    if reduceMotion {
                        selection = value
                    } else {
                        withAnimation(.snappy(duration: 0.18)) {
                            selection = value
                        }
                    }
                } label: {
                    VStack(spacing: 8) {
                        Text(emoji(value))
                            .font(.system(size: 34))
                            .accessibilityHidden(true)

                        Text(title(value))
                            .font(.body.weight(.semibold))
                            .multilineTextAlignment(.center)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .foregroundStyle(isSelected ? BrickValStyle.Semantic.builderYellow : .primary)
                    .frame(maxWidth: .infinity, minHeight: 92)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 12)
                    .background(
                        isSelected
                            ? BrickValStyle.Semantic.builderYellow.opacity(0.16)
                            : BrickValStyle.Primitive.white.opacity(0.07),
                        in: RoundedRectangle(cornerRadius: 14, style: .continuous)
                    )
                    .overlay(alignment: .topTrailing) {
                        Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                            .font(.title3)
                            .foregroundStyle(isSelected ? BrickValStyle.Semantic.builderYellow : .secondary)
                            .padding(10)
                            .accessibilityHidden(true)
                    }
                }
                .buttonStyle(.plain)
                .accessibilityLabel(title(value))
                .accessibilityValue(isSelected ? "Selected" : "Not selected")
                .accessibilityHint("Double-tap to select this answer")
                .accessibilityAddTraits(isSelected ? .isSelected : [])
            }
        }
        .animation(reduceMotion ? nil : .snappy(duration: 0.18), value: selection)
    }
}

private struct FeedbackChoiceTile: View {
    let title: String
    let emoji: String
    let isSelected: Bool

    var body: some View {
        VStack(spacing: 8) {
            Text(emoji)
                .font(.title2)
                .accessibilityHidden(true)

            Text(title)
                .font(.body.weight(.semibold))
                .multilineTextAlignment(.center)
                .lineLimit(3)
                .fixedSize(horizontal: false, vertical: true)
        }
        .foregroundStyle(isSelected ? BrickValStyle.Semantic.builderYellow : .primary)
        .frame(maxWidth: .infinity, minHeight: 92)
        .padding(.horizontal, 12)
        .padding(.vertical, 12)
        .background(
            isSelected
                ? BrickValStyle.Semantic.builderYellow.opacity(0.16)
                : BrickValStyle.Primitive.white.opacity(0.07),
            in: RoundedRectangle(cornerRadius: 14, style: .continuous)
        )
        .overlay {
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(
                    isSelected ? BrickValStyle.Semantic.builderYellow.opacity(0.78) : .white.opacity(0.08),
                    lineWidth: 1
                )
        }
        .overlay(alignment: .topTrailing) {
            Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                .font(.title3)
                .foregroundStyle(isSelected ? BrickValStyle.Semantic.builderYellow : .secondary)
                .padding(10)
                .accessibilityHidden(true)
        }
    }
}

private struct FeedbackPrimaryButtonStyle: ButtonStyle {
    let isEnabled: Bool

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .foregroundStyle(isEnabled ? BrickValStyle.Primitive.black : BrickValStyle.Primitive.white.opacity(0.48))
            .background(
                isEnabled
                    ? BrickValStyle.Semantic.builderYellow
                    : BrickValStyle.Primitive.white.opacity(0.12),
                in: RoundedRectangle(cornerRadius: 16, style: .continuous)
            )
            .opacity(configuration.isPressed ? 0.82 : 1)
    }
}

private enum PMFFeedbackOptions {
    static let benefits = [
        "Fast scans",
        "Bulk scan",
        "Collection value",
        "Market history",
        "Themes",
        "Something else"
    ]

    static let improvements = [
        "Better matches",
        "Faster results",
        "More LEGO coverage",
        "Collection insights",
        "More customization",
        "Nothing right now"
    ]

    static func title(forBenefit value: String) -> String {
        switch value {
        case "Fast scans": BrickValLocalization.localized("Fast scans")
        case "Bulk scan": BrickValLocalization.localized("Bulk scan")
        case "Collection value": BrickValLocalization.localized("Collection value")
        case "Market history": BrickValLocalization.localized("Market history")
        case "Themes": BrickValLocalization.localized("Themes")
        default: BrickValLocalization.localized("Something else")
        }
    }

    static func title(forImprovement value: String) -> String {
        switch value {
        case "Better matches": BrickValLocalization.localized("Better matches")
        case "Faster results": BrickValLocalization.localized("Faster results")
        case "More LEGO coverage": BrickValLocalization.localized("More LEGO coverage")
        case "Collection insights": BrickValLocalization.localized("Collection insights")
        case "More customization": BrickValLocalization.localized("More customization")
        default: BrickValLocalization.localized("Nothing right now")
        }
    }

    static func benefitEmoji(for value: String) -> String {
        switch value {
        case "Fast scans": "📸"
        case "Bulk scan": "🧺"
        case "Collection value": "📦"
        case "Market history": "📈"
        case "Themes": "🎨"
        default: "💡"
        }
    }

    static func improvementEmoji(for value: String) -> String {
        switch value {
        case "Better matches": "🎯"
        case "Faster results": "⚡️"
        case "More LEGO coverage": "🧱"
        case "Collection insights": "🔎"
        case "More customization": "✨"
        default: "👍"
        }
    }
}

private extension PostPurchaseReason {
    var feedbackTitle: String {
        switch self {
        case .unlimitedScans: BrickValLocalization.localized("Unlimited scans")
        case .bulkScanning: BrickValLocalization.localized("Bulk scan")
        case .collectionTracking: BrickValLocalization.localized("Collection tracking")
        case .valuesHistory: BrickValLocalization.localized("Values + history")
        case .customization: BrickValLocalization.localized("Customization")
        case .supportingBrickValue: BrickValLocalization.localized("Support BrickValue")
        case .other: BrickValLocalization.localized("Something else")
        }
    }

    var feedbackEmoji: String {
        switch self {
        case .unlimitedScans: "♾️"
        case .bulkScanning: "🧺"
        case .collectionTracking: "📦"
        case .valuesHistory: "📈"
        case .customization: "🎨"
        case .supportingBrickValue: "💛"
        case .other: "💡"
        }
    }
}

private extension AcquisitionSource {
    var feedbackTitle: String {
        switch self {
        case .tiktok: BrickValLocalization.localized("TikTok")
        case .instagram: BrickValLocalization.localized("Instagram")
        case .youtube: BrickValLocalization.localized("YouTube")
        case .appStoreSearch: BrickValLocalization.localized("App Store search")
        case .webSearch: BrickValLocalization.localized("Google or web search")
        case .friendCommunity: BrickValLocalization.localized("Friend or LEGO community")
        case .other: BrickValLocalization.localized("Something else")
        }
    }

    var feedbackEmoji: String {
        switch self {
        case .tiktok: "🎵"
        case .instagram: "📷"
        case .youtube: "▶️"
        case .appStoreSearch: "🔎"
        case .webSearch: "🌐"
        case .friendCommunity: "👋"
        case .other: "💡"
        }
    }
}

private extension PMFSentiment {
    var feedbackTitle: String {
        switch self {
        case .veryDisappointed: BrickValLocalization.localized("Very disappointed")
        case .somewhatDisappointed: BrickValLocalization.localized("Somewhat disappointed")
        case .notDisappointed: BrickValLocalization.localized("Not disappointed")
        case .noLongerUse: BrickValLocalization.localized("I no longer use it")
        }
    }

    var feedbackEmoji: String {
        switch self {
        case .veryDisappointed: "😢"
        case .somewhatDisappointed: "😕"
        case .notDisappointed: "🙂"
        case .noLongerUse: "👋"
        }
    }
}

private extension CancellationReason {
    var feedbackTitle: String {
        switch self {
        case .price: BrickValLocalization.localized("Price")
        case .scanAccuracy: BrickValLocalization.localized("Accuracy")
        case .scanSpeed: BrickValLocalization.localized("Speed")
        case .notEnoughUse: BrickValLocalization.localized("Not using it")
        case .missingFeature: BrickValLocalization.localized("Missing feature")
        case .technicalProblem: BrickValLocalization.localized("Technical issue")
        case .temporaryNeed: BrickValLocalization.localized("Temporary need")
        case .other: BrickValLocalization.localized("Something else")
        }
    }

    var feedbackEmoji: String {
        switch self {
        case .price: "💰"
        case .scanAccuracy: "🎯"
        case .scanSpeed: "⚡️"
        case .notEnoughUse: "📅"
        case .missingFeature: "🧩"
        case .technicalProblem: "🛠️"
        case .temporaryNeed: "⏳"
        case .other: "💡"
        }
    }
}
