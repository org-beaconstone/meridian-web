# Meridian Money on Kaizen

## Rehearsal site

https://meridian-money.kaizen.shared.atlassian-3p.com/

Source: https://github.com/org-beaconstone/meridian-web (private). The previous personal repository remains intact; this workspace's `organization` remote is the destination for new changes.

## Access and scope

Kaizen project `prj_f174c7aa64cf4bdc8287a6ac559267cf`, named Meridian Money, retains the enforced inherited `corp-edge` restriction. Access is subject to Kaizen's corporate edge policy; this is not an unrestricted public site. No project ingress OAuth flow is configured by the app. If colleagues cannot open it, investigate their network/access posture before changing project restrictions. Any weakening requires explicit approval.

The app serves only built `dist/` assets. It contains fictional local data and does not connect to payment providers. Source files, Markdown context, credentials and browser state are not part of the upload. Fonts are bundled locally.

## Manual deployment

```sh
npm ci
npm run check
TEST_PRODUCTION=1 npm run test:e2e
kaizen build --project-dir .
kaizen doctor --project-dir . --check-control
kaizen deploy push --project-dir . --json
# Inspect the returned deployment ID, then promote it explicitly:
kaizen deploy promote --project-dir . \
  --deployment-id <returned-deployment-id> \
  --alias meridian-money.kaizen.shared.atlassian-3p.com
```

Use the existing `projectId` in `kaizen.toml`. Do not create a replacement project or transfer a hostname. The CLI is pinned to `0.1.1530`. A push creates a preview deployment; only explicit promotion changes the named rehearsal site. GitHub Actions currently verifies builds and tests but does not auto-deploy.

Verify the hosted site with:

```sh
TEST_BASE_URL=https://meridian-money.kaizen.shared.atlassian-3p.com npm run test:e2e
```

Hosted tests use isolated browser contexts and synthetic local state; no shared account data is changed.

## Browser policy

Scripts, fonts and network connections are same-origin. Vite's `assetsInlineLimit` is zero so small font subsets are emitted as files rather than blocked data URLs. Inline styles are permitted for ADS and dynamic budget visuals; script eval is not. Framing is denied, resource policy is same-origin, and CORS is disabled. No catch-all rewrite is needed because navigation is in-app rather than path-based.

## Deployment record

Current deployment: `kzd_cc9e1f0b1dce491eba873f1399c4c473`.

The initial baseline `ada4181` was first published as `kzd_47ff0eff665245ea8dfa212fc279975d`. A hosted console check detected CSP-blocked inlined font subsets. The current deployment preserves the same application behavior, emits those font files separately, and strengthens browser tests to catch console errors and failed requests. The hosting manifest, test configuration and build fix are committed together in the organization repository.

See [verification](verification.md) for build and browser results, and [demo runbook](demo-runbook.md) for reset and rehearsal steps.
