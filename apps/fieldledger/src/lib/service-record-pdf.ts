import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { ReportRecord } from '../domain';

/** All report content comes from the final snapshot. Failed evidence loading aborts export. */
export async function createServiceRecordPdf(report: ReportRecord, loadImage: (url: string) => Promise<Uint8Array>) {
  if (!report.snapshot) throw new Error('This legacy report has no finalized identity snapshot. Contact support for export.');
  const pdf = await PDFDocument.create();
  pdf.setTitle(report.reportNumber);
  pdf.setAuthor(report.snapshot.organizationName);
  pdf.setSubject(report.title);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([612, 792]);
  let y = 738;
  const ink = rgb(0.09, 0.13, 0.19);
  const line = (value: string, size = 11, strong = false) => {
    const font = strong ? bold : regular;
    // Standard PDF fonts use WinAnsi. Preserve supported text; show unsupported glyphs explicitly.
    const text = [...String(value)].map(char => { try { font.encodeText(char); return char; } catch { return '?'; } }).join('');
    const words = text.split(/\s+/);
    let row = '';
    const flush = () => {
      if (y < 65) { page = pdf.addPage([612, 792]); y = 738; }
      page.drawText(row, { x: 48, y, size, font, color: ink }); y -= size + 6; row = '';
    };
    for (const word of words) {
      if (row && font.widthOfTextAtSize(`${row} ${word}`, size) > 510) flush();
      // Long identifiers must wrap too.
      for (const char of (row ? ' ' : '') + word) {
        if (font.widthOfTextAtSize(row + char, size) > 510) flush();
        row += char;
      }
    }
    if (row) flush();
  };
  line(report.snapshot.organizationName, 20, true);
  line(report.title, 16, true);
  line(`Record ${report.reportNumber}`, 10);
  y -= 12;
  line(`${report.snapshot.customerName} / ${report.snapshot.siteName}`, 13, true);
  line(report.snapshot.address);
  const completedAt = new Date(report.snapshot.completedAt);
  line(`Visit: ${completedAt.toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' })} UTC | Technician: ${report.snapshot.technicianName}`);
  line(`Outcome: ${report.outcome.replace(/_/g, ' ')}`, 11, true);
  y -= 12;
  for (const result of report.results || []) {
    const asset = report.snapshot.assets.find(item => item.id === result.assetId);
    line(`${asset?.assetCode || result.assetId} - ${asset?.name || 'Service item'}`, 13, true);
    if (asset?.location) line(`Location: ${asset.location}`);
    line(`Result: ${result.outcome}`);
    for (const [key, value] of Object.entries(result.checklist || {})) {
      if (key.startsWith('photo_label_')) continue;
      const label = report.snapshot.checklistLabels?.[key] || key.replace(/_/g, ' ');
      line(`${label}: ${typeof value === 'boolean' ? value ? 'Yes' : 'No' : String(value)}`, 10);
    }
    if (result.notes) line(`Observations: ${result.notes}`);
    y -= 10;
  }
  line(report.disclaimer || 'This record documents operator-entered work and observations. It does not independently certify regulatory compliance.', 9);
  if (report.addenda?.length) {
    y -= 16;
    line(`Corrections and clarifications - revision ${report.revision}`, 13, true);
    for (const item of report.addenda) {
      line(item.reason, 11, true);
      line(item.note);
      line(`${item.authorName} | ${new Date(item.createdAt).toLocaleString('en-US', { timeZone: 'UTC' })} UTC`, 9);
      y -= 10;
    }
  }
  for (const result of report.results || []) {
    const asset = report.snapshot.assets.find(item => item.id === result.assetId);
    for (const [index, url] of (result.photoUrls || []).entries()) {
      const bytes = await loadImage(url);
      const photo = bytes[0] === 0xff ? await pdf.embedJpg(bytes) : await pdf.embedPng(bytes);
      page = pdf.addPage([612, 792]); y = 738;
      line(`${asset?.assetCode || result.assetId} / ${asset?.name || 'Service item'}`, 15, true);
      line(`Evidence ${index + 1} | ${report.reportNumber}`, 10);
      const label = result.checklist[`photo_label_${index}`];
      if (label) line(String(label), 12, true);
      const size = photo.scaleToFit(516, 585);
      page.drawImage(photo, { x: 48 + (516 - size.width) / 2, y: y - 16 - size.height, width: size.width, height: size.height });
    }
  }
  const pages = pdf.getPages();
  pages.forEach((item, index) => item.drawText(`${report.reportNumber}  |  ${index + 1} / ${pages.length}`, { x: 48, y: 30, size: 8, font: regular, color: ink }));
  return pdf.save();
}
