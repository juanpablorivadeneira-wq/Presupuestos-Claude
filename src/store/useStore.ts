import { create } from 'zustand';
import {
  Item,
  ItemCategory,
  Rubro,
  RubroCategory,
  Database,
  Budget,
  BudgetLineItem,
  BudgetUpdate,
  BudgetUpdateLineItem,
  MedicionProject,
  MedicionLineItem,
  MedicionStatus,
} from '../types';
import { createDefaultDatabase, initialItemCategories } from '../data/initialData';

const STORAGE_KEY = 'presupuestos-v2';
const AUTH_TOKEN_KEY = 'bk-auth-token';
const API_BASE = '/api';

// ── Auth token helpers ────────────────────────────────────────────────────────

export function getAuthToken(): string | null {
  try { return localStorage.getItem(AUTH_TOKEN_KEY); } catch { return null; }
}

export function setAuthToken(token: string) {
  try { localStorage.setItem(AUTH_TOKEN_KEY, token); } catch {}
}

export function clearAuthToken() {
  try { localStorage.removeItem(AUTH_TOKEN_KEY); } catch {}
}

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface StorageData {
  databases: Database[];
  currentDatabaseId: string | null;
  budgets: Budget[];
  currentBudgetId: string | null;
  budgetUpdates: BudgetUpdate[];
  currentBudgetUpdateId: string | null;
  medicionProjects: MedicionProject[];
  currentMedicionId: string | null;
  ivaRates: number[];
  defaultIvaRate: number;
}

// ── localStorage helpers (fallback / dev) ─────────────────────────────────────

function loadFromLocalStorage(): StorageData | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as StorageData) : null;
  } catch { return null; }
}

function saveToLocalStorage(data: StorageData) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

// ── Server API helpers ────────────────────────────────────────────────────────

let _saveTimer: ReturnType<typeof setTimeout> | null = null;

