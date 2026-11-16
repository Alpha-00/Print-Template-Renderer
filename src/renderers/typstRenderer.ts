import { $typst } from '@myriaddreamin/typst.ts';
import { jsPDF } from 'jspdf';
import { TemplateConfig } from '../types';

/**
 * Injects JSON data and config into a Typst source template.
 */
export function prepareTypstSource(source: string, data: any, config: TemplateConfig): string {
  // Safe JSON strings
  const jsonEncodedData = JSON.stringify(data ?? {});
  const jsonEncodedConfig = JSON.stringify(config ?? {});

  // Typst header definitions providing native access to data & config
  const typstPreamble = `
// --- Auto-injected Template Variables & Data ---
#let raw_data_str = \`\`\`${jsonEncodedData}\`\`\`.text
#let data = json.decode(raw_data_str)
#let raw_config_str = \`\`\`${jsonEncodedConfig}\`\`\`.text
#let config = json.decode(raw_config_str)

// Helper function to render tabular list data
#let auto_table(rows) = {
  if type(rows) == array and rows.len() > 0 {
    let keys = rows.at(0).keys()
    table(
      columns: keys.len(),
      fill: (col, row) => if row == 0 { rgb("${config.primaryColor || '#0284c7'}") } else if calc.even(row) { rgb("#f8fafc") } else { rgb("#ffffff") },
      stroke: 0.5pt + rgb("#cbd5e1"),
      inset: (x: 8pt, y: 7pt),
      ..keys.map(k => text(fill: white, weight: "bold", upper(k))),
      ..rows.map(row => keys.map(k => str(row.at(k, default: "")))).flatten()
    )
  }
}
// ----------------------------------------------
`;

  // Also replace any handlebars-style placeholders: {{name}}, {{title}}
  let processed = source;
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    processed = processed.replace(/\{\{?\s*([a-zA-Z0-9_.]+)\s*\}?\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }

  // Prepend preamble to source
  return `${typstPreamble}\n${processed}`;
}

/**
 * Fallback PDF renderer for Typst in case wasm compiler or remote fonts are unavailable.
 */
function renderTypstFallbackPdf(source: string, data: any, config: TemplateConfig): Blob {
  const pdf = new jsPDF({
    orientation: config.orientation === 'landscape' ? 'landscape' : 'portrait',
    unit: 'pt',
    format: config.pageSize ? (config.pageSize.toLowerCase() as any) : 'a4'
  });

  const primaryColor = config.primaryColor || '#0284c7';
  let y = 60;

  // Header / Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  pdf.setTextColor(primaryColor);
  pdf.text(config.title || 'Document Preview', 40, y);
  y += 30;

  // Render Table if data is a list
  if (Array.isArray(data) && data.length > 0) {
    const keys = Object.keys(data[0] || {});
    const colWidth = (pdf.internal.pageSize.getWidth() - 80) / Math.max(keys.length, 1);
    const rowHeight = 24;

    // Header row
    pdf.setFillColor(primaryColor);
    pdf.rect(40, y, pdf.internal.pageSize.getWidth() - 80, rowHeight, 'F');
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor('#ffffff');

    keys.forEach((key, i) => {
      pdf.text(key.toUpperCase(), 45 + i * colWidth, y + 16);
    });
    y += rowHeight;

    // Data rows
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor('#334155');

    data.forEach((row, rowIndex) => {
      if (y > pdf.internal.pageSize.getHeight() - 60) {
        pdf.addPage();
        y = 60;
      }

      if (rowIndex % 2 === 0) {
        pdf.setFillColor('#f8fafc');
        pdf.rect(40, y, pdf.internal.pageSize.getWidth() - 80, rowHeight, 'F');
      }

      pdf.setDrawColor('#e2e8f0');
      pdf.line(40, y + rowHeight, pdf.internal.pageSize.getWidth() - 40, y + rowHeight);

      keys.forEach((key, i) => {
        const val = row[key] !== undefined ? String(row[key]) : '';
        pdf.text(val, 45 + i * colWidth, y + 16);
      });

      y += rowHeight;
    });
  } else {
    // Render text lines
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor('#334155');

    const cleanLines = source
      .replace(/\/\/.*$/gm, '')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0 && !l.startsWith('#let'));

    cleanLines.forEach(line => {
      if (y > pdf.internal.pageSize.getHeight() - 60) {
        pdf.addPage();
        y = 60;
      }
      pdf.text(line, 40, y);
      y += 18;
    });
  }

  return pdf.output('blob');
}

/**
 * Compiles Typst source code to PDF Blob.
 */
export async function renderTypstToPdf(
  source: string,
  data: any,
  config: TemplateConfig,
  onProgress?: (stage: string, progress: number) => void
): Promise<{ pdfBlob: Blob; pageCount: number }> {
  onProgress?.('Preparing Typst compilation...', 25);
  const fullSource = prepareTypstSource(source, data, config);

  try {
    onProgress?.('Compiling Typst via WebAssembly...', 60);

    // Call typst.ts compiler
    const pdfData = await $typst.pdf({
      mainContent: fullSource
    });

    if (!pdfData) {
      throw new Error('Typst compilation did not return binary PDF data.');
    }

    onProgress?.('Generating PDF output...', 90);
    const pdfBlob = new Blob([pdfData.buffer as ArrayBuffer], { type: 'application/pdf' });

    return {
      pdfBlob,
      pageCount: 1 // Will be accurately determined by PDF.js in previewer
    };
  } catch (err: any) {
    console.warn('Typst WASM compiler error, switching to resilient fallback renderer:', err);
    onProgress?.('Using fallback PDF renderer...', 75);

    const fallbackBlob = renderTypstFallbackPdf(source, data, config);
    return {
      pdfBlob: fallbackBlob,
      pageCount: 1
    };
  }
}
