export interface BuildingSpec {
  id: string;
  code: string; // № по генплану (2.1 .. 2.18)
  name: string;
  shortLabel: string;
  category: 'warehouse_long' | 'warehouse_berm' | 'production' | 'admin' | 'utility' | 'safety';
  count: number;
  /** Position in scene world coordinates (meters relative to site center) */
  x: number;
  z: number;
  /** Dimensions in scene meters (visual scale matched to masterplan) */
  width: number;
  length: number;
  height: number;
  /** Rotation around Y axis in radians (site axis is ~ -0.46 rad / -26.5 deg) */
  rotationY: number;
  /** Design elevation in meters above sea level (Baltic system, 585..596 m) */
  elevation: number;
  /** Highlight label from blueprint (e.g. "455 м / 455 т", "401 м / 401 т", "392 м / 392 т") */
  blueprintTag?: string;
  /** Detailed dimensions & engineering notes for tooltip */
  dimensionsText: string;
  purpose: string;
  roofType: 'gabled' | 'flat' | 'arched' | 'tank' | 'bermed' | 'open_pad';
  colorHex: number;
  accentHex: number;
  hasBerm?: boolean;
}

export interface RoadPathSpec {
  id: string;
  name: string;
  type: 'road_type_1' | 'ditch_type_3';
  width: number;
  closed?: boolean;
  points: Array<[number, number]>; // [x, z]
}

export interface PlatformSpec {
  id: string;
  name: string;
  x: number;
  z: number;
  width: number;
  length: number;
  rotationY: number;
  elevation: number;
}

export interface BoundaryVertex {
  x: number;
  z: number;
  segmentLabel?: string;
}

/**
 * Primary site orientation angle on the PDF blueprint (NW-SE axis, approx -26.5 degrees)
 */
export const SITE_AXIS_ANGLE = -0.462; // radians (~ -26.5 deg)

/**
 * Reference metadata from Title Block (Штамп чертежа НСЗ/02/08-25ПД-ПЗУ, Лист 2)
 */
export const PROJECT_METADATA = {
  code: 'НСЗ/02/08-25ПД-ПЗУ',
  sheet: 'Лист 2 — Схема планировочной организации земельного участка. Разбивочный план',
  stage1: 'Этап I: «Пункт производства невзрывчатых компонентов эмульсионных ВВ марки «Сибирит®»',
  stage2: 'Этап II: «Склад взрывчатых материалов вместимостью 49,9 т»',
  location: 'РФ, Забайкальский край, МР «Сретенский район»',
  cadastralMain: '75:18:570101:208',
  cadastralAdjacent: ['75:18:570101:56', '75:18:570101:56/2'],
  developer: 'ООО «ТЭК Инжиниринг»',
  pavementCalc: 'ГОСТ Р 71244–2024 (IndorPavement v26.3.0, ООО «ГеоСМ»)',
  geodeticOrigin: { x: 677397.03, y: 4228744.91 },
  elevationRange: { min: 585.0, max: 596.2 },
};

/**
 * Calculates natural terrain elevation (in meters, 585.0 .. 596.5 m) at world (x, z).
 * On the blueprint, contours rise from North-East (top-right, 585m) to South-West (bottom-left, 596m).
 */
export function getElevationAt(x: number, z: number): number {
  // Gradient vector pointing from NE (+x, -z) toward SW (-x, +z)
  const swProjection = (-x * 0.78 + z * 0.62) / 215; // roughly -1 to +1 across site
  const baseElevation = 591.2 + swProjection * 5.2;
  // Subtle natural saddle / terrace modulation matching contour curvature on blueprint
  const undulation =
    Math.sin(x * 0.018 + z * 0.012) * 0.38 +
    Math.cos(x * 0.011 - z * 0.02) * 0.24;
  return Number(Math.max(584.5, Math.min(596.8, baseElevation + undulation)).toFixed(2));
}

/**
 * Converts a real elevation (585..596.5 m) to 3D scene Y coordinate (meters),
 * scaled by verticalExaggeration so the terrace slope is clearly readable in 3D.
 */
export function getSceneY(x: number, z: number, verticalExaggeration = 1.65): number {
  const elev = getElevationAt(x, z);
  return (elev - 585.0) * verticalExaggeration;
}

/**
 * Outer Forbidden / Security Zone Boundary (Запретная охранная зона)
 * with segment dimensions from the blueprint (140.75, 60.10, 73.50, 86.00, 149.25, 92.25, 56.35, 158.20, 130.05)
 */
