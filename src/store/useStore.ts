import { create } from 'zustand';
import { Item, ItemCategory, Rubro, RubroCategory } from '../types';
import {
  initialItemCategories,
  initialItems,
  initialRubroCategories,
  initialRubros,
} from '../data/initialData';

const STORAGE_KEY = 'presupuestos-data';

interface StoreData {
  items: Item[];
  itemCategories: ItemCategory[];
  rubros: Rubro[];
  rubroCategories: RubroCategory[];
}

function loadFromStorage(): StoreData | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved) as StoreData;
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

function saveToStorage(data: StoreData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore storage errors
  }
}

interface AppState extends StoreData {
  // Item actions
  addItem: (item: Item) => void;
  updateItem: (item: Item) => void;
  deleteItem: (id: string) => void;

  // ItemCategory actions
  addItemCategory: (category: ItemCategory) => void;
  updateItemCategory: (category: ItemCategory) => void;
  deleteItemCategory: (id: string) => void;

  // Rubro actions
  addRubro: (rubro: Rubro) => void;
  updateRubro: (rubro: Rubro) => void;
  deleteRubro: (id: string) => void;

  // RubroCategory actions
  addRubroCategory: (category: RubroCategory) => void;
  updateRubroCategory: (category: RubroCategory) => void;
  deleteRubroCategory: (id: string) => void;
}

const saved = loadFromStorage();

export const useStore = create<AppState>((set) => ({
  items: saved?.items ?? initialItems,
  itemCategories: saved?.itemCategories ?? initialItemCategories,
  rubros: saved?.rubros ?? initialRubros,
  rubroCategories: saved?.rubroCategories ?? initialRubroCategories,

  addItem: (item) => {
    set((state) => {
      const newState = { ...state, items: [...state.items, item] };
      saveToStorage({ items: newState.items, itemCategories: newState.itemCategories, rubros: newState.rubros, rubroCategories: newState.rubroCategories });
      return { items: newState.items };
    });
  },

  updateItem: (item) => {
    set((state) => {
      const items = state.items.map((i) => (i.id === item.id ? item : i));
      saveToStorage({ items, itemCategories: state.itemCategories, rubros: state.rubros, rubroCategories: state.rubroCategories });
      return { items };
    });
  },

  deleteItem: (id) => {
    set((state) => {
      const items = state.items.filter((i) => i.id !== id);
      saveToStorage({ items, itemCategories: state.itemCategories, rubros: state.rubros, rubroCategories: state.rubroCategories });
      return { items };
    });
  },

  addItemCategory: (category) => {
    set((state) => {
      const itemCategories = [...state.itemCategories, category];
      saveToStorage({ items: state.items, itemCategories, rubros: state.rubros, rubroCategories: state.rubroCategories });
      return { itemCategories };
    });
  },

  updateItemCategory: (category) => {
    set((state) => {
      const itemCategories = state.itemCategories.map((c) => (c.id === category.id ? category : c));
      saveToStorage({ items: state.items, itemCategories, rubros: state.rubros, rubroCategories: state.rubroCategories });
      return { itemCategories };
    });
  },

  deleteItemCategory: (id) => {
    set((state) => {
      // Get all descendant category ids
      const getDescendants = (catId: string): string[] => {
        const children = state.itemCategories.filter((c) => c.parentId === catId);
        return [catId, ...children.flatMap((c) => getDescendants(c.id))];
      };
      const idsToDelete = getDescendants(id);
      const itemCategories = state.itemCategories.filter((c) => !idsToDelete.includes(c.id));
      // Also nullify categoryId on items in deleted categories
      const items = state.items.map((i) =>
        i.categoryId && idsToDelete.includes(i.categoryId) ? { ...i, categoryId: null } : i
      );
      saveToStorage({ items, itemCategories, rubros: state.rubros, rubroCategories: state.rubroCategories });
      return { itemCategories, items };
    });
  },

  addRubro: (rubro) => {
    set((state) => {
      const rubros = [...state.rubros, rubro];
      saveToStorage({ items: state.items, itemCategories: state.itemCategories, rubros, rubroCategories: state.rubroCategories });
      return { rubros };
    });
  },

  updateRubro: (rubro) => {
    set((state) => {
      const rubros = state.rubros.map((r) => (r.id === rubro.id ? rubro : r));
      saveToStorage({ items: state.items, itemCategories: state.itemCategories, rubros, rubroCategories: state.rubroCategories });
      return { rubros };
    });
  },

  deleteRubro: (id) => {
    set((state) => {
      const rubros = state.rubros.filter((r) => r.id !== id);
      saveToStorage({ items: state.items, itemCategories: state.itemCategories, rubros, rubroCategories: state.rubroCategories });
      return { rubros };
    });
  },

  addRubroCategory: (category) => {
    set((state) => {
      const rubroCategories = [...state.rubroCategories, category];
      saveToStorage({ items: state.items, itemCategories: state.itemCategories, rubros: state.rubros, rubroCategories });
      return { rubroCategories };
    });
  },

  updateRubroCategory: (category) => {
    set((state) => {
      const rubroCategories = state.rubroCategories.map((c) => (c.id === category.id ? category : c));
      saveToStorage({ items: state.items, itemCategories: state.itemCategories, rubros: state.rubros, rubroCategories });
      return { rubroCategories };
    });
  },

  deleteRubroCategory: (id) => {
    set((state) => {
      const getDescendants = (catId: string): string[] => {
        const children = state.rubroCategories.filter((c) => c.parentId === catId);
        return [catId, ...children.flatMap((c) => getDescendants(c.id))];
      };
      const idsToDelete = getDescendants(id);
      const rubroCategories = state.rubroCategories.filter((c) => !idsToDelete.includes(c.id));
      const rubros = state.rubros.map((r) =>
        r.categoryId && idsToDelete.includes(r.categoryId) ? { ...r, categoryId: null } : r
      );
      saveToStorage({ items: state.items, itemCategories: state.itemCategories, rubros, rubroCategories });
      return { rubroCategories, rubros };
    });
  },
}));

// Helper to compute item total
export function itemTotal(item: Item): number {
  return item.material + item.manoDeObra + item.equipo + item.indirectos;
}

// Helper to compute rubro total
export function rubroTotal(rubro: Rubro, items: Item[]): number {
  return rubro.components.reduce((sum, comp) => {
    const item = items.find((i) => i.id === comp.itemId);
    if (!item) return sum;
    return sum + itemTotal(item) * comp.quantity;
  }, 0);
}

// Helper: get all descendant category ids including self
export function getCategoryIds(categoryId: string, categories: Array<{ id: string; parentId: string | null }>): string[] {
  const children = categories.filter((c) => c.parentId === categoryId);
  return [categoryId, ...children.flatMap((c) => getCategoryIds(c.id, categories))];
}

export function formatMoney(value: number): string {
  return '$' + value.toFixed(2);
}

// generate a simple unique id
export function genId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
