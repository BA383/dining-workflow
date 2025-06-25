import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import BackToInventoryDashboard from '../Components/BackToInventoryDashboard';
import { isAdmin, isDining } from '../utils/permissions';
import { getCurrentUser, setRLSContext } from '../utils/userSession';

const COLORS = ['#4ade80', '#60a5fa', '#f87171', '#c084fc', '#fbbf24'];

function InventoryReport() {
  const [user, setUser] = useState({});
  const [selectedUnit, setSelectedUnit] = useState('');
  const [inventory, setInventory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [unitFilter, setUnitFilter] = useState('');
  const [units, setUnits] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);


  const isAdminUser = user?.role === 'admin'; // ✅ Safe use after `user` is defined
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = inventory.slice(indexOfFirstRow, indexOfLastRow);

  useEffect(() => {
  async function fetchUser() {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
    setSelectedUnit(currentUser?.unit || '');
  }
  fetchUser();
}, []);


  // ✅ Now that `user` is available, check access
const shouldBlockAccess =
user?.role !== 'admin' && user?.role !== 'dining';



  useEffect(() => {
  if (!user?.role) return;

  if (user.role === 'admin') {
    fetchUnits();
    setUnitFilter('all'); // ✅ Admin sees all units by default
  } else {
    setUnitFilter(user.unit || ''); // ✅ Dining sees only their unit
  }
}, [user]);


  useEffect(() => {
    fetchInventory();
    fetchLogs();
  }, [unitFilter]);

  const fetchUnits = async () => {
    const { data, error } = await supabase.from('inventory').select('dining_unit');
    if (!error && data) {
      const uniqueUnits = [...new Set(
        data.map(item => item.dining_unit?.trim()).filter(unit => !!unit)
      )];
      setUnits(uniqueUnits);
    }
  };


  const fetchInventory = async () => {
    let query = supabase.from('inventory').select('*');


    if (!isAdminUser) {
  query = query.eq('dining_unit', user.unit); // ✅ Non-admin: always scoped
} else if (unitFilter && unitFilter !== 'all') {
  query = query.eq('dining_unit', unitFilter); // ✅ Admin: filter only if specific
}




    const { data, error } = await query;
    if (!error) {
      setInventory(data);
      buildCategoryData(data);
    }
  };

  const fetchLogs = async () => {
    let query = supabase.from('inventory_logs').select('*');
    if (!isAdminUser) {
      query = query.eq('dining_unit', user.unit);
    }
    if (isAdmin && unitFilter) {
      query = query.eq('dining_unit', unitFilter);
    }
    const { data, error } = await query;
    if (!error) {
      setLogs(data);
      buildTrendData(data);
    }
  };

  const buildTrendData = (logs) => {
    const grouped = {};
    logs.forEach((log) => {
      const date = new Date(log.timestamp);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!grouped[month]) grouped[month] = { month, checkin: 0, checkout: 0 };
      if (log.action === 'checkin') grouped[month].checkin += Number(log.quantity);
      if (log.action === 'checkout') grouped[month].checkout += Number(log.quantity);
    });
    const trendArray = Object.values(grouped).map(entry => ({ ...entry, net: entry.checkin - entry.checkout }))
      .sort((a, b) => new Date(`${a.month}-01`) - new Date(`${b.month}-01`));
    setTrendData(trendArray);
  };

 const buildCategoryData = (data) => {
  const catTotals = {};
  data.forEach(item => {
    catTotals[item.category] = (catTotals[item.category] || 0) + Number(item.qty_on_hand);
  });
  const formatted = Object.entries(catTotals).map(([category, quantity]) => ({ name: category, value: quantity }));
  setCategoryData(formatted);
};

const totalQuantity = inventory.reduce((sum, item) => sum + Number(item.qty_on_hand), 0);

const lowStockCount = inventory.filter(item =>
  item.reorder_level && item.qty_on_hand < item.reorder_level
).length;

