import SwiftUI

#if DEBUG
struct ProfileDesignDraftsView: View {
    enum Draft: String, CaseIterable, Identifiable {
        case compact
        case collectorCard
        case nativeList
        case stage

        var id: String { rawValue }

        var shortTitle: String {
            switch self {
            case .compact: "Compact"
            case .collectorCard: "Card"
            case .nativeList: "List"
            case .stage: "Stage"
            }
        }

        var title: String {
            switch self {
            case .compact: "Compact profile"
            case .collectorCard: "Collector card"
            case .nativeList: "Native settings"
            case .stage: "Centered stage"
            }
        }

        var summary: String {
            switch self {
            case .compact:
                "A focused identity header with the most important account actions."
            case .collectorCard:
                "A collectible profile card that makes the avatar the hero."
            case .nativeList:
                "The most familiar iOS structure, with customization kept close to the avatar."
            case .stage:
                "A calm, centered profile stage with a quick icon and color switcher."
            }
        }
    }

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var selectedDraft: Draft
    @State private var selectedAvatarID = ProfileDraftAvatar.samples[0].id
    @State private var avatarBackground = ProfileAvatarBackground.green.color
    @State private var isVisible = false

    init(initialDraft: Draft = .compact) {
        _selectedDraft = State(initialValue: initialDraft)
    }

