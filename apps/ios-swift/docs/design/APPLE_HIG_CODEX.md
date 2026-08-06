# Apple HIG Rules for Codex

Use this file for every iOS design, implementation, and review task. Apple’s Human Interface Guidelines are the design authority. Product requirements may override a rule only when the reason is explicit and the result remains clear, accessible, consistent, safe, and performant.

## Official references

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines)
- [Design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles)
- [Designing for iOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-ios)
- [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
- [Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback)
- [Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
- [SF Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols)
- [SwiftUI](https://developer.apple.com/documentation/swiftui)
- [SwiftUI animations](https://developer.apple.com/documentation/swiftui/animations)

## Required workflow

Before writing UI code:

1. Identify the user’s primary goal and most important action.
2. Define the information hierarchy.
3. Choose the closest native iOS pattern and component.
4. Define initial, loading, success, empty, error, offline, permission-denied, disabled, and destructive states where relevant.
5. Define Dynamic Type, Dark Mode, VoiceOver, Reduce Motion, and contrast behavior.
6. Define the purpose of every animation.
7. Implement only after these decisions are clear.

After implementation, perform the audit at the end of this file and correct violations.

## Design principles

Use these to resolve trade-offs:

- Purpose: make the important user outcome meaningful and excellent.
- Agency: let people act in their own way, understand what is happening, and recover from mistakes.
- Responsibility: protect safety, privacy, trust, and transparency.
- Familiarity: build on patterns people already understand.
- Flexibility: adapt to devices, settings, abilities, contexts, and input methods.
- Simplicity: remove what is unnecessary without removing what users need.
- Craft: care about layout, wording, animation, audio, performance, and edge cases.
- Delight: add personality only when it supports the task.

When principles conflict, prioritize safety and agency, comprehension, accessibility, task completion, consistency, and then visual novelty.

## Clarity, hierarchy, and familiarity

- Every screen has one obvious primary purpose.
- Make the primary action visually and spatially clear.
- Use concise, plain-language labels: prefer familiar verbs such as Scan, Save, Retry, Cancel, and Done.
- Do not make users interpret decorative text, ambiguous icons, or status colors.
- Use progressive disclosure for secondary detail.
- Show state changes through text, layout, iconography, haptics, or progress—not color alone.
- Prefer native SwiftUI components before custom equivalents.
- Follow system behavior for navigation, sheets, alerts, menus, forms, search, text entry, permissions, and destructive actions.
- Use the same label, icon, placement, and behavior for the same action throughout the app.
- Avoid web-style UI when an established iOS pattern exists.
- Avoid custom gestures without a discoverable alternative.

## Component selection

Prefer, in order:

1. Native SwiftUI component or modifier.
2. Native UIKit component wrapped for SwiftUI.
3. A small custom component with native semantics and accessibility.
4. A third-party component only when it provides substantial value.

Prefer NavigationStack for hierarchical navigation, TabView for a small number of top-level destinations, sheet for focused temporary tasks, and fullScreenCover only when the task genuinely requires the whole screen.

Prefer Form, List, Section, Toggle, Picker, DatePicker, TextField, SecureField, native Button, confirmationDialog, alert, ProgressView, ContentUnavailableView, ShareLink, PhotosPicker, and fileImporter where they meet the need.

Avoid custom tab bars, navigation bars, switches, sliders, alerts, permission screens, and keyboard behavior unless there is a documented reason. Avoid cards inside cards and decorative containers with no semantic purpose.

## Agency and recovery

- Keep users informed during loading, scanning, uploading, and network work.
- Provide cancel, back, retry, dismiss, or undo where appropriate.
- Never silently discard input or changes.
- Confirm significant destructive or irreversible actions.
- Do not auto-dismiss important information on a timer.
- Keep animations interruptible unless interruption would be unsafe.

## Layout

- Respect safe areas, system bars, keyboard, notches, and Dynamic Island.
- Use adaptive stacks, grids, alignment, layout priorities, and flexible frames—not fixed coordinates.
- Keep content usable at compact widths and large text sizes.
- Avoid horizontal scrolling for ordinary text or primary actions.
- Use spacing to express grouping; do not wrap every group in a card.
- Test a small iPhone, a large iPhone, Light Mode, Dark Mode, and large Dynamic Type sizes.

## Typography and writing

- Use Dynamic Type text styles such as largeTitle, title, headline, body, callout, subheadline, footnote, and caption.
- Avoid hard-coded sizes unless documented and paired with an accessibility alternative.
- Prefer system fonts and weights unless branding requires a custom font.
- Use plain, direct, respectful language.
- Write labels as actions or outcomes, not implementation details.
- Avoid jargon, unnecessary capitalization, and long paragraphs in task flows.
- Design for localization: do not assume English word length, plural rules, or fixed widths.

## Color, contrast, and materials

- Prefer semantic colors: primary, secondary, tint, background, fill, secondaryFill, and separator.
- Support Light Mode and Dark Mode without manually inverting colors.
- Never use color as the only status or selection signal; pair it with text, shape, icon, or position.
- Check contrast in both appearances and with Increase Contrast enabled.
- Use tint consistently for interactive emphasis.
- Use materials to establish hierarchy, not decoration.
- Treat Liquid Glass as a functional layer for navigation and controls, not as a default background for every content card.
- Use Liquid Glass sparingly and preserve legibility; avoid stacking translucent surfaces.
- Prefer system materials and vibrant semantic colors over manually tuned blur and opacity.

## Icons and SF Symbols

- Prefer SF Symbols for familiar actions and system concepts.
- Select by meaning, not visual resemblance alone.
- Use symbol weights and rendering modes consistently.
- Provide a text label or accessibility label when an icon may be unclear.
- Use symbol animation to communicate action, state, loading, or ongoing activity.
- Do not let decorative symbols compete with primary content.
- Custom icons must scale, work in Light and Dark Mode, maintain contrast, and have accessibility semantics.

## Interaction and touch

- Make controls comfortably tappable; do not create tiny targets.
- Make the full logical control area tappable, not only the visible glyph.
- Provide immediate feedback for taps, selection, toggles, submission, and errors.
- Avoid requiring precision, rapid timing, or repeated gestures for essential tasks.
- Preserve standard back, dismiss, scroll, pinch, and swipe behaviors.
- Provide explicit controls for important actions that might otherwise be gesture-only.

## Motion and animation

Animation must communicate cause and effect, continuity, hierarchy, progress, status, or confirmation.

- Prefer native SwiftUI transitions, springs, matched geometry, and keyframes.
- Keep feedback brief, precise, smooth, and interruptible.
- Animate state changes, not every element.
- Show where content came from, where it went, and what changed.
- Avoid ornamental looping, excessive bounce, rapid flashing, large zooms, parallax, and unnecessary depth movement.
- Use haptics as supporting feedback, never as the only important signal.
- Respect accessibilityReduceMotion.
- For reduced motion, replace movement with a fade, opacity change, tighter spring, or immediate state change.
- Check performance at 60/120 Hz and avoid expensive main-thread work.

Example SwiftUI pattern:

    @Environment(\\.accessibilityReduceMotion) private var reduceMotion

    private var stateAnimation: Animation? {
        reduceMotion ? nil : .spring(response: 0.35, dampingFraction: 0.82)
    }

## Accessibility

Accessibility is a product requirement, not a finishing step.

- Support Dynamic Type; do not truncate essential information at large sizes.
- Give custom controls meaningful VoiceOver labels, hints, values, traits, and actions.
- Group related content and set a logical reading/focus order.
- Ensure the app works without sight, sound, precise touch, or color discrimination.
- Support Reduce Motion, Increase Contrast, Bold Text, Differentiate Without Color, Voice Control, and Switch Control where relevant.
- Avoid time-limited content and auto-dismiss behavior for important information.
- Make errors specific, actionable, and available to assistive technologies.
- Hide purely decorative elements from accessibility.
- Prefer native controls because they already provide expected semantics.
- Test with VoiceOver, large text, Reduce Motion, Increase Contrast, and keyboard or switch input where applicable.

SwiftUI examples:

    Button("Scan again") { scanAgain() }
        .accessibilityHint("Starts a new camera scan")

    Image("decoration")
        .accessibilityHidden(true)

## Feedback, loading, and errors

- Every meaningful operation needs an explicit state model.
- Use concise status text such as Scanning…, Checking match…, Match found, and Couldn’t connect.
- Explain what the user can do next after failure.
- Use determinate progress when the amount or duration is known.
- Never claim success before success is confirmed.
- Preserve input and allow retry without unnecessary restart.
- Use confirmation for destructive actions and make the destructive action explicit.
- Keep processing feedback visible until a result or actionable error exists.

## Privacy and permissions

- Request permission at the moment it is needed, after explaining the user benefit.
- Request only the minimum permission.
- Make the explanation match actual camera, photo, location, microphone, contact, notification, and tracking use.
- Provide a useful path when permission is denied; never dead-end the user.
- Do not expose private data unnecessarily in logs, previews, analytics, or errors.
- Be transparent about network uploads, AI processing, storage, and deletion.
- Make safety-critical or high-consequence actions deliberate.

## State-driven implementation

Model the interface around explicit states rather than scattered Boolean flags.

    enum ScreenState {
        case idle
        case loading
        case content([Item])
        case empty
        case error(message: String)
    }

For scanning features, model permission required, searching, target detected, stabilizing, capturing, processing, matched, no match, and recoverable error. For each state define what the user sees, available actions, VoiceOver announcement, haptics, motion under Reduce Motion, and cancellation/retry behavior.

## Scanning-interface guidance

- Keep camera content primary; avoid covering the subject with unnecessary UI.
- Show one clear status message at a time.
- Use a subtle outline or reticle only when it helps positioning.
- Prevent repeated capture of the same target without clear feedback.
- Give immediate feedback for detection and capture.
- Keep processing feedback visible until a result or actionable error.
- Present results in a readable native sheet or bottom card.
- Make retry, photo-library fallback, dismiss, and condition choices explicit.
- Ensure the workflow remains usable without visual bounding boxes or color.

## Code-quality rules

- Separate view rendering, state management, networking, and image processing.
- Use small composable views named by user-facing purpose.
- Centralize semantic design constants; avoid unexplained magic numbers.
- Do not start camera, network, or timer work in a view body.
- Make asynchronous work cancellable and prevent stale updates.
- Use previews for normal, empty, loading, error, dark mode, and large text states.
- Add UI tests for the primary flow and important failure paths.

## Required completion audit

Before declaring a screen complete, verify:

- Is the primary goal obvious within seconds?
- Is the primary action easy to find?
- Can the user understand what is happening and recover?
- Does it use the closest native iOS pattern?
- Is navigation and terminology consistent?
- Have unnecessary custom controls and gestures been removed?
- Does it adapt to small and large iPhones?
- Does it work in Light Mode, Dark Mode, and large Dynamic Type?
- Are typography, spacing, symbols, materials, and contrast deliberate?
- Does each animation communicate something useful?
- Is motion brief, smooth, interruptible, and reduced when requested?
- Are loading, success, empty, and error states clear?
- Can VoiceOver operate the full flow?
- Is information conveyed without color alone?
- Are labels, hints, traits, focus order, and custom actions correct?
- Are permissions requested at the right moment with a clear explanation?
- Is private data handled responsibly?
- Does the UI accurately represent status and processing?

If any answer is no, fix the issue or document the product reason before completion.

## Required Codex response sequence

For every iOS design task, use this sequence:

1. User goal — one sentence.
2. HIG interpretation — relevant principles and native patterns.
3. State model — important states and transitions.
4. Accessibility plan — Dynamic Type, VoiceOver, contrast, motion, keyboard, and touch.
5. Implementation — smallest composable SwiftUI/UIKit solution.
6. Audit — check this file and correct violations.

Do not optimize for novelty at the expense of clarity, accessibility, trust, performance, or familiar iOS behavior.
