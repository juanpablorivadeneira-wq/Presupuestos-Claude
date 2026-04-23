import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Search, Plus, X, AlertCircle } from 'lucide-react';
import { Item, ItemCategory, Rubro, RubroCategory } from '../../types';
import { itemTotal, genId, formatMoney } from '../../store/useStore';

interface RubroFormProps {
  rubro?: Rubro;
  rubros: Rubro[];
  rubroCategories: RubroCategory[];
  items: Item[];
  itemCategories: ItemCategory[];
  onSave: (rubro: Rubro) => void;
  onCancel: () => void;
}

type ComponentType = 'material' | 'manoDeObra' | 'equipo' | 'subcontrato';

interface ComponentRow {
  id: string;
  itemId: string;
  quantity: number;
  type: ComponentType;
}

const UNITS = ['m²', 'm³', 'm', 'ml', 'kg', 'ton', 'h', 'día', 'mes', 'Und', 'Global', 'km', 'l'];

const TYPE_LABELS: Record<ComponentType, string> = {
  material: 'Material',
  manoDeObra: 'Mano de Obra',
  equipo: 'Equipo',
  subcontrato: 'Subcontrato',
};

const TYPE_COLORS: Record<ComponentType, string> = {
  material: 'bg-blue-100 text-blue-700',
  manoDeObra: 'bg-orange-100 text-orange-700',
  equipo: 'bg-purple-100 text-purple-700',
  subcontrato: 'bg-yellow-100 text-yellow-700',
};

function detectType(item: Item, itemCategories: ItemCategory[]): ComponentType {
  const cat = itemCategories.find((c) => c.id === item.categoryId);
  if (cat) {
    const n = cat.name.toLowerCase();
    if (n.includes('mano') || n.includes('obra') || n.includes('labor')) return 'manoDeObra';
    if (n.includes('equipo') || n.includes('equipment') || n.includes('maquinaria')) return 'equipo';
    if (n.includes('subcontrat') || n.includes('sc')) return 'subcontrato';
  }
  if (item.manoDeObra > 0 && item.material === 0 && item.equipo === 0) return 'manoDeObra';
  if (item.equipo > 0 && item.material === 0 && item.manoDeObra === 0) return 'equipo';
  return 'material';
}

