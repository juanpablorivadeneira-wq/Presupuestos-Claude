import { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';
import Modal from './Modal';

interface Category {
  id: string;
  name: string;
  parentId: string | null;
}

interface CategoryTreeProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  onAddCategory: (category: Category) => void;
  onUpdateCategory: (category: Category) => void;
  onDeleteCategory: (id: string) => void;
  allLabel: string;
  readOnly?: boolean;
}

interface TreeNodeProps {
  category: Category;
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  onAdd: (parentId: string | null) => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  depth: number;
  readOnly?: boolean;
}

function TreeNode({
  category,
  categories,
  selectedCategoryId,
  onSelectCategory,
  onAdd,
  onEdit,
  onDelete,
  depth,
  readOnly = false,
}: TreeNodeProps) {
  const children = categories.filter((c) => c.parentId === category.id);
  const [expanded, setExpanded] = useState(true);
  const hasChildren = children.length > 0;
  const isSelected = selectedCategoryId === category.id;

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-1 px-2 rounded cursor-pointer group text-sm ${
          isSelected ? 'bg-green-50 text-green-700' : 'hover:bg-gray-100 text-gray-700'
        }`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => onSelectCategory(category.id)}
      >
        {/* Expand toggle */}
        <span
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) setExpanded((v) => !v);
          }}
          className="w-4 h-4 flex items-center justify-center text-gray-400 shrink-0"
        >
          {hasChildren ? (
            expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />
          ) : null}
        </span>

        {/* Folder icon */}
        <span className="shrink-0 text-yellow-500">
          {hasChildren && expanded ? <FolderOpen size={14} /> : <Folder size={14} />}
        </span>

        {/* Name */}
        <span className="flex-1 truncate font-medium">{category.name}</span>

        {/* Action buttons - show on hover */}
        {!readOnly && (
          <span className="hidden group-hover:flex items-center gap-0.5 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAdd(category.id);
              }}
              title="Agregar subcategoría"
              className="p-0.5 rounded hover:bg-green-100 hover:text-green-700 text-gray-400"
            >
              <Plus size={12} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(category);
              }}
              title="Editar categoría"
              className="p-0.5 rounded hover:bg-blue-100 hover:text-blue-700 text-gray-400"
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(category);
              }}
              title="Eliminar categoría"
              className="p-0.5 rounded hover:bg-red-100 hover:text-red-700 text-gray-400"
            >
              <Trash2 size={12} />
            </button>
          </span>
        )}
      </div>

      {/* Children */}
      {expanded &&
        children.map((child) => (
          <TreeNode
            key={child.id}
            category={child}
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={onSelectCategory}
            onAdd={onAdd}
            onEdit={onEdit}
            onDelete={onDelete}
            depth={depth + 1}
            readOnly={readOnly}
          />
        ))}
    </div>
  );
}

interface CategoryFormState {
  name: string;
  parentId: string | null;
}

export default function CategoryTree({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  allLabel,
  readOnly = false,
}: CategoryTreeProps) {
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<null | {
    mode: 'add' | 'edit' | 'delete';
    category?: Category;
    parentId?: string | null;
  }>(null);
  const [formState, setFormState] = useState<CategoryFormState>({ name: '', parentId: null });
  const [formError, setFormError] = useState('');

  const rootCategories = categories.filter((c) => c.parentId === null);

  const filteredRoots = search.trim()
    ? categories.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : rootCategories;

  function openAdd(parentId: string | null) {
    setFormState({ name: '', parentId });
    setFormError('');
    setModal({ mode: 'add', parentId });
  }

  function openEdit(category: Category) {
    setFormState({ name: category.name, parentId: category.parentId });
    setFormError('');
    setModal({ mode: 'edit', category });
  }

  function openDelete(category: Category) {
    setModal({ mode: 'delete', category });
  }

  function handleSubmitAdd() {
    if (!formState.name.trim()) {
      setFormError('El nombre es requerido');
      return;
    }
    const newCat: Category = {
      id: 'cat-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
      name: formState.name.trim(),
      parentId: formState.parentId,
    };
    onAddCategory(newCat);
    setModal(null);
  }

  function handleSubmitEdit() {
    if (!formState.name.trim()) {
      setFormError('El nombre es requerido');
      return;
    }
    if (!modal?.category) return;
    onUpdateCategory({ ...modal.category, name: formState.name.trim() });
    setModal(null);
  }

  function handleConfirmDelete() {
    if (!modal?.category) return;
    onDeleteCategory(modal.category.id);
    if (selectedCategoryId === modal.category.id) {
      onSelectCategory(null);
    }
    setModal(null);
  }

  const parentName = modal?.parentId
    ? categories.find((c) => c.id === modal.parentId)?.name
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar categorías..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-3 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>
      </div>

      {/* Add root category button */}
      {!readOnly && (
        <div className="px-3 pb-2">
          <button
            onClick={() => openAdd(null)}
            className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium"
          >
            <Plus size={13} />
            Nueva categoría
          </button>
        </div>
      )}

      {/* Tree */}
      <div className="flex-1 overflow-y-auto px-1">
        {/* "All" option */}
        <div
          onClick={() => onSelectCategory(null)}
          className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer text-sm font-medium mb-1 ${
            selectedCategoryId === null
              ? 'bg-green-50 text-green-700'
              : 'hover:bg-gray-100 text-gray-700'
          }`}
        >
          <Folder size={14} className="text-gray-400" />
          {allLabel}
        </div>

        {search.trim() ? (
          filteredRoots.map((cat) => (
            <div
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer text-sm ${
                selectedCategoryId === cat.id
                  ? 'bg-green-50 text-green-700'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <Folder size={14} className="text-yellow-500" />
              {cat.name}
            </div>
          ))
        ) : (
          rootCategories.map((cat) => (
            <TreeNode
              key={cat.id}
              category={cat}
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={onSelectCategory}
              onAdd={openAdd}
              onEdit={openEdit}
              onDelete={openDelete}
              depth={0}
              readOnly={readOnly}
            />
          ))
        )}
      </div>

      {/* Modals */}
      {modal?.mode === 'add' && (
        <Modal title={parentName ? `Subcategoría de: ${parentName}` : 'Nueva Categoría'} onClose={() => setModal(null)} size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                value={formState.name}
                onChange={(e) => { setFormState((s) => ({ ...s, name: e.target.value })); setFormError(''); }}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                placeholder="Nombre de la categoría"
                autoFocus
              />
              {formError && <p className="text-red-500 text-xs mt-1">{formError}</p>}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitAdd}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Agregar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {modal?.mode === 'edit' && modal.category && (
        <Modal title={`Editar: ${modal.category.name}`} onClose={() => setModal(null)} size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                value={formState.name}
                onChange={(e) => { setFormState((s) => ({ ...s, name: e.target.value })); setFormError(''); }}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                autoFocus
              />
              {formError && <p className="text-red-500 text-xs mt-1">{formError}</p>}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitEdit}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Guardar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {modal?.mode === 'delete' && modal.category && (
        <Modal title="Confirmar Eliminación" onClose={() => setModal(null)} size="sm">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              ¿Está seguro que desea eliminar la categoría{' '}
              <strong className="text-gray-900">{modal.category.name}</strong>?
              <br />
              <span className="text-red-500">
                También se eliminarán todas las subcategorías.
              </span>
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
