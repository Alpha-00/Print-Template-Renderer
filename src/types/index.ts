export type TemplateType = 'typst' | 'docx' | 'svg';

export interface RequestParams {
  type: TemplateType;
  url: string;
  data: any; // JSON object or array (table)
  config: Record<string, any>;
  inlineSource?: string; // Optional raw template content (useful for quick testing/paste)
}

export interface RenderState {
  status: 'idle' | 'loading' | 'success' | 'error';
  stage?: string;
  progress?: number;
  error?: string;
  pdfBlob?: Blob;
  pdfUrl?: string;
  pageCount: number;
  fileSize?: number;
}

export interface TemplateConfig {
  pageSize?: 'A4' | 'A5' | 'A3' | 'Letter' | 'Legal' | string;
  orientation?: 'portrait' | 'landscape';
  margins?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
  fontFamily?: string;
  fontSize?: number;
  primaryColor?: string;
  title?: string;
  watermark?: string;
  [key: string]: any;
}
