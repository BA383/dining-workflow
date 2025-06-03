import React from 'react';
import { Link } from 'react-router-dom';

function Dashboard() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-blue-900">Dining Workflow ~ Knotted Together for Excellence</h1>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Link to="/invoices" className="bg-white p-4 border rounded shadow hover:shadow-md transition">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">📄 Start New Invoice</h2>
          <p className="text-sm text-gray-600">Submit a new dining invoice form.</p>
        </Link>
        <Link to="/deposit" className="bg-white p-4 border rounded shadow hover:shadow-md transition">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">💰 Submit Deposit</h2>
          <p className="text-sm text-gray-600">Fill out and send a transmittal form.</p>
        </Link>
        <Link to="/general-report" className="bg-white p-4 border rounded shadow">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">📊 Director's Reports</h2>
          <p className="text-sm text-gray-600">Insights and tracking.</p>
        </Link>
        <Link to="/tasks" className="bg-white p-4 border rounded shadow hover:shadow-md transition">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">📝 Start New Task</h2>
          <p className="text-sm text-gray-600">Launch a signature-required workflow form.</p>
        </Link>
        

        <Link to="/inventory-dashboard" className="bg-white p-4 border rounded shadow hover:shadow-md transition">
  <h2 className="text-lg font-semibold text-blue-800 mb-2">📦 Inventory</h2>
  <p className="text-sm text-gray-600">Open inventory tools to check-in/out items.</p>
</Link>

      </div>

      {/* Status Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-green-100 text-green-800 p-4 rounded shadow">
          <h3 className="text-lg font-semibold">✅ Completed Submissions</h3>
          <p className="text-2xl font-bold">12</p>
        </div>
        <div className="bg-yellow-100 text-yellow-800 p-4 rounded shadow">
          <h3 className="text-lg font-semibold">🕒 Pending Approvals</h3>
          <p className="text-2xl font-bold">3</p>
        </div>
        <div className="bg-blue-100 text-blue-800 p-4 rounded shadow">
          <h3 className="text-lg font-semibold">📨 Sent to DocuSign</h3>
          <p className="text-2xl font-bold">5</p>
        </div>
      </div>

      {/* Recent Activity Placeholder */}
      <div className="bg-white p-4 border rounded shadow">
        <h2 className="text-lg font-semibold text-blue-800 mb-4">Recent Activity</h2>
        <ul className="text-sm text-gray-700 space-y-2">
          <li>Invoice #234 submitted - May 15</li>
          <li>Deposit for Regattas submitted - May 14</li>
          <li>Invoice #233 signed via DocuSign - May 13</li>
        </ul>
      </div>
    </div>
  );
}

export default Dashboard;