export const BOUNDARY_POLYGON: BoundaryVertex[] = [
  { x: -162, z: -72, segmentLabel: '140.75 м' },
  { x: -42, z: -136, segmentLabel: '60.10 м' },
  { x: 14, z: -166, segmentLabel: '73.50 м' },
  { x: 48, z: -98, segmentLabel: '86.00 м' },
  { x: 92, z: -18, segmentLabel: '149.25 м' },
  { x: 158, z: 96, segmentLabel: '92.25 м' },
  { x: 74, z: 144, segmentLabel: '56.35 м' },
  { x: 30, z: 168, segmentLabel: '158.20 м' },
  { x: -58, z: 42, segmentLabel: '130.05 м' },
  { x: -116, z: 6, segmentLabel: '98.40 м' },
];

/**
 * Complete Explication of Buildings & Facilities (Поз. 2.1 – 2.18 по генплану)
 * Includes the 6 elongated warehouse sections (2.16.1–2.16.6) with 455м/455т, 401м/401т, 392м/392т markings.
 */
export const BUILDINGS_DATA: BuildingSpec[] = [
  // === ГРУППА 1 ДЛИННЫХ СКЛАДСКИХ КОРПУСОВ (ЦЕНТРАЛЬНОЕ КОЛЬЦО: 455 м / 455 т) ===
  {
    id: 'b-2.16.1',
    code: '2.16.1',
    name: 'Корпус склада аммиачной селитры №1 (секция 455)',
    shortLabel: '2.16.1 Корпус 455м/т',
    category: 'warehouse_long',
    count: 1,
    x: 2,
    z: -4,
    width: 8.5,
    length: 54.0,
    height: 7.2,
    rotationY: SITE_AXIS_ANGLE,
    elevation: 591.8,
    blueprintTag: '455 м (455 т)',
    dimensionsText: 'Маркировка плана: 455 м / 455 т · Секция 52.15 × 7.00 × 7.20 м',
    purpose: 'Хранение аммиачной селитры в МКР (биг-бэгах) для производства эмульсионных ВВ «Сибирит». Оснащён сквозным проездом и торцевыми рампами.',
    roofType: 'gabled',
    colorHex: 0x334155,
    accentHex: 0x38bdf8,
  },
  {
    id: 'b-2.16.2',
    code: '2.16.2',
    name: 'Корпус склада аммиачной селитры №2 (секция 455)',
    shortLabel: '2.16.2 Корпус 455м/т',
    category: 'warehouse_long',
    count: 1,
    x: 15,
    z: -10.5,
    width: 8.5,
    length: 54.0,
    height: 7.2,
    rotationY: SITE_AXIS_ANGLE,
    elevation: 591.4,
    blueprintTag: '455 м (455 т)',
    dimensionsText: 'Маркировка плана: 455 м / 455 т · Секция 52.15 × 7.00 × 7.20 м',
    purpose: 'Второй параллельный корпус северной складской группы (расстояние между корпусами 6.00 м). Кольцевой объезд автотранспорта по периметру.',
    roofType: 'gabled',
    colorHex: 0x334155,
    accentHex: 0x38bdf8,
  },

  // === ГРУППА 2 ДЛИННЫХ СКЛАДСКИХ КОРПУСОВ (ЮЖНОЕ КОЛЬЦО: 392 м, 401 м, 401 м, 392 м) ===
  {
    id: 'b-2.16.3',
    code: '2.16.3',
    name: 'Корпус склада аммиачной селитры №3 (секция 392)',
    shortLabel: '2.16.3 Корпус 392м/т',
    category: 'warehouse_long',
    count: 1,
    x: 34,
    z: 88,
    width: 7.5,
    length: 46.5,
    height: 6.8,
    rotationY: SITE_AXIS_ANGLE,
    elevation: 593.0,
    blueprintTag: '392 м (392 т)',
    dimensionsText: 'Маркировка плана: 392 м / 392 т · Секция 45.15 × 7.00 × 6.80 м',
    purpose: 'Западный крайний корпус южного складского блока на площадке типа III (плиты дорожные ПАГ-14).',
    roofType: 'gabled',
    colorHex: 0x2d3748,
    accentHex: 0xf59e0b,
  },
  {
    id: 'b-2.16.4',
    code: '2.16.4',
    name: 'Корпус склада аммиачной селитры №4 (секция 401)',
    shortLabel: '2.16.4 Корпус 401м/т',
    category: 'warehouse_long',
    count: 1,
    x: 45,
    z: 82.5,
    width: 7.5,
    length: 48.0,
    height: 6.8,
    rotationY: SITE_AXIS_ANGLE,
    elevation: 593.0,
    blueprintTag: '401 м (401 т)',
    dimensionsText: 'Маркировка плана: 401 м / 401 т · Секция 46.00 × 7.00 × 6.80 м',
    purpose: 'Внутренний корпус южной группы складов с технологическим проездом 5.00 м для вилочных погрузчиков.',
    roofType: 'gabled',
    colorHex: 0x334155,
    accentHex: 0xf59e0b,
  },
  {
    id: 'b-2.16.5',
    code: '2.16.5',
    name: 'Корпус склада аммиачной селитры №5 (секция 401)',
    shortLabel: '2.16.5 Корпус 401м/т',
    category: 'warehouse_long',
    count: 1,
    x: 56,
    z: 77,
    width: 7.5,
    length: 48.0,
    height: 6.8,
    rotationY: SITE_AXIS_ANGLE,
    elevation: 593.0,
    blueprintTag: '401 м (401 т)',
    dimensionsText: 'Маркировка плана: 401 м / 401 т · Секция 46.00 × 7.00 × 6.80 м',
    purpose: 'Третий параллельный корпус южной группы складов селитры (вместимость секции 401 т).',
    roofType: 'gabled',
    colorHex: 0x334155,
    accentHex: 0xf59e0b,
  },
  {
    id: 'b-2.16.6',
    code: '2.16.6',
    name: 'Корпус склада аммиачной селитры №6 (секция 392)',
    shortLabel: '2.16.6 Корпус 392м/т',
    category: 'warehouse_long',
    count: 1,
    x: 67,
    z: 71.5,
    width: 7.5,
    length: 46.5,
    height: 6.8,
    rotationY: SITE_AXIS_ANGLE,
    elevation: 593.0,
    blueprintTag: '392 м (392 т)',
    dimensionsText: 'Маркировка плана: 392 м / 392 т · Секция 45.15 × 7.00 × 6.80 м',
    purpose: 'Восточный крайний корпус южной группы складов с выездом на кольцевой проезд типа I.',
    roofType: 'gabled',
    colorHex: 0x2d3748,
    accentHex: 0xf59e0b,
  },

  // === СКЛАДЫ ВЗРЫВЧАТЫХ МАТЕРИАЛОВ В ОБВАЛОВКЕ (2.15.1 – 2.15.3) ===
  {
    id: 'b-2.15.1',
    code: '2.15.1',
    name: 'Склад №1 (хранилище ВМ с защитной обваловкой)',
    shortLabel: '2.15.1 Склад №1',
    category: 'warehouse_berm',
    count: 1,
    x: -64,
    z: -38,
    width: 12.0,
    length: 15.0,
    height: 5.4,
    rotationY: SITE_AXIS_ANGLE + Math.PI / 2,
    elevation: 595.0,
    blueprintTag: 'Склад №1',
    dimensionsText: '15.00 × 12.00 × 5.40 м (в обваловке 32 × 28 м)',
    purpose: 'Постоянный расходный склад взрывчатых материалов (Этап II, общая вместимость комплекса 49,9 т). Окружён земляным защитным валом с откосами 1:1.5.',
    roofType: 'bermed',
    colorHex: 0x475569,
    accentHex: 0x22d3ee,
    hasBerm: true,
  },
  {
    id: 'b-2.15.2',
    code: '2.15.2',
    name: 'Склад №2 (хранилище ВМ с защитной обваловкой)',
    shortLabel: '2.15.2 Склад №2',
    category: 'warehouse_berm',
    count: 1,
    x: -44,
    z: 6,
    width: 14.4,
    length: 15.0,
    height: 5.4,
    rotationY: SITE_AXIS_ANGLE,
    elevation: 594.0,
    blueprintTag: 'Склад №2',
    dimensionsText: '15.00 × 14.40 × 5.40 м (в обваловке 34 × 30 м)',
    purpose: 'Хранилище взрывчатых материалов №2 с тупиковым подъездом и разворотной площадкой у рампы.',
    roofType: 'bermed',
    colorHex: 0x475569,
    accentHex: 0x22d3ee,
    hasBerm: true,
  },
  {
    id: 'b-2.15.3',
    code: '2.15.3',
    name: 'Склад №3 (хранилище ВМ с защитной обваловкой)',
    shortLabel: '2.15.3 Склад №3',
    category: 'warehouse_berm',
    count: 1,
    x: -22,
    z: 48,
    width: 12.2,
    length: 17.7,
    height: 5.4,
    rotationY: SITE_AXIS_ANGLE,
    elevation: 593.5,
    blueprintTag: 'Склад №3',
    dimensionsText: '17.70 × 12.20 × 5.40 м (в обваловке 36 × 28 м)',
    purpose: 'Южное хранилище ВМ №3 с защитным земляным валом и молниезащитой по контуру.',
    roofType: 'bermed',
    colorHex: 0x475569,
    accentHex: 0x22d3ee,
    hasBerm: true,
  },

  // === ПРОИЗВОДСТВЕННАЯ И АДМИНИСТРАТИВНАЯ ЗОНА СПРАВА (2.1, 2.2, 2.8, 2.9, 2.10, 2.17, 2.18) ===
  {
    id: 'b-2.1',
    code: '2.1',
    name: 'МПГУ (Модульный пункт приготовления эмульсии «Сибирит®»)',
    shortLabel: '2.1 МПГУ',
    category: 'production',
    count: 1,
    x: 84,
    z: 22,
    width: 12.2,
    length: 16.0,
    height: 8.6,
    rotationY: SITE_AXIS_ANGLE,
    elevation: 590.0,
    blueprintTag: '2.1 МПГУ',
    dimensionsText: '16.00 × 12.20 × 8.60 м · Отм. 590.00 м',
    purpose: 'Главный производственный корпус Этапа I: приготовление невзрывчатых компонентов эмульсионных ВВ марки «Сибирит®» с узлом загрузки СЗМ.',
    roofType: 'gabled',
    colorHex: 0x1e293b,
    accentHex: 0xf97316,
  },
  {
    id: 'b-2.2',
    code: '2.2',
    name: 'АБК (Административно-бытовой корпус)',
    shortLabel: '2.2 АБК',
    category: 'admin',
    count: 1,
    x: 78,
    z: 4,
    width: 12.2,
    length: 20.0,
    height: 6.4,
    rotationY: SITE_AXIS_ANGLE,
    elevation: 590.0,
    blueprintTag: '2.2 АБК',
    dimensionsText: '20.00 × 12.20 × 6.40 м · Отм. 590.00 м',
    purpose: 'Административно-бытовой корпус для инженерно-технического персонала, диспетчерской, лаборатории контроля качества и бытовых помещений.',
    roofType: 'flat',
    colorHex: 0x3b495e,
    accentHex: 0x38bdf8,
  },
  {
    id: 'b-2.8',
    code: '2.8',
    name: 'Насосная станция противопожарного и технологического водоснабжения',
    shortLabel: '2.8 Насосная',
    category: 'utility',
    count: 1,
    x: 96,
    z: 36,
    width: 6.0,
    length: 9.0,
    height: 4.2,
    rotationY: SITE_AXIS_ANGLE,
    elevation: 590.4,
    blueprintTag: '2.8 Насосная',
    dimensionsText: '9.00 × 6.00 × 4.20 м · Отм. 590.40 м',
    purpose: 'Насосная станция подачи воды на технологические нужды ХВО/МПГУ и систему наружного пожаротушения.',
    roofType: 'flat',
    colorHex: 0x334155,
    accentHex: 0x60a5fa,
  },
  {
    id: 'b-2.9',
    code: '2.9',
    name: 'Резервуары запаса воды (2 шт.)',
    shortLabel: '2.9 Резервуары (×2)',
    category: 'utility',
    count: 2,
    x: 102,
    z: 48,
    width: 9.5,
    length: 14.0,
    height: 5.5,
    rotationY: SITE_AXIS_ANGLE,
    elevation: 590.5,
    blueprintTag: '2.9 РЗВ ×2',
    dimensionsText: '2 резервуара · Площадка 14.00 × 9.50 × 5.50 м',
    purpose: 'Два цилиндрических резервуара противопожарного и производственного запаса воды.',
    roofType: 'tank',
    colorHex: 0x475569,
    accentHex: 0x38bdf8,
  },
  {
    id: 'b-2.10',
    code: '2.10',
    name: 'ХВО (Блок химводоочистки)',
    shortLabel: '2.10 ХВО',
    category: 'production',
    count: 1,
    x: 88,
    z: 32,
    width: 4.9,
    length: 12.2,
    height: 4.5,
    rotationY: SITE_AXIS_ANGLE,
    elevation: 590.0,
    blueprintTag: '2.10 ХВО',
    dimensionsText: '12.20 × 4.90 × 4.50 м · Отм. 590.00 м',
    purpose: 'Модульная установка химической водоочистки и подготовки технологической воды для линии эмульсии.',
    roofType: 'flat',
    colorHex: 0x334155,
    accentHex: 0x2dd4bf,
  },
  {
    id: 'b-2.17',
    code: '2.17',
    name: 'МЗКТ-10-4 (Модуль загрузки и стоянки СЗМ)',
    shortLabel: '2.17 МЗКТ-10-4',
    category: 'production',
    count: 1,
    x: 74,
    z: 27,
    width: 7.35,
    length: 12.2,
    height: 5.8,
    rotationY: SITE_AXIS_ANGLE,
    elevation: 590.0,
    blueprintTag: '2.17 МЗКТ',
    dimensionsText: '12.20 × 7.35 × 5.80 м · Отм. 590.00 м',
    purpose: 'Специализированный технологический модуль МЗКТ-10-4 в составе производственного комплекса.',
    roofType: 'gabled',
    colorHex: 0x293548,
    accentHex: 0xf59e0b,
  },
  {
    id: 'b-2.18',
    code: '2.18',
    name: 'Площадка хранения сырьевых компонентов',
    shortLabel: '2.18 Площадка сырья',
    category: 'production',
    count: 1,
    x: 64,
    z: 10,
    width: 20.0,
    length: 53.65,
    height: 3.2,
    rotationY: SITE_AXIS_ANGLE,
    elevation: 590.2,
    blueprintTag: '2.18 (53.65×20м)',
    dimensionsText: '53.65 × 20.00 м · Покрытие из плит ПАГ-14',
    purpose: 'Твёрдая технологическая площадка хранения контейнеров и тары с сырьевыми компонентами с навесом и штабелями.',
    roofType: 'open_pad',
    colorHex: 0x475569,
    accentHex: 0xfacc15,
  },

  // === ВЕРХНЯЯ И СЕВЕРО-ЗАПАДНАЯ ЗОНА (2.3, 2.4, 2.5, 2.6, 2.7, 2.11, 2.12, 2.13, 2.14) ===
  {
    id: 'b-2.3',
    code: '2.3',
    name: 'Полигон испытаний ВМ',
    shortLabel: '2.3 Полигон',
    category: 'safety',
    count: 1,
    x: -118,
    z: -62,
    width: 18.0,
    length: 18.0,
    height: 3.0,
    rotationY: SITE_AXIS_ANGLE,
    elevation: 595.0,
    blueprintTag: '2.3 Полигон',
    dimensionsText: 'Диаметр 18.0 м · Внутри западного разворотного кольца',
    purpose: 'Специализированный полигон для контрольных испытаний качества взрывчатых материалов с периметральным валом безопасности.',
    roofType: 'bermed',
    colorHex: 0x57534e,
    accentHex: 0xef4444,
    hasBerm: true,
  },
  {
    id: 'b-2.4',
    code: '2.4',
    name: 'Место для утилизации тары',
    shortLabel: '2.4 Утилизация тары',
    category: 'utility',
    count: 1,
    x: -70,
    z: -92,
    width: 14.0,
    length: 18.0,
    height: 2.8,
    rotationY: SITE_AXIS_ANGLE,
    elevation: 593.5,
    blueprintTag: '2.4 Утилизация',
    dimensionsText: '18.00 × 14.00 м · Отм. 593.50 м',
    purpose: 'Изолированная площадка с защитным ограждением для безопасного сбора и уничтожения освободившейся тары из-под ВМ.',
    roofType: 'open_pad',
    colorHex: 0x52525b,
    accentHex: 0xf97316,
  },
  {
    id: 'b-2.5',
    code: '2.5',
    name: 'Укрытие взрывника',
    shortLabel: '2.5 Укрытие',
    category: 'safety',
    count: 1,
    x: -14,
    z: -42,
    width: 5.0,
    length: 6.5,
    height: 3.4,
    rotationY: SITE_AXIS_ANGLE,
    elevation: 591.5,
    blueprintTag: '2.5 Укрытие',
    dimensionsText: '6.50 × 5.00 × 3.40 м · Бронированный блок-модуль',
    purpose: 'Защитное инженерное укрытие персонала (взрывника) при проведении контрольных работ на полигоне.',
    roofType: 'arched',
    colorHex: 0x3f3f46,
    accentHex: 0xef4444,
  },
  {
    id: 'b-2.6',
    code: '2.6',
    name: 'Противопожарный щит и пост ПБ',
    shortLabel: '2.6 Пож. щит',
    category: 'safety',
    count: 1,
    x: -20,
    z: -38,
    width: 3.0,
    length: 4.0,
    height: 2.8,
    rotationY: SITE_AXIS_ANGLE,
    elevation: 591.5,
    blueprintTag: '2.6 ПЩ',
    dimensionsText: '4.00 × 3.00 × 2.80 м · Комплектный пожарный пост',
    purpose: 'Пожарный пост с запасом песка, первичными средствами пожаротушения и гидрантом у центрального узла.',
    roofType: 'flat',
    colorHex: 0x991b1b,
    accentHex: 0xfef08a,
  },
  {
    id: 'b-2.7',
    code: '2.7',
    name: 'Блок-бокс над артскважиной',
    shortLabel: '2.7 Артскважина',
    category: 'utility',
    count: 1,
    x: 6,
    z: -148,
    width: 6.0,
    length: 6.0,
    height: 3.8,
    rotationY: SITE_AXIS_ANGLE,
    elevation: 587.2,
    blueprintTag: '2.7 Скважина',
    dimensionsText: 'Павильон 6.0 × 6.0 м на площадке 10.0 × 10.0 м · Отм. 587.20 м',
    purpose: 'Утеплённый блок-бокс водозаборной артезианской скважины в северной нижней точке рельефа площадки.',
    roofType: 'gabled',
    colorHex: 0x1e3a8a,
    accentHex: 0x38bdf8,
  },
  {
    id: 'b-2.11',
    code: '2.11',
    name: 'БКТП (Блочная комплектная трансформаторная подстанция)',
    shortLabel: '2.11 БКТП',
    category: 'utility',
    count: 1,
    x: 42,
    z: -86,
    width: 5.5,
    length: 9.0,
    height: 4.2,
    rotationY: SITE_AXIS_ANGLE,
    elevation: 588.0,
    blueprintTag: '2.11 БКТП',
    dimensionsText: '9.00 × 5.50 × 4.20 м · Отм. 588.00 м',
    purpose: 'Трансформаторная подстанция электроснабжения площадки с кабельными эстакадами и молниеприёмниками.',
    roofType: 'flat',
    colorHex: 0x334155,
    accentHex: 0xfacc15,
  },
  {
    id: 'b-2.12',
    code: '2.12',
    name: 'ДЭС (Дизельная электростанция резервного питания)',
    shortLabel: '2.12 ДЭС',
    category: 'utility',
    count: 1,
    x: 48,
    z: -74,
    width: 5.5,
    length: 10.0,
    height: 4.2,
    rotationY: SITE_AXIS_ANGLE,
    elevation: 588.0,
    blueprintTag: '2.12 ДЭС',
    dimensionsText: '10.00 × 5.50 × 4.20 м · Отм. 588.00 м',
    purpose: 'Автономная дизель-генераторная установка I категории надёжности электроснабжения систем безопасности и ПБ.',
    roofType: 'flat',
    colorHex: 0x334155,
    accentHex: 0xfacc15,
  },
  {
    id: 'b-2.13',
    code: '2.13',
    name: 'КПП (Контрольно-пропускной пункт)',
    shortLabel: '2.13 КПП',
    category: 'admin',
    count: 1,
    x: -10,
    z: -56,
    width: 6.5,
    length: 9.5,
    height: 4.0,
    rotationY: SITE_AXIS_ANGLE,
    elevation: 591.7,
    blueprintTag: '2.13 КПП',
    dimensionsText: '9.50 × 6.50 × 4.00 м · Досмотровая площадка и шлагбаум',
    purpose: 'Контрольно-пропускной пункт охраны с пультом периметральной сигнализации, турникетом и автоматическим шлагбаумом.',
    roofType: 'flat',
    colorHex: 0x1e293b,
    accentHex: 0x10b981,
  },
  {
    id: 'b-2.14',
    code: '2.14',
    name: 'Пункт выдачи ВМ',
    shortLabel: '2.14 Пункт выдачи',
    category: 'admin',
    count: 1,
    x: -26,
    z: -24,
    width: 6.0,
    length: 10.0,
    height: 4.2,
    rotationY: SITE_AXIS_ANGLE,
    elevation: 592.0,
    blueprintTag: '2.14 Выдача',
    dimensionsText: '10.00 × 6.00 × 4.20 м · Отм. 592.00 м',
    purpose: 'Специализированный пункт учёта, приёма и выдачи взрывчатых материалов на въезде в складскую зону.',
    roofType: 'gabled',
    colorHex: 0x334155,
    accentHex: 0x38bdf8,
  },
];

