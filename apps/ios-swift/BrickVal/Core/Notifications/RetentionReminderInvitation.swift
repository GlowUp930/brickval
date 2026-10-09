import SwiftUI

/// Inline consent; the iOS permission dialog only follows an explicit button tap.
struct RetentionReminderInvitationView: View {
    var onLightBackground = false
    var onboardingViewportHeight: CGFloat? = nil
    @Environment(NotificationCoordinator.self) private var notifications
    @State private var visible = false
    @State private var requesting = false

    var body: some View {
        Group {
            if visible && notifications.retentionAvailable {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Want a reminder to scan your minifigures?")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(onLightBackground ? Color.black : BrickValStyle.Semantic.textPrimary)
                    Text("Up to three reminders in your first week. Some scanning features require Pro. Turn reminders off anytime in Settings.")
                        .font(.caption)
                        .foregroundStyle(onLightBackground ? Color.black.opacity(0.65) : BrickValStyle.Semantic.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                    ViewThatFits(in: .horizontal) {
                        HStack { enableButton; declineButton }
                        VStack(alignment: .leading) { enableButton; declineButton }
                    }
                }
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(onLightBackground ? Color.black.opacity(0.04) : BrickValStyle.Semantic.surfaceMuted, in: .rect(cornerRadius: 16))
                .tint(onLightBackground ? .black : BrickValStyle.Semantic.valuePositive)
                .accessibilityElement(children: .contain)
                .onGeometryChange(for: Bool.self) { proxy in
                    guard let height = onboardingViewportHeight else { return true }
                    let frame = proxy.frame(in: .named("onboarding.reminderViewport"))
                    let visibleHeight = max(0, min(frame.maxY, height) - max(frame.minY, 0))
                    return frame.height > 0 && visibleHeight >= frame.height * 0.5
                } action: { isVisible in
                    if isVisible { notifications.markRetentionInvitationSeen() }
                }
            }
        }
        .onChange(of: notifications.showsRetentionInvitation, initial: true) { _, eligible in
            guard eligible, !notifications.retentionState.invitationSeen else { return }
            visible = true
            if onboardingViewportHeight == nil { notifications.markRetentionInvitationSeen() }
        }
    }

    private var enableButton: some View {
        Button("Enable reminders") {
            requesting = true
            Task {
                _ = await notifications.requestRetentionReminders()
                requesting = false
                visible = false
            }
        }
        .buttonStyle(.bordered)
        .frame(minHeight: 44)
        .disabled(requesting)
        .accessibilityIdentifier("retention.enable")
    }

    private var declineButton: some View {
        Button("Not now") {
            notifications.declineRetentionInvitation()
            visible = false
        }
        .frame(minHeight: 44)
        .disabled(requesting)
        .accessibilityIdentifier("retention.decline")
    }
}

#if DEBUG
struct RetentionNotificationDemoView: View {
    @Environment(NotificationCoordinator.self) private var notifications
    var body: some View {
        Group {
            if ProcessInfo.processInfo.arguments.contains("-retentionOnboarding") {
                OnboardingView()
            } else {
                NavigationStack {
                    VStack {
                        RetentionReminderInvitationView()
                        Button(action: {
                            notifications.recordMeaningfulActivity("usable_scan", hasCollection: false, usableScan: true)
                        }) { Text(verbatim: "Show usable scan result") }
                        .accessibilityIdentifier("retention.demo.result")
                        NotificationSettingsView()
                    }
                }
            }
        }
        .task {
            notifications.updatePolicy(.init(enabled: true, scanReset: true, trialEnding: true, accountAction: true, retention: true))
            notifications.prepareRetentionEligibility(onboardingCompleted: false)
        }
    }
}
#endif
