import SwiftUI

struct SettingsView: View {
    @Environment(PreferencesStore.self) private var preferences
    @Environment(CollectionStore.self) private var collection
    @Environment(EntitlementStore.self) private var entitlements
    @Environment(\.appSDKCoordinator) private var coordinator
    @State private var showClearConfirmation = false
    @State private var showAccount = false
    @State private var isRestoring = false
    @State private var clearError: String?
    @State private var purchaseMessage: String?

    private var selectedAvatar: CollectorAvatar {
        CollectorAvatar.selected(from: preferences.avatarName)
    }

    var body: some View {
        @Bindable var preferences = preferences
        ScrollView {
            VStack(spacing: BrickValStyle.Primitive.space20) {
                profileHero
                profileActions
                scannerSettings(
                    autoScan: $preferences.smartAutoScanEnabled,
                    consent: $preferences.scanImprovementConsent
                )
                appSettings
                dataSettings
                aboutSettings
            }
            .padding(.horizontal, BrickValStyle.Primitive.space16)
            .padding(.top, BrickValStyle.Primitive.space16)
            .padding(.bottom, BrickValStyle.Primitive.space32)
        }
        .background(BrickValStyle.Semantic.canvas.ignoresSafeArea())
        .navigationTitle("Profile")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showAccount) {
            NavigationStack {
                AccountView()
            }
        }
        .confirmationDialog("Clear your entire collection?", isPresented: $showClearConfirmation, titleVisibility: .visible) {
            Button("Clear collection", role: .destructive) { Task { await clearCollection() } }
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

    private var profileHero: some View {
        VStack(spacing: BrickValStyle.Primitive.space16) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space8) {
                    Text("BRICKVALUE PROFILE")
                        .font(.caption.bold())
                        .foregroundStyle(BrickValStyle.Primitive.black.opacity(0.62))
                    Text("Builder dashboard")
                        .font(.system(size: 31, weight: .black, design: .rounded))
                        .foregroundStyle(BrickValStyle.Primitive.black)
                    Text(accountStatusTitle)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(BrickValStyle.Primitive.black.opacity(0.68))
                }
                Spacer()
                Image(systemName: entitlements.isPro ? "crown.fill" : "crown")
                    .font(.title2.bold())
                    .foregroundStyle(BrickValStyle.Primitive.black)
                    .frame(width: 46, height: 46)
                    .background(BrickValStyle.Primitive.white.opacity(0.42), in: Circle())
            }

            Image(selectedAvatar.imageName)
                .resizable()
                .scaledToFit()
                .frame(width: 150, height: 150)
                .padding(BrickValStyle.Primitive.space16)
                .background(
                    Circle()
                        .fill(BrickValStyle.Primitive.white.opacity(0.48))
                        .shadow(color: BrickValStyle.Primitive.black.opacity(0.18), radius: 18, y: 10)
                )
                .overlay(alignment: .bottomTrailing) {
                    Text(selectedAvatar.title)
                        .font(.caption.bold())
                        .foregroundStyle(BrickValStyle.Primitive.white)
                        .padding(.horizontal, BrickValStyle.Primitive.space12)
                        .padding(.vertical, BrickValStyle.Primitive.space8)
                        .background(BrickValStyle.Semantic.builderRed, in: Capsule())
                        .overlay { Capsule().stroke(BrickValStyle.Primitive.white.opacity(0.42), lineWidth: 1) }
                }
                .accessibilityLabel("\(selectedAvatar.title) profile head")