/**
 * Type III Concrete Platforms (Площадки, тип III — Плита дорожная ПАГ-14)
 */
export const PLATFORMS_DATA: PlatformSpec[] = [
  {
    id: 'plat-north-warehouses',
    name: 'Площадка (тип III) группы складов 455 м/т',
    x: 8.5,
    z: -7.2,
    width: 32,
    length: 68,
    rotationY: SITE_AXIS_ANGLE,
    elevation: 591.6,
  },
  {
    id: 'plat-south-warehouses',
    name: 'Площадка (тип III) группы складов 392–401 м/т',
    x: 50.5,
    z: 79.5,
    width: 50,
    length: 62,
    rotationY: SITE_AXIS_ANGLE,
    elevation: 593.0,
  },
  {
    id: 'plat-production-main',
    name: 'Площадка (тип III) производственной зоны МПГУ и АБК',
    x: 78,
    z: 20,
    width: 48,
    length: 76,
    rotationY: SITE_AXIS_ANGLE,
    elevation: 590.0,
  },
  {
    id: 'plat-energy-bktp',
    name: 'Площадка (тип III) энергоблока БКТП и ДЭС',
    x: 45,
    z: -80,
    width: 18,
    length: 28,
    rotationY: SITE_AXIS_ANGLE,
    elevation: 588.0,
  },
  {
    id: 'plat-well-2.7',
    name: 'Площадка (тип III) павильона артскважины 2.7',
    x: 6,
    z: -148,
    width: 12,
    length: 12,
    rotationY: SITE_AXIS_ANGLE,
    elevation: 587.2,
  },
  {
    id: 'plat-kpp-hub',
    name: 'Площадка (тип III) узла КПП и укрытия',
    x: -16,
    z: -40,
    width: 24,
    length: 34,
    rotationY: SITE_AXIS_ANGLE,
    elevation: 591.6,
  },
];

