@preconcurrency import AVFoundation
import Foundation

@MainActor
final class SoundEffectPlayer {
    enum Effect: String {
        case cashRegister = "cash-register-kaching"
    }

    private var player: AVAudioPlayer?

    func play(_ effect: Effect) {
        guard let url = Bundle.main.url(forResource: effect.rawValue, withExtension: "aac") else {
            return
        }

        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.ambient, mode: .default, options: [.mixWithOthers])
            try session.setActive(true)

            let player = try AVAudioPlayer(contentsOf: url)
            player.prepareToPlay()
            player.play()
            self.player = player
        } catch {
            // A missing audio route should never interrupt a successful scan.
        }
    }
}
