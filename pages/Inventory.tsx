
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// Fix: Use local mock implementation
import { collection, getDocs, doc, setDoc, getDoc, addDoc } from '../firebase';
import { useLocation } from 'react-router-dom';
import { db } from '../firebase';
import { InventoryRecord, Item, Category } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Filter, AlertTriangle } from 'lucide-react';

const InventoryPage: React.FC = () => {
  const { userProfile } = useAuth();
  const isAdmin = userProfile?.role === 'admin';
  const queryClient = useQueryClient();
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Initialize filter from navigation state or user profile
  const initialLocation = (location.state as any)?.locationId || userProfile?.assigned_location || 'all';
  const [locationFilter, setLocationFilter] = useState(initialLocation);

  // Update filter if navigation state changes
  useEffect(() => {
    const stateLoc = (location.state as any)?.locationId;
    if (stateLoc) {
        setLocationFilter(stateLoc);
    }
  }, [location.state]);

  const [stockData, setStockData] = useState({
      item_id: '',
      variant_id: '',
      location_id: initialLocation !== 'all' ? initialLocation : (userProfile?.assigned_location || ''),
      quantity: '' as string | number,
      reference: ''
  });

  // Sync Add Stock location with filter if it's a specific location
  useEffect(() => {
      if (locationFilter !== 'all') {
          setStockData(prev => ({...prev, location_id: locationFilter}));
      }
  }, [locationFilter]);

  // Fetch Items to link names
  const { data: items } = useQuery({ queryKey: ['items'], queryFn: async () => {
      const s = await getDocs(collection(db, 'items'));
      return s.docs.map(d => ({id: d.id, ...d.data()} as Item));
  }});

  // Fetch Categories for sorting
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: async () => {
      const s = await getDocs(collection(db, 'categories'));
      return s.docs.map(d => ({id: d.id, ...d.data()} as Category));
  }});

  // Fetch Locations
  const { data: locations } = useQuery({ queryKey: ['locations'], queryFn: async () => {
      const s = await getDocs(collection(db, 'locations'));
      return s.docs.map(d => ({id: d.id, ...d.data()}));
  }});

  // Fetch UOMs
  const { data: uoms } = useQuery({ queryKey: ['uoms'], queryFn: async () => {
      const s = await getDocs(collection(db, 'uoms'));
      return s.docs.map(d => ({id: d.id, ...d.data()}));
  }});

  // Fetch Inventory
  const { data: inventory, isLoading } = useQuery({
      queryKey: ['inventory', locationFilter],
      queryFn: async () => {
          // In real app, use where() clause. 
          const s = await getDocs(collection(db, 'inventory'));
          let records = s.docs.map(d => ({id: d.id, ...d.data()} as InventoryRecord));
          
          if (!isAdmin || (locationFilter !== 'all')) {
              const targetLoc = isAdmin ? locationFilter : userProfile?.assigned_location;
              records = records.filter(r => r.location_id === targetLoc);
          }
          return records;
      }
  });

  const sortedInventory = useMemo(() => {
      if (!inventory) return [];
      
      return [...inventory].sort((a, b) => {
          // 1. Sort by Location Name
          const locNameA = locations?.find(l => l.id === a.location_id)?.name || '';
          const locNameB = locations?.find(l => l.id === b.location_id)?.name || '';
          if (locNameA !== locNameB) return locNameA.localeCompare(locNameB);

          const itemA = items?.find(i => i.id === a.item_id);
          const itemB = items?.find(i => i.id === b.item_id);

          if (!itemA) return 1;
          if (!itemB) return -1;

          // 2. Sort by Category (Sort Order -> Name)
          const catA = categories?.find(c => c.id === itemA.category);
          const catB = categories?.find(c => c.id === itemB.category);
          
          const orderA = catA?.sort_order ?? 0;
          const orderB = catB?.sort_order ?? 0;
          
          if (orderA !== orderB) return orderA - orderB;
          
          const catNameA = catA?.name || '';
          const catNameB = catB?.name || '';
          if (catNameA !== catNameB) return catNameA.localeCompare(catNameB);

          // 3. Sort by Subcategory
          const subA = itemA.subcategory || '';
          const subB = itemB.subcategory || '';
          if (subA !== subB) return subA.localeCompare(subB);

          // 4. Sort by Item Name
          return itemA.name.localeCompare(itemB.name);
      });
  }, [inventory, items, locations, categories]);

  const handleAddStock = async (e: React.FormEvent) => {
      e.preventDefault();
      // Generate a composite ID for simplicity: loc_variant
      const id = `${stockData.location_id}_${stockData.variant_id}`;
      const ref = doc(db, 'inventory', id);
      
      const existing = await getDoc(ref);
      const qtyChange = Number(stockData.quantity); // Parse string to number
      let newQty = qtyChange;
      
      if (existing.exists()) {
          newQty += existing.data().quantity;
      }

      // Update current inventory level
      await setDoc(ref, {
          location_id: stockData.location_id,
          item_id: stockData.item_id,
          variant_id: stockData.variant_id,
          quantity: newQty
      });

      // Create a movement record for reporting (Transaction History)
      await addDoc(collection(db, 'inventory_movements'), {
          item_id: stockData.item_id,
          variant_id: stockData.variant_id,
          location_id: stockData.location_id,
          quantity_change: qtyChange,
          new_quantity: newQty,
          reference: stockData.reference, // Store the PO/DR number
          timestamp: new Date(),
          user_id: userProfile?.id,
          type: 'adjustment'
      });
      
      setIsModalOpen(false);
      setStockData(prev => ({ ...prev, quantity: '', reference: '' }));
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
  };

  const selectedItem = items?.find(i => i.id === stockData.item_id);
  const selectedUOM = uoms?.find(u => u.id === selectedItem?.base_uom);

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Inventory Levels</h1>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
           {isAdmin && (
             <select 
                className="border border-slate-300 bg-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
             >
                <option value="all">All Locations</option>
                {locations?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
             </select>
           )}
           <button 
             onClick={() => setIsModalOpen(true)}
             className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center justify-center gap-2 hover:bg-blue-700 shadow-sm w-full sm:w-auto"
           >
             <Plus size={18} /> Add Stock
           </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {sortedInventory?.length === 0 ? (
            <div className="p-4">
              <div className="bg-slate-100 border-2 border-slate-200 rounded-lg p-12 text-center text-slate-500">
                  <p className="font-medium text-lg">No inventory records found for this location.</p>
              </div>
            </div>
        ) : (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 whitespace-nowrap">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">SKU / Item</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Location</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Variant Details</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Quantity (Base)</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                    {sortedInventory?.map(rec => {
                        const item = items?.find(i => i.id === rec.item_id);
                        const variant = item?.variants.find(v => v.variant_id === rec.variant_id);
                        const loc = locations?.find(l => l.id === rec.location_id);
                        const category = categories?.find(c => c.id === item?.category);
                        return (
                            <tr key={rec.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-slate-900">{item?.name || 'Unknown Item'}</div>
                                    <div className="flex gap-2 text-xs text-slate-500">
                                        <span className="font-mono">{variant?.sku}</span>
                                        {category && <span className="text-slate-400">• {category.name}</span>}
                                        {item?.subcategory && <span className="text-slate-400">• {item.subcategory}</span>}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600">{loc?.name || rec.location_id}</td>
                                <td className="px-6 py-4 text-sm text-slate-600">
                                    {variant ? `${variant.size || ''} ${variant.color || ''}` : '-'}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className={`font-bold ${rec.quantity < (variant?.reorder_level || 5) ? 'text-red-600' : 'text-slate-800'}`}>
                                        {rec.quantity}
                                    </span>
                                    {rec.quantity < (variant?.reorder_level || 5) && (
                                        <AlertTriangle size={14} className="inline ml-2 text-red-500" />
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
                </table>
            </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
             <div className="bg-white rounded-lg p-8 w-full max-w-lg shadow-2xl">
                <h2 className="text-2xl font-bold mb-6 text-slate-800">Adjust Stock</h2>
                <form onSubmit={handleAddStock} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium mb-1.5 text-slate-700">Location</label>
                        <select 
                            required 
                            disabled={!isAdmin} 
                            className="w-full border border-slate-300 bg-white p-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 disabled:bg-slate-100 disabled:text-slate-500 transition-shadow"
                            value={stockData.location_id}
                            onChange={e => setStockData({...stockData, location_id: e.target.value})}
                        >
                            <option value="">Select Location</option>
                            {locations?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5 text-slate-700">Item</label>
                        <select 
                            required 
                            className="w-full border border-slate-300 bg-white p-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 transition-shadow"
                            value={stockData.item_id}
                            onChange={e => setStockData({...stockData, item_id: e.target.value, variant_id: ''})}
                        >
                            <option value="">Select Item</option>
                            {items?.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                        </select>
                    </div>
                    {selectedItem && (
                        <div>
                             <label className="block text-sm font-medium mb-1.5 text-slate-700">Variant</label>
                            <select 
                                required 
                                className="w-full border border-slate-300 bg-white p-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 transition-shadow"
                                value={stockData.variant_id}
                                onChange={e => setStockData({...stockData, variant_id: e.target.value})}
                            >
                                <option value="">Select Variant</option>
                                {selectedItem.variants.map(v => (
                                    <option key={v.variant_id} value={v.variant_id}>
                                        {v.sku} {v.size} {v.color}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium mb-1.5 text-slate-700">
                            Quantity to Add <span className="text-blue-500 font-normal">({selectedUOM ? selectedUOM.name : 'Units'})</span>
                        </label>
                        <input 
                            type="number" 
                            required 
                            className="w-full border border-slate-300 bg-white p-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 transition-shadow"
                            value={stockData.quantity}
                            onChange={e => setStockData({...stockData, quantity: e.target.value})}
                            placeholder="0"
                        />
                        <p className="text-xs text-blue-500 mt-2">Positive adds stock, negative removes stock.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5 text-slate-700">Reference</label>
                        <input 
                            type="text" 
                            className="w-full border border-slate-300 bg-white p-2.5 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 transition-shadow"
                            value={stockData.reference}
                            onChange={e => setStockData({...stockData, reference: e.target.value})}
                            placeholder="PO Number, DR Number, etc."
                        />
                    </div>
                    <div className="flex justify-end gap-3 mt-8">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium transition-colors">Cancel</button>
                        <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors">Submit</button>
                    </div>
                </form>
             </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;
