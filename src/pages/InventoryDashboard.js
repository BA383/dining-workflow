import React from 'react';
import { Link } from 'react-router-dom';

function InventoryDashboard() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-blue-900 mb-6">Inventory Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Add Inventory */}
        <Link to="/inventory/add" className="p-6 bg-white shadow rounded hover:bg-gray-100">
          <h2 className="text-xl font-semibold mb-2">Register Inventory</h2>
          <p className="text-sm text-gray-600">Register new inventory items with barcode support</p>
        </Link>

        {/* Table View */}
        <Link to="/inventory-table" className="p-6 bg-white shadow rounded hover:bg-gray-100">
          <h2 className="text-xl font-semibold mb-2">Master Inventory View</h2>
          <p className="text-sm text-gray-600">View, filter, and export inventory data</p>
        </Link>

        {/* Check In / Out */}
        <Link to="/inventory-check" className="p-6 bg-white shadow rounded hover:bg-gray-100">
          <h2 className="text-xl font-semibold mb-2">Check In / Out</h2>
          <p className="text-sm text-gray-600">Track incoming and outgoing inventory with scanner</p>
        </Link>

        {/* Reports */}
        <div className="p-6 bg-white shadow rounded opacity-70">
          <h2 className="text-xl font-semibold mb-2">Reports (Coming Soon)</h2>
          <p className="text-sm text-gray-600">Generate and view inventory usage and waste data</p>
        </div>
      </div>
    </div>
  );
}

export default InventoryDashboard;
