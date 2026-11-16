import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import * as docxPreview from 'docx-preview';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { TemplateConfig } from '../types';

/**
 * Fills a DOCX template using docxtemplater and converts each page to a multi-page PDF.
 */
export async function renderDocxToPdf(
  docxBuffer: ArrayBuffer,
  data: any,
  config: TemplateConfig,
  onProgress?: (stage: string, progress: number) => void
): Promise<{ pdfBlob: Blob; pageCount: number; populatedDocx: Blob }> {
  onProgress?.('Populating DOCX template with data...', 20);

  // 1. Prepare docxtemplater data context
  let templateData: Record<string, any> = {};

  if (Array.isArray(data)) {
    // If data is a list, map it to common table loop variables
    templateData = {
      items: data,
      data: data,
      rows: data,
      table: data,
      list: data,
      count: data.length,
      ...config
    };
  } else if (typeof data === 'object' && data !== null) {
    templateData = {
      ...data,
      ...config
    };
  }

  // 2. Load zip and apply docxtemplater
  let populatedBuffer: ArrayBuffer;
  try {
    const zip = new PizZip(docxBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{', end: '}' }
    });

    doc.render(templateData);

    const generated = doc.getZip().generate({
      type: 'arraybuffer',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
    populatedBuffer = generated as ArrayBuffer;
  } catch (err: any) {
    console.error('Docxtemplater error:', err);
    // If docxtemplater fails (e.g. tag mismatch or not a templated docx), use original buffer
    populatedBuffer = docxBuffer;
  }

  const populatedDocxBlob = new Blob([populatedBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });

  onProgress?.('Rendering DOCX layout...', 50);

  // 3. Render DOCX pages in DOM using docx-preview
  const hostDiv = document.createElement('div');
  hostDiv.style.position = 'fixed';
  hostDiv.style.left = '-99999px';
  hostDiv.style.top = '0';
  hostDiv.style.width = '1000px';
  hostDiv.style.backgroundColor = '#ffffff';
  hostDiv.style.opacity = '0';
  document.body.appendChild(hostDiv);

  try {
    await docxPreview.renderAsync(populatedBuffer, hostDiv, undefined, {
      className: 'docx-page',
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      renderHeaders: true,
      renderFooters: true,
      renderFootnotes: true,
      renderEndnotes: true,
      experimental: true,
      useBase64URL: true
    });

    // Find rendered page sections
    let pageSections = hostDiv.querySelectorAll('section.docx') as NodeListOf<HTMLElement>;
    if (pageSections.length === 0) {
      pageSections = hostDiv.querySelectorAll('.docx-wrapper > section') as NodeListOf<HTMLElement>;
    }
    if (pageSections.length === 0) {
      // Fallback to entire host if sections aren't separated
      pageSections = [hostDiv] as unknown as NodeListOf<HTMLElement>;
    }

    onProgress?.(`Converting ${pageSections.length} page(s) to PDF...`, 70);

    const pdf = new jsPDF({
      orientation: config.orientation === 'landscape' ? 'landscape' : 'portrait',
      unit: 'pt',
      format: config.pageSize ? (config.pageSize.toLowerCase() as any) : 'a4'
    });

    const totalPages = pageSections.length;
    for (let i = 0; i < totalPages; i++) {
      const section = pageSections[i];
      onProgress?.(`Capturing page ${i + 1} of ${totalPages}...`, 70 + Math.round((i / totalPages) * 25));

      // Render section to canvas
      const canvas = await html2canvas(section, {
        scale: 2, // High resolution for sharp text and tables
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const imgWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (i > 0) {
        pdf.addPage(
          config.pageSize ? (config.pageSize.toLowerCase() as any) : 'a4',
          config.orientation === 'landscape' ? 'landscape' : 'portrait'
        );
      }

      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
    }

    onProgress?.('Finalizing PDF...', 98);
    const pdfBlob = pdf.output('blob');

    return {
      pdfBlob,
      pageCount: totalPages,
      populatedDocx: populatedDocxBlob
    };
  } finally {
    document.body.removeChild(hostDiv);
  }
}
