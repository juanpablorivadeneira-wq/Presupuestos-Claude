import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { Item, ItemCategory } from '../../types';
import { genId, formatMoney, useStore } from '../../store/useStore';
import { UNITS } from '../../data/units';

interface ItemFormProps {
  item?: Item;
  categories: ItemCategory[];
  onSave: (item: Item) => void;
  onCancel: () => void;
}

type CostFieldType = 'material' | 'manoDeObra' | 'equipo' | 'subcontrato' | null;

function detectCostType(catId: string | null, cats: ItemCategory[]): CostFieldType {
  if (!catId) return null;
  let current = cats.find((c) => c.id === catId);
  let root = current;
  while (current?.parentId) {
    const parent = cats.find((c) => c.id === current!.parentId);
    if (!parent) break;
    root = parent;
    current = parent;
  }
  if (!root) return null;
  const n = root.name.toLowerCase();
  if (n.includes('mano') || n.includes('obra') || n.includes('labor')) return 'manoDeObra';
  if (n.includes('equipo') || n.includes('equipment') || n.includes('maquinaria')) return 'equipo';
  if (n.includes('subcontrat')) return 'subcontrato';
  if (n.includes('material')) return 'material';
  return null;
}

export default function ItemForm({ item, categories, onSave, onCancel }: ItemFormProps) {
  const ivaRates = useStore((s) => s.ivaRates);
  const defaultIvaRate = useStore((s) => s.defaultIvaRate);

  const [code, setCode] = useState(item?.code ?? '');
  const [name, setName] = useState(item?.name ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [unit, setUnit] = useState(item?.unit ?? 'Und');
  const [material, setMaterial] = useState(String(item?.material ?? '0'));
  const [manoDeObra, setManoDeObra] = useState(String(item?.manoDeObra ?? '0'));
  const [equipo, setEquipo] = useState(String(item?.equipo ?? '0'));
  const [indirectos, setIndirectos] = useState(String(item?.indirectos ?? '0'));
  const [ivaRate, setIvaRate] = useState(item ? (item.ivaRate ?? 0) : defaultIvaRate);
  const [categoryId, setCategoryId] = useState<string | null>(item?.categoryId ?? null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const costType = detectCostType(categoryId, categories);
  const matDisabled = costType !== null && costType !== 'material';
  const moDisabled  = costType !== null && costType !== 'manoDeObra';
  const eqDisabled  = costType !== null && costType !== 'equipo';

  function handleCategoryChange(newCatId: string | null) {
    const newType = detectCostType(newCatId, categories);
    setCategoryId(newCatId);
    if (newType === 'material')   { setManoDeObra('0'); setEquipo('0'); }
    if (newType === 'manoDeObra') { setMaterial('0');   setEquipo('0'); }
    if (newType === 'equipo')     { setMaterial('0');   setManoDeObra('0'); }
    if (newType === 'subcontrato'){ setMaterial('0');   setManoDeObra('0'); setEquipo('0'); }
    // Suggest IVA for new items based on category type
    if (!item) {
      if (newType === 'manoDeObra') setIvaRate(0);
      else if (newType !== null)    setIvaRate(defaultIvaRate);
    }
  }

  const matVal = parseFloat(material) || 0;
  const moVal  = parseFloat(manoDeObra) || 0;
  const eqVal  = parseFloat(equipo) || 0;
  const indVal = parseFloat(indirectos) || 0;
  const base   = matVal + moVal + eqVal + indVal;
  const ivaAmt = base * ivaRate;
  const total  = base * (1 + ivaRate);

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'El nombre es requerido';
    if (!unit.trim()) e.unit = 'La unidad es requerida';
    return e;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    onSave({
      id: item?.id ?? genId(),
      code: code.trim(),
      name: name.trim(),
      description: description.trim(),
      unit: unit.trim(),
      material: matDisabled ? 0 : matVal,
      manoDeObra: moDisabled ? 0 : moVal,
      equipo: eqDisabled ? 0 : eqVal,
      indirectos: indVal,
      ivaRate,
      categoryId,
    });
  }

  function buildOptions(cats: ItemCategory[], parentId: string | null, depth: number): React.ReactNode[] {
    return cats
      .filter((c) => c.parentId === parentId)
      .flatMap((c) => [
        <option key={c.id} value={c.id}>{'  '.repeat(depth) + c.name}</option>,
        ...buildOptions(cats, c.id, depth + 1),
      ]);
  }

  const inputCls = (err?: string, disabled = false) =>
    `w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 ${
      disabled
        ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
        : err
          ? 'bg-gray-50 border-red-400'
          : 'bg-gray-50 border-gray-200'
    }`;

  const availableRates = [...new Set([...ivaRates, ivaRate])].sort((a, b) => a - b);

  const costTypeLabel: Record<NonNullable<CostFieldType>, string> = {
    material: 'Material',
    manoDeObra: 'Mano de Obra',
    equipo: 'Equipo',
    subcontrato: 'Subcontrato',
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Nombre + Código */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <label className="block text-sm text-gray-700 mb-1">Nombre *</label>
          <input
            type="text" value={name} autoFocus
            onChange={(e) => { setName(e.target.value); setErrors((err) => ({ ...err, name: '' })); }}
            className={inputCls(errors.name)}
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Código</label>
          <input type="text" value={code} onChange={(e) => setCode(e.target.value)} className={inputCls()} placeholder="ej. MAT-OG-001" />
        </div>
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-sm text-gray-700 mb-1">Descripción</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-1 focus:ring-green-500 resize-none" />
      </div>

      {/* Unidad + Categoría */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Unidad *</label>
          <select value={unit} onChange={(e) => { setUnit(e.target.value); setErrors((err) => ({ ...err, unit: '' })); }} className={inputCls(errors.unit)}>
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            {!UNITS.includes(unit) && unit && <option value={unit}>{unit}</option>}
          </select>
          {errors.unit && <p className="text-red-500 text-xs mt-1">{errors.unit}</p>}
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Categoría</label>
          <select
            value={categoryId ?? ''}
            onChange={(e) => handleCategoryChange(e.target.value || null)}
            className={inputCls()}
          >
            <option value="">Sin categoría</option>
            {buildOptions(categories, null, 0)}
          </select>
        </div>
      </div>

      {/* Costos — with category-type lock */}
      {costType && (
        <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded px-2 py-1">
          <span>Categoría <strong>{costTypeLabel[costType]}</strong> — solo se edita el campo correspondiente</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={`block text-sm mb-1 ${matDisabled ? 'text-gray-400' : 'text-gray-700'}`}>Costo Material</label>
          <input
            type="number" min="0" step="0.0001"
            value={matDisabled ? '0' : material}
            onChange={(e) => setMaterial(e.target.value)}
            disabled={matDisabled}
            className={inputCls(undefined, matDisabled)}
          />
        </div>
        <div>
          <label className={`block text-sm mb-1 ${moDisabled ? 'text-gray-400' : 'text-gray-700'}`}>Costo Mano de Obra</label>
          <input
            type="number" min="0" step="0.0001"
            value={moDisabled ? '0' : manoDeObra}
            onChange={(e) => setManoDeObra(e.target.value)}
            disabled={moDisabled}
            className={inputCls(undefined, moDisabled)}
          />
        </div>
        <div>
          <label className={`block text-sm mb-1 ${eqDisabled ? 'text-gray-400' : 'text-gray-700'}`}>Costo Equipo</label>
          <input
            type="number" min="0" step="0.0001"
            value={eqDisabled ? '0' : equipo}
            onChange={(e) => setEquipo(e.target.value)}
            disabled={eqDisabled}
            className={inputCls(undefined, eqDisabled)}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Costos Indirectos</label>
          <input type="number" min="0" step="0.0001" value={indirectos} onChange={(e) => setIndirectos(e.target.value)} className={inputCls()} />
        </div>
      </div>

      {/* IVA + Totales */}
      <div className={`border rounded-md px-4 py-3 space-y-2 ${item && item.ivaRate === undefined ? 'bg-amber-50 border-amber-300' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-700 shrink-0">IVA aplicable</label>
          <select
            value={ivaRate}
            onChange={(e) => setIvaRate(parseFloat(e.target.value))}
            className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
          >
            {availableRates.map((r) => (
              <option key={r} value={r}>{(r * 100).toFixed(0)}%</option>
            ))}
          </select>
          {ivaRate === 0 && item && item.ivaRate === undefined && <span className="text-xs text-amber-600 font-medium">⚠ Sin IVA asignado — guarda para confirmar</span>}
          {ivaRate === 0 && (!item || item.ivaRate === 0) && <span className="text-xs text-gray-400">Exento / Artesano</span>}
        </div>
        <div className="grid grid-cols-3 gap-4 pt-1 border-t border-gray-200">
          <div>
            <p className="text-xs text-gray-400">Base (sin IVA)</p>
            <p className="text-sm font-medium text-gray-700">{formatMoney(base)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">IVA ({(ivaRate * 100).toFixed(0)}%)</p>
            <p className="text-sm font-medium text-amber-600">{formatMoney(ivaAmt)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Precio unitario</p>
            <p className="text-base font-bold text-green-600">{formatMoney(total)}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-gray-200 pt-4 flex justify-end gap-4">
        <button type="button" onClick={onCancel} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-800">
          <X size={14} /> Cancelar
        </button>
        <button type="submit" className="flex items-center gap-1.5 text-sm text-gray-800 font-medium hover:text-green-700">
          <Check size={14} /> Guardar
        </button>
      </div>
    </form>
  );
}
