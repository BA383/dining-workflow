import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { isAdmin, isDining } from './utils/permissions';
import { supabase } from './supabaseClient';
import dayjs from 'dayjs';
import { logVisit } from './utils/logVisit'; // Adjust the path if needed





function Dashboard() {
const [invoicePending, setInvoicePending] = useState(0);
const [eomStatus, setEomStatus] = useState('');
const [pendingDeposits, setPendingDeposits] = useState(0);

const [completedCount, setCompletedCount] = useState(0);
const [pendingCount, setPendingCount] = useState(0);
const [docuSignCount, setDocuSignCount] = useState(0);
const [recentActivity, setRecentActivity] = useState([]);
const [invoiceCompletedCount, setInvoiceCompletedCount] = useState(0);
const [depositCompletedCount, setDepositCompletedCount] = useState(0);
const [timesheetCompletedCount, setTimesheetCompletedCount] = useState(0);
const [groupEntryCount, setGroupEntryCount] = useState(0);
const [eomRunCount, setEomRunCount] = useState(0);



  // ✅ First useEffect for visit tracking
useEffect(() => {
  const trackVisit = async () => {
    const { data, error } = await supabase.auth.getUser();
    const user = data?.user;
    if (user) {
      logVisit(user, '/dashboard');
    }
  };

  trackVisit();
}, []);

// ✅ Second useEffect for fetchAlerts
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

    // ✅ EOM Inventory Status (count-based, no eomData var)
const monthStart = today.startOf('month').format('YYYY-MM-DD');
const monthEnd   = today.endOf('month').format('YYYY-MM-DD');

// count how many EOM runs exist this month
const { count: eomCount } = await supabase
  .from('eom_inventory')
  .select('id', { count: 'exact', head: true })
  .gte('run_date', monthStart)
  .lte('run_date', monthEnd);

// set status only if none have been run yet
if ((eomCount ?? 0) === 0) {
  const todayDate = today.format('YYYY-MM-DD');
  if (todayDate === monthEnd) {
    setEomStatus('⚠️ EOM due today');
  } else if (dayjs(todayDate).isAfter(monthEnd)) {
    const overdueDays = dayjs().diff(monthEnd, 'day');
    setEomStatus(`❗ EOM overdue by ${overdueDays} day${overdueDays > 1 ? 's' : ''}`);
  } else {
    setEomStatus('');
  }
} else {
  setEomStatus(''); // already run this month
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
    // Optional: count EOM runs for current month (swap to all-time if you prefer)
    const monthStart = dayjs().startOf('month').format('YYYY-MM-DD');
    const monthEnd   = dayjs().endOf('month').format('YYYY-MM-DD');

    const [
      invCompleted, depCompleted, tsCompleted, grpAll, eomThisMonth,
      invPending, depPending, invSent, depSent
    ] = await Promise.all([
      supabase.from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed'),

      supabase.from('deposits')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed'),

      // Treat temp labor rows as "completed" once Exported or Invoiced
      supabase.from('temp_time_entries')
        .select('id', { count: 'exact', head: true })
        .in('status', ['Exported', 'Invoiced']),

      // Group entries: total submitted (adjust filter if you only want this month/week)
      supabase.from('group_entries')
        .select('id', { count: 'exact', head: true }),

      // EOM runs this month
      supabase.from('eom_inventory')
        .select('id', { count: 'exact', head: true })
        .gte('run_date', monthStart)
        .lte('run_date', monthEnd),

      // --- These fuel the yellow/blue tiles (keep even if 0 for now) ---
      supabase.from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'awaiting_approval'),

      supabase.from('deposits')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'awaiting_approval'),

      supabase.from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('sent_to_docusign', true),

      supabase.from('deposits')
        .select('id', { count: 'exact', head: true })
        .eq('sent_to_docusign', true),
    ]);

    const invC = invCompleted.count ?? 0;
    const depC = depCompleted.count ?? 0;
    const tsC  = tsCompleted.count ?? 0;
    const grpC = grpAll.count ?? 0;
    const eomC = eomThisMonth.count ?? 0;

    setInvoiceCompletedCount(invC);
    setDepositCompletedCount(depC);
    setTimesheetCompletedCount(tsC);
    setGroupEntryCount(grpC);
    setEomRunCount(eomC);
    setCompletedCount(invC + depC + tsC + grpC + eomC);

    // Yellow & Blue tiles (safe to keep at 0 until you formalize logic)
    const pending = (invPending.count ?? 0) + (depPending.count ?? 0);
    const sentDS  = (invSent.count ?? 0) + (depSent.count ?? 0);
    setPendingCount(pending);
    setDocuSignCount(sentDS);
  };

  loadDashboardStats();
}, []);





const hasTaskAlerts =
  (invoicePending > 0) || (pendingDeposits > 0) || Boolean(eomStatus);


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
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-blue-900">
        Dining Workflow ~ Knotted Together for Excellence
      </h1>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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



