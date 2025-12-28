
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// Fix: Ensure all firebase functions are correctly imported from the local mock implementation
import { 
  db, 
  auth, 
  firebaseConfig, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  createUserWithEmailAndPassword, 
  getAuth, 
  signOut, 
  initializeApp, 
  deleteApp 
} from '../firebase';
import { UserRole, Status, UserProfile } from '../types';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';

const UsersPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const queryClient = useQueryClient();

  // Form State
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: UserRole.USER,
    assigned_location: '',
    phone: '',
    status: Status.ACTIVE
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const snap = await getDocs(collection(db, 'users'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile));
    }
  });

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const snap = await getDocs(collection(db, 'locations'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let secondaryApp = null;
    try {
      if (editingUser) {
        // Update existing Firestore doc
        await updateDoc(doc(db, 'users', editingUser.id), {
            full_name: formData.full_name,
            role: formData.role,
            assigned_location: formData.assigned_location,
            phone: formData.phone,
            status: formData.status
        });
      } else {
        // Create Auth User using a secondary app instance
        // This prevents the current Admin from being logged out
        secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
        const secondaryAuth = getAuth(secondaryApp);
        
        const userCred = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
        
        // Create Firestore Doc
        await setDoc(doc(db, 'users', userCred.user.uid), {
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role,
          assigned_location: formData.assigned_location,
          phone: formData.phone,
          status: formData.status,
          created_at: new Date()
        });

        // Sign out the secondary auth to be clean
        await signOut(secondaryAuth);
      }
      setIsModalOpen(false);
      setEditingUser(null);
      setFormData({ email: '', password: '', full_name: '', role: UserRole.USER, assigned_location: '', phone: '', status: Status.ACTIVE });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (error: any) {
      console.error("Error saving user:", error);
      alert(`Error saving user: ${error.message}`);
    } finally {
      if (secondaryApp) {
        try {
          await deleteApp(secondaryApp);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }
  };

  const handleEdit = (user: UserProfile) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: '', // Can't view password
      full_name: user.full_name,
      role: user.role,
      assigned_location: user.assigned_location || '',
      phone: user.phone || '',
      status: user.status
    });
    setIsModalOpen(true);
  };

  if (isLoading) return <div>Loading users...</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
        <button 
          onClick={() => { setEditingUser(null); setIsModalOpen(true); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center justify-center gap-2 hover:bg-blue-700 shadow-sm w-full sm:w-auto"
        >
          <Plus size={18} /> Add User
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 whitespace-nowrap">
            <thead className="bg-slate-50">
                <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
                {users?.map((user) => (
                <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900">{user.full_name}</div>
                    <div className="text-sm text-slate-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                        {user.role}
                    </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {locations?.find(l => l.id === user.assigned_location)?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.status === 'active' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'}`}>
                        {user.status}
                    </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleEdit(user)} className="text-blue-600 hover:text-blue-900 mr-4"><Edit2 size={16}/></button>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-800">{editingUser ? 'Edit User' : 'New User'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Full Name</label>
                  <input required type="text" className="w-full border border-slate-300 bg-slate-50 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
                </div>
                <div>
                   <label className="block text-sm font-medium mb-1 text-slate-700">Email</label>
                   <input required disabled={!!editingUser} type="email" className="w-full border border-slate-300 bg-slate-50 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
              </div>
              
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Password</label>
                  <input required type="password" className="w-full border border-slate-300 bg-slate-50 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium mb-1 text-slate-700">Role</label>
                   <select className="w-full border border-slate-300 bg-slate-50 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value as UserRole})}>
                     <option value={UserRole.USER}>User</option>
                     <option value={UserRole.ADMIN}>Admin</option>
                   </select>
                </div>
                <div>
                   <label className="block text-sm font-medium mb-1 text-slate-700">Assigned Location</label>
                   <select className="w-full border border-slate-300 bg-slate-50 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.assigned_location} onChange={(e) => setFormData({...formData, assigned_location: e.target.value})}>
                     <option value="">None</option>
                     {locations?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                   </select>
                </div>
              </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium mb-1 text-slate-700">Phone</label>
                   <input type="text" className="w-full border border-slate-300 bg-slate-50 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div>
                   <label className="block text-sm font-medium mb-1 text-slate-700">Status</label>
                   <select className="w-full border border-slate-300 bg-slate-50 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value as Status})}>
                     <option value={Status.ACTIVE}>Active</option>
                     <option value={Status.INACTIVE}>Inactive</option>
                   </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-sm">Save User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
