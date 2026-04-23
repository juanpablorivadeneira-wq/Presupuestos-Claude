import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { Item, ItemCategory } from '../../types';
import { genId, formatMoney } from '../../store/useStore';
import { UNITS } from '../../data/units';

interface ItemFormProps {
  item?: Item;
  categories: ItemCategory[];
  onSave: (item: Item) => void;
  onCancel: () => void;
}

export default function ItemForm({ item, categories, onSave, onCancel }: ItemFormProps) {
  const [code, setCode] = useState(item?.code ?? '');
  const [name, setName] = useState(item?.name ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [unit, setUnit] = useState(item?.unit ?? 'Und');
  const [material, setMaterial] = useState(String(item?.material ?? '0'));
  const [manoDeObra, setManoDeObra] = useState(String(item?.manoDeObra ?? '0'));
  const [equipo, setEquipo] = useState(String(item?.equipo ?? '0'));
  const [indirectos, setIndirectos] = useState(String(item?.indirectos ?? '0'));
  const [categoryId, setCategoryId] = useState<string | null>(item?.categoryId ?? null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const matVal = parseFloat(material) || 0;
  const moVal = parseFloat(manoDeObra) || 0;
  const eqVal = parseFloat(equipo) || 0;
  const indVal = parseFloat(indirectos) || 0;
  const total = matVal + moVal + eqVal + indVal;

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
      material: matVal,
      manoDeObra: moVal,
      equipo: eqVal,
      indirectos: indVal,
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

  const inputCls = (err?: string) =>
    `w-full border rounded-md px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-1 focus:ring-green-500 ${err ? 'border-red-400' : 'border-gray-200'}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Row 1: Nombre + Código */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <label className="block text-sm text-gray-700 mb-1">Nombre *</label>
          <input
            type="text"
            value={name}
            autoFocus
            onChange={(e) => { setName(e.target.value); setErrors((err) => ({ ...err, name: '' })); }}
            className={inputCls(errors.name)}
            placeholder=""
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Código</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={inputCls()}
            placeholder="ej. MAT-OG-001"
          />
        </div>
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-sm text-gray-700 mb-1">Descripción</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-1 focus:ring-green-500 resize-none"
        />
      </div>

      {/* Row: Unidad + Categoría */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Unidad *</label>
          <select
            value={unit}
            onChange={(e) => { setUnit(e.target.value); setErrors((err) => ({ ...err, unit: '' })); }}
            className={inputCls(errors.unit)}
          >
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            {!UNITS.includes(unit) && unit && <option value={unit}>{unit}</option>}
          </select>
          {errors.unit && <p className="text-red-500 text-xs mt-1">{errors.unit}</p>}
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Categoría</label>
          <select
            value={categoryId ?? ''}
            onChange={(e) => setCategoryId(e.target.value || null)}
            className={inputCls()}
          >
            <option value="">Sin categoría</option>
            {buildOptions(categories, null, 0)}
          </select>
        </div>
      </div>

      {/* Costos 2x2 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Costo Material</label>
          <input type="number" min="0" step="0.0001" value={material}
            onChange={(e) => setMaterial(e.target.value)}
            className={inputCls()} />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Costo Mano de Obra</label>
          <input type="number" min="0" step="0.0001" value={manoDeObra}
            onChange={(e) => setManoDeObra(e.target.value)}
            className={inputCls()} />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Costo Equipo</label>
          <input type="number" min="0" step="0.0001" value={equipo}
            onChange={(e) => setEquipo(e.target.value)}
            className={inputCls()} />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Costos Indirectos</label>
          <input type="number" min="0" step="0.0001" value={indirectos}
            onChange={(e) => setIndirectos(e.target.value)}
            className={inputCls()} />
        </div>
      </div>

      {/* Total */}
      <div>
        <p className="text-sm font-bold text-gray-800">Costo Total (Calculado)</p>
        <p className="text-xl font-bold text-green-600 mt-1">{formatMoney(total)}</p>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 pt-4 flex justify-end gap-4">
        <button type="button" onClick={onCancel}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-800">
          <X size={14} /> Cancelar
        </button>
        <button type="submit"
          className="flex items-center gap-1.5 text-sm text-gray-800 font-medium hover:text-green-700">
          <Check size={14} /> Guardar
        </button>
      </div>
    </form>
  );
}
