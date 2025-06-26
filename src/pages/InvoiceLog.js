import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient'; // adjust path as needed
import { CSVLink } from 'react-csv';


export default function InvoiceLog() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [filters, setFilters] = useState({
  vendor: '',
  diningUnit: '',
  status: ''
});






  useEffect(() => {
  const fetchInvoices = async () => {
    setLoading(true);

    const {
  data: { user },
  error: userError
} = await supabase.auth.getUser();

if (userError || !user) {
  setBlocked(true);
  return;
}

const userId = user.id;


    if (!userId) {
      setBlocked(true);
      return;
    }

    // Fetch role and dining unit from profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, unit')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      setBlocked(true);
      return;
    }

    setUserRole(profile.role);

    // Fetch all invoices (RLS already applies on backend)
    const { data, error } = await supabase
      .from('invoice_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      // Admin sees all, dining sees only their unit
      const filtered = profile.role === 'admin'
        ? data
        : data.filter((inv) => inv.dining_unit === profile.unit);

      setInvoices(filtered);
    }

    setLoading(false);
  };

  fetchInvoices();
}, []);


if (blocked) {
  return (
    <div className="p-6 text-red-700 font-medium">
      🚫 Access Denied: Only administrators may view the invoice log.
    </div>
  );
}

const handleMarkProcessed = async (invoiceId) => {
  const { error } = await supabase
    .from('invoice_logs')
    .update({ status: 'Processed', approval_date: new Date().toISOString() })
    .eq('id', invoiceId);

  if (error) {
    alert('❌ Failed to update invoice status.');
    console.error(error);
  } else {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoiceId ? { ...inv, status: 'Processed' } : inv
      )
    );
  }
};



  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-blue-900 mb-4">📄 Submitted Invoices</h1>

      {loading && <p>Loading invoice records...</p>}
      {error && <p className="text-red-600">Error: {error}</p>}

      {!loading && !error && invoices.length === 0 && (
        <p className="text-gray-600">No invoices found.</p>
      )}

      {!loading && !error && invoices.length > 0 && (

        <div className="overflow-x-auto">


<CSVLink
  data={
    invoices
      .filter((inv) =>
        (!filters.vendor || inv.vendor === filters.vendor) &&
        (!filters.diningUnit || inv.dining_unit === filters.diningUnit) &&
        (!filters.status || inv.status === filters.status)
      )
      .map((inv) => ({
        Vendor: inv.vendor,
        'Invoice #': inv.invoice_number,
        Amount: inv.invoice_total,
        Unit: inv.dining_unit,
        'Submitted By': inv.submitted_by,
        'Payment Method': inv.payment_method,
        Status: inv.status,
        'Submitted On': new Date(inv.created_at).toLocaleDateString()
      }))
  }
  filename={`invoice-log-${new Date().toISOString().slice(0, 10)}.csv`}
  className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
>
  Export CSV
</CSVLink>



          <table className="min-w-full border text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="p-2 border">Vendor</th>
                <th className="p-2 border">Invoice #</th>
                <th className="p-2 border">Amount ($)</th>
                <th className="p-2 border">Dining Unit</th>
                <th className="p-2 border">Submitted By</th>
                <th className="p-2 border">Payment Method</th>
                <th className="p-2 border">Status</th>
                <th className="p-2 border">Date Submitted</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-t hover:bg-yellow-50">
                  <td className="p-2 border">{inv.vendor}</td>
                  <td className="p-2 border">{inv.invoice_number}</td>
                  <td className="p-2 border">${parseFloat(inv.invoice_total).toFixed(2)}</td>
                  <td className="p-2 border">{inv.dining_unit}</td>
                  <td className="p-2 border">{inv.submitted_by}</td>
                  <td className="p-2 border">{inv.payment_method}</td>
                  <td className="p-2 border">
  {inv.status === 'Submitted' ? (
    <button
      onClick={() => handleMarkProcessed(inv.id)}
      className="text-sm px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
    >
      Mark as Processed
    </button>
  ) : (
    <span>{inv.status}</span>
  )}
</td>

                  <td className="p-2 border">
                    {new Date(inv.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
