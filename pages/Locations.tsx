
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// Fix: Use local mock implementation
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { Location, LocationType, Status } from '../types';
import { Plus, Edit2, Trash2, MapPin, X, ClipboardList } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const LocationsPage: React.FC = () => {
  const { userProfile } = useAuth();
  const isAdmin = userProfile?.role === 'admin';
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<Location>>({
    name: '',
    address: '',
    type: LocationType.WAREHOUSE,
    status: Status.ACTIVE
  });

  const { data: locations, isLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const snap = await getDocs(collection(db, 'locations'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Location));
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updateDoc(doc(db, 'locations', editingId), formData);
    } else {
      await addDoc(collection(db, 'locations'), formData);
    }
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: '', address: '', type: LocationType.WAREHOUSE, status: Status.ACTIVE });
    queryClient.invalidateQueries({ queryKey: ['locations'] });
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Locations</h1>
        {isAdmin && (
          <button 
            onClick={() => { setEditingId(null); setIsModalOpen(true); }}
            className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center justify-center gap-2 hover:bg-blue-700 shadow-sm w-full sm:w-auto"
          >
            <Plus size={18} /> Add Location
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {locations?.map(loc => (
          <div key={loc.id} className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded text-blue-600">
                  <MapPin size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900">{loc.name}</h3>
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">{loc.type}</span>
                </div>
              </div>
              <div className="flex gap-1">
                 <button 
                    onClick={() => navigate('/inventory', { state: { locationId: loc.id } })}
                    className="text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors"
                    title="View Inventory"
                 >
                    <ClipboardList size={18} />
                 </button>
                 {isAdmin && (
                    <button 
                      onClick={() => { setEditingId(loc.id); setFormData(loc); setIsModalOpen(true); }}
                      className="text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors"
                      title="Edit Location"
                    >
                      <Edit2 size={18} />
                    </button>
                 )}
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-4">{loc.address}</p>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${loc.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span className="text-sm text-slate-500 capitalize">{loc.status}</span>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Location' : 'New Location'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Name</label>
                <input required className="w-full border border-slate-300 bg-slate-50 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Type</label>
                <select className="w-full border border-slate-300 bg-slate-50 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as LocationType})}>
                   {Object.values(LocationType).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Address</label>
                <textarea required className="w-full border border-slate-300 bg-slate-50 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
               <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Status</label>
                <select className="w-full border border-slate-300 bg-slate-50 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as Status})}>
                   <option value={Status.ACTIVE}>Active</option>
                   <option value={Status.INACTIVE}>Inactive</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50">Cancel</button>
                 <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-sm">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationsPage;