    var body: some View {
        NavigationStack {
            ZStack {
                BrickValStyle.Semantic.canvas
                    .ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        Picker("Profile design", selection: $selectedDraft) {
                            ForEach(Draft.allCases) { draft in
                                Text(draft.shortTitle).tag(draft)
                            }
                        }
                        .pickerStyle(.segmented)
                        .accessibilityLabel("Profile design draft")

                        Text("PROFILE DRAFT")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(BrickValStyle.Semantic.valuePositive)
                            .tracking(0.8)

                        draftPreview
                            .opacity(isVisible ? 1 : 0)
                            .offset(y: isVisible ? 0 : 8)
                            .scaleEffect(selectedDraft == .collectorCard && !isVisible ? 0.985 : 1)
                            .animation(entranceAnimation, value: isVisible)

                        VStack(alignment: .leading, spacing: 5) {
                            Text(selectedDraft.title)
                                .font(.headline)
                            Text(selectedDraft.summary)
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                                .fixedSize(horizontal: false, vertical: true)
                        }

                        Button {
                            replay()
                        } label: {
                            Label("Replay animation", systemImage: "arrow.clockwise")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(BrickValStyle.Semantic.valuePositive)
                        .accessibilityHint("Replays the selected profile design")
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 14)
                    .padding(.bottom, 32)
                }
                .scrollIndicators(.hidden)
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Close", systemImage: "xmark") { }
                        .labelStyle(.iconOnly)
                        .accessibilityLabel("Close profile design drafts")
                }
            }
            .preferredColorScheme(.dark)
            .onAppear {
                replay()
            }
            .onChange(of: selectedDraft) { _, _ in
                replay()
            }
        }
    }

    @ViewBuilder
    private var draftPreview: some View {
        switch selectedDraft {
        case .compact:
            compactPreview
        case .collectorCard:
            collectorCardPreview
        case .nativeList:
            nativeListPreview
        case .stage:
            stagePreview
        }
    }

    private var compactPreview: some View {
        VStack(alignment: .leading, spacing: 18) {
            profileHeading

            HStack(spacing: 16) {
                ProfileAvatarView(
                    avatar: selectedAvatar,
                    background: avatarBackground,
                    shape: .circle,
                    size: 112
                )

                VStack(alignment: .leading, spacing: 6) {
                    Text("Your collector profile")
                        .font(.title3.weight(.bold))
                    Text("Signed in collector")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Button("Edit avatar", systemImage: "pencil") { }
                        .font(.subheadline.weight(.semibold))
                        .labelStyle(.titleAndIcon)
                        .foregroundStyle(BrickValStyle.Semantic.valuePositive)
                }
            }

            compactAvatarStrip
            colorControls
            essentialActions
        }
    }

    private var collectorCardPreview: some View {
        VStack(alignment: .leading, spacing: 16) {
            ZStack(alignment: .bottomLeading) {
                RoundedRectangle(cornerRadius: 24)
                    .fill(avatarBackground)

                HStack(alignment: .bottom, spacing: 14) {
                    ProfileAvatarView(
                        avatar: selectedAvatar,
                        background: avatarBackground,
                        shape: .rounded,
                        size: 142
                    )

                    VStack(alignment: .leading, spacing: 5) {
                        Text("BRICKVALUE")
                            .font(.caption.weight(.black))
                            .tracking(1)
                            .foregroundStyle(.black.opacity(0.58))
                        Text(selectedAvatar.title)
                            .font(.system(.title, design: .rounded, weight: .black))
                            .foregroundStyle(.black)
                            .fixedSize(horizontal: false, vertical: true)
                        Text("Collector profile")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.black.opacity(0.64))
                    }
                    .padding(.bottom, 20)
                }
                .padding(16)
            }
            .frame(height: 210)
            .accessibilityElement(children: .combine)
            .accessibilityLabel("\(selectedAvatar.title) collector profile")

            Text("Choose your icon")
                .font(.headline)

            avatarGrid

            colorControls
            essentialActions
        }
    }

    private var nativeListPreview: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 14) {
                ProfileAvatarView(
                    avatar: selectedAvatar,
                    background: avatarBackground,
                    shape: .circle,
                    size: 68
                )

                VStack(alignment: .leading, spacing: 4) {
                    Text("Collector profile")
                        .font(.headline)
                    Text("Choose an icon and background")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Spacer(minLength: 8)

                Image(systemName: "chevron.right")
                    .foregroundStyle(.secondary)
                    .accessibilityHidden(true)
            }
            .padding(16)
            .contentShape(Rectangle())
            .accessibilityElement(children: .combine)
            .accessibilityHint("Edit your collector icon")

            Divider()

            VStack(alignment: .leading, spacing: 12) {
                Text("ICON")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .tracking(0.7)

                compactAvatarStrip

                HStack {
                    Label("Background color", systemImage: "circle.lefthalf.filled")
                        .font(.subheadline.weight(.semibold))
                    Spacer()
                    ColorPicker(
                        "Choose avatar background",
                        selection: colorBinding,
                        supportsOpacity: false
                    )
                    .labelsHidden()
                }
            }
            .padding(16)

            Divider()
            essentialActions
            Divider()

            Button("Delete account", role: .destructive) { }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(16)
                .accessibilityHint("Permanently deletes your BrickValue account")
        }
        .background(BrickValStyle.Semantic.surfaceMuted, in: RoundedRectangle(cornerRadius: 20))
        .overlay {
            RoundedRectangle(cornerRadius: 20)
                .stroke(BrickValStyle.Semantic.divider.opacity(0.55), lineWidth: 1)
        }
    }

    private var stagePreview: some View {
        VStack(spacing: 18) {
            profileHeading

            ProfileAvatarView(
                avatar: selectedAvatar,
                background: avatarBackground,
                shape: .rounded,
                size: 196
            )
            .overlay(alignment: .bottomTrailing) {
                Image(systemName: "checkmark")
                    .font(.headline.weight(.bold))
                    .foregroundStyle(.black)
                    .frame(width: 36, height: 36)
                    .background(BrickValStyle.Semantic.valuePositive, in: Circle())
                    .overlay { Circle().stroke(BrickValStyle.Semantic.canvas, lineWidth: 4) }
                    .accessibilityHidden(true)
            }

            VStack(spacing: 4) {
                Text(selectedAvatar.title)
                    .font(.title2.weight(.bold))
                Text(selectedAvatar.detail)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            ScrollView(.horizontal) {
                HStack(spacing: 12) {
                    ForEach(ProfileDraftAvatar.samples) { avatar in
                        avatarButton(avatar, size: 58)
                    }
                }
                .padding(.horizontal, 2)
            }
            .scrollIndicators(.hidden)

            colorControls
            essentialActions
        }
        .frame(maxWidth: .infinity)
    }

    private var profileHeading: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 4) {
                Text("PROFILE")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(BrickValStyle.Semantic.valuePositive)
                    .tracking(0.8)
                Text("Account")
                    .font(.system(.largeTitle, design: .rounded, weight: .bold))
                Text("Make your collector identity yours.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Spacer(minLength: 12)
            Text("PRO")
                .font(.caption.weight(.black))
                .tracking(0.8)
                .foregroundStyle(.black)
                .padding(.horizontal, 10)
                .padding(.vertical, 7)
                .background(BrickValStyle.Semantic.valuePositive, in: Capsule())
                .accessibilityLabel("Pro active")
        }
    }

    private var compactAvatarStrip: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Choose your icon")
                .font(.headline)

            ScrollView(.horizontal) {
                HStack(spacing: 10) {
                    ForEach(ProfileDraftAvatar.samples) { avatar in
                        avatarButton(avatar, size: 62)
                    }
                }
            }
            .scrollIndicators(.hidden)
        }
    }

    private var avatarGrid: some View {
        LazyVGrid(
            columns: [GridItem(.adaptive(minimum: 66), spacing: 10)],
            spacing: 10
        ) {
            ForEach(ProfileDraftAvatar.samples) { avatar in
                avatarButton(avatar, size: 58)
            }
        }
    }

    private func avatarButton(_ avatar: ProfileDraftAvatar, size: CGFloat) -> some View {
        let isSelected = avatar.id == selectedAvatarID

        return Button {
            withAnimation(selectionAnimation) {
                selectedAvatarID = avatar.id
            }
        } label: {
            VStack(spacing: 5) {
                ProfileAvatarView(
                    avatar: avatar,
                    background: avatarBackground,
                    shape: .circle,
                    size: size
                )
                Text(avatar.title)
                    .font(.caption2.weight(.semibold))
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)
            }
            .foregroundStyle(.primary)
            .frame(width: max(size + 10, 70), height: size + 28)
            .padding(.vertical, 6)
            .background(
                isSelected ? BrickValStyle.Semantic.valuePositive.opacity(0.12) : .clear,
                in: RoundedRectangle(cornerRadius: 14)
            )
            .overlay {
                RoundedRectangle(cornerRadius: 14)
                    .stroke(
                        isSelected ? BrickValStyle.Semantic.valuePositive : BrickValStyle.Semantic.divider,
                        lineWidth: isSelected ? 1.5 : 1
                    )
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(avatar.title) icon")
        .accessibilityValue(isSelected ? "Selected" : "Not selected")
        .accessibilityHint("Sets your collector icon")
    }

    private var colorControls: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Icon background")
                .font(.headline)

            HStack(spacing: 12) {
                ForEach(ProfileAvatarBackground.allCases) { option in
                    Button {
                        withAnimation(selectionAnimation) {
                            avatarBackground = option.color
                        }
                    } label: {
                        Circle()
                            .fill(option.color)
                            .frame(width: 30, height: 30)
                            .overlay {
                                Circle()
                                    .stroke(
                                        avatarBackground == option.color ? .white : .clear,
                                        lineWidth: 3
                                    )
                            }
                            .overlay {
                                Circle()
                                    .stroke(BrickValStyle.Semantic.divider, lineWidth: 1)
                            }
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("\(option.title) icon background")
                    .accessibilityValue(avatarBackground == option.color ? "Selected" : "Not selected")
                }

                ColorPicker(
                    "Custom icon background",
                    selection: colorBinding,
                    supportsOpacity: false
                )
                .labelsHidden()
                .accessibilityLabel("Custom icon background color")
            }
        }
        .padding(14)
        .background(BrickValStyle.Semantic.surfaceMuted, in: RoundedRectangle(cornerRadius: 16))
    }

    private var essentialActions: some View {
        VStack(spacing: 0) {
            draftActionRow(icon: "person.crop.circle", title: "Manage account")
            Divider()
            draftActionRow(icon: "checkmark.shield", title: "Security")
            Divider()
            draftActionRow(icon: "rectangle.portrait.and.arrow.right", title: "Sign out", tint: .orange)
        }
        .background(BrickValStyle.Semantic.surfaceMuted, in: RoundedRectangle(cornerRadius: 16))
        .overlay {
            RoundedRectangle(cornerRadius: 16)
                .stroke(BrickValStyle.Semantic.divider.opacity(0.55), lineWidth: 1)
        }
    }

    private func draftActionRow(icon: String, title: String, tint: Color = BrickValStyle.Semantic.textPrimary) -> some View {
        Button {
        } label: {
            HStack(spacing: 14) {
                Image(systemName: icon)
                    .font(.headline)
                    .foregroundStyle(tint)
                    .frame(width: 30, height: 30)

                Text(title)
                    .font(.body.weight(.semibold))
                    .foregroundStyle(tint)

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(.secondary)
                    .accessibilityHidden(true)
            }
            .padding(.horizontal, 16)
            .frame(minHeight: 54)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(title)
        .accessibilityHint("Opens \(title.lowercased())")
    }

    private var selectedAvatar: ProfileDraftAvatar {
        ProfileDraftAvatar.samples.first { $0.id == selectedAvatarID } ?? ProfileDraftAvatar.samples[0]
    }

    private var colorBinding: Binding<Color> {
        Binding(
            get: { avatarBackground },
            set: { avatarBackground = $0 }
        )
    }

    private var entranceAnimation: Animation? {
        reduceMotion ? nil : .easeOut(duration: 0.36)
    }

    private var selectionAnimation: Animation? {
        reduceMotion ? nil : .easeOut(duration: 0.22)
    }

    private func replay() {
        guard !reduceMotion else {
            isVisible = true
            return
        }

        isVisible = false
        Task {
            try? await Task.sleep(for: .milliseconds(40))
            guard !Task.isCancelled else { return }
            withAnimation(.easeOut(duration: 0.36)) {
                isVisible = true
            }
        }
    }
}

