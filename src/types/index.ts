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
