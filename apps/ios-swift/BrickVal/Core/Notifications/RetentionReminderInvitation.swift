import SwiftUI

private struct RetentionReminderInvitation: ViewModifier {
    @Environment(NotificationCoordinator.self) private var notifications
    @State private var presented = false

    func body(content: Content) -> some View {
        content
            .onChange(of: notifications.showsRetentionInvitation, initial: true) { _, eligible in
                guard eligible, !notifications.retentionState.invitationSeen else { return }
                presented = true
                notifications.markRetentionInvitationSeen()
            }
            .alert("Want occasional reminders to scan and build your collection?", isPresented: $presented) {
                Button("Enable reminders") {
                    Task { _ = await notifications.requestRetentionReminders() }
                }
                Button("Not now", role: .cancel) { notifications.declineRetentionInvitation() }
            } message: {
                Text("At most one reminder a week, and two in 30 days. Turn them off anytime in Notifications.")
            }
    }
}

extension View {
    func retentionReminderInvitation() -> some View { modifier(RetentionReminderInvitation()) }
}

#if DEBUG
/// Isolated consent fixture; never writes production reminder preferences.
struct RetentionNotificationDemoView: View {
    @Environment(NotificationCoordinator.self) private var notifications
    var body: some View {
        NavigationStack {
            VStack {
                Button(action: {
                    notifications.recordMeaningfulActivity("usable_scan", hasCollection: false, usableScan: true)
                }) { Text(verbatim: "Show usable scan result") }
                .accessibilityIdentifier("retention.demo.result")
                NotificationSettingsView()
            }
        }
        .retentionReminderInvitation()
        .task {
            notifications.updatePolicy(.init(enabled: true, scanReset: true, trialEnding: true, accountAction: true, retention: true))
        }
    }
}
#endif