<Link
  to="/tasks"
  aria-label="Open task center"
  className={[
    "relative overflow-hidden rounded-xl p-5 transition",
    "md:col-span-2", // makes it wider than other tiles
    hasTaskAlerts
      ? "bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 ring-1 ring-amber-300 shadow-lg hover:shadow-xl"
      : "bg-slate-50 ring-1 ring-slate-200 shadow hover:shadow-md"
  ].join(" ")}
>
  {/* left accent bar */}
  <span className="absolute inset-y-0 left-0 w-1 bg-amber-500" aria-hidden />

  {/* soft glow blob */}
  <span
    className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-amber-200/50 blur-3xl"
    aria-hidden
  />

  <div className="relative z-10">
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 shrink-0 grid place-items-center rounded-full 
          ${hasTaskAlerts ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-700"}`}>
          🛎️
        </div>
        <div>
          <h2 className="text-xl font-semibold text-blue-900">New Task Alert</h2>
          <p className="text-sm text-slate-700">
            Initiate required workflow tasks and see what needs attention.
          </p>
        </div>
      </div>

      {/* CTA button */}
      <span className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium
        ${hasTaskAlerts ? "bg-amber-600 text-white" : "bg-blue-600 text-white"}`}>
        Open Tasks <span aria-hidden>→</span>
      </span>
    </div>

    {/* alert pills */}
    <div className="mt-3 flex flex-wrap gap-2 text-xs">
      {invoicePending > 0 && (
        <span className="rounded-full bg-red-100 text-red-800 px-3 py-1">
          {invoicePending} invoice{invoicePending > 1 ? "s" : ""} awaiting signature
        </span>
      )}
      {pendingDeposits > 0 && (
        <span className="rounded-full bg-yellow-100 text-yellow-800 px-3 py-1">
          {pendingDeposits} deposit{pendingDeposits > 1 ? "s" : ""} need signature
        </span>
      )}
      {eomStatus && (
        <span className="rounded-full bg-orange-100 text-orange-800 px-3 py-1">
          {eomStatus}
        </span>
      )}
      {!hasTaskAlerts && (
        <span className="rounded-full bg-emerald-100 text-emerald-800 px-3 py-1">
          All clear for now ✅
        </span>
      )}
    </div>
  </div>
</Link>



  {/* ✅ New: Temp Labor Timesheets tile */}
  <Link to="/temp-labor" className="bg-white p-4 border rounded shadow hover:shadow-md transition">
    <h2 className="text-lg font-semibold text-blue-800 mb-2">🧾 Temp Labor Timesheets</h2>
    <p className="text-sm text-gray-600">Log hours, import CSV, review & export.</p>
  </Link>


        <Link to="/inventory-dashboard" className="bg-white p-4 border rounded shadow hover:shadow-md transition">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">📦 Inventory</h2>
          <p className="text-sm text-gray-600">Open inventory tools to check-in/out items.</p>
        </Link>
      </div>

      {/* Status Boxes */}
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
  {/* Completed */}
  <div className="bg-green-100 text-green-900 p-4 rounded shadow">
    <h3 className="text-lg font-semibold">✅ Completed Submissions</h3>
    <p className="text-3xl font-bold">{completedCount}</p>
    <div className="text-xs mt-2 space-y-1">
      <div>Invoices: <b>{invoiceCompletedCount}</b></div>
      <div>Deposits: <b>{depositCompletedCount}</b></div>
      <div>Timesheets: <b>{timesheetCompletedCount}</b></div>
      <div>Group Entry: <b>{groupEntryCount}</b></div>
      <div>EOM Inventory Runs (mo): <b>{eomRunCount}</b></div>
    </div>
  </div>

  {/* Pending Approvals (kept for future; shows 0 until your workflow fills it) */}
  <div className="bg-yellow-100 text-yellow-800 p-4 rounded shadow">
    <h3 className="text-lg font-semibold">🕒 Pending Approvals</h3>
    <p className="text-3xl font-bold">{pendingCount}</p>
    <p className="text-xs mt-1">Figures will populate as approval routing is enabled.</p>
  </div>

  {/* Sent to DocuSign (kept for future; shows 0 until wired) */}
  <div className="bg-blue-100 text-blue-800 p-4 rounded shadow">
    <h3 className="text-lg font-semibold">📨 Sent to DocuSign</h3>
    <p className="text-3xl font-bold">{docuSignCount}</p>
    <p className="text-xs mt-1">Auto-increments once envelopes are sent.</p>
  </div>
</div>



      {/* Recent Activity */}
      <div className="bg-white p-4 border rounded shadow">
        <h2 className="text-lg font-semibold text-blue-800 mb-4">Recent Activity</h2>
        <ul className="text-xs sm:text-sm text-gray-700 space-y-2">
          <li>Invoice #234 submitted - May 15</li>
          <li>Deposit for Regattas submitted - May 14</li>
          <li>Invoice #233 signed via DocuSign - May 13</li>
        </ul>
      </div>
    </div>
  );
}

export default Dashboard;
