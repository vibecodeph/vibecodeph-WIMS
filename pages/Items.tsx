
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// Fix: Use local mock implementation
import { collection, getDocs, addDoc, doc, updateDoc } from '../firebase';
import { db } from '../firebase';
import { Item, Variant, Status, Category } from '../types';
import { Plus, ChevronDown, ChevronRight, Edit2, X, Box } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// Simple UID generator for variants since they are inside an object array
const uuid = () => Math.random().toString(36).substr(2, 9);

const ItemsPage: React.FC = () => {
  const { userProfile } = useAuth();
  const isAdmin = userProfile?.role === 'admin';
  const queryClient = useQueryClient();
  
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Item>>({
    name: '',
    category: '',
    subcategory: '',
    description: '',
    base_uom: '',
    has_variants: false,
    variants: [],
    status: Status.ACTIVE
  });

  const { data: items } = useQuery({
    queryKey: ['items'],
    queryFn: async () => {
      const snap = await getDocs(collection(db, 'items'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Item));
    }
  });

  const { data: uoms } = useQuery({
    queryKey: ['uoms'],
    queryFn: async () => {
        const snap = await getDocs(collection(db, 'uoms'));
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
        const snap = await getDocs(collection(db, 'categories'));
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Category));
        // Sort for dropdown display
        return docs.sort((a,b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name));
    }
  });

  const sortedItems = useMemo(() => {
    if (!items) return [];
    
    return [...items].sort((a, b) => {
      // 1. Group by Category (Sort Order -> Name)
      const catA = categories?.find(c => c.id === a.category);
      const catB = categories?.find(c => c.id === b.category);
      
      const orderA = catA?.sort_order ?? 0;
      const orderB = catB?.sort_order ?? 0;
      
      if (orderA !== orderB) return orderA - orderB;
      
      const catNameA = catA?.name || '';
      const catNameB = catB?.name || '';
      if (catNameA !== catNameB) return catNameA.localeCompare(catNameB);

      // 2. Sort by Subcategory
      const subA = a.subcategory || '';
      const subB = b.subcategory || '';
      if (subA !== subB) return subA.localeCompare(subB);

      // 3. Sort by Name
      return a.name.localeCompare(b.name);
    });
  }, [items, categories]);

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedItems);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedItems(newSet);
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ 
      name: '', 
      category: '', 
      subcategory: '',
      description: '', 
      base_uom: '', 
      has_variants: true, 
      variants: [],
      status: Status.ACTIVE 
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: Item) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      category: item.category,
      subcategory: item.subcategory || '',
      description: item.description || '',
      base_uom: item.base_uom,
      has_variants: item.has_variants,
      variants: item.variants || [],
      status: item.status || Status.ACTIVE
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSave = { ...formData };

    if (!dataToSave.has_variants && dataToSave.variants?.length === 0) {
        // Auto create a default variant if none exists
        dataToSave.variants = [{
            variant_id: uuid(),
            sku: `${dataToSave.name?.substring(0,3).toUpperCase()}-001`,
            average_cost: 0,
            reorder_level: 10,
            serial_required: false
        }];
    }
    
    try {
      if (editingId) {
        await updateDoc(doc(db, 'items', editingId), dataToSave);
      } else {
        await addDoc(collection(db, 'items'), dataToSave);
      }
      setIsModalOpen(false);
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['items'] });
    } catch (error) {
      console.error("Error saving item:", error);
      alert("Failed to save item.");
    }
  };

  const addVariant = () => {
      setFormData({
          ...formData,
          variants: [
              ...(formData.variants || []),
              { variant_id: uuid(), sku: '', average_cost: 0, reorder_level: 0, serial_required: false }
          ]
      });
  };

  const updateVariant = (index: number, field: string, value: any) => {
      const newVariants = [...(formData.variants || [])];
      newVariants[index] = { ...newVariants[index], [field]: value };
      setFormData({ ...formData, variants: newVariants });
  };

  const removeVariant = (index: number) => {
    // Removed confirm to fix "not functioning" issue and improve UX
    const newVariants = [...(formData.variants || [])];
    newVariants.splice(index, 1);
    setFormData({ ...formData, variants: newVariants });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Items Catalog</h1>
        {isAdmin && (
          <button 
             onClick={openAddModal}
            className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-blue-700 shadow-sm w-full sm:w-auto justify-center"
          >
            <Plus size={18} /> Add Item
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-medium text-slate-500 w-10"></th>
                <th className="px-6 py-3 font-medium text-slate-500">Name</th>
                <th className="px-6 py-3 font-medium text-slate-500">Category</th>
                <th className="px-6 py-3 font-medium text-slate-500">Base UOM</th>
                <th className="px-6 py-3 font-medium text-slate-500 text-right">Variants</th>
                <th className="px-6 py-3 font-medium text-slate-500 text-center">Status</th>
                <th className="px-6 py-3 font-medium text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedItems.map(item => (
                <React.Fragment key={item.id}>
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <button onClick={() => toggleExpand(item.id)} className="text-slate-400 hover:text-blue-600">
                        {expandedItems.has(item.id) ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                      </button>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">{item.name}</td>
                    <td className="px-6 py-4 text-slate-600">
                        <div className="font-medium">{categories?.find(c => c.id === item.category)?.name || item.category}</div>
                        {item.subcategory && <div className="text-xs text-slate-400 mt-0.5">{item.subcategory}</div>}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                        {uoms?.find(u => u.id === item.base_uom)?.name || item.base_uom}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-600">{item.variants?.length || 0}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.status === Status.INACTIVE ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {item.status || Status.ACTIVE}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isAdmin && (
                          <button onClick={() => openEditModal(item)} className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50">
                              <Edit2 size={16} />
                          </button>
                      )}
                    </td>
                  </tr>
                  {expandedItems.has(item.id) && (
                    <tr>
                      <td colSpan={7} className="bg-slate-50 px-6 py-4 shadow-inner">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                            <thead>
                                <tr className="text-slate-500 border-b border-slate-200">
                                <th className="py-2 text-center min-w-[100px]">SKU</th>
                                <th className="py-2 text-center min-w-[120px]">Size / Color</th>
                                <th className="py-2 text-center min-w-[100px]">Cost</th>
                                <th className="py-2 text-center min-w-[100px]">Reorder Lvl</th>
                                <th className="py-2 text-center min-w-[80px]">Serial Req?</th>
                                </tr>
                            </thead>
                            <tbody>
                                {item.variants.map(v => (
                                <tr key={v.variant_id} className="border-b border-slate-100 last:border-0">
                                    <td className="py-2 font-mono text-slate-700 text-center">{v.sku}</td>
                                    <td className="py-2 text-center">
                                    {v.size && v.color 
                                        ? `${v.size} / ${v.color}` 
                                        : (v.size || v.color || '-')}
                                    </td>
                                    <td className="py-2 text-center">₱{v.average_cost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                                    <td className="py-2 text-center">{v.reorder_level}</td>
                                    <td className="py-2 text-center">{v.serial_required ? 'Yes' : 'No'}</td>
                                </tr>
                                ))}
                            </tbody>
                            </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto px-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl h-auto max-h-[90vh] overflow-y-auto shadow-2xl relative my-8">
             <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Item' : 'Add New Item'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-700">Item Name</label>
                        <input required className="w-full border border-slate-300 bg-slate-50 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-700">Category</label>
                        <select required className="w-full border border-slate-300 bg-slate-50 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value, subcategory: ''})}>
                            <option value="">Select Category</option>
                            {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-700">Subcategory</label>
                        <select 
                            className="w-full border border-slate-300 bg-slate-50 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-slate-100" 
                            value={formData.subcategory} 
                            onChange={e => setFormData({...formData, subcategory: e.target.value})}
                            disabled={!formData.category}
                        >
                            <option value="">Select Subcategory</option>
                            {formData.category && categories?.find(c => c.id === formData.category)?.subcategories?.map(sub => (
                                <option key={sub} value={sub}>{sub}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-700">Base UOM</label>
                        <select required className="w-full border border-slate-300 bg-slate-50 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.base_uom} onChange={e => setFormData({...formData, base_uom: e.target.value})}>
                            <option value="">Select UOM</option>
                            {uoms?.map(u => <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>)}
                        </select>
                    </div>
                     <div className="col-span-1 sm:col-span-2">
                        <label className="block text-sm font-medium mb-1 text-slate-700">Description</label>
                        <input className="w-full border border-slate-300 bg-slate-50 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                    </div>
                </div>

                <div className="flex items-center gap-2 py-2">
                    <input 
                        type="checkbox" 
                        id="itemStatus" 
                        checked={formData.status === Status.ACTIVE} 
                        onChange={(e) => setFormData({...formData, status: e.target.checked ? Status.ACTIVE : Status.INACTIVE})} 
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="itemStatus" className="text-sm font-medium text-slate-700 select-none cursor-pointer">
                        Item is Active
                    </label>
                </div>

                <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-slate-800">Variants</h3>
                        <button type="button" onClick={addVariant} className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200">
                            + Add Variant
                        </button>
                    </div>
                    
                    {formData.variants?.map((v, idx) => (
                        <div key={v.variant_id || idx} className="bg-slate-50 p-4 rounded mb-2 relative border border-slate-200">
                             <button 
                                type="button"
                                onClick={() => removeVariant(idx)}
                                className="absolute top-2 right-2 text-slate-400 hover:text-red-500 p-1 bg-slate-50 rounded-full"
                            >
                                <X size={16} />
                            </button>
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
                                <div className="col-span-2 md:col-span-1">
                                    <label className="text-xs text-slate-500 block mb-1">SKU</label>
                                    <input className="w-full border border-slate-300 bg-white p-1.5 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" value={v.sku} onChange={(e) => updateVariant(idx, 'sku', e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 block mb-1">Size</label>
                                    <input className="w-full border border-slate-300 bg-white p-1.5 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" value={v.size || ''} onChange={(e) => updateVariant(idx, 'size', e.target.value)} placeholder="e.g. L" />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 block mb-1">Color</label>
                                    <input className="w-full border border-slate-300 bg-white p-1.5 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" value={v.color || ''} onChange={(e) => updateVariant(idx, 'color', e.target.value)} placeholder="e.g. Red" />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 block mb-1">Avg Cost (₱)</label>
                                    <input type="number" className="w-full border border-slate-300 bg-white p-1.5 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" value={v.average_cost} onChange={(e) => updateVariant(idx, 'average_cost', parseFloat(e.target.value))} />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 block mb-1">Reorder Lvl</label>
                                    <input type="number" className="w-full border border-slate-300 bg-white p-1.5 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" value={v.reorder_level} onChange={(e) => updateVariant(idx, 'reorder_level', parseInt(e.target.value))} />
                                </div>
                                <div className="flex items-center gap-2 h-8">
                                    <label className="text-xs text-slate-500 block">Serial?</label>
                                    <input type="checkbox" checked={v.serial_required} onChange={(e) => updateVariant(idx, 'serial_required', e.target.checked)} className="h-4 w-4" />
                                </div>
                            </div>
                        </div>
                    ))}
                    {formData.variants?.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No variants added. Default variant will be created on save.</p>}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-sm">
                        {editingId ? 'Update Item' : 'Save Item'}
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemsPage;
