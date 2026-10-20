import Foundation
import Sentry

/// Temporary BRICKVAL-12 diagnostics. Only fixed screen names and monotonic
/// durations enter Sentry; no account, input, or collection data is accepted.
@MainActor
final class AppHangDiagnostics {
    enum Screen: String {
        case launch, onboarding, profile, account, authentication
        case accessGate = "access_gate"
    }

    enum Phase: String {
        case started, ready, requested, appeared, disappeared
    }

    struct Event {
        let screen: Screen
        let phase: Phase
        let elapsedMilliseconds: Int
        let presentationMilliseconds: Int?
        let source: Screen?

        var data: [String: Any] {
            var result: [String: Any] = [
                "diagnostic_version": 1,
                "screen": screen.rawValue,
                "phase": phase.rawValue,
                "elapsed_since_launch_ms": elapsedMilliseconds,
            ]
            if let presentationMilliseconds { result["presentation_ms"] = presentationMilliseconds }
            if let source { result["source_screen"] = source.rawValue }
            return result
        }
    }

    private let clock: () -> TimeInterval
    private let emit: (Event) -> Void
    private let startedAt: TimeInterval
    private var pending: [Screen: (time: TimeInterval, source: Screen)] = [:]

    init(
        clock: @escaping () -> TimeInterval = { ProcessInfo.processInfo.systemUptime },
        emit: @escaping (Event) -> Void = { event in
#if !DEBUG
            let breadcrumb = Breadcrumb(level: .info, category: "brickval.ui_diagnostic")
            breadcrumb.message = "\(event.screen.rawValue).\(event.phase.rawValue)"
            breadcrumb.data = event.data
            SentrySDK.addBreadcrumb(breadcrumb)
#endif
        }
    ) {
        self.clock = clock
        self.emit = emit
        startedAt = clock()
    }

    /// Called in the button action, before SwiftUI starts presenting the view.
    func request(_ screen: Screen, from source: Screen, includesAuthentication: Bool = false) {
        let now = clock()
        pending[screen] = (now, source)
        if screen == .account { pending.removeValue(forKey: .authentication) }
        if screen == .account, includesAuthentication {
            // Signed-out Account embeds authentication. Keep its request time
            // until the authentication view appears, independently of Account.
            pending[.authentication] = (now, source)
        }
        emit(Event(screen: screen, phase: .requested,
                   elapsedMilliseconds: milliseconds(now - startedAt),
                   presentationMilliseconds: nil, source: source))
    }

    func record(_ screen: Screen, _ phase: Phase) {
        let now = clock()
        let request = phase == .appeared ? pending.removeValue(forKey: screen) : nil
        if phase == .disappeared {
            pending.removeValue(forKey: screen)
            if screen == .account { pending.removeValue(forKey: .authentication) }
        }
        emit(Event(screen: screen, phase: phase,
                   elapsedMilliseconds: milliseconds(now - startedAt),
                   presentationMilliseconds: request.map { milliseconds(now - $0.time) },
                   source: request?.source))
    }

    private func milliseconds(_ seconds: TimeInterval) -> Int {
        Int(max(0, seconds) * 1_000)
    }
}
