import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
// Configure worker
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Printer,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Columns,
  Square,
  FileText
} from 'lucide-react';

interface PDFPreviewerProps {
  pdfBlob?: Blob;
  pdfUrl?: string;
  onPageCountDetermined?: (count: number) => void;
  documentTitle?: string;
}

type ViewMode = 'continuous' | 'single' | 'grid';

export const PDFPreviewer: React.FC<PDFPreviewerProps> = ({
  pdfBlob,
  pdfUrl,
  onPageCountDetermined,
  documentTitle = 'Rendered_Document'
}) => {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.1);
  const [rotation, setRotation] = useState<number>(0);
  const [viewMode, setViewMode] = useState<ViewMode>('continuous');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [pageThumbnails, setPageThumbnails] = useState<string[]>([]);
  const [renderError, setRenderError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const pageCanvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const blobUrlRef = useRef<string | null>(null);

  // Load PDF Document when blob changes
  useEffect(() => {
    let isCancelled = false;

    async function loadDocument() {
      setRenderError(null);
      setPdfDoc(null);
      setTotalPages(0);
      setPageThumbnails([]);

      let sourceUrl = pdfUrl;
      if (pdfBlob) {
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
        }
        blobUrlRef.current = URL.createObjectURL(pdfBlob);
        sourceUrl = blobUrlRef.current;
      }

      if (!sourceUrl) return;

      try {
        const loadingTask = pdfjsLib.getDocument({
          url: sourceUrl,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        if (isCancelled) return;

        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setCurrentPage(1);
        onPageCountDetermined?.(doc.numPages);

        // Generate thumbnails for the sidebar
        generateThumbnails(doc);
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Error loading PDF document:', err);
          setRenderError(err.message || 'Failed to render PDF.');
        }
      }
    }

    loadDocument();

    return () => {
      isCancelled = true;
    };
  }, [pdfBlob, pdfUrl]);

  // Generate thumbnail images for each page
  async function generateThumbnails(doc: pdfjsLib.PDFDocumentProxy) {
    const thumbs: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      try {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: 0.25 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport }).promise;
          thumbs.push(canvas.toDataURL());
        }
      } catch (e) {
        console.warn('Thumbnail generation error:', e);
      }
    }
    setPageThumbnails(thumbs);
  }

  // Render pages when doc, scale, rotation, or viewMode changes
  useEffect(() => {
    if (!pdfDoc) return;

    let isCancelled = false;

    async function renderAllPages() {
      const pagesToRender = viewMode === 'single' ? [currentPage] : Array.from({ length: totalPages }, (_, i) => i + 1);

      for (const pageNum of pagesToRender) {
        const canvas = pageCanvasRefs.current.get(pageNum);
        if (!canvas) continue;

        try {
          const page = await pdfDoc!.getPage(pageNum);
          if (isCancelled) return;

          const pixelRatio = window.devicePixelRatio || 1;
          const viewport = page.getViewport({ scale: scale * pixelRatio, rotation });

          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = `${viewport.width / pixelRatio}px`;
          canvas.style.height = `${viewport.height / pixelRatio}px`;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            await page.render({
              canvasContext: ctx,
              viewport
            }).promise;
          }
        } catch (e) {
          console.error(`Error rendering page ${pageNum}:`, e);
        }
      }
    }

    renderAllPages();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, scale, rotation, viewMode, currentPage, totalPages]);

  // Download Handler
  const handleDownload = () => {
    if (!blobUrlRef.current && !pdfUrl) return;
    const a = document.createElement('a');
    a.href = blobUrlRef.current || pdfUrl || '';
    a.download = `${documentTitle.replace(/\s+/g, '_')}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Print Handler
  const handlePrint = () => {
    if (!blobUrlRef.current && !pdfUrl) return;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = blobUrlRef.current || pdfUrl || '';
    document.body.appendChild(iframe);

    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Print iframe error:', err);
        window.open(iframe.src, '_blank');
      }
    };
  };

  // Zoom Helpers
  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3.0));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.4));
  const handleResetZoom = () => setScale(1.1);
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  // Fullscreen Handler
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const scrollToPage = (pageNum: number) => {
    setCurrentPage(pageNum);
    if (viewMode === 'continuous') {
      const canvas = pageCanvasRefs.current.get(pageNum);
      canvas?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl relative"
    >
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-800/90 backdrop-blur border-b border-slate-700/80 text-slate-200 select-none z-10 gap-2">
        {/* Left Toolbar Items: Sidebar toggle & Page counter */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSidebarOpen(prev => !prev)}
            title="Toggle Thumbnails"
            className={`p-1.5 rounded-lg transition ${
              sidebarOpen ? 'bg-sky-600/30 text-sky-400' : 'hover:bg-slate-700 text-slate-400'
            }`}
          >
            <Columns className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-700 mx-1" />

          {/* Page Navigation */}
          <div className="flex items-center space-x-1.5 text-xs text-slate-300">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage <= 1}
              className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-medium px-1">
              Page <span className="text-sky-400 font-semibold">{totalPages > 0 ? currentPage : 0}</span> of{' '}
              <span className="text-slate-400">{totalPages}</span>
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage >= totalPages}
              className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center: View Mode & Zoom Controls */}
        <div className="flex items-center space-x-2">
          {/* View mode toggle */}
          <div className="flex bg-slate-900/80 p-0.5 rounded-lg border border-slate-700/60 text-xs">
            <button
              onClick={() => setViewMode('continuous')}
              title="Continuous Vertical Scroll"
              className={`px-2 py-1 rounded flex items-center space-x-1 transition ${
                viewMode === 'continuous' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Scroll</span>
            </button>
            <button
              onClick={() => setViewMode('single')}
              title="Single Page"
              className={`px-2 py-1 rounded flex items-center space-x-1 transition ${
                viewMode === 'single' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Square className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Single</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              title="Grid Overview"
              className={`px-2 py-1 rounded flex items-center space-x-1 transition ${
                viewMode === 'grid' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Grid</span>
            </button>
          </div>

          <div className="h-4 w-px bg-slate-700 mx-1" />

          {/* Zoom controls */}
          <div className="flex items-center space-x-1">
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className="px-2 py-1 text-xs font-mono text-slate-300 hover:bg-slate-700 rounded transition"
              title="Reset Zoom"
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 transition"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleRotate}
              className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 transition ml-1"
              title="Rotate 90° Clockwise"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Toolbar Items: Actions (Print, Download, Fullscreen) */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg transition shadow-sm"
            title="Print PDF Document"
          >
            <Printer className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Print</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white rounded-lg transition shadow-md"
            title="Download PDF File"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 transition"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Preview Work Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Thumbnail Sidebar */}
        {sidebarOpen && totalPages > 0 && (
          <div className="w-48 bg-slate-950/80 border-r border-slate-800 p-3 overflow-y-auto space-y-3 flex-shrink-0 transition-all select-none">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1 mb-2">
              Pages ({totalPages})
            </div>
            {pageThumbnails.map((thumbUrl, idx) => {
              const pageNum = idx + 1;
              const isSelected = currentPage === pageNum;
              return (
                <div
                  key={pageNum}
                  onClick={() => scrollToPage(pageNum)}
                  className={`cursor-pointer group flex flex-col items-center p-2 rounded-lg border transition ${
                    isSelected
                      ? 'bg-sky-950/40 border-sky-500/80 shadow-md ring-1 ring-sky-500/50'
                      : 'border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                  }`}
                >
                  <img
                    src={thumbUrl}
                    alt={`Page ${pageNum}`}
                    className="w-full h-auto bg-white rounded shadow-sm group-hover:shadow transition"
                  />
                  <span
                    className={`mt-1.5 text-xs font-mono ${
                      isSelected ? 'text-sky-400 font-semibold' : 'text-slate-400'
                    }`}
                  >
                    Page {pageNum}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* PDF Canvas Viewport */}
        <div className="flex-1 bg-slate-950 overflow-auto p-6 flex flex-col items-center">
          {renderError && (
            <div className="m-auto max-w-md p-6 bg-red-950/50 border border-red-800/60 rounded-xl text-center text-red-200">
              <p className="font-semibold text-red-400 mb-1">Rendering Notice</p>
              <p className="text-xs text-red-300">{renderError}</p>
            </div>
          )}

          {!pdfDoc && !renderError && (
            <div className="m-auto flex flex-col items-center justify-center p-8 text-slate-400">
              <div className="w-10 h-10 border-4 border-sky-500/30 border-t-sky-500 rounded-full animate-spin mb-4" />
              <p className="text-sm font-medium">Rendering PDF Pages...</p>
              <p className="text-xs text-slate-500 mt-1">Rasterizing vector assets and typography</p>
            </div>
          )}

          {pdfDoc && (
            <div
              className={`min-w-fit flex ${
                viewMode === 'grid'
                  ? 'flex-row flex-wrap justify-center gap-6'
                  : 'flex-col items-center space-y-6'
              }`}
            >
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
                if (viewMode === 'single' && pageNum !== currentPage) return null;

                return (
                  <div
                    key={pageNum}
                    className="relative group transition-all"
                  >
                    {/* Page Container */}
                    <div className="bg-white rounded shadow-2xl overflow-hidden ring-1 ring-slate-800">
                      <canvas
                        ref={el => {
                          if (el) {
                            pageCanvasRefs.current.set(pageNum, el);
                          } else {
                            pageCanvasRefs.current.delete(pageNum);
                          }
                        }}
                        className="block"
                      />
                    </div>

                    {/* Page floating badge */}
                    <div className="absolute bottom-2 right-2 px-2 py-1 bg-slate-900/80 backdrop-blur border border-slate-700/60 rounded text-[10px] text-slate-300 font-mono shadow opacity-0 group-hover:opacity-100 transition">
                      {pageNum} / {totalPages}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
