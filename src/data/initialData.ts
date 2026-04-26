import { Item, ItemCategory, Rubro, RubroCategory, Database } from '../types';

export const initialItemCategories: ItemCategory[] = [
  { id: 'cat-eq', name: 'EQUIPOS', parentId: null },
  { id: 'cat-mo', name: 'MANO DE OBRA', parentId: null },
  { id: 'cat-sc', name: 'SUBCONTRATOS', parentId: null },
  { id: 'cat-mat', name: 'MATERIALES', parentId: null },
  { id: 'cat-mat-og', name: 'Obra Gris', parentId: 'cat-mat' },
  { id: 'cat-mat-ac', name: 'Acabados', parentId: 'cat-mat' },
  { id: 'cat-mat-he', name: 'Herramientas', parentId: 'cat-mat' },
  { id: 'cat-mat-epp', name: 'EPP', parentId: 'cat-mat' },
];

export const initialItems: Item[] = [
  { id: 'item-1',  code: 'MAT-OG-001', name: 'Cemento Portland Tipo I (50kg)', description: 'Cemento gris para construcción general', unit: 'kg',     material: 0.45,   manoDeObra: 0,   equipo: 0,    subcontrato: 0.05,  ivaRate: 0.15, categoryId: 'cat-mat-og' },
  { id: 'item-2',  code: 'MAT-OG-002', name: 'Arena de Río',                    description: 'Arena lavada para mezclas',          unit: 'm³',    material: 25.0,   manoDeObra: 0,   equipo: 0,    subcontrato: 2.0,   ivaRate: 0.15, categoryId: 'cat-mat-og' },
  { id: 'item-3',  code: 'MAT-OG-003', name: 'Bloque de Hormigón 15x20x40',     description: 'Bloque hueco para mampostería',      unit: 'Und',   material: 0.85,   manoDeObra: 0,   equipo: 0,    subcontrato: 0.05,  ivaRate: 0.15, categoryId: 'cat-mat-og' },
  { id: 'item-4',  code: 'MAT-AC-001', name: 'Adoquin Español 8cm Color 30x14', description: 'Adoquín decorativo para exteriores', unit: 'm²',    material: 17.51,  manoDeObra: 0,   equipo: 0,    subcontrato: 1.5,   ivaRate: 0.15, categoryId: 'cat-mat-ac' },
  { id: 'item-5',  code: 'MAT-AC-002', name: 'Adoquin Modena 8 cm Color',       description: 'Adoquín tipo modena',                unit: 'm²',    material: 19.15,  manoDeObra: 0,   equipo: 0,    subcontrato: 1.75,  ivaRate: 0.15, categoryId: 'cat-mat-ac' },
  { id: 'item-6',  code: 'MAT-AC-003', name: 'Cerámica Piso 45x45 cm',          description: 'Cerámica esmaltada antideslizante',  unit: 'm²',    material: 12.5,   manoDeObra: 0,   equipo: 0,    subcontrato: 1.0,   ivaRate: 0.15, categoryId: 'cat-mat-ac' },
  { id: 'item-7',  code: 'MAT-HE-001', name: 'Amoladora Dewalt DWE4559 2400W',  description: 'Herramienta eléctrica industrial',   unit: 'Und',   material: 152.62, manoDeObra: 0,   equipo: 0,    subcontrato: 10.0,  ivaRate: 0.15, categoryId: 'cat-mat-he' },
  { id: 'item-8',  code: 'MAT-HE-002', name: 'Taladro Percutor 13mm 850W',      description: 'Taladro eléctrico con percusión',    unit: 'Und',   material: 85.0,   manoDeObra: 0,   equipo: 0,    subcontrato: 5.0,   ivaRate: 0.15, categoryId: 'cat-mat-he' },
  { id: 'item-9',  code: 'EPP-001',    name: 'Casco de Seguridad Tipo II',       description: 'Casco duro con suspensión',          unit: 'Und',   material: 8.5,    manoDeObra: 0,   equipo: 0,    subcontrato: 0.85,  ivaRate: 0.15, categoryId: 'cat-mat-epp' },
  { id: 'item-10', code: 'MO-001',     name: 'Peón de Construcción',             description: 'Trabajador no calificado',           unit: 'h',     material: 0,      manoDeObra: 3.5, equipo: 0,    subcontrato: 0.35,  ivaRate: 0,    categoryId: 'cat-mo' },
  { id: 'item-11', code: 'MO-002',     name: 'Maestro de Obra',                  description: 'Trabajador calificado',              unit: 'h',     material: 0,      manoDeObra: 6.5, equipo: 0,    subcontrato: 0.65,  ivaRate: 0,    categoryId: 'cat-mo' },
  { id: 'item-12', code: 'MO-003',     name: 'Albañil',                          description: 'Oficial de construcción',            unit: 'h',     material: 0,      manoDeObra: 4.5, equipo: 0,    subcontrato: 0.45,  ivaRate: 0,    categoryId: 'cat-mo' },
  { id: 'item-13', code: 'EQ-001',     name: 'Excavadora CAT 320',               description: 'Excavadora hidráulica 20 ton',       unit: 'h',     material: 0,      manoDeObra: 0,   equipo: 85.0, subcontrato: 8.5,   ivaRate: 0.15, categoryId: 'cat-eq' },
  { id: 'item-14', code: 'EQ-002',     name: 'Compactadora Vibradora',           description: 'Compactador de suelo manual',        unit: 'h',     material: 0,      manoDeObra: 0,   equipo: 12.0, subcontrato: 1.2,   ivaRate: 0.15, categoryId: 'cat-eq' },
  { id: 'item-15', code: 'SC-001',     name: 'Instalación Eléctrica Residencial',description: 'Instalación eléctrica completa',     unit: 'Global',material: 0,      manoDeObra: 0,   equipo: 0,    subcontrato: 150.0, ivaRate: 0.15, categoryId: 'cat-sc' },
  { id: 'item-16', code: 'SC-002',     name: 'Instalación Sanitaria',            description: 'Red de agua potable y alcantarillado',unit: 'Global',material: 0,     manoDeObra: 0,   equipo: 0,    subcontrato: 200.0, ivaRate: 0.15, categoryId: 'cat-sc' },
  { id: 'item-17', code: 'MO-004',     name: 'Electricista',                     description: 'Técnico en instalaciones eléctricas',unit: 'h',     material: 0,      manoDeObra: 8.0, equipo: 0,    subcontrato: 0.8,   ivaRate: 0,    categoryId: 'cat-mo' },
];

