import SwiftUI

struct SettingsView: View {
    @Environment(PreferencesStore.self) private var preferences
    @Environment(CollectionStore.self) private var collection
    @Environment(EntitlementStore.self) private var entitlements
    @Environment(\.appSDKCoordinator) private var coordinator
    @Environment(\.brickValAccent) private var accent
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var showAccount = false
    @State private var showClearConfirmation = false
    @State private var isRestoring = false
    @State private var clearError: String?
    @State private var purchaseMessage: String?

    private var selectedAvatar: CollectorAvatar {
        CollectorAvatar.selected(from: preferences.avatarName)
    }

    var body: some View {
        @Bindable var preferences = preferences

        ScrollView {
            VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space24) {
                profileHeading
                profileStage
                avatarPicker
                backgroundPicker
                essentialActions
                scanningSettings(
                    autoScan: $preferences.smartAutoScanEnabled,
                    consent: $preferences.scanImprovementConsent
                )
                appSettings
                dataSettings
                aboutSettings
            }
            .padding(.horizontal, BrickValStyle.Primitive.space20)
            .padding(.top, BrickValStyle.Primitive.space16)
            .padding(.bottom, BrickValStyle.Primitive.space32)
        }
        .background(BrickValStyle.Semantic.canvas.ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
        .sheet(isPresented: $showAccount) {
            NavigationStack {
                AccountView()
            }
        }
        .confirmationDialog("Clear your entire collection?", isPresented: $showClearConfirmation, titleVisibility: .visible) {
            Button("Clear collection", role: .destructive) {
                Task { await clearCollection() }
            }
        } message: {
            Text("This cannot be undone.")
        }
        .alert("Collection was not cleared", isPresented: errorBinding) { }
        .alert("Purchase update", isPresented: purchaseMessageBinding) {
            Button("OK", role: .cancel) { purchaseMessage = nil }
        } message: {
            Text(purchaseMessage ?? "")
        }
    }

