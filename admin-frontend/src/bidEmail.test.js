import { businessValuationEmail, bidEmailLink } from './bidEmail';

test('fills the supplied BV email format with client and bid values', () => {
    const email = businessValuationEmail({ clientName: 'Jordan Smith', clientEmail: 'jordan@example.com', reportFormat: 'Detailed', businessName: 'Example Co', bidAmount: '1200', discount: '100', completionDays: '10', referenceNumber: 'BID-000021' });
    expect(email.to).toBe('jordan@example.com');
    expect(email.body).toBe('Jordan,\n\nBison Valuation can complete a USPAP Detailed report of Example Co for\n$1100.00 completed in 10 business days, from a signed Engagement Agreement.\n\nBison Valuation is accredited by 2 separate business valuation societies, the National\nAssociation of Certified Valuators and Analysts and the International Society of\nBusiness Appraisers.\n\nRef.: BID-000021');
    const link = bidEmailLink({ ...email, subject: 'Proposal & pricing' });
    expect(link).toContain('subject=Proposal%20%26%20pricing');
    expect(link).toContain('%0A');
});
