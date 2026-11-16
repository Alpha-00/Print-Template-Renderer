/**
 * Robust fetch service with CORS fallback and binary/text support.
 */

export async function fetchWithCorsFallback(
  url: string,
  asBinary: boolean = false
): Promise<{ data: string | ArrayBuffer; contentType: string }> {
  // Candidate URLs to try in sequence:
  // 1. Direct URL
  // 2. Local proxy endpoint: /api/proxy?url=...
  // 3. Public CORS proxies
  const urlsToTry = [
    url,
    `/api/proxy?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
  ];

  let lastError: Error | null = null;

  for (const candidate of urlsToTry) {
    try {
      const response = await fetch(candidate, {
        headers: {
          'Accept': '*/*'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status} (${response.statusText})`);
      }

      const contentType = response.headers.get('content-type') || '';

      if (asBinary) {
        const buffer = await response.arrayBuffer();
        return { data: buffer, contentType };
      } else {
        const text = await response.text();
        return { data: text, contentType };
      }
    } catch (err: any) {
      lastError = err;
      // Continue to next candidate
      console.warn(`Failed fetching via ${candidate}:`, err.message);
    }
  }

  throw new Error(`Failed to fetch template from "${url}". Error: ${lastError?.message || 'Network / CORS error'}`);
}

export async function fetchTemplateText(url: string): Promise<string> {
  const result = await fetchWithCorsFallback(url, false);
  return result.data as string;
}

export async function fetchTemplateBinary(url: string): Promise<ArrayBuffer> {
  const result = await fetchWithCorsFallback(url, true);
  return result.data as ArrayBuffer;
}