export function saveToServer(data: StorageData) {
  // Always mirror to localStorage for offline resilience
  saveToLocalStorage(data);
  // Debounce server writes (500 ms) to avoid hammering on rapid changes
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    fetch(`${API_BASE}/data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    }).catch(() => { /* server unreachable — localStorage already saved */ });
  }, 500);
}

export type ServerLoadResult =
  | { status: 'ok'; data: StorageData | null }
  | { status: 'needs_auth' }
  | { status: 'offline'; data: StorageData | null };

export async function loadFromServer(): Promise<ServerLoadResult> {
  try {
    const res = await fetch(`${API_BASE}/data`, { headers: authHeaders() });
    if (res.status === 401) return { status: 'needs_auth' };
    if (!res.ok) throw new Error('server error');
    const data = await res.json();
    return { status: 'ok', data: data as StorageData | null };
  } catch {
    // Server unreachable — fall back to localStorage
    return { status: 'offline', data: loadFromLocalStorage() };
  }
}

export async function loginToServer(
  username: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error ?? 'Error de servidor' };
    setAuthToken(json.token);
    return { ok: true };
  } catch {
    return { ok: false, error: 'No se pudo conectar al servidor' };
  }
}

// ── Synchronous bootstrap (localStorage only, used for initial Zustand state) ─
function loadFromStorage(): StorageData | null {
  return loadFromLocalStorage();
}

interface AppState {
  databases: Database[];
  currentDatabaseId: string | null;
  budgets: Budget[];
  currentBudgetId: string | null;
  budgetUpdates: BudgetUpdate[];
  currentBudgetUpdateId: string | null;
  medicionProjects: MedicionProject[];
  currentMedicionId: string | null;
  ivaRates: number[];
  defaultIvaRate: number;

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
  updateDatabaseContents: (id: string, db: Database) => void;

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
  addLineItemsBulk: (budgetId: string, items: Array<{ rubroId: string; quantity: number }>) => void;
  updateLineItem: (budgetId: string, lineItemId: string, quantity: number) => void;
  removeLineItem: (budgetId: string, lineItemId: string) => void;
  recalculateBudget: (budgetId: string) => void;
  setBudgetIvaRate: (budgetId: string, rate: number) => void;
  setIvaRates: (rates: number[]) => void;
  setDefaultIvaRate: (rate: number) => void;

  // BudgetUpdate actions
  createBudgetUpdate: (name: string, description: string, sourceBudgetId: string, newDatabaseId: string) => string;
  updateBudgetUpdate: (id: string, name: string, description: string) => void;
  deleteBudgetUpdate: (id: string) => void;
  openBudgetUpdate: (id: string) => void;
  closeBudgetUpdate: () => void;
  changeBudgetUpdateDatabase: (id: string, newDatabaseId: string) => void;
  updateBudgetUpdateProgress: (updateId: string, lineItemId: string, progress: number) => void;

  // Medicion actions
  createMedicionProject: (name: string, description: string, budgetId: string) => string;
  updateMedicionProject: (id: string, name: string, description: string) => void;
  deleteMedicionProject: (id: string) => void;
  openMedicionProject: (id: string) => void;
  closeMedicionProject: () => void;
  updateMedicionStatus: (projectId: string, itemId: string, status: MedicionStatus) => void;
  updateMedicionQuantityRevit: (projectId: string, itemId: string, qty: number) => void;
  updateMedicionNotes: (projectId: string, itemId: string, notes: string) => void;
  importRevitCsv: (projectId: string, matches: { code: string; quantity: number }[]) => number;

  // Hydrate store from server (called on app init)
  hydrate: (data: StorageData) => void;

  // Backup / Restore
  exportBackup: () => void;
  importBackup: (json: string) => { ok: boolean; error?: string };
  mergeBackup: (data: { databases?: Database[]; budgets?: Budget[]; budgetUpdates?: BudgetUpdate[] }) => void;
}

const saved = loadFromStorage();

const defaultDb = createDefaultDatabase();
const initialDatabases: Database[] = saved?.databases ?? [defaultDb];
const initialCurrentDatabaseId: string | null = saved?.currentDatabaseId ?? null;
const initialBudgets: Budget[] = saved?.budgets ?? [];
const initialCurrentBudgetId: string | null = saved?.currentBudgetId ?? null;
const initialBudgetUpdates: BudgetUpdate[] = saved?.budgetUpdates ?? [];
const initialCurrentBudgetUpdateId: string | null = saved?.currentBudgetUpdateId ?? null;
const initialMedicionProjects: MedicionProject[] = saved?.medicionProjects ?? [];
const initialCurrentMedicionId: string | null = saved?.currentMedicionId ?? null;
const initialIvaRates: number[] = saved?.ivaRates ?? [0, 0.05, 0.15];
const initialDefaultIvaRate: number = saved?.defaultIvaRate ?? 0.15;

function updateDbInList(databases: Database[], dbId: string | null, updater: (db: Database) => Database): Database[] {
  if (!dbId) return databases;
  return databases.map((db) => (db.id === dbId ? updater(db) : db));
}

export const useStore = create<AppState>((set, get) => ({
  databases: initialDatabases,
  currentDatabaseId: initialCurrentDatabaseId,
  budgets: initialBudgets,
  currentBudgetId: initialCurrentBudgetId,
  budgetUpdates: initialBudgetUpdates,
  currentBudgetUpdateId: initialCurrentBudgetUpdateId,
  medicionProjects: initialMedicionProjects,
  currentMedicionId: initialCurrentMedicionId,
  ivaRates: initialIvaRates,
  defaultIvaRate: initialDefaultIvaRate,

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
      return { databases, currentDatabaseId: newDb.id };
    });
    return newDb.id;
  },

  updateDatabase: (id, name, description) => {
    set((state) => {
      const databases = state.databases.map((db) =>
        db.id === id ? { ...db, name, description, updatedAt: new Date().toISOString() } : db
      );
      return { databases };
    });
  },

  deleteDatabase: (id) => {
    set((state) => {
      const databases = state.databases.filter((db) => db.id !== id);
      const currentDatabaseId = state.currentDatabaseId === id ? null : state.currentDatabaseId;
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
      return { databases };
    });
  },

  openDatabase: (id) => {
    set(() => ({ currentDatabaseId: id }));
  },

  closeDatabase: () => {
    set(() => ({ currentDatabaseId: null }));
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
      return { databases, currentDatabaseId: newId };
    });
    return newId;
  },

  updateDatabaseContents: (id, db) => {
    set((state) => {
      const databases = state.databases.map((d) =>
        d.id === id
          ? {
              ...d,
              name: db.name,
              description: db.description,
              items: db.items.map((i) => ({ ...i })),
              itemCategories: db.itemCategories.map((c) => ({ ...c })),
              rubros: db.rubros.map((r) => ({ ...r, components: r.components.map((c) => ({ ...c })) })),
              rubroCategories: db.rubroCategories.map((c) => ({ ...c })),
              updatedAt: new Date().toISOString(),
            }
          : d
      );
      return { databases };
    });
  },

  // ── Item actions ──────────────────────────────────────────────────────────

  addItem: (item) => {
    set((state) => {
      const databases = updateDbInList(state.databases, state.currentDatabaseId, (db) => ({
        ...db,
        items: [...db.items, item],
        updatedAt: new Date().toISOString(),
      }));
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
      ivaRate: 0.12,
    };
    set((state) => {
      const budgets = [...state.budgets, newBudget];
      return { budgets };
    });
  },

  updateBudget: (id, name, description) => {
    set((state) => {
      const budgets = state.budgets.map((b) =>
        b.id === id ? { ...b, name, description, updatedAt: new Date().toISOString() } : b
      );
      return { budgets };
    });
  },

  setBudgetIvaRate: (budgetId, rate) => {
    set((state) => ({
      budgets: state.budgets.map((b) =>
        b.id === budgetId ? { ...b, ivaRate: rate, updatedAt: new Date().toISOString() } : b
      ),
    }));
  },

  setIvaRates: (rates) => {
    set({ ivaRates: [...rates].sort((a, b) => a - b) });
  },

  setDefaultIvaRate: (rate) => {
    set({ defaultIvaRate: rate });
  },

  deleteBudget: (id) => {
    set((state) => {
      const budgets = state.budgets.filter((b) => b.id !== id);
      const currentBudgetId = state.currentBudgetId === id ? null : state.currentBudgetId;
      return { budgets, currentBudgetId };
    });
  },

  openBudget: (id) => {
    set(() => ({ currentBudgetId: id }));
  },

  closeBudget: () => {
    set(() => ({ currentBudgetId: null }));
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
      const bd = rubroBreakdown(rubro, db.items);
      const category = rubro.categoryId ? db.rubroCategories.find((c) => c.id === rubro.categoryId) : null;
      const lineItem: BudgetLineItem = {
        id: genId(),
        rubroId,
        rubroCode: rubro.code,
        rubroName: rubro.name,
        rubroDescription: rubro.description,
        rubroUnit: rubro.unit,
        categoryId: rubro.categoryId,
        categoryName: category?.name ?? '',
        quantity,
        unitCost,
        materialCost: bd.material,
        manoDeObraCost: bd.manoDeObra,
        equipoCost: bd.equipo,
      };
      const budgets = state.budgets.map((b) =>
        b.id === budgetId
          ? { ...b, lineItems: [...b.lineItems, lineItem], updatedAt: new Date().toISOString() }
          : b
      );
      return { budgets };
    });
  },

  addLineItemsBulk: (budgetId, items) => {
    set((state) => {
      const budget = state.budgets.find((b) => b.id === budgetId);
      if (!budget) return {};
      const db = state.databases.find((d) => d.id === budget.databaseId);
      if (!db) return {};
      const newLineItems: BudgetLineItem[] = [];
      for (const { rubroId, quantity } of items) {
        const rubro = db.rubros.find((r) => r.id === rubroId);
        if (!rubro || quantity <= 0) continue;
        const unitCost = rubroTotal(rubro, db.items);
        const bd = rubroBreakdown(rubro, db.items);
        const category = rubro.categoryId ? db.rubroCategories.find((c) => c.id === rubro.categoryId) : null;
        newLineItems.push({
          id: genId(),
          rubroId,
          rubroCode: rubro.code,
          rubroName: rubro.name,
          rubroDescription: rubro.description,
          rubroUnit: rubro.unit,
          categoryId: rubro.categoryId,
          categoryName: category?.name ?? '',
          quantity,
          unitCost,
          materialCost: bd.material,
          manoDeObraCost: bd.manoDeObra,
          equipoCost: bd.equipo,
        });
      }
      if (newLineItems.length === 0) return {};
      const budgets = state.budgets.map((b) =>
        b.id === budgetId
          ? { ...b, lineItems: [...b.lineItems, ...newLineItems], updatedAt: new Date().toISOString() }
          : b
      );
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
            const bd = rubroBreakdown(rubro, db.items);
            return {
              ...li,
              unitCost: rubroTotal(rubro, db.items),
              materialCost: bd.material,
              manoDeObraCost: bd.manoDeObra,
              equipoCost: bd.equipo,
            };
          }),
          updatedAt: new Date().toISOString(),
        };
      });
      return { budgets };
    });
  },

  // ── BudgetUpdate actions ────────────────────────────────────────────────────

  createBudgetUpdate: (name, description, sourceBudgetId, newDatabaseId) => {
    const now = new Date().toISOString();
    const state = get();
    const sourceBudget = state.budgets.find((b) => b.id === sourceBudgetId);
    if (!sourceBudget) return '';
    const newDb = state.databases.find((d) => d.id === newDatabaseId);
    const lineItems: BudgetUpdateLineItem[] = sourceBudget.lineItems.map((li) => ({
      id: genId(),
      rubroId: li.rubroId,
      rubroCode: li.rubroCode,
      rubroName: li.rubroName,
      rubroUnit: li.rubroUnit,
      categoryId: li.categoryId,
      categoryName: li.categoryName,
      quantity: li.quantity,
      progress: 0,
      oldUnitCost: li.unitCost,
      oldMaterialCost: li.materialCost,
      oldManoDeObraCost: li.manoDeObraCost,
      oldEquipoCost: li.equipoCost,
    }));
    const newUpdate: BudgetUpdate = {
      id: genId(),
      name,
      description,
      sourceBudgetId,
      sourceBudgetName: sourceBudget.name,
      newDatabaseId,
      newDatabaseName: newDb?.name ?? '',
      ivaRate: sourceBudget.ivaRate,
      createdAt: now,
      updatedAt: now,
      lineItems,
    };
    set((s) => {
      const budgetUpdates = [...s.budgetUpdates, newUpdate];
      return { budgetUpdates, currentBudgetUpdateId: newUpdate.id };
    });
    return newUpdate.id;
  },

  updateBudgetUpdate: (id, name, description) => {
    set((s) => {
      const budgetUpdates = s.budgetUpdates.map((u) =>
        u.id === id ? { ...u, name, description, updatedAt: new Date().toISOString() } : u
      );
      return { budgetUpdates };
    });
  },

  deleteBudgetUpdate: (id) => {
    set((s) => {
      const budgetUpdates = s.budgetUpdates.filter((u) => u.id !== id);
      const currentBudgetUpdateId = s.currentBudgetUpdateId === id ? null : s.currentBudgetUpdateId;
      return { budgetUpdates, currentBudgetUpdateId };
    });
  },

  openBudgetUpdate: (id) => {
    set(() => ({ currentBudgetUpdateId: id }));
  },

  closeBudgetUpdate: () => {
    set(() => ({ currentBudgetUpdateId: null }));
  },

  changeBudgetUpdateDatabase: (id, newDatabaseId) => {
    set((s) => {
      const db = s.databases.find((d) => d.id === newDatabaseId);
      const budgetUpdates = s.budgetUpdates.map((u) =>
        u.id === id
          ? { ...u, newDatabaseId, newDatabaseName: db?.name ?? '', updatedAt: new Date().toISOString() }
          : u
      );
      return { budgetUpdates };
    });
  },

  updateBudgetUpdateProgress: (updateId, lineItemId, progress) => {
    set((s) => {
      const budgetUpdates = s.budgetUpdates.map((u) =>
        u.id === updateId
          ? {
              ...u,
              lineItems: u.lineItems.map((li) => (li.id === lineItemId ? { ...li, progress } : li)),
              updatedAt: new Date().toISOString(),
            }
          : u
      );
      return { budgetUpdates };
    });
  },

  // ── Medicion actions ────────────────────────────────────────────────────────

  createMedicionProject: (name, description, budgetId) => {
    const now = new Date().toISOString();
    const state = get();
    const budget = state.budgets.find((b) => b.id === budgetId);
    if (!budget) return '';
    const lineItems: MedicionLineItem[] = budget.lineItems.map((li) => ({
      id: genId(),
      rubroId: li.rubroId,
      rubroCode: li.rubroCode,
      rubroName: li.rubroName,
      rubroUnit: li.rubroUnit,
      categoryId: li.categoryId,
      categoryName: li.categoryName,
      quantityBudget: li.quantity,
      quantityRevit: 0,
      unitCost: li.unitCost,
      status: 'pendiente' as MedicionStatus,
      notes: '',
    }));
    const project: MedicionProject = {
      id: genId(), name, description, budgetId, budgetName: budget.name,
      createdAt: now, updatedAt: now, lineItems,
    };
    set((s) => ({ medicionProjects: [...s.medicionProjects, project], currentMedicionId: project.id }));
    return project.id;
  },

  updateMedicionProject: (id, name, description) => {
    set((s) => ({
      medicionProjects: s.medicionProjects.map((p) =>
        p.id === id ? { ...p, name, description, updatedAt: new Date().toISOString() } : p
      ),
    }));
  },

  deleteMedicionProject: (id) => {
    set((s) => ({
      medicionProjects: s.medicionProjects.filter((p) => p.id !== id),
      currentMedicionId: s.currentMedicionId === id ? null : s.currentMedicionId,
    }));
  },

  openMedicionProject: (id) => { set(() => ({ currentMedicionId: id })); },
  closeMedicionProject: () => { set(() => ({ currentMedicionId: null })); },

  updateMedicionStatus: (projectId, itemId, status) => {
    set((s) => ({
      medicionProjects: s.medicionProjects.map((p) =>
        p.id !== projectId ? p : {
          ...p, updatedAt: new Date().toISOString(),
          lineItems: p.lineItems.map((li) => li.id === itemId ? { ...li, status } : li),
        }
      ),
    }));
  },

  updateMedicionQuantityRevit: (projectId, itemId, qty) => {
    set((s) => ({
      medicionProjects: s.medicionProjects.map((p) =>
        p.id !== projectId ? p : {
          ...p, updatedAt: new Date().toISOString(),
          lineItems: p.lineItems.map((li) => li.id === itemId ? { ...li, quantityRevit: qty } : li),
        }
      ),
    }));
  },

  updateMedicionNotes: (projectId, itemId, notes) => {
    set((s) => ({
      medicionProjects: s.medicionProjects.map((p) =>
        p.id !== projectId ? p : {
          ...p, updatedAt: new Date().toISOString(),
          lineItems: p.lineItems.map((li) => li.id === itemId ? { ...li, notes } : li),
        }
      ),
    }));
  },

  importRevitCsv: (projectId, matches) => {
    const codeMap = new Map(matches.map((m) => [m.code.trim().toLowerCase(), m.quantity]));
    let count = 0;
    set((s) => ({
      medicionProjects: s.medicionProjects.map((p) => {
        if (p.id !== projectId) return p;
        const lineItems = p.lineItems.map((li) => {
          const qty = codeMap.get(li.rubroCode.trim().toLowerCase());
          if (qty === undefined) return li;
          count++;
          return { ...li, quantityRevit: qty };
        });
        return { ...p, lineItems, updatedAt: new Date().toISOString() };
      }),
    }));
    return count;
  },

  hydrate: (data) => {
    set({
      databases: data.databases ?? [],
      currentDatabaseId: data.currentDatabaseId ?? null,
      budgets: data.budgets ?? [],
      currentBudgetId: data.currentBudgetId ?? null,
      budgetUpdates: data.budgetUpdates ?? [],
      currentBudgetUpdateId: data.currentBudgetUpdateId ?? null,
      medicionProjects: data.medicionProjects ?? [],
      currentMedicionId: data.currentMedicionId ?? null,
    });
  },

  exportBackup: () => {
    const s = useStore.getState();
    const data: StorageData = {
      databases: s.databases,
      currentDatabaseId: s.currentDatabaseId,
      budgets: s.budgets,
      currentBudgetId: s.currentBudgetId,
      budgetUpdates: s.budgetUpdates,
      currentBudgetUpdateId: s.currentBudgetUpdateId,
      medicionProjects: s.medicionProjects,
      currentMedicionId: s.currentMedicionId,
      ivaRates: s.ivaRates,
      defaultIvaRate: s.defaultIvaRate,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `buildkontrol-backup-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importBackup: (json) => {
    try {
      const data = JSON.parse(json) as StorageData;
      if (!Array.isArray(data.databases) || !Array.isArray(data.budgets) || !Array.isArray(data.budgetUpdates)) {
        return { ok: false, error: 'Archivo inválido: estructura incorrecta.' };
      }
      set({
        databases: data.databases,
        currentDatabaseId: data.currentDatabaseId ?? null,
        budgets: data.budgets,
        currentBudgetId: data.currentBudgetId ?? null,
        budgetUpdates: data.budgetUpdates,
        currentBudgetUpdateId: data.currentBudgetUpdateId ?? null,
      });
      return { ok: true };
    } catch {
      return { ok: false, error: 'No se pudo leer el archivo. Asegúrate de que sea un backup válido.' };
    }
  },

  mergeBackup: ({ databases: dbs = [], budgets: bgs = [], budgetUpdates: bus = [] }) => {
    set((s) => {
      // Upsert by id: replace if exists, append if new
      const upsert = <T extends { id: string }>(current: T[], incoming: T[]) => {
        const map = new Map(current.map((x) => [x.id, x]));
        incoming.forEach((x) => map.set(x.id, x));
        return Array.from(map.values());
      };
      return {
        databases: upsert(s.databases, dbs),
        budgets: upsert(s.budgets, bgs),
        budgetUpdates: upsert(s.budgetUpdates, bus),
      };
    });
  },
}));

