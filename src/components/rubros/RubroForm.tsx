import React, { useState } from 'react';
import { Trash2, Search } from 'lucide-react';
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

export default function RubroForm({
  rubro,
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

  // Item search state
  const [itemSearch, setItemSearch] = useState('');
  const [showItemDropdown, setShowItemDropdown] = useState(false);

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
    const saved: Rubro = {
      id: rubro?.id ?? genId(),
      code: code.trim(),
      name: name.trim(),
      description: description.trim(),
      unit: unit.trim(),
      categoryId,
      components: components.map((c) => ({
        id: c.id,
        itemId: c.itemId,
        quantity: c.quantity,
        type: c.type,
      })),
    };
    onSave(saved);
  }

  // Build category options
  function buildOptions(
    cats: RubroCategory[],
    parentId: string | null,
    depth: number
  ): React.ReactNode[] {
    return cats
      .filter((c) => c.parentId === parentId)
      .flatMap((c) => [
        <option key={c.id} value={c.id}>
          {'  '.repeat(depth) + c.name}
        </option>,
        ...buildOptions(cats, c.id, depth + 1),
      ]);
  }

  // Filter items for search
  const filteredItems = itemSearch.trim()
    ? items.filter(
        (i) =>
          i.code.toLowerCase().includes(itemSearch.toLowerCase()) ||
          i.name.toLowerCase().includes(itemSearch.toLowerCase())
      )
    : items;

  function addComponent(item: Item) {
    // Determine type from category
    const cat = itemCategories.find((c) => c.id === item.categoryId);
    let type: ComponentType = 'material';
    if (cat) {
      const catName = cat.name.toLowerCase();
      if (catName.includes('mano') || catName.includes('obra') || item.manoDeObra > 0) type = 'manoDeObra';
      else if (catName.includes('equipo') || item.equipo > 0) type = 'equipo';
      else if (catName.includes('subcontrat') || catName.includes('sc')) type = 'subcontrato';
      else type = 'material';
    } else {
      if (item.manoDeObra > 0) type = 'manoDeObra';
      else if (item.equipo > 0) type = 'equipo';
      else type = 'material';
    }

    setComponents((prev) => [
      ...prev,
      { id: genId(), itemId: item.id, quantity: 1, type },
    ]);
    setItemSearch('');
    setShowItemDropdown(false);
  }

  function removeComponent(id: string) {
    setComponents((prev) => prev.filter((c) => c.id !== id));
  }

  function updateComponentQty(id: string, qty: number) {
    setComponents((prev) => prev.map((c) => (c.id === id ? { ...c, quantity: qty } : c)));
  }

  function updateComponentType(id: string, type: ComponentType) {
    setComponents((prev) => prev.map((c) => (c.id === id ? { ...c, type } : c)));
  }

  // Calculate total
  const total = components.reduce((sum, comp) => {
    const item = items.find((i) => i.id === comp.itemId);
    if (!item) return sum;
    return sum + itemTotal(item) * comp.quantity;
  }, 0);

  const typeLabels: Record<ComponentType, string> = {
    material: 'Material',
    manoDeObra: 'Mano de Obra',
    equipo: 'Equipo',
    subcontrato: 'Subcontrato',
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Código *</label>
          <input
            type="text"
            value={code}
            onChange={(e) => { setCode(e.target.value); setErrors((err) => ({ ...err, code: '' })); }}
            className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 ${errors.code ? 'border-red-400' : 'border-gray-300'}`}
            placeholder="ej. 02.01.01"
          />
          {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Unidad *</label>
          <input
            type="text"
            value={unit}
            onChange={(e) => { setUnit(e.target.value); setErrors((err) => ({ ...err, unit: '' })); }}
            className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 ${errors.unit ? 'border-red-400' : 'border-gray-300'}`}
            placeholder="ej. m², m³, Und"
          />
          {errors.unit && <p className="text-red-500 text-xs mt-1">{errors.unit}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setErrors((err) => ({ ...err, name: '' })); }}
          className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 ${errors.name ? 'border-red-400' : 'border-gray-300'}`}
          placeholder="Nombre del rubro"
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 resize-none"
          placeholder="Descripción del rubro"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
        <select
          value={categoryId ?? ''}
          onChange={(e) => setCategoryId(e.target.value || null)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
        >
          <option value="">Sin categoría</option>
          {buildOptions(rubroCategories, null, 0)}
        </select>
      </div>

      {/* Components section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">Componentes (Items)</label>
          <span className="text-xs text-gray-400">{components.length} componente(s)</span>
        </div>

        {/* Search and add item */}
        <div className="relative mb-3">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar y agregar item..."
            value={itemSearch}
            onChange={(e) => { setItemSearch(e.target.value); setShowItemDropdown(true); }}
            onFocus={() => setShowItemDropdown(true)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500"
          />
          {showItemDropdown && itemSearch && filteredItems.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-20 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto mt-0.5">
              {filteredItems.slice(0, 20).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addComponent(item)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 flex items-center justify-between gap-2"
                >
                  <div>
                    <span className="font-mono text-xs text-gray-500 mr-2">{item.code}</span>
                    <span className="text-gray-800">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-400">{item.unit}</span>
                    <span className="text-xs font-semibold text-green-600">{formatMoney(itemTotal(item))}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
          {showItemDropdown && itemSearch && filteredItems.length === 0 && (
            <div className="absolute top-full left-0 right-0 z-20 bg-white border border-gray-200 rounded-md shadow-lg p-3 mt-0.5 text-sm text-gray-400">
              No se encontraron items
            </div>
          )}
        </div>

        {/* Component list */}
        {components.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-md">
            No hay componentes. Busque y agregue items arriba.
          </div>
        ) : (
          <div className="border border-gray-200 rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Item</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-28">Tipo</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-20">P. Unit</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-24">Cantidad</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-20">Subtotal</th>
                  <th className="px-2 py-2 w-8"></th>
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
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-800">{item.name}</div>
                        <div className="text-xs text-gray-400">{item.code} · {item.unit}</div>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={comp.type}
                          onChange={(e) => updateComponentType(comp.id, e.target.value as ComponentType)}
                          className="w-full text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-green-500"
                        >
                          {Object.entries(typeLabels).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600 text-xs">
                        {formatMoney(unitPrice)}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={comp.quantity}
                          onChange={(e) => updateComponentQty(comp.id, parseFloat(e.target.value) || 0)}
                          className="w-full text-right border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                        />
                      </td>
                      <td className="px-3 py-2 text-right text-green-600 font-semibold text-xs">
                        {formatMoney(subtotal)}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeComponent(comp.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Total */}
      <div className="bg-green-50 border border-green-200 rounded-md px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-medium text-green-800">Costo Total:</span>
        <span className="text-lg font-bold text-green-700">{formatMoney(total)}</span>
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
          {rubro ? 'Guardar cambios' : 'Crear Rubro'}
        </button>
      </div>
    </form>
  );
}
