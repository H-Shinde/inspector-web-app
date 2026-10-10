import { readBidList } from './bidFields';

// Fictional demo records. Existing job data and user edits take precedence.
export function withJobDemoData(job) {
    const n = Number(job.id) || 1;
    const rush = n % 3 === 0;
    const items = [
        { name: 'Forklift', type: 'Material handling', make: 'Toyota', model: '8FGCU25', year: 2018 + n % 6, hoursMiles: `${1200 + n * 85} hours` },
        { name: 'Delivery truck', type: 'Vehicle', make: 'Ford', model: 'Transit 250', year: 2019 + n % 5, hoursMiles: `${24000 + n * 1500} miles` },
        { name: 'Air compressor', type: 'Shop equipment', make: 'Ingersoll Rand', model: '2475N7.5', year: 2017 + n % 7, hoursMiles: `${600 + n * 40} hours` },
        { name: 'Excavator', type: 'Construction', make: 'Caterpillar', model: '305 CR', year: 2020 + n % 4, hoursMiles: `${800 + n * 65} hours` },
    ];
    let savedItems = {};
    try { savedItems = JSON.parse(sessionStorage.getItem('jobItems') || '{}') || {}; } catch {}
    if (job.isCreatedJob) return { ...job, items: savedItems[job.id] ?? job.items ?? [] };
    return {
        appraisalType: ['Commercial appraisal', 'Equipment appraisal', 'Market valuation'][(n - 1) % 3],
        subjectContactPhone: `202-555-${String(100 + n % 100).padStart(4, '0')}`,
        propertyType: ['Office', 'Warehouse', 'Retail', 'Industrial'][(n - 1) % 4],
        rush,
        businessAddress: `${100 + n * 10} Example Avenue`,
        pdf: `sample-job-${n}.pdf`,
        discount: String(n % 4 * 25),
        subjectContactEmail: `${job.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        city: ['Washington', 'Arlington', 'Alexandria'][(n - 1) % 3],
        state: ['DC', 'VA', 'VA'][(n - 1) % 3],
        zipCode: ['20001', '22201', '22301'][(n - 1) % 3],
        inspector: ['Alex Morgan', 'Jordan Lee', 'Taylor Brooks', 'Casey Rivera'][(n - 1) % 4],
        items,
        ...job,
        items: (savedItems[job.id] ?? job.items ?? items).map((item, index) => ({
            serialNumber: `DEMO-${n}-${String(index + 1).padStart(4, '0')}`,
            photoNumber: String(index + 1),
            referenceNumber: `JOB-${n}-ITEM-${index + 1}`,
            comments: `Sample asset ${index + 1} for job ${n}. Condition and identification to be verified during inspection.`,
            ...item,
        })),
    };
}

export function demoSections(job) {
    const n = Number(job.id) || 1;
    const rate = 40 + n % 5 * 5;
    const appraisal = 65 + n % 4 * 10;
    const count = job.items?.length ?? 4;
    const nonInspected = n % 3;
    const totalAppraisal = count * appraisal;
    const nonRushTotal = count * rate + totalAppraisal;
    const rushCharge = job.rush === true || String(job.rush).toLowerCase() === 'yes' ? 100 : 0;
    const discount = Number(job.discount) || 0;
    const rates = {
        inspectionRate: String(rate), customInspectionRate: String(rate + 5), additionalInspectionCharge: String(20 + n * 2),
        appraisalRate: String(appraisal), customAppraisalRate: String(appraisal + 10), additionalAppraisalCharge: String(25 + n * 3),
    };
    return {
        'Appraised Items': { count: String(count), ...rates },
        'Non Appraised Items': { count: String(nonInspected), ...rates },
        'Asset Valuation': {
            fmvContinuedUse: String(65000 + n * 2500), fairMarketValueRemoved: String(55000 + n * 2000),
            orderlyLiquidationValue: String(42000 + n * 1500), forcedLiquidationValue: String(30000 + n * 1000),
            other: `Demo equipment package ${n}`, additionalLocations: `Sample storage site ${n}, ${job.city}`,
        },
        'Inspection Fees': {
            totalInspectedItems: String(count), totalNonInspectedItems: String(nonInspected),
            totalAppraisal: String(totalAppraisal), rush: String(rushCharge), pdfDiscount: String(discount),
            total: String(nonRushTotal + rushCharge - discount), nonRushTotal: String(nonRushTotal - discount),
            meNote: `Demo job ${n}: machinery and equipment reviewed at the primary site.`,
        },
    };
}

export function seedJobDemoSections(jobs) {
    let details;
    try { details = JSON.parse(sessionStorage.getItem('jobSectionDetails') || '{}') || {}; }
    catch { details = {}; }
    const history = readBidList('jobValuationHistory');
    for (const job of jobs) {
        const demoDefaults = demoSections(job);
        const defaults = job.isCreatedJob
            ? Object.fromEntries(Object.entries(demoDefaults).map(([section, values]) => [section, Object.fromEntries(Object.keys(values).map((field) => [field, '']))]))
            : demoDefaults;
        const existing = details[job.id] || {};
        details[job.id] = Object.fromEntries(Object.entries(defaults).map(([section, values]) => [section, { ...values, ...existing[section] }]));
        if (job.isCreatedJob) continue;
        for (const section of ['Asset Valuation', 'Inspection Fees']) {
            for (const [index, status] of ['Accepted', 'Pending', 'Declined'].entries()) {
                if (!history.some((entry) => String(entry.jobId) === String(job.id) && (entry.section || 'Asset Valuation') === section && entry.status === status)) {
                    history.push({ jobId: String(job.id), section, status, savedAt: `2026-09-${String(20 - index).padStart(2, '0')}T14:00:00Z`, values: { ...defaults[section] }, demo: true });
                }
            }
        }
    }
    sessionStorage.setItem('jobSectionDetails', JSON.stringify(details));
    sessionStorage.setItem('jobValuationHistory', JSON.stringify(history));
    return details;
}
