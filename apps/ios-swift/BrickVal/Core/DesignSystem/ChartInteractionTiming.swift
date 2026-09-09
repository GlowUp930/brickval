#if DEBUG
import QuartzCore
import os

/// Opt-in profiling only. Measures tap to the first display callback after SwiftUI
/// applies changed chart data; it does not claim to measure physical display latency.
@MainActor
final class ChartInteractionTiming: NSObject {
    static let shared = ChartInteractionTiming()
    private var start: CFTimeInterval?
    private var link: CADisplayLink?
    private let logger = Logger(subsystem: "com.brickval.app", category: "ChartPerformance")

    func begin() {
        guard ProcessInfo.processInfo.arguments.contains("-profileCollectionPerformance") else { return }
        link?.invalidate()
        link = nil
        start = CACurrentMediaTime()
    }

    func applied() {
        guard start != nil, link == nil else { return }
        let link = CADisplayLink(target: self, selector: #selector(frame))
        self.link = link
        link.add(to: .main, forMode: .common)
    }

    @objc private func frame() {
        guard let start else { return }
        let milliseconds = (CACurrentMediaTime() - start) * 1000
        logger.info("CHART_FRAME_MS \(milliseconds, privacy: .public)")
        self.start = nil
        link?.invalidate()
        link = nil
    }
}
#endif
