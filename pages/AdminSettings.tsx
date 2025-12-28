
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// Fix: Use local mock implementation
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from '../firebase';
import { db } from '../firebase';
import { Category, UOM, UOMConversion } from '../types';
import { Plus, Trash2, Edit2, ArrowRight } from 'lucide-react';

// Import existing pages to embed
import UsersPage from './Users';
import LocationsPage from './Locations';
import ItemsPage from './Items';

const AdminSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'categories' | 'uoms' | 'locations' | 'items' | 'users'>('categories');

  const tabs = [
    { id: 'categories', label: 'Categories' },
    { id: 'uoms', label: 'UOM & Conversions' },
    { id: 'locations', label: 'Locations' },
    { id: 'items', label: 'Items' },
    { id: 'users', label: 'Users' },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Admin Settings</h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-6 bg-slate-50 min-h-[600px]">
          {activeTab === 'categories' && <CategoryManager />}
          {activeTab === 'uoms' && <UOMManager />}
          {/* Reuse existing pages */}
          {activeTab === 'locations' && <div className="bg-transparent"><LocationsPage /></div>}
          {activeTab === 'items' && <div className="bg-transparent"><ItemsPage /></div>}
          {activeTab === 'users' && <div className="bg-transparent"><UsersPage /></div>}
        </div>
      </div>
    </div>
  );
};

