import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Package, MapPin, Users, Activity, Info } from 'lucide-react';
import { getDocs, collection, db } from '../firebase';

const StatCard = ({ title, value, icon, color }: any) => (
  <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-100 flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
    </div>
    <div className={`p-3 rounded-full ${color}`}>
      {icon}
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const { data: stats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const items = await getDocs(collection(db, 'items'));
      const locs = await getDocs(collection(db, 'locations'));
      const users = await getDocs(collection(db, 'users'));
      
      return {
        items: items.docs.length,
        locations: locs.docs.length,
        users: users.docs.length,
        variants: items.docs.reduce((acc, curr: any) => acc + (curr.variants?.length || 0), 0)
      };
    }
  });

  const lowStockItems = [
    { id: '1', itemName: 'MacBook Pro 14"', variantInfo: 'Silver / 16GB', sku: 'LAP-MBP-14-S', quantity: 2, limit: 5 },
    { id: '2', itemName: 'Dell UltraSharp', variantInfo: '27" 4K', sku: 'MON-DELL-27', quantity: 1, limit: 3 },
  ];

  const chartData = [
    { name: 'Mon', movements: 40 },
    { name: 'Tue', movements: 30 },
    { name: 'Wed', movements: 20 },
    { name: 'Thu', movements: 27 },
    { name: 'Fri', movements: 18 },
    { name: 'Sat', movements: 23 },
    { name: 'Sun', movements: 34 },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-blue-800 text-sm shadow-sm flex items-center gap-3">
        <Info size={18} className="text-blue-600" />
        <div>
          <strong>Local Engine Active:</strong> The application is running using a <strong>Local Storage Mock Engine</strong>. Your data will persist in this browser, and you have full access to all features (Inventory, Users, Admin Settings) without needing a Firebase connection.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Items" value={stats?.items || 0} icon={<Package className="text-blue-600" />} color="bg-blue-50" />
        <StatCard title="Total Variants" value={stats?.variants || 0} icon={<Activity className="text-emerald-600" />} color="bg-emerald-50" />
        <StatCard title="Locations" value={stats?.locations || 0} icon={<MapPin className="text-violet-600" />} color="bg-violet-50" />
        <StatCard title="Total Users" value={stats?.users || 0} icon={<Users className="text-amber-600" />} color="bg-amber-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-100">
          <h3 className="text-lg font-medium text-slate-800 mb-4">Inventory Movement (Last 7 Days)</h3>
          <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{fontSize: 12}} />
                  <YAxis tick={{fontSize: 12}} />
                  <Tooltip />
                  <Bar dataKey="movements" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
              </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-100">
          <h3 className="text-lg font-medium text-slate-800 mb-4">Low Stock Alerts</h3>
          <div className="space-y-4">
            {lowStockItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 rounded border border-red-100">
                    <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <div>
                        <p className="text-sm font-medium text-red-900">
                            {item.itemName} 
                            {item.variantInfo && <span className="font-normal text-red-800"> - {item.variantInfo}</span>}
                        </p>
                        <p className="text-xs text-red-700">SKU: {item.sku}</p>
                    </div>
                    </div>
                    <div className="text-right">
                        <span className="block text-sm font-bold text-red-600">{item.quantity} left</span>
                        <span className="text-[10px] text-red-400">Reorder: {item.limit}</span>
                    </div>
                </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