const totalValue = inventory.reduce((sum, item) => {
  const price = parseFloat(item.unitPrice) || 0;
  const qty = parseFloat(item.qty_on_hand) || 0;
  return sum + price * qty;
}, 0);

  const uniqueCategories = [...new Set(inventory.map(item => item.category))].length;

 return (
  <div className="p-6 max-w-7xl mx-auto">
    {shouldBlockAccess ? (
      <div className="p-6">
        <p className="text-red-600 font-semibold">
          🚫 Inventory is for Dining staff only.
        </p>
      </div>
    ) : (
      <>
        <BackToInventoryDashboard />
        <h1 className="text-3xl font-bold mb-2 text-blue-900">
          Inventory Report {isAdmin && unitFilter ? `– ${unitFilter}` : !isAdmin ? `– ${user.unit}` : ''}
        </h1>

        {isAdmin && (
          <div className="mb-4">
            <label className="text-sm font-medium">Filter by unit:</label>
            <select
              className="ml-2 p-2 border rounded"
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
            >
              <option value="">All Units</option>
              {units.map((unit) => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 shadow rounded">
            <p className="text-sm text-gray-500">Total Inventory Quantity</p>
            <p className="text-xl font-semibold text-blue-800">{totalQuantity}</p>
          </div>
          <div className="bg-white p-4 shadow rounded">
            <p className="text-sm text-gray-500">Low Stock Items</p>
            <p className="text-xl font-semibold text-red-500">{lowStockCount}</p>
          </div>
          <div className="bg-white p-4 shadow rounded">
            <p className="text-sm text-gray-500">Total Inventory Value</p>
            <p className="text-xl font-semibold text-green-600">${totalValue.toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 shadow rounded">
            <p className="text-sm text-gray-500">Unique Categories</p>
            <p className="text-xl font-semibold text-purple-600">{uniqueCategories}</p>
          </div>
        </div>

        <div className="mb-10">
          <h2 className="text-xl font-semibold mb-2">Category Distribution</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={categoryData} dataKey="value" nameKey="name" outerRadius={100}>
                {categoryData.map((entry, i) => (
                  <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [`${value} units`, `${name}`]} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="mb-10">
          <h2 className="text-xl font-semibold mb-2">Inventory Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value, name) => [`${value} items`, name]} />
              <Legend />
              <Line type="monotone" dataKey="checkin" stroke="#4ade80" name="Check-ins" />
              <Line type="monotone" dataKey="checkout" stroke="#f87171" name="Check-outs" />
              <Line type="monotone" dataKey="net" stroke="#60a5fa" name="Net Change" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Inventory Snapshot</h2>
          <table className="w-full border-collapse border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2">Item</th>
                <th className="border p-2">SKU</th>
                <th className="border p-2">Category</th>
                <th className="border p-2">Quantity</th>
                <th className="border p-2">Dining Unit</th>
                <th className="border p-2">Location</th>
              </tr>
            </thead>
            <tbody>
              {currentRows.map((item, i) => (
                <tr key={i}>
                  <td className="border p-2">{item.name}</td>
                  <td className="border p-2">{item.sku}</td>
                  <td className="border p-2">{item.category}</td>
                  <td className="border p-2">{item.qty_on_hand}</td>
                  <td className="border p-2">{item.dining_unit}</td>
                  <td className="border p-2">{item.location}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between items-center mt-4 mb-2">
            <label className="text-sm text-gray-700">
              Rows per page:
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="ml-2 p-1 border rounded"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </label>
          </div>

          <div className="flex justify-center mt-4 space-x-2">
            {Array.from({ length: Math.ceil(inventory.length / rowsPerPage) }, (_, i) => (
              <button
                key={i}
                className={`px-3 py-1 rounded ${
                  currentPage === i + 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'
                }`}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </>
    )}
  </div>
);
}
export default InventoryReport; // ✅ must be included