// --- Sub-Component: Category Manager ---
const CategoryManager = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: '', subcategories: '', sort_order: 0 });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const snap = await getDocs(collection(db, 'categories'));
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Category));
      // Sort by sort_order, then by name
      return docs.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name));
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const subCatsArray = formData.subcategories.split(',').map(s => s.trim()).filter(s => s);
    const order = Number(formData.sort_order);
    
    try {
      if (editingCategory) {
        await updateDoc(doc(db, 'categories', editingCategory.id), {
          name: formData.name,
          subcategories: subCatsArray,
          sort_order: order
        });
      } else {
        await addDoc(collection(db, 'categories'), {
          name: formData.name,
          subcategories: subCatsArray,
          sort_order: order
        });
      }
      
      setIsModalOpen(false);
      setEditingCategory(null);
      setFormData({ name: '', subcategories: '', sort_order: 0 });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    } catch (error) {
      console.error("Error saving category:", error);
      alert("Failed to save category.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'categories', id));
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    } catch (error) {
      console.error("Error deleting category:", error);
      alert("Failed to delete category.");
    }
  };

  const openEdit = (cat: Category) => {
      setEditingCategory(cat);
      setFormData({ 
          name: cat.name, 
          subcategories: cat.subcategories.join(', '), 
          sort_order: cat.sort_order ?? 0 
      });
      setIsModalOpen(true);
  };

  const openAdd = () => {
      setEditingCategory(null);
      setFormData({ name: '', subcategories: '', sort_order: 0 });
      setIsModalOpen(true);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h3 className="text-lg font-semibold text-slate-700">Product Categories</h3>
        <button 
          onClick={openAdd}
          className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center justify-center gap-2 hover:bg-blue-700 text-sm shadow-sm w-full sm:w-auto"
        >
          <Plus size={16} /> Add Category
        </button>
      </div>

      <div className="grid gap-4">
        {categories?.map(cat => (
          <div key={cat.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200" title="Sort Order">
                    #{cat.sort_order ?? 0}
                </span>
                <h4 className="font-bold text-slate-800">{cat.name}</h4>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {cat.subcategories.map((sub, idx) => (
                  <span key={idx} className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs">
                    {sub}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <button 
                onClick={() => openEdit(cat)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Edit"
              >
                <Edit2 size={16} />
              </button>
              <button 
                onClick={() => handleDelete(cat.id)} 
                className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4 text-slate-800">{editingCategory ? 'Edit Category' : 'New Category'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-3">
                    <label className="block text-sm font-medium mb-1 text-slate-700">Category Name</label>
                    <input required className="w-full border border-slate-300 bg-slate-50 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm font-medium mb-1 text-slate-700">Sort Order</label>
                    <input type="number" required className="w-full border border-slate-300 bg-slate-50 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.sort_order} onChange={e => setFormData({...formData, sort_order: parseInt(e.target.value)})} />
                  </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Subcategories (comma separated)</label>
                <textarea className="w-full border border-slate-300 bg-slate-50 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.subcategories} onChange={e => setFormData({...formData, subcategories: e.target.value})} placeholder="e.g. Laptops, Phones, Accessories" />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50">Cancel</button>
                 <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Sub-Component: UOM Manager ---
const UOMManager = () => {
  const queryClient = useQueryClient();
  const [uomModalOpen, setUomModalOpen] = useState(false);
  const [convModalOpen, setConvModalOpen] = useState(false);
  
  // UOM State
  const [uomData, setUomData] = useState({ name: '', abbreviation: '' });
  const [editingUomId, setEditingUomId] = useState<string | null>(null);

  // Conversion State
  const [convData, setConvData] = useState({ from_uom: '', to_uom: '', multiplier: 1 });
  const [editingConvId, setEditingConvId] = useState<string | null>(null);

  const { data: uoms } = useQuery({
    queryKey: ['uoms'],
    queryFn: async () => {
      const snap = await getDocs(collection(db, 'uoms'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as UOM));
    }
  });

  const { data: conversions } = useQuery({
    queryKey: ['conversions'],
    queryFn: async () => {
      const snap = await getDocs(collection(db, 'uom_conversions'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as UOMConversion));
    }
  });

  // UOM Handlers
  const handleUomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUomId) {
        await updateDoc(doc(db, 'uoms', editingUomId), uomData);
      } else {
        await addDoc(collection(db, 'uoms'), uomData);
      }
      setUomModalOpen(false);
      setEditingUomId(null);
      setUomData({ name: '', abbreviation: '' });
      queryClient.invalidateQueries({ queryKey: ['uoms'] });
    } catch (error) {
      console.error("Error saving UOM:", error);
      alert("Failed to save UOM.");
    }
  };

  const deleteUom = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'uoms', id));
      queryClient.invalidateQueries({ queryKey: ['uoms'] });
    } catch (error) {
      console.error("Error deleting UOM:", error);
      alert("Failed to delete UOM.");
    }
  };

  const startEditUom = (u: UOM) => {
    setUomData({ name: u.name, abbreviation: u.abbreviation });
    setEditingUomId(u.id);
    setUomModalOpen(true);
  };

  // Conversion Handlers
  const handleConvSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingConvId) {
        await updateDoc(doc(db, 'uom_conversions', editingConvId), convData);
      } else {
        await addDoc(collection(db, 'uom_conversions'), convData);
      }
      setConvModalOpen(false);
      setEditingConvId(null);
      setConvData({ from_uom: '', to_uom: '', multiplier: 1 });
      queryClient.invalidateQueries({ queryKey: ['conversions'] });
    } catch (error) {
      console.error("Error saving conversion:", error);
      alert("Failed to save conversion.");
    }
  };

  const deleteConv = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'uom_conversions', id));
      queryClient.invalidateQueries({ queryKey: ['conversions'] });
    } catch (error) {
      console.error("Error deleting conversion:", error);
      alert("Failed to delete conversion.");
    }
  };

  const startEditConv = (c: UOMConversion) => {
    setConvData({ from_uom: c.from_uom, to_uom: c.to_uom, multiplier: c.multiplier });
    setEditingConvId(c.id);
    setConvModalOpen(true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* UOM List */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-800">Units of Measure</h3>
          <button onClick={() => { setEditingUomId(null); setUomData({name: '', abbreviation: ''}); setUomModalOpen(true); }} className="text-blue-600 hover:bg-blue-50 p-2 rounded-full">
            <Plus size={20} />
          </button>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
            <thead className="text-slate-500 border-b">
                <tr>
                <th className="py-2">Name</th>
                <th className="py-2">Abbr</th>
                <th className="py-2 text-right">Actions</th>
                </tr>
            </thead>
            <tbody>
                {uoms?.map(u => (
                <tr key={u.id} className="border-b last:border-0 border-slate-100">
                    <td className="py-3 font-medium">{u.name}</td>
                    <td className="py-3 text-slate-500">{u.abbreviation}</td>
                    <td className="py-3 text-right">
                    <div className="flex justify-end gap-2">
                        <button 
                        onClick={() => startEditUom(u)} 
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit"
                        >
                        <Edit2 size={16} />
                        </button>
                        <button 
                        onClick={() => deleteUom(u.id)} 
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete"
                        >
                        <Trash2 size={16} />
                        </button>
                    </div>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      </div>

      {/* Conversions List */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-800">Conversions</h3>
          <button onClick={() => { setEditingConvId(null); setConvData({from_uom: '', to_uom: '', multiplier: 1}); setConvModalOpen(true); }} className="text-blue-600 hover:bg-blue-50 p-2 rounded-full">
            <Plus size={20} />
          </button>
        </div>
        <div className="space-y-3">
          {conversions?.map(c => {
             const fromUom = uoms?.find(u => u.id === c.from_uom);
             const toUom = uoms?.find(u => u.id === c.to_uom);
             return (
               <div key={c.id} className="flex items-center justify-between bg-slate-50 p-3 rounded border border-slate-100">
                 <div className="flex items-center gap-2 text-sm font-medium text-slate-700 flex-wrap">
                   <span>1 {fromUom?.abbreviation || c.from_uom}</span>
                   <ArrowRight size={14} className="text-slate-400" />
                   <span className="text-blue-600">{c.multiplier} {toUom?.abbreviation || c.to_uom}</span>
                 </div>
                 <div className="flex gap-2">
                   <button 
                      onClick={() => startEditConv(c)} 
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Edit"
                   >
                      <Edit2 size={16} />
                   </button>
                   <button 
                      onClick={() => deleteConv(c.id)} 
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete"
                   >
                      <Trash2 size={16} />
                   </button>
                 </div>
               </div>
             )
          })}
        </div>
      </div>

      {/* UOM Modal */}
      {uomModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-bold mb-4 text-slate-800">{editingUomId ? 'Edit UOM' : 'Add UOM'}</h3>
            <form onSubmit={handleUomSubmit} className="space-y-4">
              <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">UOM Name</label>
                  <input required placeholder="Name (e.g. Box)" className="w-full border border-slate-300 bg-slate-50 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" value={uomData.name} onChange={e => setUomData({...uomData, name: e.target.value})} />
              </div>
              <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Abbreviation</label>
                  <input required placeholder="Abbreviation (e.g. bx)" className="w-full border border-slate-300 bg-slate-50 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" value={uomData.abbreviation} onChange={e => setUomData({...uomData, abbreviation: e.target.value})} />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => setUomModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-sm">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Conversion Modal */}
      {convModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-bold mb-4 text-slate-800">Add Conversion</h3>
            <form onSubmit={handleConvSubmit} className="space-y-4">
               <div>
                 <label className="block text-sm font-medium mb-1 text-slate-700">From</label>
                 <select required className="w-full border border-slate-300 bg-slate-50 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" value={convData.from_uom} onChange={e => setConvData({...convData, from_uom: e.target.value})}>
                   <option value="">Select UOM</option>
                   {uoms?.map(u => <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>)}
                 </select>
               </div>
               <div>
                 <label className="block text-sm font-medium mb-1 text-slate-700">To (Base)</label>
                 <select required className="w-full border border-slate-300 bg-slate-50 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" value={convData.to_uom} onChange={e => setConvData({...convData, to_uom: e.target.value})}>
                   <option value="">Select UOM</option>
                   {uoms?.map(u => <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>)}
                 </select>
               </div>
               <div>
                 <label className="block text-sm font-medium mb-1 text-slate-700">Multiplier</label>
                 <input type="number" required className="w-full border border-slate-300 bg-slate-50 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" value={convData.multiplier} onChange={e => setConvData({...convData, multiplier: parseFloat(e.target.value)})} />
               </div>
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => setConvModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-sm">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminSettings;
