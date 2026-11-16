import { jsPDF } from 'jspdf';
import { svg2pdf } from 'svg2pdf.js';
import { TemplateConfig } from '../types';

/**
 * Replaces placeholders in text with data object values.
 * Supports {{key}}, {key}, and nested paths like {{user.name}}
 */
function interpolateVariables(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{?\s*([a-zA-Z0-9_.]+)\s*\}?\}/g, (match, path) => {
    const keys = path.split('.');
    let val: any = data;
    for (const key of keys) {
      if (val === undefined || val === null) return match;
      val = val[key];
    }
    return val !== undefined && val !== null ? String(val) : match;
  });
}

/**
 * Handles list/table data inside SVG templates.
 * If {{#items}}...{{/items}} exists, repeats the template block and offsets the y coordinates.
 * Otherwise, if SVG does not contain repeat blocks, appends a styled dynamic vector table to the SVG.
 */
function injectDataIntoSvg(svgContent: string, data: any, config: TemplateConfig): string {
  let content = svgContent;

  if (Array.isArray(data)) {
    // Check for loop block syntax: {{#items}}...{{/items}} or {{#data}}...{{/data}} or {{#rows}}...{{/rows}}
    const loopRegex = /\{\{#(?:items|data|rows)\}\}([\s\S]*?)\{\{\/(?:items|data|rows)\}\}/i;
    const loopMatch = content.match(loopRegex);

    if (loopMatch) {
      const templateBlock = loopMatch[1];
      const renderedRows = data.map((item, index) => {
        let row = interpolateVariables(templateBlock, { ...item, _index: index, _row: index + 1 });
        // Auto-shift transform translateY or y attribute if row template doesn't handle it
        row = row.replace(/(\by=")(\d+(?:\.\d+)?)"/g, (_, prefix, y) => {
          const shifted = parseFloat(y) + index * 28;
          return `${prefix}${shifted}"`;
        });
        row = row.replace(/(transform="translate\(\s*[\d.]+\s*,\s*)([\d.]+)(\s*\)")/g, (_, prefix, y, suffix) => {
          const shifted = parseFloat(y) + index * 28;
          return `${prefix}${shifted}${suffix}`;
        });
        return row;
      }).join('\n');

      content = content.replace(loopMatch[0], renderedRows);
    } else {
      // If no loop tags exist, check if there's a marker or if we should append a vector table
      if (data.length > 0) {
        // Collect all column keys
        const columns = Array.from(
          new Set(data.flatMap(item => (typeof item === 'object' && item !== null ? Object.keys(item) : ['value'])))
        );

        const primaryColor = config.primaryColor || '#0284c7';
        const startY = 160;
        const rowHeight = 32;
        const totalWidth = 700;
        const colWidth = totalWidth / columns.length;

        // Build SVG table
        let tableSvg = `<g id="generated-table" transform="translate(50, ${startY})" font-family="system-ui, -apple-system, sans-serif" font-size="12">`;

        // Table Header
        tableSvg += `<rect x="0" y="0" width="${totalWidth}" height="36" rx="6" fill="${primaryColor}" />`;
        columns.forEach((col, idx) => {
          const x = idx * colWidth + 14;
          const label = col.charAt(0).toUpperCase() + col.slice(1);
          tableSvg += `<text x="${x}" y="23" fill="#ffffff" font-weight="bold">${escapeXml(label)}</text>`;
        });

        // Table Rows
        data.forEach((row, rowIdx) => {
          const y = 36 + rowIdx * rowHeight;
          const bg = rowIdx % 2 === 0 ? '#f8fafc' : '#ffffff';
          tableSvg += `<rect x="0" y="${y}" width="${totalWidth}" height="${rowHeight}" fill="${bg}" stroke="#e2e8f0" stroke-width="0.5" />`;

          columns.forEach((col, colIdx) => {
            const x = colIdx * colWidth + 14;
            const val = typeof row === 'object' && row !== null ? row[col] : row;
            const displayVal = val !== undefined && val !== null ? String(val) : '';
            tableSvg += `<text x="${x}" y="${y + 20}" fill="#334155">${escapeXml(displayVal)}</text>`;
          });
        });

        tableSvg += `</g>`;

        // Insert before closing </svg>
        if (content.includes('</svg>')) {
          content = content.replace('</svg>', `${tableSvg}\n</svg>`);
        } else {
          content += tableSvg;
        }
      }
    }
    // Also interpolate any top-level config or metadata
    content = interpolateVariables(content, { count: data.length, totalItems: data.length, ...config });
  } else if (typeof data === 'object' && data !== null) {
    // Single object interpolation
    content = interpolateVariables(content, { ...data, ...config });
  }

  return content;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Renders an SVG template with JSON data and config to a PDF Blob.
 */
export async function renderSvgToPdf(
  svgContent: string,
  data: any,
  config: TemplateConfig
): Promise<{ pdfBlob: Blob; pageCount: number }> {
  // 1. Process data and placeholders
  const processedSvg = injectDataIntoSvg(svgContent, data, config);

  // 2. Parse into SVG DOM Element
  const parser = new DOMParser();
  const doc = parser.parseFromString(processedSvg, 'image/svg+xml');
  const svgElement = doc.documentElement as unknown as SVGElement;

  if (doc.querySelector('parsererror')) {
    throw new Error('Failed to parse SVG template: Invalid XML/SVG syntax.');
  }

  // 3. Determine dimensions
  const viewBox = svgElement.getAttribute('viewBox');
  let width = 595.28; // Default A4 in points
  let height = 841.89;

  if (viewBox) {
    const parts = viewBox.split(/\s+|,/).map(parseFloat);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      width = parts[2];
      height = parts[3];
    }
  } else {
    const w = parseFloat(svgElement.getAttribute('width') || '0');
    const h = parseFloat(svgElement.getAttribute('height') || '0');
    if (w > 0 && h > 0) {
      width = w;
      height = h;
    }
  }

  // Handle config orientation
  const isLandscape = config.orientation === 'landscape' || width > height;
  const orientation = isLandscape ? 'landscape' : 'portrait';

  // 4. Initialize jsPDF
  const pdf = new jsPDF({
    orientation,
    unit: 'pt',
    format: [width, height]
  });

  // Temporarily attach to document body in hidden container for svg2pdf compute styles
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-99999px';
  container.style.left = '-99999px';
  container.style.visibility = 'hidden';
  container.appendChild(svgElement);
  document.body.appendChild(container);

  try {
    await svg2pdf(svgElement, pdf, {
      x: 0,
      y: 0,
      width,
      height
    });

    const pdfBlob = pdf.output('blob');
    return {
      pdfBlob,
      pageCount: pdf.getNumberOfPages()
    };
  } finally {
    document.body.removeChild(container);
  }
}
