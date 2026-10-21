import { clientBidFields } from './bidFields';

export const bidSections = [
    ['Appraisal', [
        ['appraisalType', 'Appraisal Type', 'appraisalType'], ['reportFormat', 'Report Format'],
        ['referenceNumber', 'Reference Number'], ['status', 'Status', 'status'],
    ]],
    ['Business', [
        ['businessName', 'Business Name'], ['propertyType', 'Type of Property'],
        ['businessAddress', 'Business Address'], ['city', 'City'], ['state', 'State'], ['zipCode', 'Zip'],
    ]],
    ['Client Information', clientBidFields],
    ['Subject Contact', [
        ['name', 'Contact Name'], ['subjectContactEmail', 'Contact Email', 'email'],
        ['subjectContactPhone', 'Contact Phone', 'tel'],
    ]],
    ['Appraisal Details', [
        ['valueType', 'Value Type'], ['valueDate', 'Value Date', 'date'],
        ['intendedUse', 'Intended Use'], ['intendedUser', 'Intended User'],
        ['completionDays', 'Completion Days', 'number'], ['rush', 'Rush', 'checkbox'],
    ]],
    ['Asset Valuation', [
        ['fmvContinuedUse', 'FMV in Continued Use', 'number'],
        ['fairMarketValueRemoved', 'Fair Market Value Removed', 'number'],
        ['orderlyLiquidationValue', 'Orderly Liquidation Value', 'number'],
        ['forcedLiquidationValue', 'Forced Liquidation Value', 'number'],
        ['other', 'Other'], ['additionalLocations', 'Additional Locations'],
    ]],
    ['Inspection Fees', [
        ['totalInspectedItems', 'Total Inspected Items', 'number'],
        ['totalNonInspectedItems', 'Total Non-Inspected Items', 'number'],
        ['totalAppraisal', 'Total Appraisal', 'number'],
        ['total', 'Total', 'number'], ['nonRushTotal', 'Non-Rush Total', 'number'],
        ['meNote', 'M&E Note', 'textarea'],
    ]],
    ['Pricing', [
        ['bidAmount', 'Appraisal Fee', 'number'], ['pdfOnly', 'PDF Only/ No hard copy', 'checkbox'],
        ['discount', 'Discount', 'number'], ['rushDiscount', 'Rush Discount', 'number'], ['additionalCharges', 'Additional Charges', 'number'],
        ['totalBid', 'Total Bid', 'total'],
    ]],
];

const machineryFields = new Set([
    'appraisalType', 'reportFormat', 'referenceNumber', 'status',
    'propertyType', 'businessName', 'businessAddress', 'city',
    'name', 'subjectContactEmail', 'subjectContactPhone',
    ...bidSections.filter(([title]) => ['Asset Valuation', 'Inspection Fees'].includes(title)).flatMap(([, fields]) => fields.map(([field]) => field)),
    'rush', 'pdfOnly', 'discount', 'rushDiscount',
    'valueDate', 'clientCompany', 'clientName', 'clientEmail', 'valueType', 'bidAmount', 'completionDays', 'date',
]);

export function getBidSections(appraisalType) {
    return appraisalType === 'Machinery & Equipment (M&E)' ? bidSections.map(([title, fields]) => [title,
        [...fields.filter(([field]) => machineryFields.has(field)), ...(title === 'Appraisal Details' ? [['date', 'Request Date', 'date']] : [])]
            .map(([field, label, type]) => [field, field === 'bidAmount' ? 'M&E Bid' : field === 'city' ? 'Business City' : field === 'discount' ? 'PDF Discount' : label, type]),
    ]).filter(([, fields]) => fields.length) : bidSections;
}
