# Storefront QA

Run the API and a production client build first. From this directory run `npm install`, then `npm test`. On Windows the runner uses installed Microsoft Edge; elsewhere run `npx playwright install chromium`. Override `QA_BASE_URL` and `QA_CHANNEL` if needed.

Provide the local seeded buyer password via `UI_QA_PASSWORD` or the existing `server/.env` value. Credentials never enter reports. The checkout test intercepts all order submissions; it does not place an order or change the account's cart. Do not run against a live customer system.

Outputs: `docs/storefront-upgrade/browser-results.json` and representative screenshots. These are lab checks and emulated viewports, not human usability results or field performance statistics. See `docs/usability-study.md` for the separate human study.