private struct ProfileDraftAvatar: Identifiable {
    let id: String
    let title: String
    let detail: String
    let imageName: String

    static let samples = [
        ProfileDraftAvatar(id: "classic", title: "Classic", detail: "Blue cap", imageName: "AvatarClassic"),
        ProfileDraftAvatar(id: "ghost", title: "Ghost", detail: "Glow shell", imageName: "AvatarGhost"),
        ProfileDraftAvatar(id: "wolf", title: "Wolf", detail: "Wolfpack", imageName: "AvatarWolf"),
        ProfileDraftAvatar(id: "knight", title: "Knight", detail: "Castle helm", imageName: "AvatarKnight"),
        ProfileDraftAvatar(id: "city", title: "City", detail: "Rescue crew", imageName: "AvatarCity"),
        ProfileDraftAvatar(id: "space", title: "Space", detail: "Classic explorer", imageName: "AvatarClassicSpace"),
        ProfileDraftAvatar(id: "frankenstein", title: "Frank", detail: "Monster maker", imageName: "AvatarFrankenstein"),
        ProfileDraftAvatar(id: "spider", title: "Spider", detail: "Web crawler", imageName: "AvatarSpider"),
        ProfileDraftAvatar(id: "skeleton", title: "Skeleton", detail: "Bone collector", imageName: "AvatarSkeleton"),
        ProfileDraftAvatar(id: "shark", title: "Shark", detail: "Deep diver", imageName: "AvatarShark"),
        ProfileDraftAvatar(id: "hotdog", title: "Hot Dog", detail: "Snack squad", imageName: "AvatarHotdog"),
        ProfileDraftAvatar(id: "goat", title: "Goat", detail: "Farm friend", imageName: "AvatarGoat")
    ]
}

