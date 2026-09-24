import PhotosUI
import SwiftUI

/// Short, photo-led recovery help for recognition failures only.
struct ScanPhotoGuideView: View {
    @Binding var selectedPhoto: PhotosPickerItem?
    let retake: () -> Void
    let dismiss: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            GeometryReader { geometry in
                HStack(spacing: 0) {
                    example(
                        image: "ScanGuideGood",
                        title: BrickValLocalization.localized("Good"),
                        detail: BrickValLocalization.localized("Separate"),
                        symbol: "checkmark",
                        badgeColor: Color(red: 0.08, green: 0.30, blue: 0.15)
                    )
                    .frame(width: geometry.size.width / 2)

                    example(
                        image: "ScanGuideAvoid",
                        title: BrickValLocalization.localized("Avoid"),
                        detail: BrickValLocalization.localized("Don't pile"),
                        symbol: "xmark",
                        badgeColor: Color(red: 0.51, green: 0.17, blue: 0.14)
                    )
                    .frame(width: geometry.size.width / 2)
                }
            }
            .frame(height: 186)
            .overlay(alignment: .topTrailing) {
                Button(action: dismiss) {
                    Image(systemName: "xmark")
                        .font(.subheadline.bold())
                        .frame(width: 44, height: 44)
                        .background(.regularMaterial, in: Circle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Close")
                .accessibilityIdentifier("scanner.photoGuide.close")
                .padding(4)
            }

            VStack(alignment: .leading, spacing: 12) {
                Text("Scan fails? Try these!")
                    .font(.title3.bold())
                    .foregroundStyle(.primary)
                    .fixedSize(horizontal: false, vertical: true)

                guidanceLabels

                ViewThatFits(in: .horizontal) {
                    HStack(spacing: 8) { tipLabels }
                    VStack(spacing: 8) { tipLabels }
                }

                Button("Retake photo", action: retake)
                    .font(.subheadline.bold())
                    .frame(maxWidth: .infinity, minHeight: 48)
                    .foregroundStyle(.black)
                    .background(BrickValStyle.Semantic.valuePositive, in: .rect(cornerRadius: 14))
                    .accessibilityIdentifier("scanner.photoGuide.retake")

                PhotosPicker(selection: $selectedPhoto, matching: .images) {
                    Text("Choose from Library")
                        .font(.subheadline.weight(.semibold))
                        .frame(maxWidth: .infinity, minHeight: 44)
                }
                .buttonStyle(.plain)
                .foregroundStyle(BrickValStyle.Semantic.valuePositive)
                .accessibilityIdentifier("scanner.photoGuide.library")
            }
            .padding(16)
        }
        .background(Color(.systemBackground), in: .rect(cornerRadius: 24))
        .clipShape(.rect(cornerRadius: 24))
        .frame(maxWidth: 340)
        .postHogNoMask()
    }

    private var guidanceLabels: some View {
        HStack(spacing: 10) {
            Label("Separate", systemImage: "checkmark")
                .foregroundStyle(BrickValStyle.Semantic.valuePositive)
            Label("Don't pile", systemImage: "xmark")
                .foregroundStyle(BrickValStyle.Semantic.valueNegative)
        }
        .font(.caption.weight(.semibold))
        .fixedSize(horizontal: false, vertical: true)
    }

    @ViewBuilder
    private var tipLabels: some View {
        tip("Bright light", symbol: "sun.max.fill")
        tip("Try a library photo", symbol: "photo.on.rectangle")
    }

    private func tip(_ text: LocalizedStringKey, symbol: String) -> some View {
        Label(text, systemImage: symbol)
            .font(.caption.weight(.semibold))
            .foregroundStyle(BrickValStyle.Semantic.textPrimary)
            .frame(maxWidth: .infinity, minHeight: 44)
            .padding(.horizontal, 8)
            .background(BrickValStyle.Semantic.surfaceMuted, in: .rect(cornerRadius: 12))
            .accessibilityElement(children: .combine)
    }

    private func example(
        image: String,
        title: String,
        detail: String,
        symbol: String,
        badgeColor: Color
    ) -> some View {
        GeometryReader { geometry in
            Image(image)
                .resizable()
                .scaledToFill()
                .frame(width: geometry.size.width, height: geometry.size.height)
                .clipped()
                .overlay(alignment: .topLeading) {
                    Label(title, systemImage: symbol)
                        .font(.caption2.bold())
                        .foregroundStyle(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 5)
                        .background(badgeColor, in: Capsule())
                        .padding(8)
                        .accessibilityHidden(true)
                }
                .accessibilityLabel("\(title): \(detail)")
        }
    }
}
