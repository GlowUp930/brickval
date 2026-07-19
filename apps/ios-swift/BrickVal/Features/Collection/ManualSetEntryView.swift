import SwiftUI

struct ManualSetEntryView: View {
    @Environment(\.brickValAPIClient) private var api
    @Environment(\.dismiss) private var dismiss

    @State private var setNumber = ""
    @State private var result: LookupResult?
    @State private var isLoading = false
    @State private var errorMessage: String?

    private let keypadColumns = Array(repeating: GridItem(.flexible(), spacing: 12), count: 3)

    var body: some View {
        if let result {
            ScanResultView(result: result, reset: dismiss.callAsFunction)
        } else {
            NavigationStack {
                ZStack {
                    BrickValStyle.Semantic.inverseCanvas
                        .ignoresSafeArea()

                    ScrollView(showsIndicators: false) {
                        VStack(spacing: 16) {
                            header
                            hero
                            entryDisplay
                            errorView
                            keypad
                            lookupButton
                        }
                        .padding(.horizontal, 22)
                        .padding(.top, 18)
                        .padding(.bottom, 24)
                    }
                    .background(
                        RoundedRectangle(cornerRadius: 38, style: .continuous)
                            .fill(BrickValStyle.Primitive.white)
                            .shadow(color: .black.opacity(0.22), radius: 20, y: 10)
                            .padding(.horizontal, 10)
                    )
                    .padding(.top, 12)
                    .padding(.bottom, 10)
                }
                .toolbar(.hidden, for: .navigationBar)
            }
        }
    }

    private var header: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 8) {
                Text("Add LEGO set")
                    .font(.system(size: 30, weight: .heavy, design: .rounded))
                    .foregroundStyle(.black)

                Text("Enter the number printed on the box or instructions.")
                    .font(.system(size: 16, weight: .semibold, design: .rounded))
                    .foregroundStyle(.black.opacity(0.52))
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer(minLength: 16)

            Button(action: dismiss.callAsFunction) {
                Image(systemName: "xmark")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundStyle(.black)
                    .frame(width: 48, height: 48)
                    .contentShape(Circle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Close manual set entry")
        }
        .padding(.top, 14)
    }

    private var hero: some View {
        Image("ManualEntryHero")
            .resizable()
            .scaledToFit()
            .frame(maxHeight: 168)
            .frame(maxWidth: .infinity)
            .padding(.top, 4)
            .accessibilityHidden(true)
    }

    private var entryDisplay: some View {
        HStack(spacing: 0) {
            Text("SET")
                .font(.system(size: 24, weight: .black, design: .rounded))
                .foregroundStyle(.black)
                .frame(width: 112, height: 62)
                .background(BrickValStyle.Semantic.builderYellow)

            Text(setNumber.isEmpty ? "10307" : setNumber)
                .font(.system(size: 28, weight: .bold, design: .rounded))
                .foregroundStyle(setNumber.isEmpty ? .black.opacity(0.28) : .black)
                .frame(maxWidth: .infinity, minHeight: 62, alignment: .leading)
                .padding(.horizontal, 24)
                .background(BrickValStyle.Primitive.gray50)
                .overlay(alignment: .trailing) {
                    Rectangle()
                        .fill(.black)
                        .frame(width: 3, height: 34)
                        .opacity(setNumber.isEmpty ? 0 : 1)
                        .padding(.trailing, 22)
                }
        }
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(BrickValStyle.Semantic.builderRed, lineWidth: 3)
        )
        .shadow(color: .black.opacity(0.16), radius: 0, y: 4)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Set number")
        .accessibilityValue(setNumber.isEmpty ? "Empty" : setNumber)
    }

    @ViewBuilder
    private var errorView: some View {
        if let errorMessage {
            Text(errorMessage)
                .font(.system(size: 15, weight: .semibold, design: .rounded))
                .foregroundStyle(BrickValStyle.Semantic.builderRed)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(14)
                .background(BrickValStyle.Semantic.builderRed.opacity(0.08))
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
    }

    private var keypad: some View {
        LazyVGrid(columns: keypadColumns, spacing: 12) {
            ForEach(1...9, id: \.self) { digit in
                keypadButton(String(digit)) { appendDigit(digit) }
            }

            Color.clear
                .frame(height: 58)

            keypadButton("0") { appendDigit(0) }

            Button(action: deleteDigit) {
                Image(systemName: "delete.left")
                    .font(.system(size: 30, weight: .black))
                    .foregroundStyle(.black)
                    .frame(maxWidth: .infinity, minHeight: 58)
                    .contentShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            }
            .buttonStyle(.plain)
            .disabled(setNumber.isEmpty)
            .opacity(setNumber.isEmpty ? 0.28 : 1)
            .accessibilityLabel("Delete digit")
        }
    }

    private var lookupButton: some View {
        Button(action: lookup) {
            HStack(spacing: 10) {
                if isLoading {
                    ProgressView()
                        .tint(.white)
                } else {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 18, weight: .black))
                }

                Text(isLoading ? "Looking up..." : "Look up set")
                    .font(.system(size: 20, weight: .black, design: .rounded))
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity, minHeight: 54)
            .background(canLookUp ? BrickValStyle.Semantic.builderBlue : BrickValStyle.Primitive.gray400)
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        }
        .buttonStyle(.plain)
        .disabled(!canLookUp)
        .accessibilityHint("Searches BrickVal for this LEGO set number")
    }

    private var canLookUp: Bool {
        !setNumber.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !isLoading
    }

    private func keypadButton(_ label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.system(size: 28, weight: .black, design: .rounded))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity, minHeight: 58)
                .background(BrickValStyle.Semantic.builderBlue)
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        }
        .buttonStyle(.plain)
        .disabled(isLoading)
    }

    private func appendDigit(_ digit: Int) {
        guard setNumber.count < 8 else { return }
        errorMessage = nil
        setNumber.append(String(digit))
    }

    private func deleteDigit() {
        guard !setNumber.isEmpty else { return }
        errorMessage = nil
        setNumber.removeLast()
    }

    private func lookup() {
        guard canLookUp else { return }

        Task {
            isLoading = true
            errorMessage = nil
            defer { isLoading = false }

            do {
                result = try await api.lookup(setNumber.trimmingCharacters(in: .whitespacesAndNewlines), .set, nil)
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }
}
