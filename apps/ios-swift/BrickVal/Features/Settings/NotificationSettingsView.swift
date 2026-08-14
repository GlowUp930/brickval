import SwiftUI
import UIKit

struct NotificationSettingsView: View {
    @Environment(NotificationCoordinator.self) private var notifications
    @Environment(MonetizationStore.self) private var monetization
    @Environment(EntitlementStore.self) private var entitlements
    @Environment(\.brickValAccent) private var accent
    @Environment(\.openURL) private var openURL

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space20) {
                statusCard
                reminderCard
            }
            .padding(BrickValStyle.Primitive.space16)
        }
        .background(BrickValStyle.Semantic.canvas.ignoresSafeArea())
        .navigationTitle("Notifications")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await notifications.refreshAuthorizationStatus()
        }
    }

    private var statusCard: some View {
        VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space12) {
            Label(statusTitle, systemImage: statusIcon)
                .font(.headline.weight(.bold))
                .foregroundStyle(statusColor)
            Text(statusMessage)
                .font(.subheadline)
                .foregroundStyle(BrickValStyle.Semantic.textSecondary)
                .fixedSize(horizontal: false, vertical: true)

            if notifications.authorizationStatus == .denied {
                Button("Open Settings", systemImage: "arrow.up.forward.app") {
                    guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
                    openURL(url)
                }
                .buttonStyle(.borderedProminent)
                .tint(accent)
            }
        }
        .padding(BrickValStyle.Primitive.space16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .notificationCardStyle()
    }

    private var reminderCard: some View {
        VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space8) {
            Text("REMINDERS")
                .font(.caption.bold())
                .foregroundStyle(BrickValStyle.Semantic.textSecondary)

            if !entitlements.isPro, notifications.policy.scanReset {
                NotificationToggleRow(
                    title: "Free scans are ready",
                    subtitle: "One reminder when your daily scans reset.",
                    isOn: Binding(
                        get: { notifications.scanResetReminderEnabled },
                        set: { enabled in
                            Task { await setScanResetReminder(enabled) }
                        }
                    )
                )
            }

            if entitlements.isPro {
                if notifications.subscriptionState?.isTrial == true,
                   notifications.policy.trialEnding {
                    NotificationToggleRow(
                        title: "Trial ending reminder",
                        subtitle: "One reminder 2 days before your trial renews.",
                        isOn: Binding(
                            get: { notifications.trialReminderEnabled },
                            set: { enabled in
                                Task { await setTrialReminder(enabled) }
                            }
                        )
                    )
                }

                if notifications.policy.accountAction {
                    NotificationToggleRow(
                        title: "Important account alerts",
                        subtitle: "Tell me when a subscription needs attention.",
                        isOn: Binding(
                            get: { notifications.accountAlertsEnabled },
                            set: { enabled in
                                Task { await setAccountAlerts(enabled) }
                            }
                        )
                    )
                }
            }
        }
        .padding(BrickValStyle.Primitive.space16)
        .notificationCardStyle()
    }

    private var statusTitle: String {
        switch notifications.authorizationStatus {
        case .authorized, .provisional, .ephemeral: "Notifications are on"
        case .denied: "Notifications are off"
        case .notDetermined: "Notifications are not set up"
        }
    }

    private var statusIcon: String {
        switch notifications.authorizationStatus {
        case .authorized, .provisional, .ephemeral: "bell.badge.fill"
        case .denied: "bell.slash.fill"
        case .notDetermined: "bell"
        }
    }

    private var statusColor: Color {
        notifications.authorizationStatus == .denied
            ? BrickValStyle.Semantic.valueNegative
            : BrickValStyle.Semantic.textPrimary
    }

    private var statusMessage: String {
        switch notifications.authorizationStatus {
        case .authorized, .provisional, .ephemeral:
            "BrickValue will only send reminders you choose. We do not send inactivity or generic marketing notifications."
        case .denied:
            "Turn notifications on in Settings to use a reminder you requested."
        case .notDetermined:
            "Notifications stay off until you choose a reminder below."
        }
    }

    private func setScanResetReminder(_ enabled: Bool) async {
        if enabled {
            guard let resetDate = monetization.usage.singleScan.resetsAt.flatMap(ISO8601DateFormatter().date(from:)) else { return }
            _ = await notifications.requestScanResetReminder(resetDate: resetDate)
        } else {
            notifications.cancel(category: .scanReset)
        }
    }

    private func setTrialReminder(_ enabled: Bool) async {
        if enabled, let state = notifications.subscriptionState,
           state.isTrial, let expirationDate = state.expirationDate {
            _ = await notifications.requestTrialReminder(
                expirationDate: expirationDate,
                willRenew: state.willRenew
            )
        } else {
            notifications.cancel(category: .trialEnding)
        }
    }

    private func setAccountAlerts(_ enabled: Bool) async {
        if enabled {
            _ = await notifications.requestAccountAlerts()
        } else {
            notifications.cancel(category: .accountAction)
        }
    }
}

private struct NotificationToggleRow: View {
    let title: String
    let subtitle: String
    @Binding var isOn: Bool

    var body: some View {
        Toggle(isOn: $isOn) {
            VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space4) {
                Text(title)
                    .font(.headline)
                    .foregroundStyle(BrickValStyle.Semantic.textPrimary)
                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(BrickValStyle.Semantic.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .tint(BrickValStyle.Semantic.valuePositive)
        .padding(.vertical, BrickValStyle.Primitive.space8)
    }
}

private extension View {
    func notificationCardStyle() -> some View {
        background(BrickValStyle.Semantic.surfaceMuted, in: RoundedRectangle(cornerRadius: 24))
            .overlay {
                RoundedRectangle(cornerRadius: 24)
                    .stroke(BrickValStyle.Semantic.divider.opacity(0.45), lineWidth: 1)
            }
    }
}