    private var profileHeading: some View {
        HStack(alignment: .top, spacing: BrickValStyle.Primitive.space12) {
            VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space4) {
                Text("PROFILE")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(accent)
                    .tracking(0.8)
                Text("Account")
                    .font(.system(.largeTitle, design: .rounded, weight: .bold))
                    .foregroundStyle(BrickValStyle.Semantic.textPrimary)
                Text(accountStatusTitle)
                    .font(.subheadline)
                    .foregroundStyle(BrickValStyle.Semantic.textSecondary)
            }

            Spacer(minLength: BrickValStyle.Primitive.space8)

            if entitlements.isPro {
                Text("PRO")
                    .font(.caption.weight(.black))
                    .tracking(0.8)
                    .foregroundStyle(contrastColor(for: accent))
                    .padding(.horizontal, 11)
                    .padding(.vertical, 8)
                    .background(accent, in: Capsule())
                    .accessibilityLabel("Pro active")
            }
        }
    }

    private var profileStage: some View {
        VStack(spacing: BrickValStyle.Primitive.space12) {
            StageAvatarView(
                avatar: selectedAvatar,
                background: selectedAvatarBackground,
                size: 190
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
                    .font(.title2.weight(.bold))
                    .foregroundStyle(BrickValStyle.Semantic.textPrimary)
                Text(selectedAvatar.detail)
                    .font(.subheadline)
                    .foregroundStyle(BrickValStyle.Semantic.textSecondary)
            }
        }
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(selectedAvatar.title) collector profile")
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
                StageAvatarView(
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
        VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space8) {
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

            HStack(spacing: BrickValStyle.Primitive.space12) {
                ForEach(presetBackgrounds) { option in
                    Button {
                        withAnimation(reduceMotion ? nil : .easeOut(duration: 0.22)) {
                            preferences.avatarBackground = option
                        }
                    } label: {
                        Circle()
                            .fill(backgroundColor(for: option))
                            .frame(width: 30, height: 30)
                            .overlay {
                                Circle()
                                    .stroke(
                                        preferences.avatarBackground == option ? contrastColor(for: backgroundColor(for: option)) : .clear,
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
                }
            }
        }
        .padding(BrickValStyle.Primitive.space16)
        .background(BrickValStyle.Semantic.surfaceMuted, in: RoundedRectangle(cornerRadius: 16))
    }

    private var essentialActions: some View {
        VStack(spacing: 0) {
            Button {
                showAccount = true
            } label: {
                settingsRow(
                    icon: "person.crop.circle",
                    title: "Manage account",
                    subtitle: "Profile, sign-in, and security",
                    trailing: "Open"
                )
            }
            .buttonStyle(.plain)

            Divider()

            if entitlements.isPro {
                NavigationLink(value: AppRoute.subscription) {
                    settingsRow(
                        icon: "checkmark.seal.fill",
                        title: "Subscription",
                        subtitle: "Brickvalue Pro is active",
                        trailing: "PRO"
                    )
                }
                .buttonStyle(.plain)
            } else {
                Button(action: triggerPaywall) {
                    settingsRow(
                        icon: "sparkles",
                        title: "Subscription",
                        subtitle: "Unlock unlimited collection and premium tools",
                        trailing: "Upgrade"
                    )
                }
                .buttonStyle(.plain)
            }

            Divider()

            if entitlements.isPro {
                NavigationLink(value: AppRoute.appearance) {
                    settingsRow(
                        icon: "paintpalette",
                        title: "Theme and accent",
                        subtitle: "Choose dark mode and your app accent",
                        trailing: preferences.accent.title
                    )
                }
                .buttonStyle(.plain)
            } else {
                Button(action: triggerPaywall) {
                    settingsRow(
                        icon: "paintpalette",
                        title: "Theme and accent",
                        subtitle: "A Brickvalue Pro feature",
                        trailing: "PRO"
                    )
                }
                .buttonStyle(.plain)
            }
        }
        .profileCardStyle()
    }

    private func scanningSettings(autoScan: Binding<Bool>, consent: Binding<Bool>) -> some View {
        VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space12) {
            sectionHeader("Scanning")
            Toggle(isOn: autoScan) {
                settingsRowText(
                    icon: "camera.viewfinder",
                    title: "Smart auto-scan",
                    subtitle: "Detects minifigures when the camera is open."
                )
            }
            .tint(accent)
            Toggle(isOn: consent) {
                settingsRowText(
                    icon: "sparkles",
                    title: "Help improve scans",
                    subtitle: "Feedback and image upload happen only with your consent."
                )
            }
            .tint(accent)
        }
        .padding(BrickValStyle.Primitive.space16)
        .profileCardStyle()
    }

    private var appSettings: some View {
        VStack(spacing: BrickValStyle.Primitive.space12) {
            sectionHeader("App")
            Button(action: restorePurchases) {
                settingsRow(
                    icon: "arrow.clockwise",
                    title: "Restore purchases",
                    subtitle: "Recover Brickvalue Pro on this Apple ID",
                    trailing: isRestoring ? "Wait" : "Restore"
                )
            }
            .buttonStyle(.plain)
            .disabled(isRestoring)
        }
        .padding(BrickValStyle.Primitive.space16)
        .profileCardStyle()
    }

    private var dataSettings: some View {
        VStack(spacing: BrickValStyle.Primitive.space12) {
            sectionHeader("Collection data")
            Button(role: .destructive) {
                showClearConfirmation = true
            } label: {
                settingsRow(
                    icon: "trash",
                    title: "Clear collection",
                    subtitle: "Remove all saved LEGO items",
                    trailing: "Clear"
                )
            }
            .buttonStyle(.plain)
        }
        .padding(BrickValStyle.Primitive.space16)
        .profileCardStyle()
    }

    private var aboutSettings: some View {
        VStack(spacing: BrickValStyle.Primitive.space12) {
            sectionHeader("About")
            Link(destination: AppLinks.privacy) {
                settingsRow(
                    icon: "hand.raised",
                    title: "Privacy policy",
                    subtitle: "How Brickvalue handles your data",
                    trailing: "Open"
                )
            }
            Link(destination: AppLinks.terms) {
                settingsRow(
                    icon: "doc.text",
                    title: "Terms of use",
                    subtitle: "Product terms and conditions",
                    trailing: "Open"
                )
            }
            settingsRow(
                icon: "number",
                title: "Version",
                subtitle: "Installed app build",
                trailing: version
            )
        }
        .padding(BrickValStyle.Primitive.space16)
        .profileCardStyle()
    }

    private func settingsRow(
        icon: String,
        title: String,
        subtitle: String,
        trailing: String
    ) -> some View {
        HStack(spacing: BrickValStyle.Primitive.space12) {
            Image(systemName: icon)
                .font(.headline)
                .foregroundStyle(accent)
                .frame(width: 38, height: 38)
                .background(accent.opacity(0.12), in: RoundedRectangle(cornerRadius: 12))

            settingsRowText(title: title, subtitle: subtitle)

            Spacer(minLength: BrickValStyle.Primitive.space8)

            Text(trailing)
                .font(.caption.bold())
                .foregroundStyle(trailing == "PRO" ? accent : BrickValStyle.Semantic.textSecondary)
                .lineLimit(1)
        }
        .padding(.vertical, BrickValStyle.Primitive.space4)
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
    }

    private func settingsRowText(
        icon: String? = nil,
        title: String,
        subtitle: String
    ) -> some View {
        HStack(spacing: BrickValStyle.Primitive.space12) {
            if let icon {
                Image(systemName: icon)
                    .font(.headline)
                    .foregroundStyle(accent)
                    .frame(width: 38, height: 38)
                    .background(accent.opacity(0.12), in: RoundedRectangle(cornerRadius: 12))
            }

            VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space4) {
                Text(title)
                    .font(.headline)
                    .foregroundStyle(BrickValStyle.Semantic.textPrimary)
                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(BrickValStyle.Semantic.textSecondary)
                    .lineLimit(2)
            }
        }
    }

    private func sectionHeader(_ title: String) -> some View {
        Text(title.uppercased())
            .font(.caption.bold())
            .foregroundStyle(BrickValStyle.Semantic.textSecondary)
            .frame(maxWidth: .infinity, alignment: .leading)
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

    private var accountStatusTitle: String {
        if coordinator?.clerk == nil { return "Local collector profile" }
        return coordinator?.clerk?.user == nil ? "Signed out collector" : "Signed in collector"
    }

    private var version: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0.1"
    }

    private var errorBinding: Binding<Bool> {
        Binding(
            get: { clearError != nil },
            set: { if !$0 { clearError = nil } }
        )
    }

    private var purchaseMessageBinding: Binding<Bool> {
        Binding(
            get: { purchaseMessage != nil },
            set: { if !$0 { purchaseMessage = nil } }
        )
    }

    private func triggerPaywall() {
        if coordinator?.superwallConfigured == true {
            coordinator?.presentUpgrade()
        } else {
            purchaseMessage = "Upgrade options are not configured for this build."
        }
    }

    private func restorePurchases() {
        Task {
            isRestoring = true
            defer { isRestoring = false }
            do {
                try await coordinator?.restorePurchases()
                purchaseMessage = "Purchases restored."
            } catch {
                purchaseMessage = error.localizedDescription
            }
        }
    }

    private func clearCollection() async {
        do {
            try await collection.clear()
        } catch {
            clearError = error.localizedDescription
        }
    }
}

private struct StageAvatarView: View {
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

private extension View {
    func profileCardStyle() -> some View {
        background(BrickValStyle.Semantic.surfaceMuted, in: RoundedRectangle(cornerRadius: 20))
            .overlay {
                RoundedRectangle(cornerRadius: 20)
                    .stroke(BrickValStyle.Semantic.divider.opacity(0.45), lineWidth: 1)
            }
    }
}
