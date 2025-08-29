import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from './supabaseClient';
import BackToAdminDashboard from './BackToAdminDashboard';
import dayjs from 'dayjs';

function Tasks() {
  const [invoicePending, setInvoicePending] = useState(0);
  const [eomNotice, setEomNotice] = useState('');
  const [depositNotice, setDepositNotice] = useState('');
  const [groupNotice, setGroupNotice] = useState('');
  const [timesheetNotice, setTimesheetNotice] = useState('');
  const [timesheetCount, setTimesheetCount] = useState(0);
  
const refreshTimesheetStatus = async () => {
  const start = dayjs().startOf('isoWeek');   // use .startOf('week') if you prefer Sun–Sat
  const end   = start.add(1, 'week');
  const { count, error } = await supabase
    .from('temp_time_entries')
    .select('id', { count: 'exact', head: true })
    .gte('date_worked', start.format('YYYY-MM-DD'))
    .lt('date_worked', end.format('YYYY-MM-DD'));

  const n = count ?? 0;
  setTimesheetCount(n);
  setTimesheetNotice(!error && n === 0 ? 'No timesheet logged this week' : '');
};

const refreshDepositNotice = async () => {
  const start = dayjs().startOf('day');
  const end   = dayjs().endOf('day');
  const { count } = await supabase
    .from('deposits')
    .select('id', { count: 'exact', head: true })
    .gte('submitted_at', start.toISOString())
    .lte('submitted_at', end.toISOString());

  setDepositNotice((count ?? 0) > 0 ? 'Deposit submitted today' : 'No deposit submitted today');
};

  
  useEffect(() => {
  const fetchPendingInvoices = async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user?.email) return;

    const { data, error } = await supabase
      .from('invoices')
      .select('id')
      .eq('status', 'pending_signature');

    if (!error && data) {
      setInvoicePending(data.length);
    }
  };

  fetchPendingInvoices();
}, []);

  
  useEffect(() => {
  const fetchTimesheetStatus = async () => {
    const start = dayjs().startOf('week');         // Sun–Sat; swap to .startOf('isoWeek') if Mon–Sun
    const endExclusive = start.add(1, 'week');     // end-exclusive window

    // Works whether date_worked is DATE or TIMESTAMP
    const { data, error } = await supabase
      .from('temp_time_entries')
      .select('id', { count: 'exact', head: true })
      .gte('date_worked', start.toISOString())
      .lt('date_worked', endExclusive.toISOString());

    const count = (data?.length ?? 0); // head:true returns no rows; length may be 0
    // If your PostgREST version supports it, you can use the returned count header via supabase-js v2.
    setTimesheetCount(count);
    if (!error && count === 0) {
      setTimesheetNotice('No timesheet logged this week');
    } else {
      setTimesheetNotice('');
    }
  };

  fetchTimesheetStatus();
}, []);


  
useEffect(() => {
  const fetchStatus = async () => {
    const today = dayjs();
    const endOfMonth = dayjs().endOf('month');
    const diff = today.diff(endOfMonth, 'day');

    if (diff === 0) setEomNotice('EOM due today');
    else if (diff > 0) setEomNotice(`${diff} day${diff > 1 ? 's' : ''} overdue`);
    else setEomNotice('');

    const { data: invoices } = await supabase
      .from('invoice_log')
      .select('*')
      .eq('processed', false);
    setInvoicePending(invoices?.length || 0);

    const { data: groups } = await supabase
      .from('group_entries')
      .select('*')
      .gte('entry_date', today.startOf('day').toISOString());
    setGroupNotice(!groups || groups.length === 0 ? 'No group entry recorded' : '');

    // NEW
    await refreshTimesheetStatus();
    await refreshDepositNotice();
  };

  fetchStatus();
}, []);





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
          <p className="text-sm text-gray-600">
            Start a vendor invoice to be sent for signature.<br />
            {invoicePending > 0 && (
              <span className="text-red-600 font-semibold">{invoicePending} awaiting signature</span>
            )}
          </p>
        </Link>

        <Link to="/deposit" className="bg-white border p-4 rounded shadow hover:shadow-md transition">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">💰 New Deposit</h2>
          <p className="text-sm text-gray-600">
            Begin a daily transmittal for Regattas or other units.<br />
            {depositNotice && (
              <span className="text-red-600 font-semibold">{depositNotice}</span>
            )}
          </p>
        </Link>

        <Link to="/group-entry" className="bg-white border p-4 rounded shadow hover:shadow-md transition">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">👥 Group Entry</h2>
          <p className="text-sm text-gray-600">
            Record a one-time or recurring dining entry.<br />
            {groupNotice && (
              <span className="text-red-600 font-semibold">{groupNotice}</span>
            )}
          </p>
        </Link>




        <Link to="/temp-labor" className="bg-white border p-4 rounded shadow hover:shadow-md transition">
  <h2 className="text-lg font-semibold text-blue-800 mb-2">🧾 Temp Labor Timesheets</h2>
  <p className="text-sm text-gray-600">
    Log weekly hours, import CSV, review & export.<br />
    {timesheetNotice ? (
      <span className="text-red-600 font-semibold">{timesheetNotice}</span>
    ) : (
      <span className="text-green-700 font-semibold">
        {timesheetCount > 0 ? `${timesheetCount} entries this week` : 'Up to date'}
      </span>
    )}
  </p>
</Link>






        <Link to="/run-eom-inventory" className="bg-white border p-4 rounded shadow hover:shadow-md transition">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">📦 Run EOM Inventory</h2>
          <p className="text-sm text-gray-600">
            Generate plate cost from monthly activity logs.<br />
            {eomNotice && (
              <span className="text-red-600 font-semibold">{eomNotice}</span>
            )}
          </p>
        </Link>
      </div>
    </div>
  );
}

export default Tasks;
