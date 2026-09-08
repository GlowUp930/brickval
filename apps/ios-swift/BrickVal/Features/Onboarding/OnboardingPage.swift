import Foundation

struct OnboardingPage: Identifiable, Sendable {
    let id: Int
    let title: LocalizedStringResource
    let message: LocalizedStringResource
    let systemImage: String

    static let pages = [
        OnboardingPage(id: 0, title: "Know what your LEGO is worth", message: "Scan sets and minifigures, then see recent market values in seconds.", systemImage: "viewfinder"),
        OnboardingPage(id: 1, title: "One collection, always current", message: "Save new or used items and track your portfolio value over time.", systemImage: "shippingbox"),
        OnboardingPage(id: 2, title: "Prices with context", message: "See the average of recent sold prices, or a clearly labeled average asking price from active listings.", systemImage: "chart.line.uptrend.xyaxis"),
        OnboardingPage(id: 3, title: "Scan hands-free", message: "Smart Scan waits for a clear, steady minifigure before taking the photo.", systemImage: "camera.viewfinder"),
    ]
}
