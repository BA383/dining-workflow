import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { CSVLink } from 'react-csv';

export default function InvoiceLog() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState('');
  const [userUnit, setUserUnit] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, unit')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        setBlocked(true);
        return;
      }

      setUserRole(profile.role);
      setUserUnit(profile.unit);

      const { data, error } = await supabase
        .from('invoice_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        const filtered = profile.role === 'admin'
          ? data
          : data.filter((inv) => inv.dining_unit === profile.unit);

        setInvoices(filtered);
      }

      setLoading(false);
    };

    fetchInvoices();
  }, []);

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

  const filteredInvoices = invoices.filter((inv) => {
    const matchesVendor = inv.vendor?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesInvoice = inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilters =
      (!filters.vendor || inv.vendor === filters.vendor) &&
      (!filters.diningUnit || inv.dining_unit === filters.diningUnit) &&
      (!filters.status || inv.status === filters.status);

    return (matchesVendor || matchesInvoice) && matchesFilters;
  });

  const totalAmount = filteredInvoices.reduce((acc, inv) => acc + parseFloat(inv.invoice_total || 0), 0);

  if (blocked) {
    return (
      <div className="p-6 text-red-700 font-medium">
        🚫 Access Denied: Only administrators may view the invoice log.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-blue-900 mb-4">📄 Submitted Invoices</h1>

      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <input
          type="text"
          placeholder="Search vendor or invoice #"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border p-2 rounded w-full md:w-1/3"
        />

        {userRole === 'admin' && (
          <select
            value={filters.diningUnit}
            onChange={(e) => setFilters({ ...filters, diningUnit: e.target.value })}
            className="border p-2 rounded w-full md:w-1/4"
          >
            <option value="">All Dining Units</option>
            {[...new Set(invoices.map(inv => inv.dining_unit))].map(unit => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
        )}

        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="border p-2 rounded w-full md:w-1/4"
        >
          <option value="">All Statuses</option>
          <option value="Submitted">Submitted</option>
          <option value="Processed">Processed</option>
        </select>
      </div>

      <div className="flex justify-between items-center mb-2">
        <CSVLink
          data={filteredInvoices.map((inv) => ({
            Vendor: inv.vendor,
            'Invoice #': inv.invoice_number,
            Amount: inv.invoice_total,
            Unit: inv.dining_unit,
            'Submitted By': inv.submitted_by,
            'Payment Method': inv.payment_method,
            Status: inv.status,
            'Submitted On': new Date(inv.created_at).toLocaleDateString()
          }))}
          filename={`invoice-log-${new Date().toISOString().slice(0, 10)}.csv`}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
        >
          Export CSV
        </CSVLink>

        <div className="text-lg font-semibold text-green-800">
          Total: ${totalAmount.toFixed(2)}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-2 border">Vendor</th>
              <th className="p-2 border">Invoice #</th>
              <th className="p-2 border">Amount ($)</th>
              <th className="p-2 border">Dining Unit</th>
              <th className="p-2 border">Invoice Date</th>
              <th className="p-2 border">Date Received</th>
              <th className="p-2 border">Submitted By</th>
              <th className="p-2 border">Payment Method</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border">Date Submitted</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map((inv) => (
              <tr key={inv.id} className="border-t hover:bg-yellow-50">
                <td className="p-2 border">{inv.vendor}</td>
                <td className="p-2 border">{inv.invoice_number}</td>
                <td className="p-2 border">${parseFloat(inv.invoice_total || 0).toFixed(2)}</td>
                <td className="p-2 border">{inv.dining_unit}</td>
                <td className="p-2 border">{inv.invoice_date}</td>
                <td className="p-2 border">{inv.date_received}</td>
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
                  {inv.date_submitted
                    ? new Date(inv.date_submitted).toLocaleDateString()
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
