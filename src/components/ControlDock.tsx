import React, { useState } from 'react';
import {
  Box,
  Compass,
  Map,
  Layers,
  Sun,
  Download,
  ChevronDown,
  ChevronUp,
  Table,
} from 'lucide-react';
import { BUILDINGS_DATA, BuildingSpec } from '../utils/pzuData';
import { CameraViewMode, VisualStyleMode } from './PzuCanvas3D';

interface ControlDockProps {
  cameraMode: CameraViewMode;
  onCameraModeChange: (mode: CameraViewMode) => void;
  visualStyle: VisualStyleMode;
  onToggleVisualStyle: () => void;
  showContours: boolean;
  onToggleContours: () => void;
  showDitches: boolean;
  onToggleDitches: () => void;
  showForbiddenZone: boolean;
  onToggleForbiddenZone: () => void;
  verticalExaggeration: number;
  onToggleExaggeration: () => void;
  selectedBuilding: BuildingSpec | null;
  onSelectBuilding: (b: BuildingSpec | null) => void;
  onOpenModal: (modal: 'sections' | 'standalone') => void;
}

export const ControlDock: React.FC<ControlDockProps> = ({
  cameraMode,
  onCameraModeChange,
  visualStyle,
  onToggleVisualStyle,
  showContours,
  onToggleContours,
  showDitches,
  onToggleDitches,
  showForbiddenZone,
  onToggleForbiddenZone,
  verticalExaggeration,
  onToggleExaggeration,
  selectedBuilding,
  onSelectBuilding,
  onOpenModal,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <nav
      aria-label="Панель управления 3D-макетом ПЗУ"
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-20 w-[min(1080px,95vw)] transition-transform duration-200 ${
        collapsed ? 'translate-y-[calc(100%+12px)]' : 'translate-y-0'
      }`}
    >
      {/* Collapse / Expand Handle */}
      <button
        type="button"
        onClick={() => setCollapsed((prev) => !prev)}
        className="absolute -top-8 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-t-lg bg-[#0f1724] border border-b-0 border-slate-700/80 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
      >
        {collapsed ? (
          <>
            <ChevronUp className="w-3.5 h-3.5 text-sky-400" />
            <span>Показать панель</span>
          </>
        ) : (
          <>
            <ChevronDown className="w-3.5 h-3.5 text-sky-400" />
            <span>Скрыть панель</span>
          </>
        )}
      </button>

      {/* Main Dock Container */}
      <div className="px-4 py-3 rounded-xl bg-[#0f1724] border border-slate-700/80 shadow-2xl flex flex-wrap items-center justify-between gap-3">
        {/* Group 1: Camera View Modes */}
        <div className="flex items-center gap-1.5" role="group" aria-label="Режимы камеры">
          <button
            type="button"
            onClick={() => onCameraModeChange('iso')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              cameraMode === 'iso'
                ? 'bg-sky-600 text-white border border-sky-400'
                : 'bg-slate-800/90 text-slate-200 border border-slate-700 hover:border-slate-500'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>Изометрия 3D</span>
          </button>

          <button
            type="button"
            onClick={() => onCameraModeChange('top')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              cameraMode === 'top'
                ? 'bg-sky-600 text-white border border-sky-400'
                : 'bg-slate-800/90 text-slate-200 border border-slate-700 hover:border-slate-500'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>Вид сверху (2D план)</span>
          </button>

          <button
            type="button"
            onClick={() => onCameraModeChange('tour')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              cameraMode === 'tour'
                ? 'bg-amber-600 text-white border border-amber-400'
                : 'bg-slate-800/90 text-slate-200 border border-slate-700 hover:border-slate-500'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Презентационный тур</span>
          </button>
        </div>

        {/* Group 2: Quick Explication Selector (2.1 .. 2.18) */}
        <div className="flex items-center gap-2">
          <label htmlFor="explication-select" className="text-xs font-medium text-slate-400 whitespace-nowrap">
            Объект ПЗУ:
          </label>
          <select
            id="explication-select"
            aria-label="Выбор здания или сооружения по экспликации"
            value={selectedBuilding?.id ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              if (!val) {
                onSelectBuilding(null);
              } else {
                const found = BUILDINGS_DATA.find((b) => b.id === val) ?? null;
                onSelectBuilding(found);
              }
            }}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-100 font-medium focus:outline-none focus:border-sky-400 cursor-pointer max-w-[230px]"
          >
            <option value="">— Все сооружения (25 поз.) —</option>
            {BUILDINGS_DATA.map((b) => (
              <option key={b.id} value={b.id}>
                {b.shortLabel} ({b.elevation.toFixed(1)} м)
              </option>
            ))}
          </select>
        </div>

        {/* Group 3: GIS Layers & Style Toggles */}
        <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Слои и стиль освещения">
          <button
            type="button"
            onClick={onToggleVisualStyle}
            className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold bg-slate-800/90 text-slate-200 border border-slate-700 hover:border-slate-500 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span>{visualStyle === 'tech_dark' ? 'Стиль: Tech ГИС' : 'Стиль: Clay Макет'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleContours}
            className={`px-2.5 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              showContours
                ? 'bg-slate-800 text-sky-300 border-sky-500/50'
                : 'bg-slate-900/60 text-slate-400 border-slate-800'
            }`}
          >
            Изолинии 585–596м
          </button>

          <button
            type="button"
            onClick={onToggleDitches}
            className={`px-2.5 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              showDitches
                ? 'bg-slate-800 text-sky-300 border-sky-500/50'
                : 'bg-slate-900/60 text-slate-400 border-slate-800'
            }`}
          >
            Канавы 1:20
          </button>

          <button
            type="button"
            onClick={onToggleForbiddenZone}
            className={`px-2.5 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              showForbiddenZone
                ? 'bg-slate-800 text-rose-300 border-rose-500/50'
                : 'bg-slate-900/60 text-slate-400 border-slate-800'
            }`}
          >
            Запретная зона
          </button>

          <button
            type="button"
            onClick={onToggleExaggeration}
            title="Масштаб вертикального перепада высот рельефа по оси Y"
            className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs font-mono font-semibold bg-slate-800/90 text-amber-300 border border-slate-700 hover:border-amber-400 transition-colors cursor-pointer whitespace-nowrap shrink-0 tabular-nums"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Рельеф Y: {verticalExaggeration.toFixed(1)}×</span>
          </button>
        </div>

        {/* Group 4: Documentation & Standalone HTML Export */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onOpenModal('sections')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Table className="w-3.5 h-3.5 text-sky-400" />
            <span>Экспликация и узлы</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenModal('standalone')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Автономный index.html</span>
          </button>
        </div>
      </div>
    </nav>
  );
};
