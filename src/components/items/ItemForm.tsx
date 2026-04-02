import React, { useState } from 'react';
import { Item, ItemCategory } from '../../types';
import { itemTotal, genId } from '../../store/useStore';

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
  const [unit, setUnit] = useState(item?.unit ?? '');
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
    if (!code.trim()) e.code = 'El código es requerido';
    if (!name.trim()) e.name = 'El nombre es requerido';
    if (!unit.trim()) e.unit = 'La unidad es requerida';
    return e;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    const saved: Item = {
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
    };
    onSave(saved);
  }

  // Build category options - flat list with indentation
  function buildOptions(cats: ItemCategory[], parentId: string | null, depth: number): React.ReactNode[] {
    return cats
      .filter((c) => c.parentId === parentId)
      .flatMap((c) => [
        <option key={c.id} value={c.id}>
          {'  '.repeat(depth) + c.name}
        </option>,
        ...buildOptions(cats, c.id, depth + 1),
      ]);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Código */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Código *</label>
          <input
            type="text"
            value={code}
            onChange={(e) => { setCode(e.target.value); setErrors((err) => ({ ...err, code: '' })); }}
            className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 ${errors.code ? 'border-red-400' : 'border-gray-300'}`}
            placeholder="ej. MAT-OG-001"
          />
          {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
        </div>

        {/* Unidad */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Unidad *</label>
          <input
            type="text"
            value={unit}
            onChange={(e) => { setUnit(e.target.value); setErrors((err) => ({ ...err, unit: '' })); }}
            className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 ${errors.unit ? 'border-red-400' : 'border-gray-300'}`}
            placeholder="ej. kg, m², h"
          />
          {errors.unit && <p className="text-red-500 text-xs mt-1">{errors.unit}</p>}
        </div>
      </div>

      {/* Nombre */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setErrors((err) => ({ ...err, name: '' })); }}
          className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 ${errors.name ? 'border-red-400' : 'border-gray-300'}`}
          placeholder="Nombre del item"
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 resize-none"
          placeholder="Descripción del item"
        />
      </div>

      {/* Categoría */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
        <select
          value={categoryId ?? ''}
          onChange={(e) => setCategoryId(e.target.value || null)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
        >
          <option value="">Sin categoría</option>
          {buildOptions(categories, null, 0)}
        </select>
      </div>

      {/* Precios */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Material ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mano de Obra ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={manoDeObra}
            onChange={(e) => setManoDeObra(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Equipo ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={equipo}
            onChange={(e) => setEquipo(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Indirectos ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={indirectos}
            onChange={(e) => setIndirectos(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>
      </div>

      {/* Total */}
      <div className="bg-green-50 border border-green-200 rounded-md px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-medium text-green-800">Total calculado:</span>
        <span className="text-lg font-bold text-green-700">${total.toFixed(2)}</span>
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          {item ? 'Guardar cambios' : 'Crear Item'}
        </button>
      </div>
    </form>
  );
}

// Re-export itemTotal for convenience
export { itemTotal };
