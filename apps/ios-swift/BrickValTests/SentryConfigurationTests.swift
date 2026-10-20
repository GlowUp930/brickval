import Foundation
import Testing
@testable import BrickVal

@MainActor
struct SentryConfigurationTests {
    @Test func hangDiagnosticsMeasureBothAccountAndAuthenticationFromTheTap() {
        var uptime = 100.0
        var events: [AppHangDiagnostics.Event] = []
        let diagnostics = AppHangDiagnostics(clock: { uptime }, emit: { events.append($0) })
        diagnostics.record(.launch, .started)
        uptime = 102
        diagnostics.request(.account, from: .accessGate, includesAuthentication: true)
        uptime = 102.25
        diagnostics.record(.account, .appeared)
        uptime = 102.5
        diagnostics.record(.authentication, .appeared)

        #expect(events.map(\.phase) == [.started, .requested, .appeared, .appeared])
        #expect(events[2].presentationMilliseconds == 250)
        #expect(events[3].presentationMilliseconds == 500)
        #expect(events[3].elapsedMilliseconds == 2_500)
        #expect(events[3].source == .accessGate)
        #expect(Set(events[3].data.keys) == [
            "diagnostic_version", "screen", "phase", "elapsed_since_launch_ms",
            "presentation_ms", "source_screen",
        ])
        #expect(events[3].data["screen"] as? String == "authentication")
    }

    @Test func dismissingAccountClearsAnUnfinishedAuthenticationRequest() {
        var uptime = 100.0
        var events: [AppHangDiagnostics.Event] = []
        let diagnostics = AppHangDiagnostics(clock: { uptime }, emit: { events.append($0) })
        diagnostics.request(.account, from: .accessGate, includesAuthentication: true)
        diagnostics.record(.account, .disappeared)
        uptime = 110
        diagnostics.record(.authentication, .appeared)

        #expect(events.last?.presentationMilliseconds == nil)
        #expect(events.last?.source == nil)
    }

    @Test func reopeningAccountReplacesThePreviousRequestAndOrigin() {
        var uptime = 100.0
        var events: [AppHangDiagnostics.Event] = []
        let diagnostics = AppHangDiagnostics(clock: { uptime }, emit: { events.append($0) })
        diagnostics.request(.account, from: .accessGate, includesAuthentication: true)
        uptime = 110
        diagnostics.request(.account, from: .profile, includesAuthentication: true)
        diagnostics.record(.onboarding, .appeared)
        uptime = 110.5
        diagnostics.record(.authentication, .appeared)

        #expect(events.last?.presentationMilliseconds == 500)
        #expect(events.last?.source == .profile)
    }

    @Test func signedInAccountDoesNotStartAnAuthenticationTimer() {
        var events: [AppHangDiagnostics.Event] = []
        let diagnostics = AppHangDiagnostics(clock: { 100 }, emit: { events.append($0) })
        diagnostics.request(.account, from: .accessGate, includesAuthentication: true)
        diagnostics.request(.account, from: .profile)
        diagnostics.record(.account, .appeared)
        diagnostics.record(.authentication, .appeared)

        #expect(events.last?.presentationMilliseconds == nil)
        #expect(events.last?.source == nil)
    }

    @Test func authenticationRequestIsConsumedAndStartupRecordsNoPresentationData() {
        var uptime = 100.0
        var events: [AppHangDiagnostics.Event] = []
        let diagnostics = AppHangDiagnostics(clock: { uptime }, emit: { events.append($0) })
        uptime = 101
        diagnostics.record(.launch, .ready)
        diagnostics.request(.authentication, from: .onboarding)
        uptime = 101.25
        diagnostics.record(.authentication, .appeared)
        diagnostics.record(.authentication, .appeared)

        #expect(events[0].elapsedMilliseconds == 1_000)
        #expect(Set(events[0].data.keys) == ["diagnostic_version", "screen", "phase", "elapsed_since_launch_ms"])
        #expect(events[2].presentationMilliseconds == 250)
        #expect(events.last?.presentationMilliseconds == nil)
    }

    @Test func automaticFailedRequestCaptureIsLimitedToTheBrickValAPIHost() {
        let apiURL = URL(string: "https://brickvalue.live/api/lookup")!

        #expect(AppSDKCoordinator.sentryFailedRequestTargets(for: apiURL) == ["brickvalue.live"])
    }
}
