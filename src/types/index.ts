export interface ItemCategory {
  id: string;
  name: string;
  parentId: string | null;
}

export interface Item {
  id: string;
  code: string;
  name: string;
  description: string;
  unit: string;
  material: number;
  manoDeObra: number;
  equipo: number;
  indirectos: number;
  categoryId: string | null;
}

export interface RubroCategory {
  id: string;
  name: string;
  parentId: string | null;
}

export interface RubroComponent {
  id: string;
  itemId: string;
  quantity: number;
  type: 'material' | 'manoDeObra' | 'equipo' | 'subcontrato';
}

export interface Rubro {
  id: string;
  code: string;
  name: string;
  description: string;
  unit: string;
  components: RubroComponent[];
  categoryId: string | null;
}

export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export interface Database {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  items: Item[];
  itemCategories: ItemCategory[];
  rubros: Rubro[];
  rubroCategories: RubroCategory[];
}

export interface BudgetLineItem {
  id: string;
  rubroId: string;
  rubroCode: string;
  rubroName: string;
  rubroDescription: string;
  rubroUnit: string;
  categoryId: string | null;
  categoryName: string;
  quantity: number;
  unitCost: number;
  materialCost: number;
  manoDeObraCost: number;
  equipoCost: number;
}

export interface Budget {
  id: string;
  name: string;
  description: string;
  databaseId: string;
  databaseName: string;
  createdAt: string;
  updatedAt: string;
  lineItems: BudgetLineItem[];
  ivaRate: number;
}

// ── Budget Update (Actualización de Presupuesto) ──────────────────────────────

export interface BudgetUpdateLineItem {
  id: string;
  rubroId: string;
  rubroCode: string;
  rubroName: string;
  rubroUnit: string;
  categoryId: string | null;
  categoryName: string;
  quantity: number;
  progress: number;
  oldUnitCost: number;
  oldMaterialCost: number;
  oldManoDeObraCost: number;
  oldEquipoCost: number;
}

export interface BudgetUpdate {
  id: string;
  name: string;
  description: string;
  sourceBudgetId: string;
  sourceBudgetName: string;
  newDatabaseId: string;
  newDatabaseName: string;
  ivaRate: number;
  createdAt: string;
  updatedAt: string;
  lineItems: BudgetUpdateLineItem[];
}

export type AppView = 'home' | 'database' | 'budget' | 'actualizacion' | 'compare' | 'medicion' | 'revit';

// ── Medición ──────────────────────────────────────────────────────────────────

export type MedicionStatus = 'pendiente' | 'en_proceso' | 'medido' | 'verificado';

export interface MedicionLineItem {
  id: string;
  rubroId: string;
  rubroCode: string;
  rubroName: string;
  rubroUnit: string;
  categoryId: string | null;
  categoryName: string;
  quantityBudget: number;
  quantityRevit: number;
  unitCost: number;
  status: MedicionStatus;
  notes: string;
}

export interface MedicionProject {
  id: string;
  name: string;
  description: string;
  budgetId: string;
  budgetName: string;
  createdAt: string;
  updatedAt: string;
  lineItems: MedicionLineItem[];
}