/**
 * Road Network (Автомобильные дороги, тип I) and Gravel Drainage Ditches (Щебеночные канавы, тип III)
 */
export const ROADS_DATA: RoadPathSpec[] = [
  // 1. Северо-западное разворотное кольцо (вокруг полигона 2.3 и площадки 2.4)
  {
    id: 'road-nw-loop',
    name: 'Северо-западное разворотное кольцо (Тип I)',
    type: 'road_type_1',
    width: 7.0,
    closed: true,
    points: [
      [-148, -68],
      [-62, -116],
      [-34, -68],
      [-58, -42],
      [-114, -18],
      [-144, -44],
    ],
  },
  // 2. Северная ветка к артскважине 2.7 и энергоблоку 2.11/2.12
  {
    id: 'road-north-branch',
    name: 'Северный проезд к артскважине и БКТП (Тип I)',
    type: 'road_type_1',
    width: 6.5,
    closed: false,
    points: [
      [-62, -116],
      [4, -152],
      [38, -88],
      [62, -38],
      [96, 30],
      [126, 92],
      [78, 128],
    ],
  },
  // 3. Центральная поперечная связка через КПП (2.13) и Укрытие (2.5)
  {
    id: 'road-central-connector',
    name: 'Главный распределительный проезд через КПП (Тип I)',
    type: 'road_type_1',
    width: 7.0,
    closed: false,
    points: [
      [-34, -68],
      [-12, -46],
      [28, -54],
      [62, -38],
    ],
  },
  // 4. Овальное кольцо вокруг северной группы складов 2.16.1–2.16.2 (455 м/т)
  {
    id: 'road-oval-455',
    name: 'Кольцевой объезд корпусов 455м/т (Тип I)',
    type: 'road_type_1',
    width: 6.5,
    closed: true,
    points: [
      [-20, -32],
      [4, -44],
      [34, 16],
      [10, 28],
    ],
  },
  // 5. Овальное кольцо вокруг южной группы складов 2.16.3–2.16.6 (392–401 м/т)
  {
    id: 'road-oval-392-401',
    name: 'Кольцевой объезд корпусов 392–401м/т (Тип I)',
    type: 'road_type_1',
    width: 6.5,
    closed: true,
    points: [
      [12, 62],
      [54, 40],
      [88, 98],
      [46, 120],
    ],
  },
  // 6. Серпантинная магистраль вдоль обвалованных складов 2.15.1–2.15.3 и южных складов
  {
    id: 'road-west-serpentine',
    name: 'Серпантинный проезд вдоль складов ВМ (Тип I)',
    type: 'road_type_1',
    width: 6.5,
    closed: false,
    points: [
      [-58, -42],
      [-20, -32],
      [10, 28],
      [12, 62],
      [46, 120],
      [78, 128],
    ],
  },
  // 7. Подъезды к хранилищам 2.15.1, 2.15.2, 2.15.3
  {
    id: 'road-spur-2.15.2',
    name: 'Съезд к складу ВМ №2 (2.15.2)',
    type: 'road_type_1',
    width: 5.5,
    closed: false,
    points: [
      [-8, -6],
      [-40, 8],
    ],
  },
  {
    id: 'road-spur-2.15.3',
    name: 'Съезд к складу ВМ №3 (2.15.3)',
    type: 'road_type_1',
    width: 5.5,
    closed: false,
    points: [
      [11, 44],
      [-20, 50],
    ],
  },

  // === ВОДООТВОДНЫЕ ЩЕБЕНОЧНЫЕ КАНАВЫ (ТИП III, 1:20) ВДОЛЬ ДОРОГ ===
  {
    id: 'ditch-nw-outer',
    name: 'Водоотводная щебеночная канава (тип III, 1:20) — СЗ контур',
    type: 'ditch_type_3',
    width: 2.2,
    closed: false,
    points: [
      [-154, -66],
      [-60, -122],
      [4, -158],
      [44, -92],
      [102, 28],
      [132, 94],
    ],
  },
  {
    id: 'ditch-west-berms',
    name: 'Водоотводная щебеночная канава (тип III, 1:20) — ЮЗ ветка',
    type: 'ditch_type_3',
    width: 2.2,
    closed: false,
    points: [
      [-120, -12],
      [-64, -36],
      [-26, -24],
      [4, 34],
      [40, 126],
      [80, 134],
    ],
  },
];

