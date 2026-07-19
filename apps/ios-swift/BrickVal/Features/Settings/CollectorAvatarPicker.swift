import SwiftUI

enum CollectorAvatar: String, CaseIterable, Identifiable {
    case classic, ghost, wolf, knight
    var id: Self { self }

    static func selected(from rawValue: String?) -> CollectorAvatar {
        CollectorAvatar(rawValue: rawValue ?? "") ?? .classic
    }

    var title: String { rawValue.capitalized }
    var imageName: String { "Avatar\(title)" }
    var detail: String {
        switch self {
        case .classic: "Blue cap"
        case .ghost: "Glow shell"
        case .wolf: "Wolfpack"
        case .knight: "Castle helm"
        }
    }
}

struct CollectorAvatarPicker: View {
    @Environment(PreferencesStore.self) private var preferences

    private var selected: CollectorAvatar {
        CollectorAvatar.selected(from: preferences.avatarName)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space12) {
            Text("PROFILE HEAD")
                .font(.caption.bold())
                .foregroundStyle(.secondary)
            Text("Choose your collector look")
                .font(.headline)

            HStack(spacing: BrickValStyle.Primitive.space8) {
                ForEach(CollectorAvatar.allCases) { avatar in
                    Button {
                        preferences.avatarName = avatar.rawValue
                    } label: {
                        VStack(spacing: BrickValStyle.Primitive.space8) {
                            Image(avatar.imageName)
                                .resizable()
                                .scaledToFill()
                                .frame(width: 42, height: 42)
                                .clipShape(.rect(cornerRadius: 10))
                            Text(avatar.title).font(.caption2.bold())
                        }
                        .foregroundStyle(.primary)
                        .frame(maxWidth: .infinity, minHeight: 82)
                        .background(selected == avatar ? BrickValStyle.Semantic.valuePositive.opacity(0.12) : .clear,
                                    in: .rect(cornerRadius: BrickValStyle.Primitive.radius12))
                        .overlay {
                            RoundedRectangle(cornerRadius: BrickValStyle.Primitive.radius12)
                                .stroke(selected == avatar ? BrickValStyle.Semantic.valuePositive : BrickValStyle.Semantic.divider)
                        }
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("\(avatar.title) avatar, \(avatar.detail)")
                    .accessibilityAddTraits(selected == avatar ? .isSelected : [])
                }
            }
        }
    }
}
