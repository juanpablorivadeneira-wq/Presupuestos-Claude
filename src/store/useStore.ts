import { create } from 'zustand';
import {
  Item,
  ItemCategory,
  Rubro,
  RubroCategory,
  Database,
  Budget,
  BudgetLineItem,
} from '../types';
import { createDefaultDatabase, initialItemCategories } from '../data/initialData';

const STORAGE_KEY = 'presupuestos-v2';

interface StorageData {
  databases: Database[];
  currentDatabaseId: string | null;
  budgets: Budget[];
  currentBudgetId: string | null;
}

function loadFromStorage(): StorageData | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved) as StorageData;
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

function saveToStorage(data: StorageData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore storage errors
  }
}

interface AppState {
  databases: Database[];
  currentDatabaseId: string | null;
  budgets: Budget[];
  currentBudgetId: string | null;

  // Computed selectors
  getCurrentDatabase: () => Database | null;
  getCurrentItems: () => Item[];
  getCurrentRubros: () => Rubro[];

  // Database actions
  createDatabase: (name: string, description: string) => string;
  updateDatabase: (id: string, name: string, description: string) => void;
  deleteDatabase: (id: string) => void;
  duplicateDatabase: (id: string, newName: string) => void;
  openDatabase: (id: string) => void;
  closeDatabase: () => void;
  importDatabase: (db: Database) => string;

  // Item actions (operate on currentDatabaseId)
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

  // Budget actions
  createBudget: (name: string, description: string, databaseId: string) => void;
  updateBudget: (id: string, name: string, description: string) => void;
  deleteBudget: (id: string) => void;
  openBudget: (id: string) => void;
  closeBudget: () => void;
  addLineItem: (budgetId: string, rubroId: string, quantity: number) => void;
  updateLineItem: (budgetId: string, lineItemId: string, quantity: number) => void;
  removeLineItem: (budgetId: string, lineItemId: string) => void;
  recalculateBudget: (budgetId: string) => void;
}

const saved = loadFromStorage();

const defaultDb = createDefaultDatabase();
const initialDatabases: Database[] = saved?.databases ?? [defaultDb];
const initialCurrentDatabaseId: string | null = saved?.currentDatabaseId ?? null;
const initialBudgets: Budget[] = saved?.budgets ?? [];
const initialCurrentBudgetId: string | null = saved?.currentBudgetId ?? null;

function updateDbInList(databases: Database[], dbId: string | null, updater: (db: Database) => Database): Database[] {
  if (!dbId) return databases;
  return databases.map((db) => (db.id === dbId ? updater(db) : db));
}

