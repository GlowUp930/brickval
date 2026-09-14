# BrickLink Attribution in App Store Screenshots

**Research date:** 2026-09-14
**Question:** May BrickValue say “Powered by BrickLink” in App Store screenshots?

## Decision

Do not use **“Powered by BrickLink”** without written approval from BrickLink. The phrase is likely to suggest that BrickLink powers, endorses, certifies, or is affiliated with BrickValue. That conflicts with the BrickLink API terms’ requirement that an application not suggest endorsement or affiliation and that it make clear the developer, rather than BrickLink, provides the service.

Use a factual attribution instead:

> **Market data from the BrickLink API**

This describes the data source without presenting BrickLink as a co-brand, partner, or product sponsor. Keep BrickValue as the visually dominant brand and do not use the BrickLink logo in the screenshot unless the required trademark conditions are met and BrickLink has approved the use.

This is a policy reading, not legal advice. If the marketing team wants to retain “Powered by BrickLink,” request written confirmation from BrickLink/API Support before publishing the screenshot.

## Evidence

### BrickLink API terms

BrickLink’s official API terms allow an API application to use BrickLink trademarks only subject to the terms. They require that:

- BrickLink marks not be used in a way that suggests endorsement or affiliation.
- BrickLink marks be used in their entirety and not misleadingly.
- Any BrickLink logo or mark be less prominent than the application’s primary brand.
- Publicity state that the application was created using the BrickLink API and does not imply endorsement or certification.
- The application prominently display this notice:

  > “The term 'Bricklink' is a trademark of Bricklink, Inc. This application uses the Bricklink API but is not endorsed or certified by Bricklink, Inc.”

The same terms also say BrickValue must make clear that it, rather than BrickLink, is the provider of its services. The terms permit reasonable commercial use when these conditions are followed, but they reserve all rights not expressly granted and allow BrickLink to withhold trademark use if application quality is unsatisfactory.

Source: [BrickLink API Terms of Use](https://www.bricklink.com/helpLang.asp?helpID=2216&viewType=shop), especially the API restrictions, attribution, and commercial-use sections.

### Apple App Store requirements

Apple says App Store metadata, screenshots, and previews must accurately reflect the app. Screenshots may contain text overlays, but the developer is responsible for rights to materials used in screenshots and previews. Apple also requires that apps using third-party services be specifically permitted under that service’s terms of use.

Sources: [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) sections 2.3.1–2.3.3, 2.3.7, 2.3.9, and 5.2.1–5.2.2; [Creating your product page](https://developer.apple.com/app-store/product-page/).

### LEGO Group context

BrickLink is part of the LEGO Group. LEGO’s official trademark guidance warns against marketing that creates a false association, sponsorship, or authorization by the LEGO Group and says commercial or marketing use of LEGO Group trademarks requires formal permission or a written licence. This reinforces the need to avoid co-branding language and LEGO/BrickLink logos in promotional artwork unless authorized.

Sources: [LEGO Group acquisition announcement for BrickLink](https://www.lego.com/en-us/aboutus/news/2019/november/lego-bricklink); [LEGO Group Fair Play trademark guidance](https://www.lego.com/cdn/cs/legal/assets/blt1a4c9a959ce8e1cb/LEGO_Fairplay_Nov2018.pdf), pages 8–11.

## Recommended App Store treatment

1. Use **“Market data from the BrickLink API”** as the screenshot attribution, only where the shown feature actually uses BrickLink data.
2. Keep the BrickValue logo/name larger and more prominent than the attribution.
3. Do not use “Powered by BrickLink,” “official BrickLink data,” “BrickLink partner,” “endorsed by BrickLink,” or “certified by BrickLink” without written authorization.
4. Do not use the BrickLink logo, signature colors, or a BrickLink-like layout in the screenshot unless the API trademark conditions are satisfied. Text attribution is lower-risk than logo co-branding.
5. Add the exact API disclaimer from the terms to an easy-to-find in-app About/Legal screen. Link to the BrickLink API terms there. Keep the disclaimer separate from the screenshot headline so it remains readable and not misleading.
6. Before publishing, confirm that the current BrickLink API registration/contract still accepts commercial App Store promotion under these terms. The official terms identify `apisupport@bricklink.com` for questions about commercial use or request-volume limits.

## Scope and limitation

This review covers the current public BrickLink API terms and Apple’s public App Store guidance. It does not confirm whether BrickValue’s specific API registration includes a separate agreement, approval, logo licence, or restrictions that override the public terms. A separate written agreement or direct approval would control.
