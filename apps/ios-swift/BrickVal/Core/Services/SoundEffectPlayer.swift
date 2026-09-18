@preconcurrency import AVFoundation
import Foundation
import OSLog

@MainActor
final class SoundEffectPlayer: NSObject {
    enum Effect {
        case cashRegister
        case bulkModePowerUp
        case bulkResultCashRegister

        var resourceName: String {
            switch self {
            case .cashRegister: "cash-register-kaching"
            case .bulkModePowerUp: "bulk-mode-power-up"
            case .bulkResultCashRegister: "bulk-result-cash-register"
            }
        }

        var fileExtension: String {
            switch self {
            case .cashRegister: "aac"
            case .bulkModePowerUp, .bulkResultCashRegister: "mp3"
            }
        }
    }

    private var activePlayers: [AVAudioPlayer] = []
    private let logger = Logger(subsystem: "com.brickval.app", category: "SoundEffects")

    func play(_ effect: Effect) {
        guard let url = Bundle.main.url(
            forResource: effect.resourceName,
            withExtension: effect.fileExtension
        ) else {
            logger.error(
                "Missing bundled sound effect: \(effect.resourceName, privacy: .public).\(effect.fileExtension, privacy: .public)"
            )
            return
        }

        do {
            let session = AVAudioSession.sharedInstance()
            // Playback keeps scan feedback audible when the iPhone silent
            // switch is on, while mixWithOthers avoids stopping the user's
            // music or podcast.
            try session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
            try session.setActive(true)

            let player = try AVAudioPlayer(contentsOf: url)
            player.volume = 1
            player.delegate = self
            player.prepareToPlay()
            activePlayers.append(player)
            if !player.play() {
                activePlayers.removeAll { $0 === player }
                logger.error("Audio player rejected sound effect: \(effect.resourceName, privacy: .public)")
            }
        } catch {
            // Audio feedback must never interrupt a successful scan, but keep
            // the failure visible in the device console for release checks.
            logger.error(
                "Unable to play sound effect \(effect.resourceName, privacy: .public): \(error.localizedDescription, privacy: .public)"
            )
        }
    }
}

extension SoundEffectPlayer: AVAudioPlayerDelegate {
    nonisolated func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        Task { @MainActor [weak self] in
            self?.activePlayers.removeAll { $0 === player }
        }
    }
}
