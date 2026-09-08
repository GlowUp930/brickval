import SwiftUI
import UIKit

struct ReferralView: View {
    @Environment(PreferencesStore.self) private var preferences
    @Environment(MonetizationStore.self) private var monetization
    @Environment(\.appSDKCoordinator) private var coordinator
    @Environment(\.brickValAPIClient) private var api
    @Environment(\.brickValAccent) private var accent
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(AppRouter.self) private var router
    @State private var status: ReferralStatus?
    @State private var inviteCode = ""
    @State private var isLoading = false
    @State private var isClaiming = false
    @State private var message: String?
    @State private var showAccount = false
    @State private var copiedCode = false
    @State private var hasCapturedOpen = false

    private var userID: String? {
        coordinator?.clerk?.user?.id
    }

    private var isSignedOut: Bool {
        coordinator?.clerk != nil && userID == nil
    }

    private var shareMessage: String {
        guard let status else {
            return BrickValLocalization.localized("Join me on BrickVal and find the value of your LEGO collection.")
        }
        return BrickValLocalization.localized("Join me on BrickVal and find the value of your LEGO collection. Use my invite code \(status.code): https://brickvalue.live/r/\(status.code)")
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space24) {
                hero

                if coordinator?.clerk == nil {
                    unavailableContent
                } else if isSignedOut {
                    signInContent
                } else {
                    referralContent
                }
            }
            .padding(.horizontal, BrickValStyle.Primitive.space16)
            .padding(.top, BrickValStyle.Primitive.space16)
            .padding(.bottom, BrickValStyle.Primitive.space32)
        }
        .background(BrickValStyle.Semantic.canvas.ignoresSafeArea())
        .navigationTitle("Invite friends")
        .navigationBarTitleDisplayMode(.inline)
        .task(id: userID) {
            await loadReferralStatus()
        }
        .onAppear {
            guard !hasCapturedOpen else { return }
            hasCapturedOpen = true
            coordinator?.analytics.capture(PostHogEvent.referralOpened)
        }
        .sheet(isPresented: $showAccount) {
            NavigationStack {
                AccountView()
            }
        }
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space20) {
            HStack {
                ZStack(alignment: .bottomTrailing) {
                    Circle()
                        .fill(BrickValStyle.Primitive.white.opacity(0.12))
                        .frame(width: 72, height: 72)

                    Image(systemName: "person.2.fill")
                        .font(.system(size: 30, weight: .semibold))
                        .foregroundStyle(accent)

                    Image(systemName: "plus")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(BrickValStyle.Primitive.black)
                        .frame(width: 24, height: 24)
                        .background(accent, in: Circle())
                        .overlay {
                            Circle().stroke(BrickValStyle.Primitive.brandInk, lineWidth: 3)
                        }
                        .offset(x: 4, y: 4)
                }
                .accessibilityHidden(true)

                Spacer(minLength: BrickValStyle.Primitive.space12)

                VStack(alignment: .trailing, spacing: BrickValStyle.Primitive.space4) {
                    Text("REWARD")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(BrickValStyle.Primitive.white.opacity(0.58))
                    Text("+3 scans")
                        .font(.headline.weight(.bold))
                        .foregroundStyle(accent)
                }
            }

            VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space8) {
                Text("Invite your LEGO crew")
                    .font(.system(.largeTitle, design: .rounded, weight: .black))
                    .foregroundStyle(BrickValStyle.Primitive.white)
                    .fixedSize(horizontal: false, vertical: true)
                    .accessibilityAddTraits(.isHeader)

                Text("Bring three friends to BrickVal. When they join and finish onboarding, you unlock three bonus bulk scans.")
                    .font(.body)
                    .foregroundStyle(BrickValStyle.Primitive.white.opacity(0.72))
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(BrickValStyle.Primitive.space20)
        .background {
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [BrickValStyle.Primitive.brandInk, BrickValStyle.Primitive.gray900],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .overlay(alignment: .topTrailing) {
                    Circle()
                        .fill(accent.opacity(0.16))
                        .frame(width: 150, height: 150)
                        .blur(radius: 2)
                        .offset(x: 62, y: -76)
                }
        }
        .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
        .accessibilityElement(children: .combine)
    }

    private var unavailableContent: some View {
        ContentUnavailableView(
            "Account configuration missing",
            systemImage: "person.crop.circle.badge.exclamationmark",
            description: Text("Sign-in is required to create and track invitations.")
        )
        .frame(maxWidth: .infinity)
    }

    private var signInContent: some View {
        VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space16) {
            Label("Save your invite progress", systemImage: "person.crop.circle.badge.plus")
                .font(.headline.weight(.bold))
                .foregroundStyle(BrickValStyle.Semantic.textPrimary)

            Text("Sign in to get your invite code and keep your bonus scans connected to your account.")
                .font(.body)
                .foregroundStyle(BrickValStyle.Semantic.textSecondary)
                .fixedSize(horizontal: false, vertical: true)

            Button("Open account", systemImage: "person.crop.circle") {
                showAccount = true
            }
            .buttonStyle(.borderedProminent)
            .tint(accent)
            .frame(minHeight: 44)
        }
        .padding(BrickValStyle.Primitive.space20)
        .background(BrickValStyle.Semantic.surfaceMuted, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
        .accessibilityElement(children: .contain)
    }

    private var referralContent: some View {
        VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space20) {
            if isLoading && status == nil {
                ProgressView("Loading invite status…")
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.vertical, BrickValStyle.Primitive.space20)
            } else if let status {
                progressContent(status)
                shareContent(status)
                claimContent
            }

            if let message {
                Label(message, systemImage: "info.circle.fill")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(BrickValStyle.Semantic.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
                    .transition(reduceMotion ? .opacity : .move(edge: .top).combined(with: .opacity))
            }
        }
    }

    private func progressContent(_ status: ReferralStatus) -> some View {
        let qualifiedCount = min(status.qualifiedCount, status.goal)

        return VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space16) {
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space4) {
                    Text("Invite progress")
                        .font(.headline.weight(.bold))
                        .foregroundStyle(BrickValStyle.Semantic.textPrimary)
                    Text(status.rewardGranted ? "Your reward is unlocked" : "Three qualified friends unlock your reward")
                        .font(.subheadline)
                        .foregroundStyle(BrickValStyle.Semantic.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Spacer(minLength: BrickValStyle.Primitive.space12)

                Text("\(qualifiedCount) / \(status.goal)")
                    .font(.title3.weight(.bold).monospacedDigit())
                    .foregroundStyle(accent)
            }

            ProgressView(value: Double(qualifiedCount), total: Double(status.goal))
                .tint(accent)
                .accessibilityValue("\(status.qualifiedCount) of \(status.goal) friends qualified")

            HStack(spacing: BrickValStyle.Primitive.space8) {
                ForEach(0..<status.goal, id: \.self) { index in
                    let isComplete = index < qualifiedCount
                    HStack(spacing: BrickValStyle.Primitive.space8) {
                        Image(systemName: isComplete ? "checkmark" : "person")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(isComplete ? BrickValStyle.Primitive.black : BrickValStyle.Semantic.textSecondary)
                            .frame(width: 30, height: 30)
                            .background(isComplete ? accent : BrickValStyle.Semantic.canvas, in: Circle())
                            .overlay {
                                Circle().stroke(isComplete ? accent : BrickValStyle.Semantic.divider, lineWidth: 1)
                            }

                        if index < status.goal - 1 {
                            Rectangle()
                                .fill(index < qualifiedCount - 1 ? accent : BrickValStyle.Semantic.divider)
                                .frame(height: 2)
                        }
                    }
                    .frame(maxWidth: .infinity)
                }
            }
            .accessibilityHidden(true)

            Text(progressMessage(for: status))
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(status.bulkCreditsRemaining > 0 ? accent : BrickValStyle.Semantic.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(BrickValStyle.Primitive.space20)
        .background(BrickValStyle.Semantic.surfaceMuted, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
        .accessibilityElement(children: .contain)
    }

    private func progressMessage(for status: ReferralStatus) -> String {
        if status.bulkCreditsRemaining > 0 {
            return BrickValLocalization.localized("\(status.bulkCreditsRemaining) bonus bulk scan available")
        }
        if status.rewardGranted {
            return BrickValLocalization.localized("Your referral reward has been used. Invite more friends to keep growing the community.")
        }
        let remaining = max(0, status.goal - status.qualifiedCount)
        return BrickValLocalization.localized("\(remaining) more friend to unlock 3 bonus bulk scans.")
    }

    private func shareContent(_ status: ReferralStatus) -> some View {
        VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space16) {
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space4) {
                    Text("Your invite code")
                        .font(.headline.weight(.bold))
                        .foregroundStyle(BrickValStyle.Semantic.textPrimary)
                    Text("Friends enter this code when they join BrickVal.")
                        .font(.subheadline)
                        .foregroundStyle(BrickValStyle.Semantic.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Spacer(minLength: BrickValStyle.Primitive.space8)

                Button {
                    UIPasteboard.general.string = status.code
                    withAnimation(reduceMotion ? nil : .snappy(duration: 0.2)) {
                        copiedCode = true
                    }
                } label: {
                    Label(copiedCode ? "Copied" : "Copy", systemImage: copiedCode ? "checkmark" : "doc.on.doc")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(accent)
                        .frame(minWidth: 44, minHeight: 44)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(copiedCode ? "Invite code copied" : "Copy invite code")
            }

            HStack(spacing: BrickValStyle.Primitive.space12) {
                Text(status.code)
                    .font(.system(.title, design: .monospaced, weight: .bold))
                    .tracking(2)
                    .foregroundStyle(BrickValStyle.Semantic.textPrimary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                    .accessibilityLabel("Invite code \(status.code)")

                Spacer(minLength: 0)
            }
            .padding(.horizontal, BrickValStyle.Primitive.space16)
            .frame(minHeight: 64)
            .background(BrickValStyle.Semantic.canvas, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(BrickValStyle.Semantic.divider, lineWidth: 1)
            }

            ShareLink(item: shareMessage, subject: Text("BrickVal invite")) {
                Label("Share invite", systemImage: "square.and.arrow.up")
                    .font(.headline.weight(.bold))
                    .frame(maxWidth: .infinity, minHeight: 52)
            }
            .buttonStyle(.borderedProminent)
            .tint(accent)
            .simultaneousGesture(TapGesture().onEnded {
                coordinator?.analytics.capture(PostHogEvent.referralInviteShared)
            })
        }
        .padding(BrickValStyle.Primitive.space20)
        .background(BrickValStyle.Semantic.surfaceMuted, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
    }

    private var claimContent: some View {
        VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space16) {
            VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space4) {
                Text("Have an invite code?")
                    .font(.headline.weight(.bold))
                    .foregroundStyle(BrickValStyle.Semantic.textPrimary)
                Text("Enter a friend's code to support their reward.")
                    .font(.subheadline)
                    .foregroundStyle(BrickValStyle.Semantic.textSecondary)
            }

            TextField("8-character code", text: $inviteCode)
                .textInputAutocapitalization(.characters)
                .autocorrectionDisabled()
                .font(.system(.title3, design: .monospaced, weight: .semibold))
                .padding(.horizontal, BrickValStyle.Primitive.space16)
                .frame(minHeight: 56)
                .background(BrickValStyle.Semantic.canvas, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .stroke(inviteCode.isEmpty ? BrickValStyle.Semantic.divider : accent, lineWidth: 1.5)
                }
                .onChange(of: inviteCode) { _, newValue in
                    inviteCode = String(newValue.uppercased().filter { $0.isLetter || $0.isNumber }.prefix(8))
                }

            Button {
                Task { await claimEnteredCode() }
            } label: {
                HStack {
                    if isClaiming {
                        ProgressView().tint(BrickValStyle.Primitive.black)
                    } else {
                        Text("Apply invite code")
                            .font(.headline.weight(.bold))
                    }
                }
                .frame(maxWidth: .infinity, minHeight: 52)
            }
            .buttonStyle(.borderedProminent)
            .tint(accent)
            .disabled(isClaiming || inviteCode.count != 8)
        }
        .padding(BrickValStyle.Primitive.space20)
        .background(BrickValStyle.Semantic.surfaceMuted, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
    }

    private func loadReferralStatus() async {
        guard userID != nil else {
            if let pendingReferralCode = router.pendingReferralCode {
                inviteCode = pendingReferralCode
            }
            return
        }

        isLoading = true
        message = nil
        defer { isLoading = false }

        do {
            let loadedStatus = try await api.referralStatus()
            status = loadedStatus
            monetization.applyReferralStatus(loadedStatus)

            if let pendingReferralCode = router.pendingReferralCode {
                inviteCode = pendingReferralCode
                await claim(code: pendingReferralCode, clearPendingCode: true)
            }
        } catch {
            message = BrickValLocalization.localized("We couldn't load your invite details. Check your connection and try again.")
        }
    }

    private func claimEnteredCode() async {
        await claim(code: inviteCode, clearPendingCode: false)
    }

    private func claim(code: String, clearPendingCode: Bool) async {
        let normalizedCode = code.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        guard normalizedCode.count == 8 else {
            message = BrickValLocalization.localized("Enter the 8-character invite code.")
            return
        }

        isClaiming = true
        message = nil
        coordinator?.analytics.capture(PostHogEvent.referralClaimAttempted)
        defer { isClaiming = false }

        do {
            let response = try await api.claimReferralCode(
                normalizedCode,
                InstallationIdentity.current()
            )
            status = response.referral
            monetization.applyReferralStatus(response.referral)
            inviteCode = ""
            if clearPendingCode { router.clearPendingReferral() }
            if response.claimed || response.status == "claimed" || response.status == "qualified" {
                coordinator?.analytics.capture(PostHogEvent.referralClaimed)
                var rewardGranted = response.referral.rewardGranted
                if preferences.hasCompletedOnboarding {
                    rewardGranted = await completeReferralOnboarding()
                } else {
                    message = BrickValLocalization.localized("Invite accepted. Complete onboarding to count toward your friend's reward.")
                }
                if rewardGranted {
                    coordinator?.analytics.capture(
                        PostHogEvent.referralRewardGranted,
                        properties: ["credits": response.referral.bonusBulkScans]
                    )
                }
            } else if response.status == "already_claimed" || response.status == "qualified" {
                message = BrickValLocalization.localized("This account already has an invite attached.")
            } else if response.status == "installation_already_used" {
                message = BrickValLocalization.localized("This installation has already used an invite code.")
            } else {
                message = BrickValLocalization.localized("That invite code could not be claimed.")
            }
        } catch {
            message = BrickValLocalization.localized("We couldn't apply that invite code. Check your connection and try again.")
        }
    }

    @discardableResult
    private func completeReferralOnboarding() async -> Bool {
        do {
            let completion = try await api.completeReferralOnboarding()
            preferences.referralOnboardingCompletionPending = false
            monetization.applyReferralStatus(completion.referral)
            message = BrickValLocalization.localized("Invite accepted. You now count toward your friend's reward.")
            coordinator?.analytics.capture(
                PostHogEvent.referralOnboardingCompleted,
                properties: [
                    "qualified": completion.qualified,
                    "reward_granted": completion.rewardGranted,
                    "source": "profile",
                ]
            )
            return completion.rewardGranted
        } catch {
            preferences.referralCompletionUserID = coordinator?.clerk?.user?.id
            preferences.referralOnboardingCompletionPending = true
            message = BrickValLocalization.localized("Invite accepted. We'll finish counting it when you're back online.")
            return false
        }
    }
}

#Preview {
    NavigationStack { ReferralView() }
        .environment(AppRouter())
        .environment(PreferencesStore())
        .environment(MonetizationStore())
}
