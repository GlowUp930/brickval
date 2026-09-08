import SwiftUI

private enum SettingsSheet: String, Identifiable {
    case account
    case hardPaywallOnboardingPreview

    var id: String { rawValue }
}

struct SettingsView: View {
    @Environment(PreferencesStore.self) private var preferences
    @Environment(CollectionStore.self) private var collection
    @Environment(EntitlementStore.self) private var entitlements
    @Environment(CurrencyStore.self) private var currency
    @Environment(\.appSDKCoordinator) private var coordinator
    @Environment(\.brickValAccent) private var accent
    @State private var showClearConfirmation = false
    @State private var presentedSheet: SettingsSheet?
    @State private var isRestoring = false
    @State private var clearError: String?
    @State private var purchaseMessage: String?
    @State private var secretLogoTapCount = 0
    @State private var lastSecretLogoTap = Date.distantPast

    private var selectedAvatar: CollectorAvatar {
        guard coordinator?.clerk?.user != nil else { return .classic }
        return CollectorAvatar.selected(from: preferences.avatarName)
    }

    var body: some View {
        @Bindable var preferences = preferences
        ScrollView {
            VStack(spacing: BrickValStyle.Primitive.space20) {
                Button {
                    presentedSheet = .account
                } label: {
                    profileHero
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Builder dashboard")
                .accessibilityHint("Opens Manage Account to sign in or update your collector profile")
                profileActions
                scannerSettings(
                    autoScan: $preferences.smartAutoScanEnabled,
                    consent: $preferences.scanImprovementConsent
                )
                appSettings
                dataSettings
                aboutSettings
                previewSettings
            }
            .padding(.horizontal, BrickValStyle.Primitive.space16)
            .padding(.top, BrickValStyle.Primitive.space16)
            .padding(.bottom, BrickValStyle.Primitive.space32)
        }
        .background(BrickValStyle.Semantic.canvas.ignoresSafeArea())
        .navigationTitle("Profile")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Image("OnboardingLogo")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 28, height: 28)
                    .clipShape(RoundedRectangle(cornerRadius: 7, style: .continuous))
                    .contentShape(Rectangle())
                    .onTapGesture(count: 1, perform: handleSecretLogoTap)
                    .accessibilityHidden(true)
            }
        }
        .sheet(item: $presentedSheet) { sheet in
            switch sheet {
            case .account:
                NavigationStack {
                    AccountView()
                }
            case .hardPaywallOnboardingPreview:
                HardPaywallOnboardingPreviewView()
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
                Spacer(minLength: BrickValStyle.Primitive.space8)
                HStack(spacing: BrickValStyle.Primitive.space8) {
                    if entitlements.isPro {
                        proLogo
                    }
                    Image(systemName: "chevron.right")
                        .font(.headline.weight(.bold))
                        .foregroundStyle(BrickValStyle.Primitive.black.opacity(0.62))
                        .accessibilityHidden(true)
                }
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
                heroStat(title: "Sets", value: setQuantity.formatted(.number.locale(BrickValLocalization.effectiveLanguage.locale)))
                heroStat(title: "Minifigs", value: minifigQuantity.formatted(.number.locale(BrickValLocalization.effectiveLanguage.locale)))
                heroStat(
                    title: "Value",
                    value: currency.formattedWithCode(
                        collection.totalValue,
                        to: preferences.effectiveCurrency,
                        locale: BrickValLocalization.effectiveLanguage.locale
                    )
                )
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

    private var proLogo: some View {
        ProBadge(state: .active, compact: false)
    }

    private func heroStat(title: LocalizedStringResource, value: String) -> some View {
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
                presentedSheet = .account
            } label: {
                profileDynamicRow(
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
                        profileProRow(
                            icon: "checkmark.seal.fill",
                            title: "Subscription",
                            subtitle: "Brickvalue Pro active",
                            state: .active
                        )
                    }
                } else {
                    Button(action: { triggerPaywall(placement: .subscriptionUpgrade) }) {
                        profileProRow(
                            icon: "sparkles",
                            title: "Subscription",
                            subtitle: "Free plan",
                            state: .requiresPro
                        )
                    }
                }
            }
            .buttonStyle(.plain)

            NavigationLink(value: AppRoute.referral) {
                profileRow(
                    icon: "person.2",
                    title: "Invite friends",
                    subtitle: "Earn bonus bulk scans",
                    trailing: "Open"
                )
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
            .tint(accent)
            Toggle(isOn: consent) {
                profileRowText(
                    icon: "sparkles",
                    title: "Help improve scans",
                    subtitle: "Scan feedback and image upload only happen with your consent."
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
            Group {
                NavigationLink {
                    NotificationSettingsView()
                } label: {
                    profileRow(
                        icon: "bell",
                        title: "Notifications",
                        subtitle: "Choose useful scan and account reminders",
                        trailing: "Open"
                    )
                }

                NavigationLink {
                    LanguageSettingsView()
                } label: {
                    profileDynamicRow(
                        icon: "globe",
                        title: BrickValLocalization.localized("Language"),
                        subtitle: languageSubtitle,
                        trailing: BrickValLocalization.localized("Open")
                    )
                }
                .accessibilityIdentifier("settings.language")

                NavigationLink {
                    CurrencySettingsView()
                } label: {
                    profileDynamicRow(
                        icon: "dollarsign.circle",
                        title: BrickValLocalization.localized("Currency"),
                        subtitle: currencySubtitle,
                        trailing: BrickValLocalization.localized("Open")
                    )
                }
                .accessibilityIdentifier("settings.currency")

                if entitlements.isPro {
                    NavigationLink(value: AppRoute.appearance) {
                        profileProRow(
                            icon: "paintpalette",
                            title: "Theme and accent",
                            subtitle: "Dark mode, light mode, and colour",
                            state: .active
                        )
                    }
                } else {
                    Button(action: { triggerPaywall(placement: .appearanceAttempt) }) {
                        profileProRow(
                            icon: "paintpalette",
                            title: "Theme and accent",
                            subtitle: "Pro feature",
                            state: .requiresPro
                        )
                    }
                }
            }
            .buttonStyle(.plain)

            Button(action: restorePurchases) {
                profileDynamicRow(
                    icon: "arrow.clockwise",
                    title: isRestoring ? BrickValLocalization.localized("Restoring purchases…") : BrickValLocalization.localized("Restore purchases"),
                    subtitle: BrickValLocalization.localized("Recover Brickvalue Pro on this Apple ID"),
                    trailing: isRestoring ? BrickValLocalization.localized("Wait") : BrickValLocalization.localized("Restore")
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

    private var previewSettings: some View {
        VStack(spacing: BrickValStyle.Primitive.space12) {
            sectionHeader("Temporary preview")
            Button {
                presentedSheet = .hardPaywallOnboardingPreview
            } label: {
                profileRow(
                    icon: "lock.shield",
                    title: "Preview hard-paywall onboarding",
                    subtitle: "Review the new-user access flow",
                    trailing: "Open"
                )
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("settings.hardPaywallOnboardingPreview")
        }
        .padding(BrickValStyle.Primitive.space16)
        .profileCardStyle()
    }

    private func sectionHeader(_ title: LocalizedStringResource) -> some View {
        Text(title)
            .font(.caption.bold())
            .textCase(.uppercase)
            .foregroundStyle(BrickValStyle.Semantic.textSecondary)
            .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func profileRow(icon: String, title: LocalizedStringResource, subtitle: LocalizedStringResource, trailing: LocalizedStringResource) -> some View {
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

    private func profileRow(icon: String, title: LocalizedStringResource, subtitle: LocalizedStringResource, trailing: String) -> some View {
        HStack(spacing: BrickValStyle.Primitive.space12) {
            Image(systemName: icon)
                .font(.headline)
                .foregroundStyle(BrickValStyle.Semantic.textPrimary)
                .frame(width: 38, height: 38)
                .background(BrickValStyle.Semantic.surfaceMuted, in: RoundedRectangle(cornerRadius: 12))
            profileRowText(title: title, subtitle: subtitle)
            Spacer(minLength: BrickValStyle.Primitive.space8)
            Text(verbatim: trailing)
                .font(.caption.bold())
                .foregroundStyle(BrickValStyle.Semantic.textSecondary)
                .lineLimit(1)
        }
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
    }

    private func profileDynamicRow(icon: String, title: String, subtitle: String, trailing: String) -> some View {
        HStack(spacing: BrickValStyle.Primitive.space12) {
            Image(systemName: icon)
                .font(.headline)
                .foregroundStyle(BrickValStyle.Semantic.textPrimary)
                .frame(width: 38, height: 38)
                .background(BrickValStyle.Semantic.surfaceMuted, in: RoundedRectangle(cornerRadius: 12))
            profileRowText(title: title, subtitle: subtitle)
            Spacer(minLength: BrickValStyle.Primitive.space8)
            Text(verbatim: trailing)
                .font(.caption.bold())
                .foregroundStyle(BrickValStyle.Semantic.textSecondary)
                .lineLimit(1)
        }
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
    }

    private func profileProRow(
        icon: String,
        title: LocalizedStringResource,
        subtitle: LocalizedStringResource,
        state: ProBadgeState
    ) -> some View {
        HStack(spacing: BrickValStyle.Primitive.space12) {
            Image(systemName: icon)
                .font(.headline)
                .foregroundStyle(BrickValStyle.Semantic.textPrimary)
                .frame(width: 38, height: 38)
                .background(BrickValStyle.Semantic.surfaceMuted, in: RoundedRectangle(cornerRadius: 12))
            profileRowText(title: title, subtitle: subtitle)
            Spacer(minLength: BrickValStyle.Primitive.space8)
            ProBadge(state: state)
        }
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
    }

    private func profileRowText(icon: String? = nil, title: LocalizedStringResource, subtitle: LocalizedStringResource) -> some View {
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
                Text(verbatim: title)
                    .font(.headline)
                    .foregroundStyle(BrickValStyle.Semantic.textPrimary)
                Text(verbatim: subtitle)
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

    private var languageSubtitle: String {
        let languageName = preferences.effectiveLanguage.displayName
        guard preferences.languageOverride == nil else { return languageName }
        return "\(BrickValLocalization.localized("System default")) · \(languageName)"
    }

    private var currencySubtitle: String {
        let selectedCurrency = preferences.effectiveCurrency
        let activeCurrency = currency.displayCurrency(for: selectedCurrency)
        let activeName = "\(activeCurrency.displayName) (\(activeCurrency.code))"
        let systemPrefix = preferences.currencyOverride == nil
            ? "\(BrickValLocalization.localized("System default")) · "
            : ""
        guard selectedCurrency != activeCurrency else { return "\(systemPrefix)\(activeName)" }
        return "\(systemPrefix)\(BrickValLocalization.localized("Selected")) \(selectedCurrency.code) · \(BrickValLocalization.localized("Showing")) \(activeCurrency.code)"
    }

    private var accountStatusTitle: String {
        if coordinator?.clerk == nil { return BrickValLocalization.localized("Local collector profile") }
        return coordinator?.clerk?.user == nil
            ? BrickValLocalization.localized("Sign in to customize")
            : BrickValLocalization.localized("Signed in collector")
    }

    private var accountActionTitle: String {
        coordinator?.clerk?.user == nil
            ? BrickValLocalization.localized("Sign in or create account")
            : BrickValLocalization.localized("Account")
    }

    private var accountActionSubtitle: String {
        if coordinator?.clerk == nil {
            return BrickValLocalization.localized("Profile is saved on this device. Clerk sign-in is not configured.")
        }
        return coordinator?.clerk?.user == nil
            ? BrickValLocalization.localized("Sync identity before upgrading")
            : BrickValLocalization.localized("Manage profile and sign-in details")
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

    private func handleSecretLogoTap() {
        let now = Date()
        if now.timeIntervalSince(lastSecretLogoTap) > 2 {
            secretLogoTapCount = 0
        }

        secretLogoTapCount += 1
        lastSecretLogoTap = now

        guard secretLogoTapCount >= 7 else { return }
        secretLogoTapCount = 0
        preferences.isReplayingOnboarding = true
    }

    private func triggerPaywall(placement: ProPlacement) {
        guard let coordinator else {
            purchaseMessage = BrickValLocalization.localized("Upgrade options are not configured for this build.")
            return
        }
        _ = coordinator.presentUpgrade(placement: placement)
    }

    private func restorePurchases() {
        Task {
            isRestoring = true
            defer { isRestoring = false }
            do {
                try await coordinator?.restorePurchases()
                purchaseMessage = BrickValLocalization.localized("Purchases restored.")
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

private struct HardPaywallOnboardingPreviewView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var isShowingHardAccess = false

    var body: some View {
        ZStack(alignment: .topTrailing) {
            if isShowingHardAccess {
                HardScanAccessView()
            } else {
                OnboardingView(runMode: .isolatedHardPaywallPreview) {
                    withAnimation(.easeOut(duration: 0.24)) {
                        isShowingHardAccess = true
                    }
                }
            }

            Button {
                dismiss()
            } label: {
                Image(systemName: "xmark")
                    .font(.headline.weight(.bold))
                    .foregroundStyle(isShowingHardAccess ? .white : .black)
                    .frame(width: 36, height: 36)
                    .background(.ultraThinMaterial, in: Circle())
            }
            .padding(.top, 12)
            .padding(.trailing, 16)
            .accessibilityLabel("Close preview")
        }
        .interactiveDismissDisabled()
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
