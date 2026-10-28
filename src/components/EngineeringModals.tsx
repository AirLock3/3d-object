import React, { useState } from 'react';
import { X, Download, Copy, Check, Layers, FileCode, Table } from 'lucide-react';
import {
  BUILDINGS_DATA,
  CROSS_SECTIONS_SPEC,
  PROJECT_METADATA,
  BuildingSpec,
} from '../utils/pzuData';
import { generateStandaloneIndexHtml } from '../utils/standaloneHtmlGenerator';

interface EngineeringModalsProps {
  activeModal: 'none' | 'sections' | 'standalone';
  onClose: () => void;
  onSelectBuildingFromTable: (b: BuildingSpec) => void;
}

export const EngineeringModals: React.FC<EngineeringModalsProps> = ({
  activeModal,
  onClose,
  onSelectBuildingFromTable,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'explication' | 'sections'>('explication');

  if (activeModal === 'none') return null;

  const standaloneHtml = activeModal === 'standalone' ? generateStandaloneIndexHtml() : '';

  const handleDownloadStandalone = () => {
    const htmlContent = generateStandaloneIndexHtml();
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyStandalone = () => {
    const htmlContent = generateStandaloneIndexHtml();
    navigator.clipboard?.writeText(htmlContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75"
      role="dialog"
      aria-modal="true"
      aria-label={
        activeModal === 'sections'
          ? 'Экспликация зданий и конструктивные разрезы ПЗУ'
          : 'Автономный файл index.html'
      }
    >
      <div className="w-full max-w-4xl max-h-[86vh] flex flex-col rounded-xl bg-[#111926] border border-slate-700/80 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0d131d]">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              {activeModal === 'sections'
                ? 'Ведомость экспликации (поз. 2.1–2.18) и конструктивные сечения ПЗУ'
                : 'Автономный монолитный файл index.html (Three.js CDN + OrbitControls)'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {PROJECT_METADATA.code} · {PROJECT_METADATA.sheet} · Кадастровый № {PROJECT_METADATA.cadastralMain}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {activeModal === 'sections' ? (
          <>
            {/* Sub-tabs */}
            <div className="flex items-center gap-2 px-6 py-3 bg-[#0f1622] border-b border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('explication')}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'explication'
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                Экспликация зданий и сооружений (2.1 – 2.18)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('sections')}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'sections'
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Конструкции дорожной одежды и водоотвода
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {activeTab === 'explication' ? (
                <div className="overflow-x-auto border border-slate-800 rounded-lg">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900/90 text-slate-300 border-b border-slate-800">
                        <th className="py-2.5 px-3 font-semibold whitespace-nowrap">№ по плану</th>
                        <th className="py-2.5 px-3 font-semibold">Наименование объекта</th>
                        <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Кол-во</th>
                        <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Отметка, м</th>
                        <th className="py-2.5 px-3 font-semibold">Габариты / Примечание</th>
                        <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">На 3D-плане</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {BUILDINGS_DATA.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-semibold text-amber-400 tabular-nums whitespace-nowrap">
                            {b.code}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-100">{b.name}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-300 tabular-nums">{b.count}</td>
                          <td className="py-2.5 px-3 font-mono text-sky-400 tabular-nums whitespace-nowrap">
                            {b.elevation.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">{b.dimensionsText}</td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => {
                                onSelectBuildingFromTable(b);
                                onClose();
                              }}
                              className="px-2.5 py-1 rounded bg-sky-600/20 border border-sky-500/40 text-sky-300 hover:bg-sky-600 hover:text-white font-medium transition-colors cursor-pointer"
                            >
                              Показать в 3D
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {CROSS_SECTIONS_SPEC.map((cs) => (
                    <div
                      key={cs.id}
                      className="p-4 rounded-lg bg-[#162030] border border-slate-800 flex flex-col justify-between"
                    >
                      <div>
                        <h3 className="text-sm font-bold text-white">{cs.title}</h3>
                        <p className="text-xs text-slate-400 mt-1 mb-4">{cs.subtitle}</p>
                        <div className="space-y-2">
                          {cs.layers.map((layer, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 rounded bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2.5">
                                <span
                                  className="w-3 h-3 rounded-sm shrink-0"
                                  style={{ backgroundColor: layer.color }}
                                />
                                <span className="text-xs text-slate-200 leading-snug">{layer.name}</span>
                              </div>
                              <span className="text-xs font-mono text-amber-400 whitespace-nowrap shrink-0 tabular-nums">
                                {layer.thickness}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
                        Расчёт дорожной одежды: IndorPavement v26.3.0 (ООО «ГеоСМ») по ГОСТ Р 71244–2024.
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-6 flex flex-col gap-4 overflow-y-auto">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-lg bg-[#162030] border border-slate-800">
              <div className="text-xs text-slate-300 space-y-1">
                <p className="font-semibold text-white">
                  Готовый самодостаточный файл <code className="text-amber-400">index.html</code> без внешних локальных зависимостей
                </p>
                <p className="text-slate-400">
                  Включает Three.js r170 и OrbitControls через CDN (unpkg.com), рельеф 585–596 м, корпуса 455м/401м/392м, дороги и интерактивные тултипы.
                </p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyStandalone}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Код скопирован' : 'Скопировать код'}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadStandalone}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-4 h-4" />
                  Скачать index.html
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-b-0 border-slate-800 rounded-t-lg text-[11px] font-mono text-slate-400">
                <FileCode className="w-3.5 h-3.5 text-sky-400" />
                <span>index.html (монолитный код для запуска двойным кликом)</span>
              </div>
              <pre className="p-4 rounded-b-lg bg-[#090d14] border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-[42vh] leading-relaxed select-all">
                {standaloneHtml}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