            HStack(spacing: BrickValStyle.Primitive.space12) {
                heroStat(title: "Sets", value: setQuantity.formatted())
                heroStat(title: "Minifigs", value: minifigQuantity.formatted())
                heroStat(title: "Value", value: collection.totalValue.formatted(.currency(code: "USD")))
            }
        }
        .padding(BrickValStyle.Primitive.space20)
        .background {
            RoundedRectangle(cornerRadius: 30)
                .fill(
                    LinearGradient(
                        colors: [
                            BrickValStyle.Semantic.builderYellow,
                            BrickValStyle.Semantic.builderYellowDeep,
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .overlay(alignment: .topTrailing) {
                    Circle()
                        .fill(BrickValStyle.Primitive.white.opacity(0.18))
                        .frame(width: 150, height: 150)
                        .offset(x: 48, y: -58)
                }
                .overlay(alignment: .bottomLeading) {
                    Circle()
                        .fill(BrickValStyle.Primitive.black.opacity(0.07))
                        .frame(width: 120, height: 120)
                        .offset(x: -54, y: 42)
                }
        }
        .clipShape(RoundedRectangle(cornerRadius: 30))
    }

    private func heroStat(title: String, value: String) -> some View {
        VStack(spacing: BrickValStyle.Primitive.space4) {
            Text(value)
                .font(.system(size: 18, weight: .black, design: .rounded))
                .foregroundStyle(BrickValStyle.Primitive.black)
                .lineLimit(1)
                .minimumScaleFactor(0.68)
            Text(title)
                .font(.caption.bold())
                .foregroundStyle(BrickValStyle.Primitive.black.opacity(0.62))
        }
        .frame(maxWidth: .infinity, minHeight: 64)
        .padding(.horizontal, BrickValStyle.Primitive.space8)
        .background(BrickValStyle.Primitive.white.opacity(0.38), in: RoundedRectangle(cornerRadius: 18))
    }

    private var profileActions: some View {
        VStack(spacing: BrickValStyle.Primitive.space12) {
            Button {
                showAccount = true
            } label: {
                profileRow(
                    icon: "person.crop.circle",
                    title: accountActionTitle,
                    subtitle: accountActionSubtitle,
                    trailing: "Open"
                )
            }
            .buttonStyle(.plain)

            Group {
                if entitlements.isPro {
                    NavigationLink(value: AppRoute.subscription) {
                        profileRow(
                            icon: "crown.fill",
                            title: "Subscription",
                            subtitle: "Brickvalue Pro active",
                            trailing: "Pro"
                        )
                    }
                } else {
                    Button(action: triggerPaywall) {
                        profileRow(
                            icon: "crown.fill",
                            title: "Subscription",
                            subtitle: "Free plan",
                            trailing: "Upgrade"
                        )
                    }
                }
            }
            .buttonStyle(.plain)
        }
        .padding(BrickValStyle.Primitive.space16)
        .profileCardStyle()
    }

    private func scannerSettings(autoScan: Binding<Bool>, consent: Binding<Bool>) -> some View {
        VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space12) {
            sectionHeader("Scanning")
            Toggle(isOn: autoScan) {
                profileRowText(
                    icon: "camera.viewfinder",
                    title: "Smart auto-scan",
                    subtitle: "Automatically detects minifigures when the camera is open."
                )
            }
            .tint(BrickValStyle.Semantic.valuePositive)
            Toggle(isOn: consent) {
                profileRowText(
                    icon: "sparkles",
                    title: "Help improve scans",
                    subtitle: "Scan feedback and image upload only happen with your consent."
                )
            }
            .tint(BrickValStyle.Semantic.valuePositive)
        }
        .padding(BrickValStyle.Primitive.space16)
        .profileCardStyle()
    }

    private var appSettings: some View {
        VStack(spacing: BrickValStyle.Primitive.space12) {
            sectionHeader("App")
            Group {
                if entitlements.isPro {
                    NavigationLink(value: AppRoute.appearance) {
                        profileRow(
                            icon: "paintpalette",
                            title: "Theme and accent",
                            subtitle: "Dark mode, light mode, and colour",
                            trailing: "Edit"
                        )
                    }
                } else {
                    Button(action: triggerPaywall) {
                        profileRow(
                            icon: "paintpalette",
                            title: "Theme and accent",
                            subtitle: "Pro feature",
                            trailing: "Pro"
                        )
                    }
                }
            }
            .buttonStyle(.plain)

            Button(action: restorePurchases) {
                profileRow(
                    icon: "arrow.clockwise",
                    title: isRestoring ? "Restoring purchases..." : "Restore purchases",
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
                profileRow(icon: "trash", title: "Clear collection", subtitle: "Remove all saved LEGO items", trailing: "Clear")
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
                profileRow(icon: "hand.raised", title: "Privacy policy", subtitle: "How Brickvalue handles your data", trailing: "Open")
            }
            Link(destination: AppLinks.terms) {
                profileRow(icon: "doc.text", title: "Terms of use", subtitle: "Product terms and conditions", trailing: "Open")
            }
            profileRow(icon: "number", title: "Version", subtitle: "Installed app build", trailing: version)
        }
        .padding(BrickValStyle.Primitive.space16)
        .profileCardStyle()
    }

    private func sectionHeader(_ title: String) -> some View {
        Text(title.uppercased())
            .font(.caption.bold())
            .foregroundStyle(BrickValStyle.Semantic.textSecondary)
            .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func profileRow(icon: String, title: String, subtitle: String, trailing: String) -> some View {
        HStack(spacing: BrickValStyle.Primitive.space12) {
            Image(systemName: icon)
                .font(.headline)
                .foregroundStyle(BrickValStyle.Semantic.textPrimary)
                .frame(width: 38, height: 38)
                .background(BrickValStyle.Semantic.surfaceMuted, in: RoundedRectangle(cornerRadius: 12))
            profileRowText(title: title, subtitle: subtitle)
            Spacer(minLength: BrickValStyle.Primitive.space8)
            Text(trailing)
                .font(.caption.bold())
                .foregroundStyle(BrickValStyle.Semantic.textSecondary)
                .lineLimit(1)
        }
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
    }

    private func profileRowText(icon: String? = nil, title: String, subtitle: String) -> some View {
        HStack(spacing: BrickValStyle.Primitive.space12) {
            if let icon {
                Image(systemName: icon)
                    .font(.headline)
                    .foregroundStyle(BrickValStyle.Semantic.textPrimary)
                    .frame(width: 38, height: 38)
                    .background(BrickValStyle.Semantic.surfaceMuted, in: RoundedRectangle(cornerRadius: 12))
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

    private var setQuantity: Int {
        collection.items.filter { $0.itemType == .set }.reduce(0) { $0 + $1.quantity }
    }

    private var minifigQuantity: Int {
        collection.items.filter { $0.itemType == .minifig }.reduce(0) { $0 + $1.quantity }
    }

    private var accountStatusTitle: String {
        if coordinator?.clerk == nil { return "Local collector profile" }
        return coordinator?.clerk?.user == nil ? "Signed out collector" : "Signed in collector"
    }

    private var accountActionTitle: String {
        coordinator?.clerk?.user == nil ? "Sign in or create account" : "Account"
    }

    private var accountActionSubtitle: String {
        if coordinator?.clerk == nil {
            return "Profile is saved on this device. Clerk sign-in is not configured."
        }
        return coordinator?.clerk?.user == nil ? "Sync identity before upgrading" : "Manage profile and sign-in details"
    }

    private var version: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0.1"
    }

    private var errorBinding: Binding<Bool> {
        Binding(get: { clearError != nil }, set: { if !$0 { clearError = nil } })
    }

    private var purchaseMessageBinding: Binding<Bool> {
        Binding(get: { purchaseMessage != nil }, set: { if !$0 { purchaseMessage = nil } })
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

private extension View {
    func profileCardStyle() -> some View {
        background(BrickValStyle.Semantic.surfaceMuted, in: RoundedRectangle(cornerRadius: 24))
            .overlay {
                RoundedRectangle(cornerRadius: 24)
                    .stroke(BrickValStyle.Semantic.divider.opacity(0.45), lineWidth: 1)
            }
    }
}
