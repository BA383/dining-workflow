import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { isAdmin, isDining } from './utils/permissions';
import { supabase } from './supabaseClient';
import dayjs from 'dayjs';




function Dashboard() {
  const [invoicePending, setInvoicePending] = useState(0);
const [eomStatus, setEomStatus] = useState('');
const [pendingDeposits, setPendingDeposits] = useState(0);

const [completedCount, setCompletedCount] = useState(0);
const [pendingCount, setPendingCount] = useState(0);
const [docuSignCount, setDocuSignCount] = useState(0);
const [recentActivity, setRecentActivity] = useState([]);


  useEffect(() => {
  const fetchAlerts = async () => {
    const today = dayjs();
    const endOfMonth = today.endOf('month').format('YYYY-MM-DD');

    // ✅ Pending Invoices
    const { data: invoices, error: invoiceError } = await supabase
      .from('invoices')
      .select('id')
      .eq('status', 'pending_signature');

    if (!invoiceError && invoices) {
      setInvoicePending(invoices.length);
    }

    // ✅ EOM Inventory Status
    const { data: eomData } = await supabase
      .from('eom_inventory')
      .select('run_date')
      .gte('run_date', today.startOf('month').format('YYYY-MM-DD'));

    if (!eomData || eomData.length === 0) {
      const todayDate = today.format('YYYY-MM-DD');
      if (todayDate === endOfMonth) {
        setEomStatus('⚠️ EOM due today');
      } else if (dayjs(todayDate).isAfter(endOfMonth)) {
        const overdueDays = dayjs().diff(endOfMonth, 'day');
        setEomStatus(`❗ EOM overdue by ${overdueDays} day${overdueDays > 1 ? 's' : ''}`);
      }
    }

    // ✅ Pending Deposit Signatures
    const { data: depositData } = await supabase
      .from('deposits')
      .select('id')
      .eq('status', 'awaiting_signature');

    if (depositData) {
      setPendingDeposits(depositData.length);
    }
  };

  fetchAlerts();
}, []);


useEffect(() => {
  const loadDashboardStats = async () => {
    // ✅ Completed Submissions (invoices + deposits marked completed)
    const { data: completedInvoices } = await supabase
      .from('invoices')
      .select('id')
      .eq('status', 'completed');

    const { data: completedDeposits } = await supabase
      .from('deposits')
      .select('id')
      .eq('status', 'completed');

    setCompletedCount(
      (completedInvoices?.length || 0) + (completedDeposits?.length || 0)
    );

    // ✅ Pending Approvals (invoices or deposits awaiting approval)
    const { data: pendingInvoices } = await supabase
      .from('invoices')
      .select('id')
      .eq('status', 'awaiting_approval');

    const { data: pendingDeposits } = await supabase
      .from('deposits')
      .select('id')
      .eq('status', 'awaiting_approval');

    setPendingCount(
      (pendingInvoices?.length || 0) + (pendingDeposits?.length || 0)
    );

    // ✅ Sent to DocuSign (any item where sent = true)
    const { data: sentInvoices } = await supabase
      .from('invoices')
      .select('id')
      .eq('sent_to_docusign', true);

    const { data: sentDeposits } = await supabase
      .from('deposits')
      .select('id')
      .eq('sent_to_docusign', true);

    setDocuSignCount(
      (sentInvoices?.length || 0) + (sentDeposits?.length || 0)
    );

    // ✅ Recent Activity (combine 5 latest invoices + deposits)
    const { data: recentInvoices } = await supabase
      .from('invoices')
      .select('id, created_at, status')
      .order('created_at', { ascending: false })
      .limit(3);

    const { data: recentDeposits } = await supabase
      .from('deposits')
      .select('unit, created_at, status')
      .order('created_at', { ascending: false })
      .limit(2);

    const activity = [];

    recentInvoices?.forEach((i) =>
      activity.push({
        text: `Invoice #${i.id} ${i.status?.replace('_', ' ')}`,
        date: dayjs(i.created_at).format('MMM D'),
      })
    );

    recentDeposits?.forEach((d) =>
      activity.push({
        text: `Deposit for ${d.unit} ${d.status?.replace('_', ' ')}`,
        date: dayjs(d.created_at).format('MMM D'),
      })
    );

    setRecentActivity(activity.slice(0, 5)); // Combine and cap to 5
  };

  loadDashboardStats();
}, []);


  // ✅ Permissions check
  if (!isAdmin() && !isDining()) {
    return (
      <div className="p-6">
        <p className="text-red-600 font-semibold text-lg">
          🚫 Access Denied: Only Admins and Dining staff can access this page.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-blue-900">
        Dining Workflow ~ Knotted Together for Excellence
      </h1>

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
          <h2 className="text-lg font-semibold text-blue-800 mb-2">📊 Director's Snapshot</h2>
          <p className="text-sm text-gray-600">Insights and tracking.</p>
        </Link>
       <Link to="/tasks" className="bg-white p-4 border rounded shadow hover:shadow-md transition">
  <h2 className="text-lg font-semibold text-blue-800 mb-2">📝 New Task Alert</h2>
  <p className="text-sm text-gray-600">
    Initiate required workflow tasks.<br />
    {invoicePending > 0 && (
      <span className="text-red-600 font-semibold block">
        {invoicePending} invoice{invoicePending > 1 ? 's' : ''} awaiting signature
      </span>
    )}
    {pendingDeposits > 0 && (
      <span className="text-yellow-700 font-semibold block">
        {pendingDeposits} deposit{pendingDeposits > 1 ? 's' : ''} need signature
      </span>
    )}
    {eomStatus && (
      <span className="text-orange-700 font-semibold block">{eomStatus}</span>
    )}
  </p>
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
    <p className="text-2xl font-bold">{completedCount}</p>
  </div>
  <div className="bg-yellow-100 text-yellow-800 p-4 rounded shadow">
    <h3 className="text-lg font-semibold">🕒 Pending Approvals</h3>
    <p className="text-2xl font-bold">{pendingCount}</p>
  </div>
  <div className="bg-blue-100 text-blue-800 p-4 rounded shadow">
    <h3 className="text-lg font-semibold">📨 Sent to DocuSign</h3>
    <p className="text-2xl font-bold">{docuSignCount}</p>
  </div>
</div>


      {/* Recent Activity */}
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
