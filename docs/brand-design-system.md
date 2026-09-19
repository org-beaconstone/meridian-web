# Meridian brand and design system

Fictional brand guidance and implementation notes. This is not an official Atlassian product or an accessibility certification.

## Brand layer

- Navy `#142C35`: Meridian account card, wordmark and branded headings.
- Gold `#D5B77A`: account-card accent lines and original Meridian mark.
- Soft sage and warm neutral surfaces keep the banking view calm. Category colors are paired with text and amounts, never the sole signal.
- Locally bundled DM Sans for body text, Manrope for display figures/headings. System fallbacks remain available. No remote font requests.

## Official Atlassian Design System

Installed components: `@atlaskit/button/new`, `@atlaskit/textfield`, `@atlaskit/lozenge`, `@atlaskit/section-message`, `@atlaskit/css-reset` and `@atlaskit/tokens`. `main.tsx` loads the light, spacing, typography and shape themes before rendering. ADS controls keep ADS behavior and colors: primary actions are ADS blue, not overridden navy.

Use semantic tokens for text, surfaces, focus, selected states, success and danger. Don't style Atlaskit internals via global selectors. The feature-flag resolver returns local defaults and never contacts Atlassian services.

## Intentional custom components

- Sidebar, account card, summary panels, recipient avatars and category progress visuals use original Meridian styling.
- Native select and radio controls provide recipient and payment-method choice. Amounts are text inputs with `inputMode="decimal"`, validated in integer pence; not floating-point number inputs.
- Native HTML dialog supplies browser focus containment and Escape handling. The previous prototype found an ADS modal transitive-renderer incompatibility with React 19; we avoid that dependency rather than patch it.
- Lucide provides decorative banking icons, not ADS icons. Essential actions have text labels or accessible names.

## Provider identity

Adyen and Worldpay are plain text provider labels, not reproduced official logos or endorsement claims. Keep third-party identity visually subordinate to Meridian. Don't recolor, distort or invent an official provider logo. Any future official assets require permission and the provider's brand rules. The payment-method assignment is fictional demo routing, not a statement of provider capability.

## Responsive and accessible interactions

`src/styles.css` is the implementation source of truth: desktop adjustments at 1550/1200/1000px, stacked mobile layout at 760px. Wide content is capped at 1530px. Navigation moves to a sticky top row on mobile.

- Semantic landmarks, skip link, labelled fields and fieldsets.
- `aria-current` for navigation and payment steps; progressbar values include monetary text.
- Validation errors are alerts; saved-budget notices are live status messages.
- Dialogs return focus to their trigger. Page transitions focus the page heading.
- Reduced-motion preference disables transitions.
- WCAG 2.2 AA is the target, not a claim of a full independent audit. Use automated checks plus keyboard, contrast and assistive-technology review before production use.

## Dependency compatibility

Some transitive Atlaskit analytics packages still declare older React peer ranges. npm reports override warnings. Do not force an old renderer into this app. Verify both Vite development mode and the built production bundle in a real browser after any dependency upgrade.

See [demo runbook](demo-runbook.md) and [API standards](api-standards.md).