// ── Auto-persist on every state change ───────────────────────────────────────
// Single subscription saves ALL fields — no action needs its own saveToStorage call.
useStore.subscribe((state) => {
  saveToServer({
    databases: state.databases,
    currentDatabaseId: state.currentDatabaseId,
    budgets: state.budgets,
    currentBudgetId: state.currentBudgetId,
    budgetUpdates: state.budgetUpdates,
    currentBudgetUpdateId: state.currentBudgetUpdateId,
    medicionProjects: state.medicionProjects,
    currentMedicionId: state.currentMedicionId,
    ivaRates: state.ivaRates,
    defaultIvaRate: state.defaultIvaRate,
  });
});

// ── Standalone helper functions ───────────────────────────────────────────────

export function itemTotal(item: Item): number {
  const base = item.material + item.manoDeObra + item.equipo + item.indirectos;
  return base * (1 + (item.ivaRate ?? 0));
}

export function itemBase(item: Item): number {
  return item.material + item.manoDeObra + item.equipo + item.indirectos;
}

export function rubroTotal(rubro: Rubro, items: Item[]): number {
  return rubro.components.reduce((sum, comp) => {
    const item = items.find((i) => i.id === comp.itemId);
    if (!item) return sum;
    return sum + itemTotal(item) * comp.quantity;
  }, 0);
}

export function rubroBreakdown(rubro: Rubro, items: Item[]): { material: number; manoDeObra: number; equipo: number } {
  let material = 0, manoDeObra = 0, equipo = 0;
  for (const comp of rubro.components) {
    const item = items.find((i) => i.id === comp.itemId);
    if (!item) continue;
    const cost = itemTotal(item) * comp.quantity;
    if (comp.type === 'material') material += cost;
    else if (comp.type === 'manoDeObra') manoDeObra += cost;
    else if (comp.type === 'equipo') equipo += cost;
  }
  return { material, manoDeObra, equipo };
}

export function getCategoryIds(
  categoryId: string,
  categories: Array<{ id: string; parentId: string | null }>
): string[] {
  const children = categories.filter((c) => c.parentId === categoryId);
  return [categoryId, ...children.flatMap((c) => getCategoryIds(c.id, categories))];
}

export function formatMoney(value: number): string {
  return '$' + value.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function genId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
