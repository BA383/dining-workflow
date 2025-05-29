import React from 'react';
import { Link } from 'react-router-dom';

import {
  PlusCircle,
  Table,
  ScanBarcode,
  ClipboardList,
  FileBarChart2,
  Shield
} from 'lucide-react';

function InventoryDashboard() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
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

       {/* Make the Reports card clickable */}
<Link to="/inventory-report" className="block">
  <div className="p-6 bg-white shadow rounded hover:opacity-100 transition-opacity duration-200">
    <div className="flex items-center gap-3 mb-2">
      <FileBarChart2 className="text-gray-700" />
      <h2 className="text-xl font-semibold">Reports</h2>
    </div>
    <p className="text-sm text-gray-600">Click to view usage & activity trends</p>
  </div>
</Link>
      </div>
    </div>
  );
}

export default InventoryDashboard;