/**
 * Engineering Cross-Sections from the bottom of the blueprint
 */
export const CROSS_SECTIONS_SPEC = [
  {
    id: 'cs-road-1',
    title: 'Сечение проезда, тип I',
    subtitle: 'Общая толщина дорожной одежды: 380 мм (ГОСТ Р 71244–2024)',
    layers: [
      { name: 'ПГС ГОСТ 23735-2014 (верхний слой)', thickness: '250 мм', color: '#d97706' },
      { name: 'Объёмная георешетка GECARC Неосинт 0614', thickness: 'армирование', color: '#38bdf8' },
      { name: 'ПГС ГОСТ 23735-2014 (нижний слой)', thickness: '130 мм', color: '#b45309' },
      { name: 'Геотекстиль GETPF Неосинт XU2185', thickness: 'разделительный слой', color: '#a855f7' },
      { name: 'Уплотнённый грунт земляного полотна', thickness: 'основание', color: '#57534e' },
    ],
  },
  {
    id: 'cs-ditch-3',
    title: 'Сечение щебеночной канавы, тип III (1:20)',
    subtitle: 'Трапецеидальный профиль: дно 500 мм, глубина ≥ 300 мм, откосы 1:1.5',
    layers: [
      { name: 'Укрепление щебнем М600 фр. 40–70 по ГОСТ 8267-93*', thickness: '150 мм', color: '#94a3b8' },
      { name: 'Геотекстиль GETPF Неосинт XU2185', thickness: 'мембрана', color: '#38bdf8' },
      { name: 'Уплотнённый грунт земляного полотна', thickness: 'профиль 1:1.5', color: '#57534e' },
    ],
  },
  {
    id: 'cs-platform-3',
    title: 'Сечение площадок (тип III)',
    subtitle: 'Тяжёлое сборное покрытие под складские и производственные нагрузки',
    layers: [
      { name: 'Плита дорожная железобетонная ПАГ-14', thickness: '140 мм', color: '#cbd5e1' },
      { name: 'ПГС ГОСТ 23735-2014 (выравнивающее основание)', thickness: '320 мм (0.32 м)', color: '#d97706' },
      { name: 'Нетканый геотекстиль GETPF Неосинт', thickness: 'разделительный слой', color: '#38bdf8' },
      { name: 'Уплотнённый грунт / срезка плодородного слоя', thickness: 'основание', color: '#57534e' },
    ],
  },
];
