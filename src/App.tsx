import React, { useState, useEffect, useCallback } from 'react';
import { RequestParams, RenderState } from './types';
import { parseUrlParams, buildShareableUrl } from './utils/urlParser';
import { fetchTemplateText, fetchTemplateBinary } from './services/fetchService';
import { renderTypstToPdf } from './renderers/typstRenderer';
import { renderDocxToPdf } from './renderers/docxRenderer';
import { renderSvgToPdf } from './renderers/svgRenderer';
import { PDFPreviewer } from './components/PDFPreviewer';
import { ParameterPanel } from './components/ParameterPanel';
import { SAMPLE_PRESETS } from './samples/presets';
import {
  Printer,
  Sparkles,
  PanelLeftClose,
  PanelLeft,
  FileText,
  AlertCircle,
  Clock,
  Layers
} from 'lucide-react';

export const App: React.FC = () => {
  const [params, setParams] = useState<RequestParams>(() => {
    const fromUrl = parseUrlParams();
    // If no explicit URL and no inline source, fallback to typst sample preset
    if (!fromUrl.url && !fromUrl.inlineSource && (!fromUrl.data || Object.keys(fromUrl.data).length === 0)) {
      return SAMPLE_PRESETS[0].params;
    }
    // If typst without URL and without inlineSource, use default sample inline
    if (fromUrl.type === 'typst' && !fromUrl.url && !fromUrl.inlineSource) {
      return SAMPLE_PRESETS[0].params;
    }
    return fromUrl;
  });

  const [renderState, setRenderState] = useState<RenderState>({
    status: 'idle',
    pageCount: 0
  });

  const [panelOpen, setPanelOpen] = useState<boolean>(true);
  const [renderDuration, setRenderDuration] = useState<number | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

  // Render Document Core Function
  const executeRender = useCallback(async (currentParams: RequestParams) => {
    const startTime = performance.now();
    setRenderState({
      status: 'loading',
      stage: 'Initializing renderer...',
      progress: 10,
      pageCount: 0
    });

    try {
      let pdfBlob: Blob;
      let pageCount = 1;

      if (currentParams.type === 'typst') {
        let typstSource = currentParams.inlineSource || '';
        const targetUrl = currentParams.url || '/templates/default.typ';
        if (!typstSource) {
          try {
            setRenderState(prev => ({ ...prev, stage: 'Loading Typst template...', progress: 20 }));
            typstSource = await fetchTemplateText(targetUrl);
          } catch (e) {
            console.warn('Could not fetch typst URL, using fallback preset:', e);
            typstSource = SAMPLE_PRESETS[0].params.inlineSource || '';
          }
        }

        const result = await renderTypstToPdf(
          typstSource,
          currentParams.data,
          currentParams.config,
          (stage, progress) => setRenderState(prev => ({ ...prev, stage, progress }))
        );
        pdfBlob = result.pdfBlob;
        pageCount = result.pageCount;
      } else if (currentParams.type === 'docx') {
        const targetUrl = currentParams.url || '/templates/default.docx';
        setRenderState(prev => ({ ...prev, stage: 'Loading DOCX template...', progress: 20 }));
        const docxBuffer = await fetchTemplateBinary(targetUrl);

        const result = await renderDocxToPdf(
          docxBuffer,
          currentParams.data,
          currentParams.config,
          (stage, progress) => setRenderState(prev => ({ ...prev, stage, progress }))
        );
        pdfBlob = result.pdfBlob;
        pageCount = result.pageCount;
      } else if (currentParams.type === 'svg') {
        let svgContent = currentParams.inlineSource || '';
        const targetUrl = currentParams.url || '/templates/default.svg';
        if (!svgContent) {
          try {
            setRenderState(prev => ({ ...prev, stage: 'Loading SVG template...', progress: 20 }));
            svgContent = await fetchTemplateText(targetUrl);
          } catch (e) {
            console.warn('Could not fetch SVG URL, using fallback preset:', e);
            svgContent = SAMPLE_PRESETS[1].params.inlineSource || '';
          }
        }

        setRenderState(prev => ({ ...prev, stage: 'Compiling SVG to vector PDF...', progress: 50 }));
        const result = await renderSvgToPdf(svgContent, currentParams.data, currentParams.config);
        pdfBlob = result.pdfBlob;
        pageCount = result.pageCount;
      } else {
        throw new Error(`Unsupported template format type: "${currentParams.type}"`);
      }

      const elapsed = Math.round(performance.now() - startTime);
      setRenderDuration(elapsed);

      setRenderState({
        status: 'success',
        pdfBlob,
        pageCount,
        fileSize: pdfBlob.size
      });
    } catch (err: any) {
      console.error('Rendering error:', err);
      setRenderState({
        status: 'error',
        pageCount: 0,
        error: err.message || 'An unknown error occurred during rendering.'
      });
    }
  }, []);

  // Run render whenever parameters are updated
  useEffect(() => {
    executeRender(params);
  }, [params, executeRender]);

  const handleApplyParams = (newParams: RequestParams) => {
    setParams(newParams);
    // Update browser URL without reloading page
    const shareable = buildShareableUrl(newParams);
    window.history.replaceState({}, '', shareable);
  };

  const handleCopyShareableUrl = () => {
    const url = buildShareableUrl(params);
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Application Header */}
      <header className="flex items-center justify-between px-5 py-3 bg-slate-900 border-b border-slate-800 z-20 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setPanelOpen(prev => !prev)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title={panelOpen ? 'Collapse Request Parameters' : 'Expand Request Parameters'}
          >
            {panelOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
          </button>

          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-600 to-blue-500 flex items-center justify-center shadow-lg shadow-sky-950">
              <Printer className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white flex items-center space-x-2">
                <span>Print Template Renderer</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-sky-950/80 border border-sky-800 text-sky-400 rounded">
                  v1.0
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">
                URL-driven document rendering &amp; multi-page PDF preview
              </p>
            </div>
          </div>
        </div>

        {/* Current status badges */}
        <div className="flex items-center space-x-3 text-xs">
          {renderState.status === 'success' && (
            <div className="hidden sm:flex items-center space-x-3 text-slate-400 bg-slate-950/60 px-3 py-1 rounded-lg border border-slate-800">
              <span className="flex items-center space-x-1 font-mono text-[11px]">
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                <span>{renderState.pageCount} page(s)</span>
              </span>
              {renderDuration && (
                <span className="flex items-center space-x-1 font-mono text-[11px]">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{renderDuration}ms</span>
                </span>
              )}
              {renderState.fileSize && (
                <span className="font-mono text-[11px] text-slate-500">
                  {(renderState.fileSize / 1024).toFixed(1)} KB
                </span>
              )}
            </div>
          )}

          <div className="flex items-center space-x-1.5 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-md text-xs font-mono font-medium text-sky-300">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            <span className="uppercase">{params.type}</span>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 flex overflow-hidden p-3 gap-3">
        {/* Left Side: Parameters Panel */}
        {panelOpen && (
          <aside className="w-96 flex-shrink-0 h-full transition-all">
            <ParameterPanel
              params={params}
              onApplyParams={handleApplyParams}
              isLoading={renderState.status === 'loading'}
              onCopyShareableUrl={handleCopyShareableUrl}
              copied={copiedUrl}
            />
          </aside>
        )}

        {/* Right Side: PDF Previewer */}
        <section className="flex-1 h-full min-w-0">
          {renderState.status === 'loading' && (
            <div className="h-full bg-slate-900 border border-slate-800 rounded-xl flex flex-col items-center justify-center p-8 text-center">
              <div className="relative mb-6">
                <div className="w-16 h-16 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin" />
                <Sparkles className="w-6 h-6 text-sky-400 absolute inset-0 m-auto" />
              </div>
              <h3 className="text-base font-semibold text-slate-100 mb-2">
                {renderState.stage || 'Rendering Template...'}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mb-4">
                Parsing JSON data, applying template rules, and generating vector PDF pages.
              </p>
              {renderState.progress !== undefined && (
                <div className="w-64 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-sky-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${renderState.progress}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {renderState.status === 'error' && (
            <div className="h-full bg-slate-900 border border-slate-800 rounded-xl flex flex-col items-center justify-center p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-red-950/60 border border-red-800 flex items-center justify-center text-red-400 mb-4 shadow-lg shadow-red-950/50">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-100 mb-2">Template Rendering Failed</h3>
              <p className="text-xs text-red-300 bg-red-950/40 border border-red-900/60 p-3 rounded-lg max-w-md font-mono text-left mb-6 break-words">
                {renderState.error}
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => executeRender(params)}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow transition"
                >
                  Retry Render
                </button>
                <button
                  onClick={() => {
                    setParams(SAMPLE_PRESETS[0].params);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold border border-slate-700 transition"
                >
                  Load Working Sample
                </button>
              </div>
            </div>
          )}

          {renderState.status === 'success' && renderState.pdfBlob && (
            <PDFPreviewer
              pdfBlob={renderState.pdfBlob}
              onPageCountDetermined={count =>
                setRenderState(prev => ({ ...prev, pageCount: count }))
              }
              documentTitle={
                (params.config?.title as string) ||
                `${params.type}_document_${Date.now()}`
              }
            />
          )}

          {renderState.status === 'idle' && (
            <div className="h-full bg-slate-900 border border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-400 p-8">
              <FileText className="w-12 h-12 text-slate-600 mb-3" />
              <p className="text-sm font-medium">Ready to render</p>
              <p className="text-xs text-slate-500 mt-1">
                Enter your template URL and JSON parameters or select a preset to begin.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
