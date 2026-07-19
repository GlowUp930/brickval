import SwiftUI

struct CardModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding()
            .background(.quaternary, in: .rect(cornerRadius: BrickValStyle.cardRadius))
    }
}

extension View {
    func brickValCard() -> some View { modifier(CardModifier()) }
}
