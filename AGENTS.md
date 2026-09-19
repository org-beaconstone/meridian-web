# Meridian Web

- Customer-facing fictional bank demo. Never initiate real payments or collect real card/bank credentials.
- Use official Atlassian Design System components for shared controls and semantic ADS tokens for UI meaning. Brand navy/gold is reserved for custom Meridian surfaces.
- Current provider registry contains Adyen and Worldpay only. Do not pre-build or name a third provider; that is a later planner exercise.
- Store money as integer minor units. Validate domain operations independently of UI controls. Keep simulation separate from provider interfaces.
- All content is synthetic. Repo docs are Confluence-ready seeds, not published pages or verified compliance attestations.
- Keep changes within this repository; do not alter sibling applications.
- Run npm run check and TEST_PRODUCTION=1 npm run test:e2e before handoff.
- Do not commit secrets, node_modules, dist, browser traces, or local state.
