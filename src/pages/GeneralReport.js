import React from 'react';

function GeneralReport() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-blue-900">General Operations Report</h1>

      {!isAdmin && (
        <p className="text-red-600">Access Denied: This report is only visible to administrators.</p>
      )}

      {isAdmin && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <div className="bg-white shadow-md rounded p-4">
              <h2 className="text-xl font-semibold mb-2 text-gray-700">📦 Inventory Summary</h2>
              <p className="text-sm text-gray-500">Aggregate data from all units including total stock, value, and trends.</p>
              <p className="mt-2 text-blue-600">[Placeholder for Inventory Summary Snapshot]</p>
            </div>

            <div className="bg-white shadow-md rounded p-4">
              <h2 className="text-xl font-semibold mb-2 text-gray-700">💰 Food Cost Analysis</h2>
              <p className="text-sm text-gray-500">Tracks cost of goods sold vs sales revenue.</p>
              <p className="mt-2 text-blue-600">[Placeholder for Food Cost % and Charts]</p>
            </div>

            <div className="bg-white shadow-md rounded p-4">
              <h2 className="text-xl font-semibold mb-2 text-gray-700">🗑️ Waste Management</h2>
              <p className="text-sm text-gray-500">Quantifies item loss, expiration, and waste trends by unit.</p>
              <p className="mt-2 text-blue-600">[Placeholder for Waste Log Breakdown]</p>
            </div>

            <div className="bg-white shadow-md rounded p-4">
              <h2 className="text-xl font-semibold mb-2 text-gray-700">🧍 Labor Cost</h2>
              <p className="text-sm text-gray-500">Compares labor hours/wages against sales by unit.</p>
              <p className="mt-2 text-blue-600">[Placeholder for Labor vs Sales Comparison]</p>
            </div>

            <div className="col-span-full bg-white shadow-md rounded p-4">
              <h2 className="text-xl font-semibold mb-2 text-gray-700">📊 Profit & Loss Overview</h2>
              <p className="text-sm text-gray-500">Overall summary of revenues, costs, and net profit across operations.</p>
              <p className="mt-2 text-blue-600">[Placeholder for P&L Breakdown and Trend Graph]</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default GeneralReport;