private enum ProfileAvatarBackground: String, CaseIterable, Identifiable {
    case charcoal
    case green
    case yellow
    case blue
    case red
    case lilac

    var id: String { rawValue }

    var title: String { rawValue.capitalized }

    var color: Color {
        switch self {
        case .charcoal: Color(red: 0.12, green: 0.13, blue: 0.15)
        case .green: BrickValStyle.Semantic.valuePositive
        case .yellow: BrickValStyle.Semantic.builderYellow
        case .blue: BrickValStyle.Semantic.builderBlue
        case .red: BrickValStyle.Semantic.builderRed
        case .lilac: Color(red: 0.55, green: 0.36, blue: 0.78)
        }
    }
}

private enum ProfileAvatarShape {
    case circle
    case rounded
}

private struct ProfileAvatarView: View {
    let avatar: ProfileDraftAvatar
    let background: Color
    let shape: ProfileAvatarShape
    let size: CGFloat

    var body: some View {
        ZStack {
            background

            Image(avatar.imageName)
                .resizable()
                .scaledToFit()
                .padding(size * 0.06)
        }
        .frame(width: size, height: size)
        .mask {
            switch shape {
            case .circle:
                Circle()
            case .rounded:
                RoundedRectangle(cornerRadius: size * 0.16)
            }
        }
        .overlay {
            switch shape {
            case .circle:
                Circle().stroke(.white.opacity(0.18), lineWidth: 1)
            case .rounded:
                RoundedRectangle(cornerRadius: size * 0.16)
                    .stroke(.white.opacity(0.18), lineWidth: 1)
            }
        }
        .accessibilityHidden(true)
    }
}
#endif
