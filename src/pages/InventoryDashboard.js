import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import BackToAdminDashboard from '../BackToAdminDashboard';
import { isAdmin, isDining } from '../utils/permissions';
import { getCurrentUser, setRLSContext } from '../utils/userSession';
import { BarChart3 as BarChartIcon } from 'lucide-react';
import { BarChart3 } from 'lucide-react';



import {
  PlusCircle,
  Table,
  Trash2,
  ScanBarcode,
  ClipboardList,
  FileBarChart2,
  Shield
} from 'lucide-react';

function InventoryDashboard() {
  const [user, setUser] = useState({});
  const [selectedUnit, setSelectedUnit] = useState('');

  useEffect(() => {
  async function fetchUser() {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
    setSelectedUnit(currentUser?.unit || '');
  }
  fetchUser();
}, []);


  // ✅ Check permissions after user is loaded
  if (!isAdmin() && !isDining()) {
    return (
      <div className="p-6">
        <p className="text-red-600 font-semibold">🚫 Access Denied: Only Dining or Admin users can access this page.</p>
      </div>
    );
  }


  return (
    <div className="p-6 max-w-6xl mx-auto">
      <BackToAdminDashboard />
      <h1 className="text-3xl font-bold text-blue-900 mb-6">Inventory Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Register Inventory */}
        <Link to="/inventory/add" className="p-6 bg-white shadow rounded hover:bg-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <PlusCircle className="text-green-600" />
            <h2 className="text-xl font-semibold">Register Inventory</h2>
          </div>
          <p className="text-sm text-gray-600">Register new items with barcode support</p>
        </Link>

        {/* Master Table */}
        <Link to="/inventory-table" className="p-6 bg-white shadow rounded hover:bg-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <Table className="text-blue-600" />
            <h2 className="text-xl font-semibold">Master Inventory View</h2>
          </div>
          <p className="text-sm text-gray-600">View, filter, and export inventory</p>
        </Link>

        {/* Check In / Out */}
        <Link to="/inventory-check" className="p-6 bg-white shadow rounded hover:bg-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <ScanBarcode className="text-yellow-600" />
            <h2 className="text-xl font-semibold">Check In / Out</h2>
          </div>
          <p className="text-sm text-gray-600">Scan to manage inventory movement</p>
        </Link>

        {/* Activity Log */}
        <Link to="/inventory-activity" className="p-6 bg-white shadow rounded hover:bg-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <ClipboardList className="text-purple-600" />
            <h2 className="text-xl font-semibold">Inventory Activity</h2>
          </div>
          <p className="text-sm text-gray-600">See all item check-ins and outs</p>
        </Link>

        {/* Admin (optional) */}
        <Link to="/inventory-admin" className="p-6 bg-white shadow rounded hover:bg-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="text-red-600" />
            <h2 className="text-xl font-semibold">Admin Panel</h2>
          </div>
          <p className="text-sm text-gray-600">Edit or remove inventory items</p>
        </Link>
{/* ✅ New tile */}
  <Link to="/waste-transfer" className="p-6 bg-white shadow rounded hover:bg-gray-100">
  
    <div className="flex items-center gap-3 mb-2">
      <Trash2 className="text-yellow-600" /> {/* or Recycle if available */}
      <h2 className="text-xl font-semibold">Log Waste / Transfer</h2>
    </div>
    <p className="text-sm text-gray-600">
      Record waste events or transfer items between units.
    </p>
  </Link>


{/* Recipe Conversion */} 
<Link to="/recipe-conversion" className="p-6 bg-white shadow rounded hover:bg-gray-100">
  <div className="flex items-center gap-3 mb-2">
    <ClipboardList className="text-orange-600" />
    <h2 className="text-xl font-semibold">Recipe Conversion</h2>
  </div>
  <p className="text-sm text-gray-600">
    Convert ingredients into standardized recipes with cost & yield tracking.
  </p>
</Link>

{/* Menu Production Planner */}
<Link to="/menu-production" className="p-6 bg-white shadow rounded hover:bg-gray-100">
  <div className="flex items-center gap-3 mb-2">
    <FileBarChart2 className="text-indigo-600" />
    <h2 className="text-xl font-semibold">Menu Production</h2>
  </div>
  <p className="text-sm text-gray-600">
    Plan production runs and forecast ingredient needs by menu.
  </p>
</Link>


{/* Production Insights */}
<Link to="/production-insights" className="p-6 bg-white shadow rounded hover:bg-gray-100">
  <div className="flex items-center gap-3 mb-2">
    <BarChart3 className="text-indigo-600" /> {/* Replace with your preferred icon */}
    <h2 className="text-xl font-semibold">Production Insights</h2>
  </div>
  <p className="text-sm text-gray-600">
    Analyze batch history, cost breakdowns, and top used ingredients.
  </p>
</Link>



       {/* Make the Reports card clickable */}
<Link to="/inventory-report" className="p-6 bg-yellow-100 shadow rounded hover:bg-blue-100">
  <div className="p-6 bg-white shadow rounded hover:opacity-100 transition-opacity duration-200">
    <div className="flex items-center gap-3 mb-2">
      <FileBarChart2 className="text-gray-700" />
      <h2 className="text-xl font-semibold">Inventory Reports</h2>
    </div>
    <p className="text-sm text-gray-600">Click to view usage & activity trends</p>
  </div>
</Link>
{/* Run EOM Inventory */}
<Link
  to="/run-eom-inventory"
  className="p-6 bg-gradient-to-br from-blue-100 via-white to-blue-50 border border-blue-300 rounded-2xl shadow-lg hover:shadow-xl transition duration-200 transform hover:scale-[1.02]"
>
  <div className="flex items-center gap-3 mb-2">
    <BarChartIcon className="text-blue-700 bg-blue-100 p-1 rounded-full h-8 w-8 shadow-sm" />
    <h2 className="text-xl font-bold text-blue-900">Run EOM Inventory</h2>
  </div>
  <p className="text-sm text-blue-700">Generate monthly COGS and plate cost reports</p>
  <div className="mt-3 inline-block bg-blue-200 text-blue-900 text-xs px-3 py-1 rounded-full shadow-inner">
    🔒 Locked until end of month
  </div>
</Link>



      </div>
    </div>
  );
}

export default InventoryDashboard;
