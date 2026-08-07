import SwiftUI

struct CollectorProfileEditorView: View {
    @Environment(PreferencesStore.self) private var preferences
    @Environment(\.brickValAccent) private var accent
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var selectedAvatar: CollectorAvatar {
        CollectorAvatar.selected(from: preferences.avatarName)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space24) {
            heading
            profileStage
            avatarPicker
            backgroundPicker
        }
    }

    private var heading: some View {
        VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space4) {
            Text("PROFILE HEAD")
                .font(.caption.weight(.semibold))
                .foregroundStyle(accent)
                .tracking(0.8)

            Text("Choose your collector look")
                .font(.system(.title2, design: .rounded, weight: .bold))
                .foregroundStyle(BrickValStyle.Semantic.textPrimary)

            Text("Your icon and background appear across BrickValue.")
                .font(.subheadline)
                .foregroundStyle(BrickValStyle.Semantic.textSecondary)
        }
    }

    private var profileStage: some View {
        VStack(spacing: BrickValStyle.Primitive.space12) {
            CollectorProfileStageAvatar(
                avatar: selectedAvatar,
                background: selectedAvatarBackground,
                size: 184
            )
            .overlay(alignment: .bottomTrailing) {
                Image(systemName: "checkmark")
                    .font(.headline.weight(.bold))
                    .foregroundStyle(contrastColor(for: accent))
                    .frame(width: 36, height: 36)
                    .background(accent, in: Circle())
                    .overlay {
                        Circle()
                            .stroke(BrickValStyle.Semantic.canvas, lineWidth: 4)
                    }
                    .accessibilityHidden(true)
            }

            VStack(spacing: BrickValStyle.Primitive.space4) {
                Text(selectedAvatar.title)
                    .font(.title3.weight(.bold))
                    .foregroundStyle(BrickValStyle.Semantic.textPrimary)
                Text(selectedAvatar.detail)
                    .font(.subheadline)
                    .foregroundStyle(BrickValStyle.Semantic.textSecondary)
            }
        }
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Selected collector icon: \(selectedAvatar.title)")
        .accessibilityValue(selectedAvatar.detail)
    }

    private var avatarPicker: some View {
        VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space8) {
            Text("Choose your icon")
                .font(.headline)
                .foregroundStyle(BrickValStyle.Semantic.textPrimary)

            ScrollView(.horizontal) {
                HStack(spacing: BrickValStyle.Primitive.space8) {
                    ForEach(CollectorAvatar.allCases) { avatar in
                        avatarButton(avatar)
                    }
                }
                .padding(.vertical, 2)
            }
            .scrollIndicators(.hidden)
        }
    }

    private func avatarButton(_ avatar: CollectorAvatar) -> some View {
        let isSelected = selectedAvatar == avatar

        return Button {
            withAnimation(reduceMotion ? nil : .easeOut(duration: 0.22)) {
                preferences.avatarName = avatar.rawValue
            }
        } label: {
            VStack(spacing: BrickValStyle.Primitive.space4) {
                CollectorProfileStageAvatar(
                    avatar: avatar,
                    background: selectedAvatarBackground,
                    size: 62
                )
                Text(avatar.title)
                    .font(.caption2.weight(.semibold))
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)
                    .foregroundStyle(BrickValStyle.Semantic.textPrimary)
            }
            .frame(width: 74, height: 92)
            .background(
                isSelected ? accent.opacity(0.12) : Color.clear,
                in: RoundedRectangle(cornerRadius: 14)
            )
            .overlay {
                RoundedRectangle(cornerRadius: 14)
                    .stroke(
                        isSelected ? accent : BrickValStyle.Semantic.divider,
                        lineWidth: isSelected ? 1.5 : 1
                    )
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(avatar.title) icon")
        .accessibilityValue(isSelected ? "Selected" : "Not selected")
        .accessibilityHint("Sets your collector icon")
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }

    private var backgroundPicker: some View {
        VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space12) {
            HStack {
                Label("Icon background", systemImage: "circle.lefthalf.filled")
                    .font(.headline)
                    .foregroundStyle(BrickValStyle.Semantic.textPrimary)
                Spacer(minLength: BrickValStyle.Primitive.space8)
                ColorPicker(
                    "Custom icon background",
                    selection: backgroundBinding,
                    supportsOpacity: false
                )
                .labelsHidden()
                .accessibilityLabel("Custom icon background color")
            }

            ScrollView(.horizontal) {
                HStack(spacing: BrickValStyle.Primitive.space12) {
                    ForEach(presetBackgrounds) { option in
                        Button {
                            withAnimation(reduceMotion ? nil : .easeOut(duration: 0.22)) {
                                preferences.avatarBackground = option
                            }
                        } label: {
                            Circle()
                                .fill(backgroundColor(for: option))
                                .frame(width: 32, height: 32)
                                .overlay {
                                    Circle()
                                        .stroke(
                                            preferences.avatarBackground == option
                                                ? contrastColor(for: backgroundColor(for: option))
                                                : .clear,
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
                        .accessibilityValue(preferences.avatarBackground == option ? "Selected" : "Not selected")
                        .accessibilityAddTraits(preferences.avatarBackground == option ? .isSelected : [])
                    }
                }
                .padding(.vertical, 2)
            }
            .scrollIndicators(.hidden)
        }
        .padding(BrickValStyle.Primitive.space16)
        .background(BrickValStyle.Semantic.surfaceMuted, in: RoundedRectangle(cornerRadius: 16))
    }

    private var backgroundBinding: Binding<Color> {
        Binding(
            get: { selectedAvatarBackground },
            set: { preferences.avatarBackgroundColor = $0 }
        )
    }

    private var selectedAvatarBackground: Color {
        preferences.avatarBackground == .accent ? accent : preferences.avatarBackgroundColor
    }

    private var presetBackgrounds: [AvatarBackgroundPreference] {
        [.accent, .charcoal, .green, .yellow, .blue, .red, .lilac]
    }

    private func backgroundColor(for option: AvatarBackgroundPreference) -> Color {
        option == .accent ? accent : option.color
    }

    private func contrastColor(for color: Color) -> Color {
        color == AccentPreference.yellow.color || color == BrickValStyle.Primitive.legoYellow
            ? BrickValStyle.Primitive.black
            : BrickValStyle.Primitive.white
    }
}

private struct CollectorProfileStageAvatar: View {
    let avatar: CollectorAvatar
    let background: Color
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
        .clipShape(RoundedRectangle(cornerRadius: size * 0.16, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: size * 0.16, style: .continuous)
                .stroke(BrickValStyle.Primitive.white.opacity(0.18), lineWidth: 1)
        }
        .accessibilityHidden(true)
    }
}
