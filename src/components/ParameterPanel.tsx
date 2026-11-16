import React, { useState } from 'react';
import { RequestParams, TemplateType } from '../types';
import { SAMPLE_PRESETS } from '../samples/presets';
import {
  Settings,
  Code2,
  Table,
  Link,
  Copy,
  Check,
  Play,
  RotateCcw,
  Sparkles,
  FileCode,
  FileText,
  Image as ImageIcon,
  ExternalLink
} from 'lucide-react';

interface ParameterPanelProps {
  params: RequestParams;
  onApplyParams: (newParams: RequestParams) => void;
  isLoading: boolean;
  onCopyShareableUrl: () => void;
  copied: boolean;
}

export const ParameterPanel: React.FC<ParameterPanelProps> = ({
  params,
  onApplyParams,
  isLoading,
  onCopyShareableUrl,
  copied
}) => {
  const [currentType, setCurrentType] = useState<TemplateType>(params.type);
  const [url, setUrl] = useState<string>(params.url);
  const [inlineSource, setInlineSource] = useState<string>(params.inlineSource || '');
  const [dataJson, setDataJson] = useState<string>(JSON.stringify(params.data, null, 2));
  const [configJson, setConfigJson] = useState<string>(JSON.stringify(params.config, null, 2));
  const [activeTab, setActiveTab] = useState<'params' | 'inline' | 'presets'>('params');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Check if data is array/table
  let isTable = false;
  let rowCount = 0;
  try {
    const parsed = JSON.parse(dataJson);
    if (Array.isArray(parsed)) {
      isTable = true;
      rowCount = parsed.length;
    }
  } catch {
    // ignore while typing
  }

  const handleApply = () => {
    setJsonError(null);
    try {
      const parsedData = JSON.parse(dataJson);
      const parsedConfig = JSON.parse(configJson || '{}');

      onApplyParams({
        type: currentType,
        url: url.trim(),
        data: parsedData,
        config: parsedConfig,
        inlineSource: inlineSource.trim() ? inlineSource : undefined
      });
    } catch (err: any) {
      setJsonError(`JSON Syntax Error: ${err.message}`);
    }
  };

  const loadPreset = (presetId: string) => {
    const preset = SAMPLE_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    setCurrentType(preset.params.type);
    setUrl(preset.params.url);
    setInlineSource(preset.params.inlineSource || '');
    setDataJson(JSON.stringify(preset.params.data, null, 2));
    setConfigJson(JSON.stringify(preset.params.config, null, 2));

    onApplyParams({
      ...preset.params
    });
    setActiveTab('params');
  };

  const formatJson = (field: 'data' | 'config') => {
    try {
      if (field === 'data') {
        const parsed = JSON.parse(dataJson);
        setDataJson(JSON.stringify(parsed, null, 2));
      } else {
        const parsed = JSON.parse(configJson);
        setConfigJson(JSON.stringify(parsed, null, 2));
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/80 border-b border-slate-700/80">
        <div className="flex items-center space-x-2">
          <Settings className="w-4 h-4 text-sky-400" />
          <h2 className="text-sm font-semibold text-slate-100">Request Parameters</h2>
        </div>

        {/* Tab selection */}
        <div className="flex bg-slate-950/70 p-0.5 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('params')}
            className={`px-2.5 py-1 rounded transition font-medium ${
              activeTab === 'params' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Inputs
          </button>
          <button
            onClick={() => setActiveTab('inline')}
            className={`px-2.5 py-1 rounded transition font-medium ${
              activeTab === 'inline' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Template Code
          </button>
          <button
            onClick={() => setActiveTab('presets')}
            className={`px-2.5 py-1 rounded transition font-medium flex items-center space-x-1 ${
              activeTab === 'presets' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Presets</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {jsonError && (
          <div className="p-2.5 bg-red-950/70 border border-red-800/80 rounded-lg text-xs text-red-300">
            {jsonError}
          </div>
        )}

        {activeTab === 'presets' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400 mb-2">
              Select a pre-built print template to test instant multi-page rendering and table interpolation:
            </p>
            {SAMPLE_PRESETS.map(preset => (
              <div
                key={preset.id}
                onClick={() => loadPreset(preset.id)}
                className="cursor-pointer p-3.5 rounded-lg border border-slate-800 hover:border-sky-500/60 bg-slate-950/50 hover:bg-slate-800/40 transition group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-xs text-slate-200 group-hover:text-sky-400 transition">
                    {preset.name}
                  </span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-sky-400">
                    {preset.params.type}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {preset.description}
                </p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'inline' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300 flex items-center space-x-1.5">
                <FileCode className="w-3.5 h-3.5 text-sky-400" />
                <span>Direct Template Source ({currentType.toUpperCase()})</span>
              </label>
              <span className="text-[10px] text-slate-500">Overrides remote URL when provided</span>
            </div>
            <textarea
              value={inlineSource}
              onChange={e => setInlineSource(e.target.value)}
              placeholder={`Paste raw ${currentType} markup here (e.g. Typst syntax or SVG XML)...`}
              rows={16}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none leading-relaxed"
            />
          </div>
        )}

        {activeTab === 'params' && (
          <>
            {/* Template Type Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                Template Format (<code className="text-sky-400">type</code>)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['typst', 'docx', 'svg'] as TemplateType[]).map(type => {
                  const isSelected = currentType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setCurrentType(type)}
                      className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg border text-xs font-semibold capitalize transition ${
                        isSelected
                          ? 'bg-sky-600/20 border-sky-500 text-sky-300 ring-1 ring-sky-500/50 shadow'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {type === 'typst' && <FileCode className="w-3.5 h-3.5" />}
                      {type === 'docx' && <FileText className="w-3.5 h-3.5" />}
                      {type === 'svg' && <ImageIcon className="w-3.5 h-3.5" />}
                      <span>{type}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Source URL */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300 flex items-center space-x-1">
                  <Link className="w-3.5 h-3.5 text-sky-400" />
                  <span>Source URL (<code className="text-sky-400">url</code>)</span>
                </label>
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-sky-400 hover:underline flex items-center space-x-0.5"
                  >
                    <span>Open</span>
                    <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                  </a>
                )}
              </div>
              <input
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="Google Drive, GitHub raw, or direct download link"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <p className="text-[10px] text-slate-500">
                Supports Google Drive sharing links (auto-converts to direct download) &amp; GitHub links.
              </p>
            </div>

            {/* Data (JSON) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300 flex items-center space-x-1.5">
                  {isTable ? (
                    <Table className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Code2 className="w-3.5 h-3.5 text-sky-400" />
                  )}
                  <span>Data JSON (<code className="text-sky-400">data</code>)</span>
                </label>
                <div className="flex items-center space-x-2">
                  {isTable ? (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-300">
                      Table ({rowCount} rows)
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      Object
                    </span>
                  )}
                  <button
                    onClick={() => formatJson('data')}
                    className="text-[10px] text-slate-400 hover:text-slate-200 hover:underline"
                  >
                    Format
                  </button>
                </div>
              </div>
              <textarea
                value={dataJson}
                onChange={e => setDataJson(e.target.value)}
                rows={7}
                placeholder='[{"item": "Widget", "qty": 10}] or {"name": "John"}'
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none leading-relaxed"
              />
            </div>

            {/* Config (JSON) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300 flex items-center space-x-1">
                  <Settings className="w-3.5 h-3.5 text-sky-400" />
                  <span>Config JSON (<code className="text-sky-400">config</code>)</span>
                </label>
                <button
                  onClick={() => formatJson('config')}
                  className="text-[10px] text-slate-400 hover:text-slate-200 hover:underline"
                >
                  Format
                </button>
              </div>
              <textarea
                value={configJson}
                onChange={e => setConfigJson(e.target.value)}
                rows={4}
                placeholder='{"pageSize": "A4", "orientation": "portrait"}'
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none leading-relaxed"
              />
            </div>
          </>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 bg-slate-800/80 border-t border-slate-700/80 space-y-2">
        <button
          onClick={handleApply}
          disabled={isLoading}
          className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-medium text-xs rounded-lg transition shadow-lg shadow-sky-950"
        >
          {isLoading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Rendering Document...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Apply &amp; Render PDF</span>
            </>
          )}
        </button>

        <div className="flex space-x-2">
          <button
            onClick={onCopyShareableUrl}
            className="flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-3 bg-slate-950/80 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-[11px] text-slate-300 transition"
            title="Copy URL with all query parameters"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied URL!' : 'Shareable URL'}</span>
          </button>

          <button
            onClick={() => {
              loadPreset('typst-invoice');
            }}
            className="flex items-center justify-center px-3 py-1.5 bg-slate-950/80 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-[11px] text-slate-400 hover:text-slate-200 transition"
            title="Reset to default sample"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
