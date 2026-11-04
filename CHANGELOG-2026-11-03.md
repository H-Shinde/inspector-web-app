# Changes — November 3, 2026

## Bid calculations (committed as 24b998e0)

- Inspection Total = Inspection Rate × Inspected Items.
- Appraisal Total = (Appraisal Rate × Inspected Items) + (Non-Appraisal Rate × Non-Appraised Items).
- Total Bid = Inspection Total + Appraisal Total + Rush Fee − PDF Discount.
- Desktop bids have zero Inspection Total but retain the inspected-item count for appraisal calculations.
- Rush Fee applies when Rush is selected; PDF Discount applies when PDF Only is selected.
- Added rate fields, server-side calculations, migration 0011, formula tests, and updated sample-bids.csv.
- Existing bids retain their saved calculation method.

## Additional local frontend changes

- Replaced the appraisal dropdown options with Calculation of Value, Business Valuation, Desktop M&E, and On-site M&E.
- Removed the separate Report Format field from Add Bid and Edit Bid.
- The four report choices map to existing backend appraisal types and report formats to preserve compatibility.
- Desktop M&E continues to hide inspection fees.
- Limited client-name typeahead width to 360px with responsive sizing.
- Rebuilt the frontend production assets and frontend-deploy.zip.

## GitHub synchronization

- Fetched origin on November 3, 2026.
- Working branch: admin-frontend-changes, based on 24b998e0.
- Later fetch found two additional remote commits, e386c04d and 78aaad66. Fast-forwarded the working branch to 78aaad66 and reapplied today's local changes.
- Resolved the AddBidpage dropdown conflict by retaining remote fee defaults alongside the four local report choices.
- Latest fetched Harshvardhan Shinde admin commit: 7f11ffba (October 28, 2026), “MInor Settings location and bid amount location fix”.
- That commit is already an ancestor of the working branch; no additional merge is needed.
- Retained remote Settings fee-default changes, calculation updates, and associated tests.
- The separate inspector-frontend branch contains inspector-app work and was not merged into the admin app.
- Local source changes, generated frontend artifacts, and existing .DS_Store changes were preserved.

## Validation

- During latest integration, removed conflict markers committed in the incoming Pricing fields, preserving the rate-based formula UI.
- Corrected incoming Settings preview to convert selected fee checkboxes to configured dollar amounts.
- Settings and calculation tests pass (19 tests).

- Production frontend build passed after the local report-dropdown and search-width changes.
- Backend rate-formula test passed for Onsite and Desktop calculations during implementation.

## Deployment

- Upload admin-frontend/frontend-deploy.zip and extract it into ~/frontend on PythonAnywhere.
- If deploying the rate-formula backend update, run python manage.py migrate before reloading the web app.
- Keep production configuration, database, and email credentials out of update archives.