export const useStore = create<AppState>((set, get) => ({
  databases: initialDatabases,
  currentDatabaseId: initialCurrentDatabaseId,
  budgets: initialBudgets,
  currentBudgetId: initialCurrentBudgetId,

  getCurrentDatabase: () => {
    const state = get();
    return state.databases.find((d) => d.id === state.currentDatabaseId) ?? null;
  },

  getCurrentItems: () => {
    const state = get();
    const db = state.databases.find((d) => d.id === state.currentDatabaseId);
    return db?.items ?? [];
  },

  getCurrentRubros: () => {
    const state = get();
    const db = state.databases.find((d) => d.id === state.currentDatabaseId);
    return db?.rubros ?? [];
  },

  // ── Database actions ──────────────────────────────────────────────────────

  createDatabase: (name, description) => {
    const now = new Date().toISOString();
    const newId = genId();
    // Clone standard categories with new IDs so each DB has its own instances
    const idMap: Record<string, string> = {};
    const clonedCategories = initialItemCategories.map((c) => {
      const newCatId = genId();
      idMap[c.id] = newCatId;
      return { ...c, id: newCatId };
    }).map((c) => ({ ...c, parentId: c.parentId ? idMap[c.parentId] ?? c.parentId : null }));
    const newDb: Database = {
      id: newId,
      name,
      description,
      createdAt: now,
      updatedAt: now,
      items: [],
      itemCategories: clonedCategories,
      rubros: [],
      rubroCategories: [],
    };
    set((state) => {
      const databases = [...state.databases, newDb];
      saveToStorage({ databases, currentDatabaseId: newDb.id, budgets: state.budgets, currentBudgetId: state.currentBudgetId });
      return { databases, currentDatabaseId: newDb.id };
    });
    return newDb.id;
  },

  updateDatabase: (id, name, description) => {
    set((state) => {
      const databases = state.databases.map((db) =>
        db.id === id ? { ...db, name, description, updatedAt: new Date().toISOString() } : db
      );
      saveToStorage({ databases, currentDatabaseId: state.currentDatabaseId, budgets: state.budgets, currentBudgetId: state.currentBudgetId });
      return { databases };
    });
  },

  deleteDatabase: (id) => {
    set((state) => {
      const databases = state.databases.filter((db) => db.id !== id);
      const currentDatabaseId = state.currentDatabaseId === id ? null : state.currentDatabaseId;
      saveToStorage({ databases, currentDatabaseId, budgets: state.budgets, currentBudgetId: state.currentBudgetId });
      return { databases, currentDatabaseId };
    });
  },

  duplicateDatabase: (id, newName) => {
    const now = new Date().toISOString();
    set((state) => {
      const source = state.databases.find((db) => db.id === id);
      if (!source) return {};
      const newDb: Database = {
        ...source,
        id: genId(),
        name: newName,
        createdAt: now,
        updatedAt: now,
        items: source.items.map((i) => ({ ...i })),
        itemCategories: source.itemCategories.map((c) => ({ ...c })),
        rubros: source.rubros.map((r) => ({ ...r, components: r.components.map((c) => ({ ...c })) })),
        rubroCategories: source.rubroCategories.map((c) => ({ ...c })),
      };
      const databases = [...state.databases, newDb];
      saveToStorage({ databases, currentDatabaseId: state.currentDatabaseId, budgets: state.budgets, currentBudgetId: state.currentBudgetId });
      return { databases };
    });
  },

  openDatabase: (id) => {
    set((state) => {
      saveToStorage({ databases: state.databases, currentDatabaseId: id, budgets: state.budgets, currentBudgetId: state.currentBudgetId });
      return { currentDatabaseId: id };
    });
  },

  closeDatabase: () => {
    set((state) => {
      saveToStorage({ databases: state.databases, currentDatabaseId: null, budgets: state.budgets, currentBudgetId: state.currentBudgetId });
      return { currentDatabaseId: null };
    });
  },

  importDatabase: (db) => {
    const now = new Date().toISOString();
    const newId = genId();
    const imported: Database = {
      ...db,
      id: newId,
      createdAt: now,
      updatedAt: now,
      items: db.items.map((i) => ({ ...i })),
      itemCategories: db.itemCategories.map((c) => ({ ...c })),
      rubros: db.rubros.map((r) => ({ ...r, components: r.components.map((c) => ({ ...c })) })),
      rubroCategories: db.rubroCategories.map((c) => ({ ...c })),
    };
    set((state) => {
      const databases = [...state.databases, imported];
      saveToStorage({ databases, currentDatabaseId: newId, budgets: state.budgets, currentBudgetId: state.currentBudgetId });
      return { databases, currentDatabaseId: newId };
    });
    return newId;
  },

  // ── Item actions ──────────────────────────────────────────────────────────

  addItem: (item) => {
    set((state) => {
      const databases = updateDbInList(state.databases, state.currentDatabaseId, (db) => ({
        ...db,
        items: [...db.items, item],
        updatedAt: new Date().toISOString(),
      }));
      saveToStorage({ databases, currentDatabaseId: state.currentDatabaseId, budgets: state.budgets, currentBudgetId: state.currentBudgetId });
      return { databases };
    });
  },

  updateItem: (item) => {
    set((state) => {
      const databases = updateDbInList(state.databases, state.currentDatabaseId, (db) => ({
        ...db,
        items: db.items.map((i) => (i.id === item.id ? item : i)),
        updatedAt: new Date().toISOString(),
      }));
      saveToStorage({ databases, currentDatabaseId: state.currentDatabaseId, budgets: state.budgets, currentBudgetId: state.currentBudgetId });
      return { databases };
    });
  },

  deleteItem: (id) => {
    set((state) => {
      const databases = updateDbInList(state.databases, state.currentDatabaseId, (db) => ({
        ...db,
        items: db.items.filter((i) => i.id !== id),
        updatedAt: new Date().toISOString(),
      }));
      saveToStorage({ databases, currentDatabaseId: state.currentDatabaseId, budgets: state.budgets, currentBudgetId: state.currentBudgetId });
      return { databases };
    });
  },

  addItemCategory: (category) => {
    set((state) => {
      const databases = updateDbInList(state.databases, state.currentDatabaseId, (db) => ({
        ...db,
        itemCategories: [...db.itemCategories, category],
        updatedAt: new Date().toISOString(),
      }));
      saveToStorage({ databases, currentDatabaseId: state.currentDatabaseId, budgets: state.budgets, currentBudgetId: state.currentBudgetId });
      return { databases };
    });
  },

  updateItemCategory: (category) => {
    set((state) => {
      const databases = updateDbInList(state.databases, state.currentDatabaseId, (db) => ({
        ...db,
        itemCategories: db.itemCategories.map((c) => (c.id === category.id ? category : c)),
        updatedAt: new Date().toISOString(),
      }));
      saveToStorage({ databases, currentDatabaseId: state.currentDatabaseId, budgets: state.budgets, currentBudgetId: state.currentBudgetId });
      return { databases };
    });
  },

  deleteItemCategory: (id) => {
    set((state) => {
      const db = state.databases.find((d) => d.id === state.currentDatabaseId);
      if (!db) return {};
      const getDescendants = (catId: string): string[] => {
        const children = db.itemCategories.filter((c) => c.parentId === catId);
        return [catId, ...children.flatMap((c) => getDescendants(c.id))];
      };
      const idsToDelete = getDescendants(id);
      const databases = updateDbInList(state.databases, state.currentDatabaseId, (d) => ({
        ...d,
        itemCategories: d.itemCategories.filter((c) => !idsToDelete.includes(c.id)),
        items: d.items.map((i) =>
          i.categoryId && idsToDelete.includes(i.categoryId) ? { ...i, categoryId: null } : i
        ),
        updatedAt: new Date().toISOString(),
      }));
      saveToStorage({ databases, currentDatabaseId: state.currentDatabaseId, budgets: state.budgets, currentBudgetId: state.currentBudgetId });
      return { databases };
    });
  },

  // ── Rubro actions ─────────────────────────────────────────────────────────

  addRubro: (rubro) => {
    set((state) => {
      const databases = updateDbInList(state.databases, state.currentDatabaseId, (db) => ({
        ...db,
        rubros: [...db.rubros, rubro],
        updatedAt: new Date().toISOString(),
      }));
      saveToStorage({ databases, currentDatabaseId: state.currentDatabaseId, budgets: state.budgets, currentBudgetId: state.currentBudgetId });
      return { databases };
    });
  },

  updateRubro: (rubro) => {
    set((state) => {
      const databases = updateDbInList(state.databases, state.currentDatabaseId, (db) => ({
        ...db,
        rubros: db.rubros.map((r) => (r.id === rubro.id ? rubro : r)),
        updatedAt: new Date().toISOString(),
      }));
      saveToStorage({ databases, currentDatabaseId: state.currentDatabaseId, budgets: state.budgets, currentBudgetId: state.currentBudgetId });
      return { databases };
    });
  },

  deleteRubro: (id) => {
    set((state) => {
      const databases = updateDbInList(state.databases, state.currentDatabaseId, (db) => ({
        ...db,
        rubros: db.rubros.filter((r) => r.id !== id),
        updatedAt: new Date().toISOString(),
      }));
      saveToStorage({ databases, currentDatabaseId: state.currentDatabaseId, budgets: state.budgets, currentBudgetId: state.currentBudgetId });
      return { databases };
    });
  },

  addRubroCategory: (category) => {
    set((state) => {
      const databases = updateDbInList(state.databases, state.currentDatabaseId, (db) => ({
        ...db,
        rubroCategories: [...db.rubroCategories, category],
        updatedAt: new Date().toISOString(),
      }));
      saveToStorage({ databases, currentDatabaseId: state.currentDatabaseId, budgets: state.budgets, currentBudgetId: state.currentBudgetId });
      return { databases };
    });
  },

  updateRubroCategory: (category) => {
    set((state) => {
      const databases = updateDbInList(state.databases, state.currentDatabaseId, (db) => ({
        ...db,
        rubroCategories: db.rubroCategories.map((c) => (c.id === category.id ? category : c)),
        updatedAt: new Date().toISOString(),
      }));
      saveToStorage({ databases, currentDatabaseId: state.currentDatabaseId, budgets: state.budgets, currentBudgetId: state.currentBudgetId });
      return { databases };
    });
  },

  deleteRubroCategory: (id) => {
    set((state) => {
      const db = state.databases.find((d) => d.id === state.currentDatabaseId);
      if (!db) return {};
      const getDescendants = (catId: string): string[] => {
        const children = db.rubroCategories.filter((c) => c.parentId === catId);
        return [catId, ...children.flatMap((c) => getDescendants(c.id))];
      };
      const idsToDelete = getDescendants(id);
      const databases = updateDbInList(state.databases, state.currentDatabaseId, (d) => ({
        ...d,
        rubroCategories: d.rubroCategories.filter((c) => !idsToDelete.includes(c.id)),
        rubros: d.rubros.map((r) =>
          r.categoryId && idsToDelete.includes(r.categoryId) ? { ...r, categoryId: null } : r
        ),
        updatedAt: new Date().toISOString(),
      }));
      saveToStorage({ databases, currentDatabaseId: state.currentDatabaseId, budgets: state.budgets, currentBudgetId: state.currentBudgetId });
      return { databases };
    });
  },

  // ── Budget actions ────────────────────────────────────────────────────────

  createBudget: (name, description, databaseId) => {
    const now = new Date().toISOString();
    const db = get().databases.find((d) => d.id === databaseId);
    const newBudget: Budget = {
      id: genId(),
      name,
      description,
      databaseId,
      databaseName: db?.name ?? '',
      createdAt: now,
      updatedAt: now,
      lineItems: [],
    };
    set((state) => {
      const budgets = [...state.budgets, newBudget];
      saveToStorage({ databases: state.databases, currentDatabaseId: state.currentDatabaseId, budgets, currentBudgetId: state.currentBudgetId });
      return { budgets };
    });
  },

  updateBudget: (id, name, description) => {
    set((state) => {
      const budgets = state.budgets.map((b) =>
        b.id === id ? { ...b, name, description, updatedAt: new Date().toISOString() } : b
      );
      saveToStorage({ databases: state.databases, currentDatabaseId: state.currentDatabaseId, budgets, currentBudgetId: state.currentBudgetId });
      return { budgets };
    });
  },

  deleteBudget: (id) => {
    set((state) => {
      const budgets = state.budgets.filter((b) => b.id !== id);
      const currentBudgetId = state.currentBudgetId === id ? null : state.currentBudgetId;
      saveToStorage({ databases: state.databases, currentDatabaseId: state.currentDatabaseId, budgets, currentBudgetId });
      return { budgets, currentBudgetId };
    });
  },

  openBudget: (id) => {
    set((state) => {
      saveToStorage({ databases: state.databases, currentDatabaseId: state.currentDatabaseId, budgets: state.budgets, currentBudgetId: id });
      return { currentBudgetId: id };
    });
  },

  closeBudget: () => {
    set((state) => {
      saveToStorage({ databases: state.databases, currentDatabaseId: state.currentDatabaseId, budgets: state.budgets, currentBudgetId: null });
      return { currentBudgetId: null };
    });
  },

  addLineItem: (budgetId, rubroId, quantity) => {
    set((state) => {
      const budget = state.budgets.find((b) => b.id === budgetId);
      if (!budget) return {};
      const db = state.databases.find((d) => d.id === budget.databaseId);
      if (!db) return {};
      const rubro = db.rubros.find((r) => r.id === rubroId);
      if (!rubro) return {};
      const unitCost = rubroTotal(rubro, db.items);
      const lineItem: BudgetLineItem = {
        id: genId(),
        rubroId,
        rubroCode: rubro.code,
        rubroName: rubro.name,
        rubroDescription: rubro.description,
        rubroUnit: rubro.unit,
        quantity,
        unitCost,
      };
      const budgets = state.budgets.map((b) =>
        b.id === budgetId
          ? { ...b, lineItems: [...b.lineItems, lineItem], updatedAt: new Date().toISOString() }
          : b
      );
      saveToStorage({ databases: state.databases, currentDatabaseId: state.currentDatabaseId, budgets, currentBudgetId: state.currentBudgetId });
      return { budgets };
    });
  },

  updateLineItem: (budgetId, lineItemId, quantity) => {
    set((state) => {
      const budgets = state.budgets.map((b) =>
        b.id === budgetId
          ? {
              ...b,
              lineItems: b.lineItems.map((li) => (li.id === lineItemId ? { ...li, quantity } : li)),
              updatedAt: new Date().toISOString(),
            }
          : b
      );
      saveToStorage({ databases: state.databases, currentDatabaseId: state.currentDatabaseId, budgets, currentBudgetId: state.currentBudgetId });
      return { budgets };
    });
  },

  removeLineItem: (budgetId, lineItemId) => {
    set((state) => {
      const budgets = state.budgets.map((b) =>
        b.id === budgetId
          ? {
              ...b,
              lineItems: b.lineItems.filter((li) => li.id !== lineItemId),
              updatedAt: new Date().toISOString(),
            }
          : b
      );
      saveToStorage({ databases: state.databases, currentDatabaseId: state.currentDatabaseId, budgets, currentBudgetId: state.currentBudgetId });
      return { budgets };
    });
  },

  recalculateBudget: (budgetId) => {
    set((state) => {
      const budget = state.budgets.find((b) => b.id === budgetId);
      if (!budget) return {};
      const db = state.databases.find((d) => d.id === budget.databaseId);
      if (!db) return {};
      const budgets = state.budgets.map((b) => {
        if (b.id !== budgetId) return b;
        return {
          ...b,
          lineItems: b.lineItems.map((li) => {
            const rubro = db.rubros.find((r) => r.id === li.rubroId);
            if (!rubro) return li;
            return { ...li, unitCost: rubroTotal(rubro, db.items) };
          }),
          updatedAt: new Date().toISOString(),
        };
      });
      saveToStorage({ databases: state.databases, currentDatabaseId: state.currentDatabaseId, budgets, currentBudgetId: state.currentBudgetId });
      return { budgets };
    });
  },
}));

// ── Standalone helper functions ───────────────────────────────────────────────

export function itemTotal(item: Item): number {
  return item.material + item.manoDeObra + item.equipo + item.indirectos;
}

export function rubroTotal(rubro: Rubro, items: Item[]): number {
  return rubro.components.reduce((sum, comp) => {
    const item = items.find((i) => i.id === comp.itemId);
    if (!item) return sum;
    return sum + itemTotal(item) * comp.quantity;
  }, 0);
}

export function getCategoryIds(
  categoryId: string,
  categories: Array<{ id: string; parentId: string | null }>
): string[] {
  const children = categories.filter((c) => c.parentId === categoryId);
  return [categoryId, ...children.flatMap((c) => getCategoryIds(c.id, categories))];
}

export function formatMoney(value: number): string {
  return '$' + value.toFixed(2);
}

export function genId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
