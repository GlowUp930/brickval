@preconcurrency import CoreMotion
import Foundation

actor MotionStabilityService {
    private let manager = CMMotionManager()
    private var stable = true
    private var previousAcceleration: CMAcceleration?

    func start() {
        guard manager.isAccelerometerAvailable, !manager.isAccelerometerActive else { return }
        manager.accelerometerUpdateInterval = 0.06
        manager.startAccelerometerUpdates(to: OperationQueue()) { [weak self] data, _ in
            guard let acceleration = data?.acceleration else { return }
            Task { await self?.observe(acceleration) }
        }
    }

    func stop() {
        manager.stopAccelerometerUpdates()
        stable = true
        previousAcceleration = nil
    }

    func isStable() -> Bool { stable }

    private func observe(_ acceleration: CMAcceleration) {
        defer { previousAcceleration = acceleration }
        guard let previousAcceleration else {
            stable = true
            return
        }
        let dx = acceleration.x - previousAcceleration.x
        let dy = acceleration.y - previousAcceleration.y
        let dz = acceleration.z - previousAcceleration.z
        stable = sqrt(dx * dx + dy * dy + dz * dz) < 0.05
    }
}
