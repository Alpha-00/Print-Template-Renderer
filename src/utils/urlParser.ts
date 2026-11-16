import { RequestParams, TemplateType } from '../types';

/**
 * Normalizes external file hosting URLs (Google Drive, GitHub, etc.) to direct raw downloadable URLs.
 */
export function normalizeSourceUrl(url: string, type?: TemplateType): string {
  if (!url) return '';
  const trimmed = url.trim();

  // Handle Google Drive
  // Pattern 1: https://drive.google.com/file/d/{FILE_ID}/view...
  const driveFileMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveFileMatch && driveFileMatch[1]) {
    return `https://drive.google.com/uc?export=download&id=${driveFileMatch[1]}`;
  }

  // Pattern 2: https://drive.google.com/open?id={FILE_ID}
  const driveOpenMatch = trimmed.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (driveOpenMatch && driveOpenMatch[1]) {
    return `https://drive.google.com/uc?export=download&id=${driveOpenMatch[1]}`;
  }

  // Pattern 3: Google Docs/Sheets/Slides export
  const gdocsMatch = trimmed.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (gdocsMatch && gdocsMatch[1]) {
    return `https://docs.google.com/document/d/${gdocsMatch[1]}/export?format=docx`;
  }

  // Handle GitHub
  // Pattern: https://github.com/{owner}/{repo}/blob/{branch}/{path}
  const githubBlobMatch = trimmed.match(/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)/);
  if (githubBlobMatch) {
    const [, owner, repo, branch, path] = githubBlobMatch;
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  }

  return trimmed;
}

/**
 * Safely parses JSON string from query parameter, with support for base64 and url decoding.
 */
export function parseJsonParam(paramValue: string | null, defaultValue: any = {}): any {
  if (!paramValue) return defaultValue;

  let cleaned = paramValue.trim();

  // Check if base64 encoded
  if (cleaned.startsWith('base64:')) {
    try {
      const decoded = atob(cleaned.replace('base64:', ''));
      return JSON.parse(decoded);
    } catch (e) {
      console.warn('Failed to parse base64 prefixed JSON:', e);
    }
  }

  // Try standard JSON.parse first
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try URI decode
    try {
      const decoded = decodeURIComponent(cleaned);
      return JSON.parse(decoded);
    } catch {
      // Try raw base64 decode if it looks like base64
      try {
        const decoded = atob(cleaned);
        return JSON.parse(decoded);
      } catch (err) {
        console.error('Error parsing JSON parameter:', err);
        return defaultValue;
      }
    }
  }
}

/**
 * Reads parameters from current window URL.
 */
export function parseUrlParams(): RequestParams {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '');

  // Helper to read param from search or hash
  const getParam = (key: string): string | null => {
    return searchParams.get(key) || hashParams.get(key) || null;
  };

  const rawType = (getParam('type') || getParam('format') || '').toLowerCase();
  
  // Accept url, templateUrl, template_url, source, src, file, or template (if URL)
  let rawUrl = 
    getParam('url') || 
    getParam('templateUrl') || 
    getParam('template_url') || 
    getParam('source') || 
    getParam('src') || 
    getParam('file') || 
    '';

  const potentialTemplateParam = getParam('template') || '';
  if (!rawUrl && (potentialTemplateParam.startsWith('http://') || potentialTemplateParam.startsWith('https://') || potentialTemplateParam.startsWith('/') || potentialTemplateParam.includes('.'))) {
    rawUrl = potentialTemplateParam;
  }

  const rawData = getParam('data') || getParam('d');
  const rawConfig = getParam('config') || getParam('c');
  const rawInline = getParam('inline') || (!rawUrl && potentialTemplateParam && !potentialTemplateParam.startsWith('http') ? potentialTemplateParam : '');

  // Determine template type
  let type: TemplateType = 'typst';
  if (rawType === 'docx' || rawType === 'doc') {
    type = 'docx';
  } else if (rawType === 'svg') {
    type = 'svg';
  } else if (rawType === 'typst' || rawType === 'typ') {
    type = 'typst';
  } else if (rawUrl) {
    // Infer from URL extension
    const lowerUrl = rawUrl.toLowerCase().split('?')[0];
    if (lowerUrl.endsWith('.docx') || lowerUrl.endsWith('.doc')) {
      type = 'docx';
    } else if (lowerUrl.endsWith('.svg')) {
      type = 'svg';
    } else if (lowerUrl.endsWith('.typ') || lowerUrl.endsWith('.typst')) {
      type = 'typst';
    }
  }

  const normalizedUrl = normalizeSourceUrl(rawUrl, type);
  const parsedData = parseJsonParam(rawData, [
    { id: 1, item: "Standard Widget", quantity: 5, price: 12.50, total: 62.50 },
    { id: 2, item: "Premium Package", quantity: 2, price: 49.99, total: 99.98 },
    { id: 3, item: "Support License", quantity: 1, price: 150.00, total: 150.00 }
  ]);
  const parsedConfig = parseJsonParam(rawConfig, {
    pageSize: "A4",
    orientation: "portrait",
    primaryColor: "#0284c7"
  });

  return {
    type,
    url: normalizedUrl,
    data: parsedData,
    config: parsedConfig,
    inlineSource: rawInline ? decodeURIComponent(rawInline) : undefined
  };
}

/**
 * Builds a shareable URL with parameters.
 */
export function buildShareableUrl(params: RequestParams): string {
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set('type', params.type);
  if (params.url) {
    url.searchParams.set('url', params.url);
  }
  if (params.data !== undefined) {
    url.searchParams.set('data', JSON.stringify(params.data));
  }
  if (params.config && Object.keys(params.config).length > 0) {
    url.searchParams.set('config', JSON.stringify(params.config));
  }
  return url.toString();
}