export const initialRubroCategories: RubroCategory[] = [
  { id: 'rcat-root', name: 'APU - Rubros', parentId: null },
  { id: 'rcat-001', name: '001 PRELIMINARES', parentId: 'rcat-root' },
  { id: 'rcat-002', name: '002 MOVIMIENTOS DE TIERRA', parentId: 'rcat-root' },
  { id: 'rcat-003', name: '003 ESTRUCTURA', parentId: 'rcat-root' },
];

export const initialRubros: Rubro[] = [
  {
    id: 'rubro-1', code: '02.01.02', name: 'Pruebas de Compactación',
    description: 'Ensayo de compactación de suelos', unit: 'Global',
    components: [
      { id: 'rc-1-1', itemId: 'item-14', quantity: 0.2, type: 'equipo' },
      { id: 'rc-1-2', itemId: 'item-10', quantity: 0.1, type: 'manoDeObra' },
    ],
    categoryId: 'rcat-002',
  },
  {
    id: 'rubro-2', code: '02.01.03', name: 'Rasanteo y Conformación Manual de Plataformas',
    description: 'Trabajos de nivelación y conformación', unit: 'm²',
    components: [
      { id: 'rc-2-1', itemId: 'item-10', quantity: 0.3, type: 'manoDeObra' },
      { id: 'rc-2-2', itemId: 'item-12', quantity: 0.1, type: 'manoDeObra' },
    ],
    categoryId: 'rcat-002',
  },
  {
    id: 'rubro-3', code: '02.02.01', name: 'Excavaciones y Rellenos con Material de Sitio',
    description: 'Movimiento de tierra con maquinaria', unit: 'm³',
    components: [
      { id: 'rc-3-1', itemId: 'item-13', quantity: 0.08, type: 'equipo' },
      { id: 'rc-3-2', itemId: 'item-10', quantity: 0.2, type: 'manoDeObra' },
    ],
    categoryId: 'rcat-002',
  },
  {
    id: 'rubro-4', code: '02.02.02', name: 'Excavaciones y Rellenos con Material Pétreo',
    description: 'Relleno con material importado', unit: 'm³',
    components: [
      { id: 'rc-4-1', itemId: 'item-2', quantity: 1.2, type: 'material' },
      { id: 'rc-4-2', itemId: 'item-13', quantity: 0.05, type: 'equipo' },
      { id: 'rc-4-3', itemId: 'item-10', quantity: 0.3, type: 'manoDeObra' },
    ],
    categoryId: 'rcat-002',
  },
  {
    id: 'rubro-5', code: '02.02.03', name: 'Cajas de Revisión de 60x60',
    description: 'Construcción de caja de inspección', unit: 'Und',
    components: [
      { id: 'rc-5-1', itemId: 'item-1', quantity: 50, type: 'material' },
      { id: 'rc-5-2', itemId: 'item-3', quantity: 30, type: 'material' },
      { id: 'rc-5-3', itemId: 'item-11', quantity: 2, type: 'manoDeObra' },
      { id: 'rc-5-4', itemId: 'item-12', quantity: 4, type: 'manoDeObra' },
    ],
    categoryId: 'rcat-002',
  },
];

export function createDefaultDatabase(): Database {
  const now = new Date().toISOString();
  return {
    id: 'db-default',
    name: 'Base General 2025',
    description: 'Base de datos de precios para construcción general 2025',
    createdAt: now,
    updatedAt: now,
    items: initialItems,
    itemCategories: initialItemCategories,
    rubros: initialRubros,
    rubroCategories: initialRubroCategories,
  };
}
