import SwiftUI

struct ReferralView: View {
    @Environment(PreferencesStore.self) private var preferences
    @Environment(MonetizationStore.self) private var monetization
    @Environment(\.appSDKCoordinator) private var coordinator
    @Environment(\.brickValAPIClient) private var api
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(AppRouter.self) private var router
    @State private var status: ReferralStatus?
    @State private var inviteCode = ""
    @State private var isLoading = false
    @State private var isClaiming = false
    @State private var message: String?
    @State private var showAccount = false
    @State private var hasCapturedOpen = false

    private var userID: String? {
        coordinator?.clerk?.user?.id
    }

    private var isSignedOut: Bool {
        coordinator?.clerk != nil && userID == nil
    }

    private var shareMessage: String {
        guard let status else { return "Join me on BrickVal and find the value of your LEGO collection." }
        return "Join me on BrickVal and find the value of your LEGO collection. Use my invite code \(status.code): https://brickvalue.live/r/\(status.code)"
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space20) {
                intro

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

    private var intro: some View {
        VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space8) {
            Label("Earn scans together", systemImage: "person.2.fill")
                .font(.title2.weight(.bold))
                .foregroundStyle(BrickValStyle.Semantic.textPrimary)
            Text("Invite three friends. When each friend signs in and completes onboarding, you receive three bonus bulk scans.")
                .font(.body)
                .foregroundStyle(BrickValStyle.Semantic.textSecondary)
        }
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
        VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space12) {
            Label("Sign in to invite friends", systemImage: "person.crop.circle.badge.plus")
                .font(.headline)
                .foregroundStyle(BrickValStyle.Semantic.textPrimary)
            Text("Your invite progress and bonus scans are attached to your BrickVal account.")
                .font(.subheadline)
                .foregroundStyle(BrickValStyle.Semantic.textSecondary)
            Button("Open account", systemImage: "person.crop.circle") {
                showAccount = true
            }
            .buttonStyle(.borderedProminent)
            .frame(minHeight: 44)
        }
        .padding(BrickValStyle.Primitive.space16)
        .background(BrickValStyle.Semantic.surfaceMuted, in: RoundedRectangle(cornerRadius: 16))
    }

    private var referralContent: some View {
        VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space16) {
            if isLoading && status == nil {
                ProgressView("Loading invite status...")
                    .frame(maxWidth: .infinity, alignment: .leading)
            } else if let status {
                progressContent(status)
                shareContent(status)
                claimContent
            }

            if let message {
                Text(message)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(BrickValStyle.Semantic.textSecondary)
                    .transition(reduceMotion ? .opacity : .move(edge: .top).combined(with: .opacity))
            }
        }
    }

    private func progressContent(_ status: ReferralStatus) -> some View {
        VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space12) {
            HStack(alignment: .firstTextBaseline) {
                Text("Invite progress")
                    .font(.headline)
                Spacer()
                Text("\(min(status.qualifiedCount, status.goal)) of \(status.goal)")
                    .font(.headline.monospacedDigit())
                    .foregroundStyle(BrickValStyle.Semantic.valuePositive)
            }
            ProgressView(value: Double(min(status.qualifiedCount, status.goal)), total: Double(status.goal))
                .tint(BrickValStyle.Semantic.valuePositive)
                .accessibilityValue("\(status.qualifiedCount) of \(status.goal) friends qualified")
            Text(status.bulkCreditsRemaining > 0
                 ? "\(status.bulkCreditsRemaining) bonus bulk \(status.bulkCreditsRemaining == 1 ? "scan" : "scans") available"
                 : "Bonus scans unlock after three qualified friends.")
                .font(.subheadline)
                .foregroundStyle(BrickValStyle.Semantic.textSecondary)
        }
        .padding(BrickValStyle.Primitive.space16)
        .background(BrickValStyle.Semantic.surfaceMuted, in: RoundedRectangle(cornerRadius: 16))
        .accessibilityElement(children: .contain)
    }

    private func shareContent(_ status: ReferralStatus) -> some View {
        VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space12) {
            Text("Your invite code")
                .font(.headline)
            Text(status.code)
                .font(.system(size: 30, weight: .bold, design: .monospaced))
                .tracking(2)
                .foregroundStyle(BrickValStyle.Semantic.valuePositive)
                .accessibilityLabel("Invite code \(status.code)")
            ShareLink(item: shareMessage, subject: Text("BrickVal invite")) {
                Label("Invite friends", systemImage: "square.and.arrow.up")
                    .frame(maxWidth: .infinity, minHeight: 44)
            }
            .buttonStyle(.borderedProminent)
            .simultaneousGesture(TapGesture().onEnded {
                coordinator?.analytics.capture(PostHogEvent.referralInviteShared)
            })
        }
    }

    private var claimContent: some View {
        VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space12) {
            Text("Have an invite code?")
                .font(.headline)
            HStack(spacing: BrickValStyle.Primitive.space8) {
                TextField("Invite code", text: $inviteCode)
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
                    .textFieldStyle(.roundedBorder)
                    .onChange(of: inviteCode) { _, newValue in
                        inviteCode = String(newValue.uppercased().filter { $0.isLetter || $0.isNumber }.prefix(8))
                    }
                Button("Claim") {
                    Task { await claimEnteredCode() }
                }
                .buttonStyle(.bordered)
                .frame(minHeight: 44)
                .disabled(isClaiming || inviteCode.count != 8)
            }
        }
    }

    private func loadReferralStatus() async {
        guard userID != nil else {
            if let pendingReferralCode = router.pendingReferralCode {
                inviteCode = pendingReferralCode
            }
            return
        }

        isLoading = true
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
            message = error.localizedDescription
        }
    }

    private func claimEnteredCode() async {
        await claim(code: inviteCode, clearPendingCode: false)
    }

    private func claim(code: String, clearPendingCode: Bool) async {
        let normalizedCode = code.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        guard normalizedCode.count == 8 else {
            message = "Enter the 8-character invite code."
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
            if response.claimed {
                coordinator?.analytics.capture(PostHogEvent.referralClaimed)
                var rewardGranted = response.referral.rewardGranted
                if preferences.hasCompletedOnboarding {
                    rewardGranted = await completeReferralOnboarding()
                } else {
                    message = "Invite accepted. Your friend will count when onboarding is complete."
                }
                if rewardGranted {
                    coordinator?.analytics.capture(
                        PostHogEvent.referralRewardGranted,
                        properties: ["credits": response.referral.bonusBulkScans]
                    )
                }
            } else if response.status == "already_claimed" || response.status == "qualified" {
                message = "This account already has an invite attached."
            } else if response.status == "installation_already_used" {
                message = "This installation has already used an invite code."
            } else {
                message = "That invite code could not be claimed."
            }
        } catch {
            message = error.localizedDescription
        }
    }

    @discardableResult
    private func completeReferralOnboarding() async -> Bool {
        do {
            let completion = try await api.completeReferralOnboarding()
            preferences.referralOnboardingCompletionPending = false
            monetization.applyReferralStatus(completion.referral)
            message = completion.rewardGranted
                ? "Invite accepted. Your bonus scans are ready."
                : "Invite accepted. Your friend is now counted toward your referral progress."
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
            preferences.referralOnboardingCompletionPending = true
            message = "Invite accepted. We'll finish counting it when you're back online."
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
