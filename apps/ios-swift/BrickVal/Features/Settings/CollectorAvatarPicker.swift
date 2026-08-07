import SwiftUI

enum CollectorAvatar: String, CaseIterable, Identifiable {
    case classic
    case ghost
    case wolf
    case knight
    case city
    case space
    case frankenstein
    case spider
    case skeleton
    case shark
    case hotdog
    case goat

    var id: Self { self }

    static func selected(from rawValue: String?) -> CollectorAvatar {
        CollectorAvatar(rawValue: rawValue ?? "") ?? .classic
    }

    var title: String {
        switch self {
        case .classic: "Classic"
        case .ghost: "Ghost"
        case .wolf: "Wolf"
        case .knight: "Knight"
        case .city: "City"
        case .space: "Space"
        case .frankenstein: "Frank"
        case .spider: "Spider"
        case .skeleton: "Skeleton"
        case .shark: "Shark"
        case .hotdog: "Hot Dog"
        case .goat: "Goat"
        }
    }

    var imageName: String {
        switch self {
        case .classic: "AvatarClassic"
        case .ghost: "AvatarGhost"
        case .wolf: "AvatarWolf"
        case .knight: "AvatarKnight"
        case .city: "AvatarCity"
        case .space: "AvatarClassicSpace"
        case .frankenstein: "AvatarFrankenstein"
        case .spider: "AvatarSpider"
        case .skeleton: "AvatarSkeleton"
        case .shark: "AvatarShark"
        case .hotdog: "AvatarHotdog"
        case .goat: "AvatarGoat"
        }
    }

    var detail: String {
        switch self {
        case .classic: "Blue cap"
        case .ghost: "Glow shell"
        case .wolf: "Wolfpack"
        case .knight: "Castle helm"
        case .city: "Rescue crew"
        case .space: "Classic explorer"
        case .frankenstein: "Monster maker"
        case .spider: "Web crawler"
        case .skeleton: "Bone collector"
        case .shark: "Deep diver"
        case .hotdog: "Snack squad"
        case .goat: "Farm friend"
        }
    }
}

struct CollectorAvatarPicker: View {
    @Environment(PreferencesStore.self) private var preferences
    @Environment(\.brickValAccent) private var accent

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

            LazyVGrid(
                columns: [GridItem(.adaptive(minimum: 68), spacing: BrickValStyle.Primitive.space8)],
                spacing: BrickValStyle.Primitive.space8
            ) {
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
                        .background(selected == avatar ? accent.opacity(0.12) : .clear,
                                    in: .rect(cornerRadius: BrickValStyle.Primitive.radius12))
                        .overlay {
                            RoundedRectangle(cornerRadius: BrickValStyle.Primitive.radius12)
                                .stroke(selected == avatar ? accent : BrickValStyle.Semantic.divider)
                        }
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("\(avatar.title) avatar, \(avatar.detail)")
                    .accessibilityAddTraits(selected == avatar ? .isSelected : [])
                }
            }

            HStack(spacing: BrickValStyle.Primitive.space12) {
                Label("Icon background", systemImage: "circle.lefthalf.filled")
                    .font(.subheadline.weight(.semibold))
                Spacer()
                ColorPicker(
                    "Choose icon background",
                    selection: backgroundBinding,
                    supportsOpacity: false
                )
                .labelsHidden()
            }
        }
    }

    private var backgroundBinding: Binding<Color> {
        Binding(
            get: { preferences.avatarBackgroundColor },
            set: { preferences.avatarBackgroundColor = $0 }
        )
    }
}
