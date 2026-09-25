import { useState } from 'react';
import { Download, Mail } from 'lucide-react';
import { getBlob, ref } from 'firebase/storage';
import { dataMode, getFirebaseServices } from '../lib/firebase';
import { useOperations } from '../context/OperationsContext';
import type { ReportRecord } from '../domain';

export function DownloadReportButton({ report }: { report: ReportRecord }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const { snapshot } = useOperations();

  const site = snapshot.sites.find((item) => item.id === report.siteId);
  const customer = snapshot.customers.find((item) => item.id === report.customerId);
  const recipientEmail = customer?.contactEmail || '';
  const companyName = report.snapshot?.organizationName || snapshot.organization.name || 'Service Provider';
  const siteName = report.snapshot?.siteName || site?.siteName || 'Facility';

  async function generatePdfBlob(): Promise<Blob> {
    const { createServiceRecordPdf } = await import('../lib/service-record-pdf');
    const bytes = await createServiceRecordPdf(report, async (url) => {
      const blob =
        dataMode === 'firebase'
          ? await getBlob(ref(getFirebaseServices().storage, url))
          : await (await fetch(url)).blob();
      if (blob.type !== 'image/webp') return new Uint8Array(await blob.arrayBuffer());
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
      bitmap.close();
      const png = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (value) => (value ? resolve(value) : reject(new Error('Unable to convert photo.'))),
          'image/png'
        )
      );
      return new Uint8Array(await png.arrayBuffer());
    });
    return new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
  }

  function triggerDownload(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${report.reportNumber}-service-record.pdf`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  async function download() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const blob = await generatePdfBlob();
      triggerDownload(blob);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to download report. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function emailOrShare() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const blob = await generatePdfBlob();
      const filename = `${report.reportNumber}-service-record.pdf`;
      const pdfFile = new File([blob], filename, { type: 'application/pdf' });

      // Mobile Web Share API with file attachment support
      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [pdfFile] })
      ) {
        await navigator.share({
          title: `${companyName} Service Record - ${report.reportNumber}`,
          text: `Official compliance service record ${report.reportNumber} for ${siteName}.`,
          files: [pdfFile],
        });
        setNotice('Service record shared successfully.');
        return;
      }

      // Desktop web / fallback: download the PDF and trigger pre-filled mailto draft
      triggerDownload(blob);

      const outcomeText =
        report.outcome === 'completed_no_exceptions'
          ? 'Completed - Pass (All items verified)'
          : report.outcome === 'completed_with_exceptions'
            ? 'Completed with Notes/Exceptions'
            : 'Service Incomplete';

      const serviceDate = new Date(report.snapshot?.completedAt || report.generatedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

      const subject = `[${companyName}] Service Record: ${report.reportNumber} - ${siteName}`;
      const body =
        `Hello,\n\n` +
        `Please find attached the official compliance service record for our recent visit.\n\n` +
        `• Record Number: ${report.reportNumber}\n` +
        `• Facility: ${siteName}\n` +
        `• Address: ${report.snapshot?.address || site?.address || 'On file'}\n` +
        `• Service Date: ${serviceDate}\n` +
        `• Status: ${outcomeText}\n` +
        `• Serviced By: ${report.snapshot?.technicianName || 'Certified Technician'}\n\n` +
        `The complete PDF service record has been downloaded to your computer. Please attach it to this email before sending.\n\n` +
        `Best regards,\n${companyName}`;

      const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(body)}`;

      window.location.href = mailtoUrl;
      setNotice('PDF downloaded. Draft opened in your email client — attach the downloaded PDF to send.');
    } catch (cause) {
      if ((cause as { name?: string }).name !== 'AbortError') {
        setError(cause instanceof Error ? cause.message : 'Unable to share report. Try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          disabled={busy}
          onClick={download}
          className="secondary-button"
          title="Download PDF report to your device"
        >
          <Download className="w-4 h-4" />
          {busy ? 'Preparing PDF…' : 'Download customer record'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={emailOrShare}
          className="secondary-button border-orange-400/30 text-orange-200 hover:bg-orange-500/10"
          title="Send pre-filled email draft or share via device"
        >
          <Mail className="w-4 h-4" />
          Email customer record
        </button>
      </div>
      {notice && <p role="status" className="text-xs text-emerald-300 mt-2.5 leading-relaxed">{notice}</p>}
      {error && <p role="alert" className="text-sm text-rose-300 mt-2.5">{error}</p>}
    </div>
  );
}