export default function RubroForm({
  rubro,
  rubros,
  rubroCategories,
  items,
  itemCategories,
  onSave,
  onCancel,
}: RubroFormProps) {
  const [code, setCode] = useState(rubro?.code ?? '');
  const [name, setName] = useState(rubro?.name ?? '');
  const [description, setDescription] = useState(rubro?.description ?? '');
  const [unit, setUnit] = useState(rubro?.unit ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(rubro?.categoryId ?? null);
  const [components, setComponents] = useState<ComponentRow[]>(
    rubro?.components.map((c) => ({
      id: c.id,
      itemId: c.itemId,
      quantity: c.quantity,
      type: c.type,
    })) ?? []
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Quantity inline editing state
  const [editingCompId, setEditingCompId] = useState<string | null>(null);
  const [editingQtyText, setEditingQtyText] = useState('');

  // Item picker state
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerCategoryId, setPickerCategoryId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showPicker && searchRef.current) {
      searchRef.current.focus();
    }
  }, [showPicker]);

  function checkDuplicateCode(val: string) {
    const exists = rubros.some((r) => r.id !== rubro?.id && r.code.trim().toLowerCase() === val.trim().toLowerCase());
    return exists ? 'Ya existe un APU con este código' : '';
  }

  function checkDuplicateName(val: string) {
    const exists = rubros.some((r) => r.id !== rubro?.id && r.name.trim().toLowerCase() === val.trim().toLowerCase());
    return exists ? 'Ya existe un APU con este nombre' : '';
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!code.trim()) e.code = 'Requerido';
    else { const dup = checkDuplicateCode(code); if (dup) e.code = dup; }
    if (!name.trim()) e.name = 'Requerido';
    else { const dup = checkDuplicateName(name); if (dup) e.name = dup; }
    if (!unit.trim()) e.unit = 'Requerido';
    if (!categoryId) e.categoryId = 'Requerido';
    return e;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    onSave({
      id: rubro?.id ?? genId(),
      code: code.trim(),
      name: name.trim(),
      description: description.trim(),
      unit: unit.trim(),
      categoryId,
      components: components.map((c) => ({
        id: c.id, itemId: c.itemId, quantity: c.quantity, type: c.type,
      })),
    });
  }

  function buildCatOptions(cats: RubroCategory[], parentId: string | null, depth: number): React.ReactNode[] {
    return cats
      .filter((c) => c.parentId === parentId)
      .flatMap((c) => [
        <option key={c.id} value={c.id}>{'  '.repeat(depth) + c.name}</option>,
        ...buildCatOptions(cats, c.id, depth + 1),
      ]);
  }

  function addComponent(item: Item) {
    // Don't add duplicates — just increment quantity instead
    const existing = components.find((c) => c.itemId === item.id);
    if (existing) {
      setComponents((prev) =>
        prev.map((c) => c.id === existing.id ? { ...c, quantity: c.quantity + 1 } : c)
      );
      return;
    }
    setComponents((prev) => [
      ...prev,
      { id: genId(), itemId: item.id, quantity: 1, type: detectType(item, itemCategories) },
    ]);
  }

  function removeComponent(id: string) {
    setComponents((prev) => prev.filter((c) => c.id !== id));
  }

  function updateQty(id: string, qty: number) {
    const rounded = Math.round(qty * 1e8) / 1e8;
    setComponents((prev) => prev.map((c) => (c.id === id ? { ...c, quantity: Math.max(0, rounded) } : c)));
  }

  // Filtered items for the picker
  const pickerItems = items.filter((i) => {
    const matchSearch = !pickerSearch.trim() ||
      i.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
      i.code.toLowerCase().includes(pickerSearch.toLowerCase());
    const matchCat = !pickerCategoryId || i.categoryId === pickerCategoryId;
    return matchSearch && matchCat;
  });

  // Totals
  const total = components.reduce((sum, c) => {
    const item = items.find((i) => i.id === c.itemId);
    return item ? sum + itemTotal(item) * c.quantity : sum;
  }, 0);

  const matTotal = components
    .filter((c) => c.type === 'material')
    .reduce((s, c) => { const it = items.find((i) => i.id === c.itemId); return it ? s + itemTotal(it) * c.quantity : s; }, 0);
  const labTotal = components
    .filter((c) => c.type === 'manoDeObra')
    .reduce((s, c) => { const it = items.find((i) => i.id === c.itemId); return it ? s + itemTotal(it) * c.quantity : s; }, 0);
  const eqpTotal = components
    .filter((c) => c.type === 'equipo')
    .reduce((s, c) => { const it = items.find((i) => i.id === c.itemId); return it ? s + itemTotal(it) * c.quantity : s; }, 0);

  const inputCls = (err?: string) =>
    `w-full border rounded-md px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-1 focus:ring-green-500 focus:bg-white transition-colors ${err ? 'border-red-400' : 'border-gray-200'}`;

  return (
    <form onSubmit={handleSubmit} className="flex gap-0 flex-1 overflow-hidden" style={{ minHeight: 480 }}>

      {/* ── LEFT PANEL — Rubro info ──────────────────────────────── */}
      <div className="w-72 shrink-0 border-r border-gray-200 px-5 py-4 flex flex-col gap-3 bg-gray-50">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Detalles del Rubro</p>

        {/* Código */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Código <span className="text-red-400">*</span></label>
          <input
            type="text"
            value={code}
            onChange={(e) => {
              const v = e.target.value;
              setCode(v);
              const dup = v.trim() ? checkDuplicateCode(v) : '';
              setErrors((p) => ({ ...p, code: dup }));
            }}
            className={inputCls(errors.code)}
            placeholder="ej. 02.01.01"
            autoFocus
          />
          {errors.code && (
            <p className="text-red-500 text-xs mt-0.5 flex items-center gap-1">
              <AlertCircle size={11} />{errors.code}
            </p>
          )}
        </div>

        {/* Nombre */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nombre <span className="text-red-400">*</span></label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              const v = e.target.value;
              setName(v);
              const dup = v.trim() ? checkDuplicateName(v) : '';
              setErrors((p) => ({ ...p, name: dup }));
            }}
            className={inputCls(errors.name)}
            placeholder="Nombre del rubro"
          />
          {errors.name && (
            <p className="text-red-500 text-xs mt-0.5 flex items-center gap-1">
              <AlertCircle size={11} />{errors.name}
            </p>
          )}
        </div>

        {/* Unidad */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Unidad <span className="text-red-400">*</span></label>
          <select
            value={unit}
            onChange={(e) => { setUnit(e.target.value); setErrors((p) => ({ ...p, unit: '' })); }}
            className={inputCls(errors.unit)}
          >
            <option value="">Seleccionar unidad...</option>
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
          {errors.unit && <p className="text-red-500 text-xs mt-0.5">{errors.unit}</p>}
        </div>

        {/* Categoría */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Categoría <span className="text-red-400">*</span></label>
          <select
            value={categoryId ?? ''}
            onChange={(e) => { setCategoryId(e.target.value || null); setErrors((p) => ({ ...p, categoryId: '' })); }}
            className={inputCls(errors.categoryId)}
          >
            <option value="">Seleccionar categoría...</option>
            {buildCatOptions(rubroCategories, null, 0)}
          </select>
          {errors.categoryId && (
            <p className="text-red-500 text-xs mt-0.5 flex items-center gap-1">
              <AlertCircle size={11} />{errors.categoryId}
            </p>
          )}
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={inputCls() + ' resize-none'}
            placeholder="Descripción opcional"
          />
        </div>

        {/* Cost summary */}
        <div className="mt-auto pt-3 border-t border-gray-200 space-y-1.5">
          {[
            { label: 'Material', val: matTotal, color: 'text-blue-600' },
            { label: 'Mano de Obra', val: labTotal, color: 'text-orange-600' },
            { label: 'Equipo', val: eqpTotal, color: 'text-purple-600' },
          ].map(({ label, val, color }) => (
            <div key={label} className="flex justify-between text-xs">
              <span className="text-gray-500">{label}</span>
              <span className={`font-medium ${color}`}>{formatMoney(val)}</span>
            </div>
          ))}
          <div className="flex justify-between items-center pt-1 border-t border-gray-200">
            <span className="text-sm font-semibold text-gray-700">Costo Total</span>
            <span className="text-base font-bold text-green-700">{formatMoney(total)}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-100 text-gray-600"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex-1 px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
          >
            {rubro ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </div>

      {/* ── RIGHT PANEL — Components ────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-white shrink-0">
          <div>
            <p className="text-sm font-semibold text-gray-800">Componentes del Rubro</p>
            <p className="text-xs text-gray-400">{components.length} item(s) agregado(s)</p>
          </div>
          <button
            type="button"
            onClick={() => setShowPicker((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
          >
            <Plus size={15} />
            Agregar Item
          </button>
        </div>

        {/* ── Item picker panel (inline, slides down) ─────────── */}
        {showPicker && (
          <div className="border-b border-gray-200 bg-gray-50 flex flex-col shrink-0" style={{ maxHeight: 260 }}>
            {/* Picker header */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Buscar por nombre o código..."
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
                />
              </div>
              <select
                value={pickerCategoryId ?? ''}
                onChange={(e) => setPickerCategoryId(e.target.value || null)}
                className="text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-500 bg-white max-w-[180px]"
              >
                <option value="">Todas las categorías</option>
                {itemCategories
                  .filter((c) => c.parentId === null)
                  .map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
              </select>
              <button
                type="button"
                onClick={() => { setShowPicker(false); setPickerSearch(''); setPickerCategoryId(null); }}
                className="p-1.5 rounded hover:bg-gray-200 text-gray-400"
              >
                <X size={15} />
              </button>
            </div>

            {/* Items list */}
            <div className="overflow-y-auto flex-1">
              {items.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-400">
                  No hay items en esta base de datos.
                  <br />
                  <span className="text-xs">Crea items en la pestaña "Items" primero.</span>
                </div>
              ) : pickerItems.length === 0 ? (
                <div className="px-4 py-4 text-center text-sm text-gray-400">
                  No se encontraron items con ese filtro.
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-gray-200 sticky top-0">
                    <tr>
                      <th className="px-4 py-1.5 text-left text-gray-600 font-semibold">Nombre</th>
                      <th className="px-3 py-1.5 text-left text-gray-600 font-semibold w-20">Unidad</th>
                      <th className="px-3 py-1.5 text-left text-gray-600 font-semibold w-24">Tipo</th>
                      <th className="px-3 py-1.5 text-right text-gray-600 font-semibold w-20">Costo</th>
                      <th className="px-3 py-1.5 text-center text-gray-600 font-semibold w-16">Agregar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pickerItems.map((item) => {
                      const type = detectType(item, itemCategories);
                      const isAdded = components.some((c) => c.itemId === item.id);
                      return (
                        <tr
                          key={item.id}
                          className={`border-b border-gray-100 cursor-pointer transition-colors ${isAdded ? 'bg-green-50' : 'bg-white hover:bg-blue-50'}`}
                          onClick={() => addComponent(item)}
                        >
                          <td className="px-4 py-1.5">
                            <span className="font-medium text-gray-800">{item.name}</span>
                            <span className="text-gray-400 ml-1.5 font-mono text-[10px]">{item.code}</span>
                          </td>
                          <td className="px-3 py-1.5 text-gray-500">{item.unit}</td>
                          <td className="px-3 py-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${TYPE_COLORS[type]}`}>
                              {TYPE_LABELS[type]}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-right text-green-600 font-semibold">
                            {formatMoney(itemTotal(item))}
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            {isAdded ? (
                              <span className="text-green-500 font-bold">✓</span>
                            ) : (
                              <Plus size={13} className="mx-auto text-gray-400" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── Component table ──────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {components.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
              <Plus size={32} className="text-gray-200" />
              <p className="text-sm">Haz clic en <strong className="text-gray-500">Agregar Item</strong> para componer el rubro</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Item</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 w-32">Tipo</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 w-20">P. Unit.</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 w-24">Cantidad</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 w-24">Subtotal</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {components.map((comp) => {
                  const item = items.find((i) => i.id === comp.itemId);
                  if (!item) return null;
                  const unitPrice = itemTotal(item);
                  const subtotal = unitPrice * comp.quantity;
                  return (
                    <tr key={comp.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <div className="text-sm font-medium text-gray-800 leading-tight">{item.name}</div>
                        <div className="text-xs text-gray-400">{item.code} · {item.unit}</div>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${TYPE_COLORS[comp.type]}`}>
                          {TYPE_LABELS[comp.type]}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-xs text-gray-500">{formatMoney(unitPrice)}</td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={editingCompId === comp.id ? editingQtyText : (comp.quantity === 0 ? '0' : parseFloat(comp.quantity.toFixed(4)).toString())}
                          onFocus={() => { setEditingCompId(comp.id); setEditingQtyText(comp.quantity === 0 ? '0' : String(comp.quantity)); }}
                          onChange={(e) => setEditingQtyText(e.target.value)}
                          onBlur={() => { updateQty(comp.id, parseFloat(editingQtyText.replace(',', '.')) || 0); setEditingCompId(null); }}
                          className="w-full text-right border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                        />
                      </td>
                      <td className="px-3 py-2 text-right text-xs font-semibold text-green-600">{formatMoney(subtotal)}</td>
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeComponent(comp.id)}
                          className="text-red-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </form>
  );
}
