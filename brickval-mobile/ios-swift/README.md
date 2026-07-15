# BrickVal for iOS

Native SwiftUI rebuild of BrickVal. It targets iPhone on iOS 17 and newer and keeps the existing `com.brickval.app` identity so the shipped Expo app can update in place.

## Local setup

1. Copy `Configuration/Secrets.example.xcconfig` to `Configuration/Secrets.xcconfig` and add the public client configuration supplied by the deployment environment.
2. Run `xcodegen generate` from this directory.
3. Open `BrickVal.xcodeproj` and run the `BrickVal` scheme.

Roboflow credentials never belong in this project. Smart detection calls BrickVal's server, which selects the detector model and enforces its quotas.
