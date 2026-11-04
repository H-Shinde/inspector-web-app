// Overlays AcroForm fields on the original PDF; never rebuilds its pages.
// Usage: node scripts/createAgreementTemplate.cjs input.pdf field-metadata.json output.pdf
const fs = require('fs');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
(async () => {
    const [input, metadata, output] = process.argv.slice(2);
    const pdf = await PDFDocument.load(fs.readFileSync(input));
    if (pdf.getPageCount() !== 3) throw new Error('Expected the original three-page engagement agreement.');
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const form = pdf.getForm();
    for (const { name, checkbox, page, mask, underline, ...bounds } of JSON.parse(fs.readFileSync(metadata, 'utf8'))) {
        // Hide only placeholder lettering. Original text, artwork, and rules stay in place.
        if (mask) pdf.getPages()[page].drawRectangle({ ...mask, color: rgb(1, 1, 1), borderWidth: 0 });
        if (underline) pdf.getPages()[page].drawLine({ ...underline, color: rgb(0, 0, 0), thickness: 0.6 });
        const field = checkbox ? form.createCheckBox(name) : form.createTextField(name);
        field.addToPage(pdf.getPages()[page], { ...bounds, borderWidth: 0, borderColor: undefined, backgroundColor: undefined, textColor: rgb(0, 0, 0) });
        if (checkbox) field.updateAppearances(() => ({ normal: { on: [], off: [] } }));
        else field.setFontSize(10);
    }
    form.updateFieldAppearances(font);
    fs.writeFileSync(output, await pdf.save());
})();
