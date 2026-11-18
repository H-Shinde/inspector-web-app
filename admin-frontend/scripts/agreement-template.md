The immutable source at scripts/templates/business-valuation-engagement-original.pdf is the supplied “Bison Valuation Conclusion Engagement Agreement 2.pdf”. The runtime template at public/agreements/business-valuation-engagement.pdf uses all three original pages and replaces the nine Apple-logo list markers on the first page with standard bullets.

Transparent AcroForm fields sit over the original placeholders on the pricing page. The client and subject sections on page three use wider, aligned fields with full labels. Field bounds are recorded in scripts/agreementFields.json. Long entered values shrink to fit their fields.

Regenerate with:

    node scripts/createAgreementTemplate.cjs scripts/templates/business-valuation-engagement-original.pdf scripts/agreementFields.json public/agreements/business-valuation-engagement.pdf

src/engagementAgreement.js maps bid values into these fields. Client Information fields populate the client company, name, street, city/state/ZIP, phone, and email placeholders. Signatures and consolidation fees remain blank because the form does not collect them. When Rush is selected, Rush Discount is deducted from the total and printed as a negative amount on the template’s Rush Fee line; it is ignored when Rush is unchecked. Unfilled fields remain editable. The template states a $100 PDF-only discount; the confirmation dialog flags other entered discount amounts rather than silently changing bid pricing or agreement wording.

Completed PDFs are stored in IndexedDB in the browser that created the bid, keyed by reference number. Previously generated agreements retain their earlier layout; newly created agreements use the original PDF. Bid records store the agreement filename. Cross-device document access requires server storage.

M&E agreements use the supplied original at scripts/templates/machinery-equipment-engagement-original.pdf and runtime template public/agreements/machinery-equipment-engagement.pdf. All three original page content streams and page boxes are retained. Only placeholder text is masked and overlaid; inline fee/delivery underlines are retained at the placeholder locations. Field bounds and masks are in scripts/machineryAgreementFields.json.

Regenerate with:

    node scripts/createAgreementTemplate.cjs scripts/templates/machinery-equipment-engagement-original.pdf scripts/machineryAgreementFields.json public/agreements/machinery-equipment-engagement.pdf

Machinery bids use their visible form values: property/business/contact information, client company, value type/date, bid amount, completion days, request date, reference number, and the Onsite/Desktop checkbox selection. The fixed intended-use wording and signature areas remain as provided. M&E now uses the same confirmation, local PDF storage, and download flow as BV.
