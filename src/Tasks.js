import React from 'react';
import { Link } from 'react-router-dom';
import BackToAdminDashboard from './BackToAdminDashboard';

function Tasks() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <BackToAdminDashboard />
      <h1 className="text-2xl font-bold text-blue-900 mb-4">Start a New Task</h1>
      <p className="text-gray-700 mb-6">
        Choose a workflow below to begin. More task types will be added as we integrate new forms and DocuSign routing.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/invoices" className="bg-white border p-4 rounded shadow hover:shadow-md transition">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">📄 New Invoice</h2>
          <p className="text-sm text-gray-600">Start a vendor invoice to be sent for signature.</p>
        </Link>

        <Link to="/deposit" className="bg-white border p-4 rounded shadow hover:shadow-md transition">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">💰 New Deposit</h2>
          <p className="text-sm text-gray-600">Begin a daily transmittal for Regattas or other units.</p>
        </Link>

        <Link to="/group-entry" className="bg-white border p-4 rounded shadow hover:shadow-md transition">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">👥 Group Entry</h2>
          <p className="text-sm text-gray-600">Record a one-time or recurring dining entry.</p>
        </Link>

        <Link to="/inventory-dashboard" className="bg-white border p-4 rounded shadow hover:shadow-md transition">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">📦 Run EOM Inventory</h2>
          <p className="text-sm text-gray-600">Track, scan, and update inventory items.</p>
        </Link>
      </div>
    </div>
  );
}

export default Tasks;
