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
    const fetchStatus = async () => {
      const today = dayjs();
      const endOfMonth = dayjs().endOf('month');
      const diff = today.diff(endOfMonth, 'day');

      // 🔸 EOM Inventory Notice
      if (diff === 0) setEomNotice('EOM due today');
      else if (diff > 0) setEomNotice(`${diff} day${diff > 1 ? 's' : ''} overdue`);
      else setEomNotice('');

      // 🔸 Pending Invoice Signatures
      const { data: invoices } = await supabase
        .from('invoice_log')
        .select('*')
        .eq('processed', false); // Or adjust to filter by signature status

      setInvoicePending(invoices?.length || 0);

      // 🔸 Deposit alert: check if no deposit was submitted today
      const { data: deposits } = await supabase
        .from('deposits')
        .select('*')
        .gte('submitted_at', today.startOf('day').toISOString());

      if (!deposits || deposits.length === 0) {
        setDepositNotice('No deposit submitted today');
      }

      // 🔸 Group Entry reminder: dummy logic, update as needed
      const { data: groups } = await supabase
        .from('group_entries')
        .select('*')
        .gte('entry_date', today.startOf('day').toISOString());

      if (!groups || groups.length === 0) {
        setGroupNotice('No group entry recorded');
      }
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
