// Create test PDF files for testing all tools
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function createTestPDFs() {
    const publicDir = path.join(__dirname, 'public', 'test');
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

    // Create a multi-page PDF for testing
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.HelveticaBold);

    for (let i = 1; i <= 5; i++) {
        const page = pdf.addPage([612, 792]); // US Letter
        page.drawText(`Test Page ${i}`, {
            x: 200,
            y: 400,
            size: 36,
            font,
            color: rgb(0.1, 0.1, 0.8),
        });
        page.drawText(`This is a test PDF for iLovePDF Clone`, {
            x: 100,
            y: 350,
            size: 16,
            font,
            color: rgb(0.3, 0.3, 0.3),
        });
        page.drawText(`Page ${i} of 5`, {
            x: 250,
            y: 50,
            size: 12,
            font,
            color: rgb(0.5, 0.5, 0.5),
        });
    }

    const pdfBytes = await pdf.save();
    fs.writeFileSync(path.join(publicDir, 'test.pdf'), pdfBytes);
    console.log('Created: test.pdf (5 pages)');

    // Create a second PDF for merge testing
    const pdf2 = await PDFDocument.create();
    const font2 = await pdf2.embedFont(StandardFonts.HelveticaBold);
    for (let i = 1; i <= 3; i++) {
        const page = pdf2.addPage([612, 792]);
        page.drawText(`Second PDF - Page ${i}`, {
            x: 150,
            y: 400,
            size: 36,
            font: font2,
            color: rgb(0.8, 0.1, 0.1),
        });
    }
    const pdf2Bytes = await pdf2.save();
    fs.writeFileSync(path.join(publicDir, 'test2.pdf'), pdf2Bytes);
    console.log('Created: test2.pdf (3 pages)');

    console.log('\nTest PDFs created at public/test/');
}

createTestPDFs().catch(console.error);
