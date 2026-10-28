import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Ruler, Mountain, Building2 } from 'lucide-react';
import {
  BUILDINGS_DATA,
  PROJECT_METADATA,
  BuildingSpec,
} from './utils/pzuData';
import { PzuCanvas3D, CameraViewMode, VisualStyleMode } from './components/PzuCanvas3D';
import { ControlDock } from './components/ControlDock';
import { EngineeringModals } from './components/EngineeringModals';

export default function App() {
  const [cameraMode, setCameraMode] = useState<CameraViewMode>('iso');
  const [visualStyle, setVisualStyle] = useState<VisualStyleMode>('tech_dark');
  const [showContours, setShowContours] = useState<boolean>(true);
  const [showDitches, setShowDitches] = useState<boolean>(true);
  const [showForbiddenZone, setShowForbiddenZone] = useState<boolean>(true);
  const [verticalExaggeration, setVerticalExaggeration] = useState<number>(1.6);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingSpec | null>(
    BUILDINGS_DATA[0] // Default highlight on 2.16.1 (Корпус 455м/т) so the user immediately sees the interactive tooltip
  );
  const [activeModal, setActiveModal] = useState<'none' | 'sections' | 'standalone'>('none');

  const handleToggleVisualStyle = () => {
    setVisualStyle((prev) => (prev === 'tech_dark' ? 'arch_clay' : 'tech_dark'));
  };

  const handleToggleExaggeration = () => {
    setVerticalExaggeration((prev) => {
      if (prev < 1.5) return 1.6;
      if (prev < 2.2) return 2.6;
      return 1.0;
    });
  };

  const handleStepBuilding = (delta: number) => {
    if (!selectedBuilding) {
      setSelectedBuilding(BUILDINGS_DATA[0]);
      return;
    }
    const idx = BUILDINGS_DATA.findIndex((b) => b.id === selectedBuilding.id);
    const nextIdx = (idx + delta + BUILDINGS_DATA.length) % BUILDINGS_DATA.length;
    setSelectedBuilding(BUILDINGS_DATA[nextIdx]);
  };

  return (
    <main
      className="relative w-screen h-screen overflow-hidden select-none font-['Plus_Jakarta_Sans',sans-serif]"
      data-camera-mode={cameraMode}
      data-visual-style={visualStyle}
    >
      {/* 100% Full-Viewport 3D WebGL Canvas */}
      <PzuCanvas3D
        cameraMode={cameraMode}
        visualStyle={visualStyle}
        showContours={showContours}
        showDitches={showDitches}
        showForbiddenZone={showForbiddenZone}
        verticalExaggeration={verticalExaggeration}
        selectedBuilding={selectedBuilding}
        onSelectBuilding={setSelectedBuilding}
        onCameraModeChange={setCameraMode}
      />

      {/* Top-Left Minimal Project Title & Blueprint Legend Badge */}
      <header className="fixed top-4 left-4 z-10 max-w-md rounded-xl bg-[#0f1724] border border-slate-700/80 px-4 py-3 shadow-xl pointer-events-auto">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-sm font-bold text-white tracking-tight">
            {PROJECT_METADATA.code} · Разбивочный план ПЗУ (3D)
          </h1>
          <span className="text-[11px] font-mono text-amber-400 tabular-nums shrink-0">
            Уч. {PROJECT_METADATA.cadastralMain}
          </span>
        </div>

        <p className="text-xs text-slate-300 mt-1 leading-snug">
          Пункт производства ЭВВ «Сибирит®» (Этап I) и Склад ВМ 49,9 т (Этап II) · Забайкальский край, Сретенский р-н
        </p>

        {/* Unboxed Metadata Legend with clean typographic separators */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5 pt-2 border-t border-slate-800 text-[11px] text-slate-300">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-1 rounded-xs bg-rose-500 inline-block" />
            Запретная зона
          </span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-1 rounded-xs bg-amber-600 inline-block" />
            Дороги (тип I)
          </span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-1 rounded-xs bg-slate-400 inline-block" />
            Площадки ПАГ-14 (тип III)
          </span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-1 rounded-xs bg-sky-400 inline-block" />
            Канавы 1:20
          </span>
        </div>
      </header>

      {/* Interactive HTML/CSS Building Inspection Tooltip Card (Top-Right) */}
      {selectedBuilding && (
        <aside
          aria-label="Информационная карточка выбранного сооружения"
          data-testid="building-tooltip-card"
          className="fixed top-4 right-4 z-10 w-96 rounded-xl bg-[#0f1724] border border-sky-500/50 p-4 shadow-2xl pointer-events-auto"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="text-xs font-mono font-semibold text-amber-400 tabular-nums">
              <span>Поз. по генплану {selectedBuilding.code}</span>
              {selectedBuilding.blueprintTag && (
                <>
                  <span className="mx-1.5 text-slate-500">·</span>
                  <span className="text-sky-300">{selectedBuilding.blueprintTag}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => handleStepBuilding(-1)}
                aria-label="Предыдущее сооружение"
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleStepBuilding(1)}
                aria-label="Следующее сооружение"
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedBuilding(null)}
                aria-label="Скрыть подсказку здания"
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <h2 className="text-sm font-bold text-white mt-1.5 leading-snug">
            {selectedBuilding.name}
          </h2>

          <div className="mt-3 pt-2.5 border-t border-slate-800 space-y-1.5 text-xs">
            <div className="flex items-center gap-2 text-sky-300 font-mono tabular-nums">
              <Ruler className="w-3.5 h-3.5 shrink-0 text-sky-400" />
              <span>{selectedBuilding.dimensionsText}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300 font-mono tabular-nums">
              <Mountain className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              <span>
                Отметка планировки: {selectedBuilding.elevation.toFixed(2)} м · Кол-во: {selectedBuilding.count} шт.
              </span>
            </div>
          </div>

          <p className="mt-2.5 pt-2.5 border-t border-slate-800 text-xs text-slate-300 leading-relaxed">
            {selectedBuilding.purpose}
          </p>

          {/* Quick Jump Buttons for the Primary Blueprint Warehouse Groups */}
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400 inline-flex items-center gap-1 whitespace-nowrap shrink-0">
              <Building2 className="w-3 h-3" />
              Переход:
            </span>
            <div className="flex items-center gap-1.5">
              {[
                { label: '455м/т', id: 'b-2.16.1' },
                { label: '401м/т', id: 'b-2.16.4' },
                { label: '392м/т', id: 'b-2.16.3' },
                { label: 'АБК 2.2', id: 'b-2.2' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    const target = BUILDINGS_DATA.find((b) => b.id === item.id);
                    if (target) setSelectedBuilding(target);
                  }}
                  className={`px-2 py-1 rounded text-[11px] font-mono font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    selectedBuilding.id === item.id
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </aside>
      )}

      {/* Unified Collapsible Bottom Control Dock */}
      <ControlDock
        cameraMode={cameraMode}
        onCameraModeChange={setCameraMode}
        visualStyle={visualStyle}
        onToggleVisualStyle={handleToggleVisualStyle}
        showContours={showContours}
        onToggleContours={() => setShowContours((v) => !v)}
        showDitches={showDitches}
        onToggleDitches={() => setShowDitches((v) => !v)}
        showForbiddenZone={showForbiddenZone}
        onToggleForbiddenZone={() => setShowForbiddenZone((v) => !v)}
        verticalExaggeration={verticalExaggeration}
        onToggleExaggeration={handleToggleExaggeration}
        selectedBuilding={selectedBuilding}
        onSelectBuilding={setSelectedBuilding}
        onOpenModal={setActiveModal}
      />

      {/* Modals for Explication Table, Road/Ditch Cross-Sections, and Standalone HTML Export */}
      <EngineeringModals
        activeModal={activeModal}
        onClose={() => setActiveModal('none')}
        onSelectBuildingFromTable={(b) => setSelectedBuilding(b)}
      />
    </main>
  );
}
