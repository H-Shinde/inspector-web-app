// Overlays AcroForm fields on the original PDF; never rebuilds its pages.
// Usage: node scripts/createAgreementTemplate.cjs input.pdf field-metadata.json output.pdf
const fs = require('fs');
const { basename } = require('path');
const { PDFArray, PDFDocument, PDFName, StandardFonts, decodePDFRawStream, rgb } = require('pdf-lib');

function replaceBusinessValuationBullets(pdf, font) {
    const page = pdf.getPages()[0];
    const bullet = font.encodeText('•').toString();
    let replaced = 0;
    // TT6 is the source font subset for the Apple-logo list markers on page one.
    const contents = page.node.Contents();
    const refs = contents instanceof PDFArray ? contents.asArray() : [page.node.get(PDFName.of('Contents'))];
    for (const ref of refs) {
        const stream = pdf.context.lookup(ref);
        const original = Buffer.from(decodePDFRawStream(stream).decode()).toString('latin1');
        const updated = original.replace(/(\/TT6 1 Tf\s+)\(!\)(\s+Tj)/g, (_, prefix, suffix) => {
            replaced += 1;
            return prefix + bullet + suffix;
        });
        if (updated !== original) pdf.context.assign(ref, pdf.context.flateStream(Buffer.from(updated, 'latin1')));
    }
    if (replaced !== 9) throw new Error('Expected nine business valuation list markers.');
    page.node.setFontDictionary(PDFName.of('TT6'), font.ref);
}

function drawBusinessValuationContactSections(page, font) {
    page.drawRectangle({ x: 55, y: 390, width: 500, height: 323, color: rgb(1, 1, 1), borderWidth: 0 });
    page.drawText('Client Information', { x: 60, y: 698, size: 14, font });
    page.drawText('Subject Information', { x: 324, y: 698, size: 14, font });
    page.drawText('Signature', { x: 60, y: 413, size: 10, font });
    page.drawLine({ start: { x: 60, y: 396 }, end: { x: 288, y: 396 }, thickness: 0.5 });
}

(async () => {
    const [input, metadata, output] = process.argv.slice(2);
    const pdf = await PDFDocument.load(fs.readFileSync(input));
    if (pdf.getPageCount() !== 3) throw new Error('Expected the original three-page engagement agreement.');
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    if (basename(input) === 'business-valuation-engagement-original.pdf') {
        replaceBusinessValuationBullets(pdf, font);
        drawBusinessValuationContactSections(pdf.getPages()[2], font);
    }
    const form = pdf.getForm();
    for (const { name, checkbox, page, mask, underline, label, ...bounds } of JSON.parse(fs.readFileSync(metadata, 'utf8'))) {
        // Hide only placeholder lettering. Original text, artwork, and rules stay in place.
        if (mask) pdf.getPages()[page].drawRectangle({ ...mask, color: rgb(1, 1, 1), borderWidth: 0 });
        if (underline) pdf.getPages()[page].drawLine({ ...underline, color: rgb(0, 0, 0), thickness: 0.6 });
        if (label) {
            const { x, y, width, height } = bounds;
            pdf.getPages()[page].drawText(label, { x, y: y + height + 3, size: 10, font });
            pdf.getPages()[page].drawLine({ start: { x, y }, end: { x: x + width, y }, thickness: 0.5 });
        }
        const field = checkbox ? form.createCheckBox(name) : form.createTextField(name);
        field.addToPage(pdf.getPages()[page], { ...bounds, borderWidth: 0, borderColor: undefined, backgroundColor: undefined, textColor: rgb(0, 0, 0) });
        if (checkbox) field.updateAppearances(() => ({ normal: { on: [], off: [] } }));
        else field.setFontSize(10);
    }
    form.updateFieldAppearances(font);
    fs.writeFileSync(output, await pdf.save());
})();
