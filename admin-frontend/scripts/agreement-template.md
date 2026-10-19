The immutable source at scripts/templates/business-valuation-engagement-original.pdf is the supplied “Bison Valuation Conclusion Engagement Agreement 2.pdf”. The runtime template at public/agreements/business-valuation-engagement.pdf preserves all three original pages, content streams, page sizes, artwork, typography, and rules. No Word/HTML conversion is used.

Only the original placeholder lettering is covered with small white masks; transparent AcroForm fields are placed at those locations. Existing checkbox outlines are retained. Original labels and layout, including clipped labels on the supplied client/subject page, are intentionally preserved. Some placeholders wrap in the source PDF; their visible prefixes identify the positions in scripts/agreementFields.json. Long entered values shrink to fit their original field areas.

Regenerate with:

    node scripts/createAgreementTemplate.cjs scripts/templates/business-valuation-engagement-original.pdf scripts/agreementFields.json public/agreements/business-valuation-engagement.pdf

src/engagementAgreement.js maps bid values into these fields. Client Information fields populate the client company, name, street, city/state/ZIP, phone, and email placeholders. Signatures and consolidation fees remain blank because the form does not collect them. When Rush is selected, Rush Discount is deducted from the total and printed as a negative amount on the template’s Rush Fee line; it is ignored when Rush is unchecked. Unfilled fields remain editable. The template states a $100 PDF-only discount; the confirmation dialog flags other entered discount amounts rather than silently changing bid pricing or agreement wording.

Completed PDFs are stored in IndexedDB in the browser that created the bid, keyed by reference number. Previously generated agreements retain their earlier layout; newly created agreements use the original PDF. Bid records store the agreement filename. Cross-device document access requires server storage.

M&E agreements use the supplied original at scripts/templates/machinery-equipment-engagement-original.pdf and runtime template public/agreements/machinery-equipment-engagement.pdf. All three original page content streams and page boxes are retained. Only placeholder text is masked and overlaid; inline fee/delivery underlines are retained at the placeholder locations. Field bounds and masks are in scripts/machineryAgreementFields.json.

Regenerate with:

    node scripts/createAgreementTemplate.cjs scripts/templates/machinery-equipment-engagement-original.pdf scripts/machineryAgreementFields.json public/agreements/machinery-equipment-engagement.pdf

Machinery bids use their visible form values: property/business/contact information, client company, value type/date, bid amount, completion days, request date, reference number, and the Onsite/Desktop checkbox selection. The fixed intended-use wording and signature areas remain as provided. M&E now uses the same confirmation, local PDF storage, and download flow as BV.
