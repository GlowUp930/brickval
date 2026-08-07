import SwiftUI

#if DEBUG
struct AccountDesignDraftsView: View {
    enum Draft: String, CaseIterable, Identifiable {
        case focus
        case sections
        case profileCard

        var id: String { rawValue }

        var shortTitle: String {
            switch self {
            case .focus: "Focus"
            case .sections: "Sections"
            case .profileCard: "Profile card"
            }
        }

        var title: String {
            switch self {
            case .focus: "Sign-in first"
            case .sections: "Clear sections"
            case .profileCard: "Compact profile card"
            }
        }

        var summary: String {
            switch self {
            case .focus:
                "The sign-in form is the primary content and appears immediately below a short access message."
            case .sections:
                "A calm default-profile row separates account access from profile customization."
            case .profileCard:
                "A compact identity card keeps the default icon visible while preserving room for sign-in."
            }
        }
    }

    @Environment(\.brickValAccent) private var accent
    @State private var selectedDraft: Draft
    @State private var email = ""
    @State private var password = ""

    init(initialDraft: Draft = .focus) {
        _selectedDraft = State(initialValue: initialDraft)
    }

    var body: some View {
        NavigationStack {
            ZStack {
                BrickValStyle.Semantic.canvas
                    .ignoresSafeArea()

                VStack(spacing: BrickValStyle.Primitive.space12) {
                    Picker("Account design", selection: $selectedDraft) {
                        ForEach(Draft.allCases) { draft in
                            Text(draft.shortTitle).tag(draft)
                        }
                    }
                    .pickerStyle(.segmented)
                    .accessibilityLabel("Account page design draft")

                    draftPreview
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                }
                .padding(.horizontal, BrickValStyle.Primitive.space16)
                .padding(.top, BrickValStyle.Primitive.space12)
                .padding(.bottom, BrickValStyle.Primitive.space16)
            }
            .navigationTitle("Manage Account")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Text("Draft")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    @ViewBuilder
    private var draftPreview: some View {
        switch selectedDraft {
        case .focus:
            focusPreview
        case .sections:
            sectionsPreview
        case .profileCard:
            profileCardPreview
        }
    }

    private var focusPreview: some View {
        VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space16) {
            accessHeading
            signInPanel
        }
    }

    private var sectionsPreview: some View {
        VStack(alignment: .leading, spacing: 0) {
            compactDefaultProfile
                .padding(.bottom, BrickValStyle.Primitive.space16)

            Divider()
                .padding(.bottom, BrickValStyle.Primitive.space16)

            signInPanel
        }
    }

    private var profileCardPreview: some View {
        VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space16) {
            HStack(spacing: BrickValStyle.Primitive.space12) {
                Image("AvatarClassic")
                    .resizable()
                    .scaledToFit()
                    .padding(8)
                    .frame(width: 68, height: 68)
                    .background(BrickValStyle.Primitive.gray200, in: RoundedRectangle(cornerRadius: 16))

                VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space4) {
                    Text("Classic")
                        .font(.headline)
                    Text("Default collector profile")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Spacer(minLength: BrickValStyle.Primitive.space8)

                Image(systemName: "lock.fill")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(accent)
                    .accessibilityHidden(true)
            }
            .padding(BrickValStyle.Primitive.space12)
            .background(BrickValStyle.Semantic.surfaceMuted, in: RoundedRectangle(cornerRadius: 18))
            .overlay {
                RoundedRectangle(cornerRadius: 18)
                    .stroke(BrickValStyle.Semantic.divider.opacity(0.45), lineWidth: 1)
            }
            .accessibilityElement(children: .combine)
            .accessibilityLabel("Classic default collector profile")

            signInPanel
        }
    }

    private var accessHeading: some View {
        VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space8) {
            Text("PROFILE")
                .font(.caption.weight(.semibold))
                .foregroundStyle(accent)
                .tracking(0.8)

            Text("Sign in to personalize")
                .font(.system(.title2, design: .rounded, weight: .bold))

            Text("The Classic icon is your default. Sign in to choose a collector icon and background.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var compactDefaultProfile: some View {
        HStack(spacing: BrickValStyle.Primitive.space12) {
            Image(systemName: "lock.circle.fill")
                .font(.title3)
                .foregroundStyle(accent)
                .frame(width: 40, height: 40)
                .background(accent.opacity(0.12), in: RoundedRectangle(cornerRadius: 12))

            VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space4) {
                Text("Sign in to personalize")
                    .font(.headline)
                Text("Classic is your default icon")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Spacer(minLength: BrickValStyle.Primitive.space8)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Sign in to personalize. Classic is your default icon.")
    }

    private var signInPanel: some View {
        VStack(alignment: .leading, spacing: BrickValStyle.Primitive.space12) {
            HStack {
                Text("Sign in")
                    .font(.title3.weight(.bold))
                Spacer()
                Image(systemName: "person.crop.circle.badge.checkmark")
                    .foregroundStyle(accent)
                    .accessibilityHidden(true)
            }

            Text("Access your collector profile")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            TextField("Email address", text: $email)
                .textFieldStyle(.roundedBorder)
                .textInputAutocapitalization(.never)
                .keyboardType(.emailAddress)
                .textContentType(.emailAddress)

            SecureField("Password", text: $password)
                .textFieldStyle(.roundedBorder)
                .textContentType(.password)

            Button {
                // Draft only.
            } label: {
                Text("Continue")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(accent)

            HStack {
                Button("Create account") { }
                    .foregroundStyle(accent)
                Spacer()
                Button("Forgot password?") { }
                    .foregroundStyle(.secondary)
            }
            .font(.footnote.weight(.semibold))
        }
        .padding(BrickValStyle.Primitive.space16)
        .background(BrickValStyle.Semantic.surfaceMuted, in: RoundedRectangle(cornerRadius: 20))
        .overlay {
            RoundedRectangle(cornerRadius: 20)
                .stroke(BrickValStyle.Semantic.divider.opacity(0.45), lineWidth: 1)
        }
        .accessibilityElement(children: .contain)
    }
}
#endif
