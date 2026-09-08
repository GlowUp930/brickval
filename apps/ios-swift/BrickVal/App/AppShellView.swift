import SwiftUI

struct AppShellView: View {
    @Environment(AppRouter.self) private var router
    @Environment(EntitlementStore.self) private var entitlements
    @Environment(MonetizationStore.self) private var monetization
    @Environment(NotificationCoordinator.self) private var notifications
    @Environment(ProductFeedbackStore.self) private var feedback
    @Environment(\.appSDKCoordinator) private var coordinator

    var body: some View {
        @Bindable var router = router
        Group {
            if #available(iOS 18.0, *) {
                TabView(selection: $router.selectedTab) {
                    Tab("Collection", systemImage: "shippingbox", value: .collection) {
                        CollectionTabView(path: $router.collectionPath)
                    }
                    Tab("Scan", systemImage: "viewfinder", value: .scan) {
                        ScanTabView(path: $router.scanPath)
                    }
                    Tab("Profile", systemImage: "person.crop.circle", value: .settings) {
                        SettingsTabView(path: $router.settingsPath)
                    }
                }
            } else {
                TabView(selection: $router.selectedTab) {
                    CollectionTabView(path: $router.collectionPath)
                        .tabItem { Label("Collection", systemImage: "shippingbox") }
                        .tag(AppTab.collection)
                    ScanTabView(path: $router.scanPath)
                        .tabItem { Label("Scan", systemImage: "viewfinder") }
                        .tag(AppTab.scan)
                    SettingsTabView(path: $router.settingsPath)
                        .tabItem { Label("Profile", systemImage: "person.crop.circle") }
                        .tag(AppTab.settings)
                }
            }
        }
        .sheet(isPresented: subscriptionFallbackBinding) {
            NavigationStack {
                SubscriptionView()
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Done") { coordinator?.dismissSubscriptionFallback() }
                        }
                }
            }
        }
        .alert("Upgrade unavailable", isPresented: paywallErrorBinding) {
            Button("OK", role: .cancel) {
                coordinator?.dismissPaywallPresentationError()
            }
        } message: {
            Text(coordinator?.paywallPresentationError ?? BrickValLocalization.localized("Something went wrong. Please try again in a moment."))
        }
        .fullScreenCover(isPresented: proWelcomeBinding) {
            ProWelcomeView()
        }
        .sheet(item: feedbackBinding) { survey in
            FeedbackSurveySheet(survey: survey)
        }
        .onAppear {
            consumePendingPurchase()
            evaluateFeedback()
        }
        .onChange(of: entitlements.pendingNewPurchase) { _, _ in
            consumePendingPurchase()
        }
        .onChange(of: notifications.subscriptionState) { _, _ in
            evaluateFeedback()
        }
        .onChange(of: monetization.successfulSingleScanCount) { _, _ in
            evaluateFeedback()
        }
        .onChange(of: entitlements.isPro) { _, _ in
            evaluateFeedback()
        }
    }

    private var subscriptionFallbackBinding: Binding<Bool> {
        Binding(
            get: { coordinator?.showsSubscriptionFallback == true },
            set: { if !$0 { coordinator?.dismissSubscriptionFallback() } }
        )
    }

    private var paywallErrorBinding: Binding<Bool> {
        Binding(
            get: { coordinator?.paywallPresentationError != nil },
            set: { if !$0 { coordinator?.dismissPaywallPresentationError() } }
        )
    }

    private var proWelcomeBinding: Binding<Bool> {
        Binding(
            get: { entitlements.shouldPresentProWelcome },
            set: { if !$0 { entitlements.dismissProWelcome() } }
        )
    }

    private var feedbackBinding: Binding<ProductFeedbackSurvey?> {
        Binding(
            get: { feedback.presentedSurvey },
            set: { newValue in
                if newValue == nil {
                    feedback.dismissPresentedSurvey()
                } else {
                    feedback.presentedSurvey = newValue
                }
            }
        )
    }

    private func consumePendingPurchase() {
        guard let purchase = entitlements.pendingNewPurchase else { return }
        feedback.preparePostPurchase(
            context: PostPurchaseContext(productID: purchase.productID, isTrial: purchase.isTrial)
        )
        entitlements.clearPendingNewPurchase()
    }

    private func evaluateFeedback() {
        feedback.evaluate(
            isPro: entitlements.isPro,
            subscriptionState: notifications.subscriptionState,
            successfulScanCount: monetization.successfulSingleScanCount,
            firstSuccessfulScanAt: monetization.firstSuccessfulSingleScanAt,
            accessCohort: monetization.accessCohort?.rawValue
        )
    }
}

#Preview {
    AppShellView()
        .environment(AppRouter())
        .environment(CollectionStore())
        .environment(PreferencesStore())
        .environment(EntitlementStore())
        .environment(MonetizationStore())
        .environment(CurrencyStore())
        .environment(NotificationCoordinator())
        .environment(ProductFeedbackStore(defaults: UserDefaults(suiteName: "AppShellPreview")!))
}
