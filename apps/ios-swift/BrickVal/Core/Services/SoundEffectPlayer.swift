@preconcurrency import AVFoundation
import Foundation

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

    func play(_ effect: Effect) {
        guard let url = Bundle.main.url(
            forResource: effect.resourceName,
            withExtension: effect.fileExtension
        ) else {
            return
        }

        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.ambient, mode: .default, options: [.mixWithOthers])
            try session.setActive(true)

            let player = try AVAudioPlayer(contentsOf: url)
            player.delegate = self
            player.prepareToPlay()
            activePlayers.append(player)
            if !player.play() {
                activePlayers.removeAll { $0 === player }
            }
        } catch {
            // A missing audio route should never interrupt a successful scan.
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
