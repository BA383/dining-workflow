import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { CSVLink } from 'react-csv';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import BackToAdminDashboard from '../BackToAdminDashboard';
import { Link } from 'react-router-dom';





const departmentOptions = [
  'Dining - Bistro','Dining - Regattas','Dining - Commons','Captains Card','Parking Services',
  'Catering','Scheduling, Events, and Conferences','Dining - Pizza','Dining - Fit','Dining - Pallete Cafe',
  'Dining - Concessions','Dining - Einsteins','Dining - Discovery Cafe (CFA and Grill\'d)','Summer Camps and Conferences'
];


const EXPENSE_TYPES = [
  'Ongoing',
  'One time, expected',
  'One time, unexpected',
  'Passthrough/Reimbursable Expense',
  'Monthly',
  'Quarterly',
  'Annual',
];



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
  department: '',     // (you already added this)
  status: '',
  source: '',
  accountCode: ''     // ← NEW
});




const mergedDepartmentOptions = useMemo(() => {
  const fromRows = invoices.map(inv => inv.department).filter(Boolean);
  const fromDining = invoices
    .map(inv => (inv.dining_unit ? `Dining - ${inv.dining_unit}` : null))
    .filter(Boolean);

  // departmentOptions should be your static list (defined once, outside the component)
  return Array.from(new Set([
    ...departmentOptions,
    ...fromRows,
    ...fromDining,
  ]));
}, [invoices]);



const [isManualOpen, setIsManualOpen] = useState(false);
const [manualFiles, setManualFiles] = useState([]); // FileList-like
const [saving, setSaving] = useState(false);

const [manualForm, setManualForm] = useState({
  date_of_invoice: new Date().toISOString().slice(0,10),
  company: '',
  amount: '',
  notes: '',
  department: '',
  additional_department: '',
  account_code: '',
  purpose: '',
  invoice_number: '',
  expense_type: '', // 'Ongoing' | 'One time, expected' | ...
});


// Multi-code allocations for Manual Expense
const [allocations, setAllocations] = useState([{ accountCode: '', amount: '' }]);

const addAllocation = () => {
  setAllocations(prev => [...prev, { accountCode: '', amount: '' }]);
};

const removeAllocation = (idx) => {
  setAllocations(prev => prev.filter((_, i) => i !== idx));
};

const updateAllocation = (idx, key, value) => {
  setAllocations(prev =>
    prev.map((row, i) => (i === idx ? { ...row, [key]: value } : row))
  );
};

const sumAllocations = () =>
  allocations.reduce((acc, a) => acc + (Number(a.amount) || 0), 0);



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
  const term = (searchTerm || '').toLowerCase();

  const matchesVendor  = (inv.vendor || '').toLowerCase().includes(term);
  const matchesInvoice = (inv.invoice_number || '').toLowerCase().includes(term);

  const matchesDepartment =
    !filters.department ||
    inv.department === filters.department ||
    (inv.dining_unit && `Dining - ${inv.dining_unit}` === filters.department);

  const matchesAccount =
    !filters.accountCode ||
    inv.account_code === filters.accountCode ||
    (Array.isArray(inv.allocations) &&
      inv.allocations.some(a => String(a.accountCode) === filters.accountCode));

  const matchesFilters =
    (!filters.vendor || inv.vendor === filters.vendor) &&
    matchesDepartment &&
    (!filters.status || inv.status === filters.status) &&
    (!filters.source || inv.source === filters.source) &&
    matchesAccount;

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





const uploadManualFiles = async (uid, files) => {
  if (!files?.length) return [];

  const uploads = await Promise.all(files.map(async (file, idx) => {
    const ext = file.name.split('.').pop() || 'bin';
    const path = `${uid}/${Date.now()}_${idx}.${ext}`;
    const { data, error } = await supabase.storage
      .from('aux-expenses')
      .upload(path, file, { upsert: false });
    if (error) throw error;

    // we’ll store the storage path; you can get signed URLs when viewing
    return { name: file.name, path, size: file.size, type: file.type };
  }));

  return uploads;
};

const handleManualSubmit = async () => {
  setSaving(true);
  try {
    // required fields
    const required = ['date_of_invoice','company','amount','department','invoice_number','expense_type','purpose'];
    for (const k of required) {
      if (!manualForm[k] || String(manualForm[k]).trim()==='') {
        throw new Error(`Please fill required field: ${k.replaceAll('_',' ')}`);
      }
    }
    const amountNum = Number(manualForm.amount);
    if (Number.isNaN(amountNum) || amountNum < 0) {
      throw new Error('Invoice Total must be a valid non-negative number.');
    }

    // allocations validation
    const allocTotal = sumAllocations();
    if (allocations.some(a => !a.accountCode || String(a.accountCode).trim().length !== 4)) {
      throw new Error('Each allocation needs a 4-digit account code.');
    }
    if (allocations.length === 0 || allocTotal <= 0) {
      throw new Error('Please allocate a positive amount to at least one account code.');
    }
    if (Math.abs(allocTotal - amountNum) > 0.005) {
      throw new Error(`Allocations ($${allocTotal.toFixed(2)}) must equal the Invoice Total ($${amountNum.toFixed(2)}).`);
    }

    // auth/session
    const { data: sessionRes, error: sessErr } = await supabase.auth.getSession();
    if (sessErr) throw new Error(`Auth session error: ${sessErr.message}`);
    if (!sessionRes?.session?.access_token) {
      const { data: ref } = await supabase.auth.refreshSession();
      if (!ref?.session?.access_token) throw new Error('No active session. Please sign in again.');
    }

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr) throw new Error(`Auth user error: ${userErr.message}`);
    if (!user) throw new Error('You must be signed in.');

    // upload files
    const uploaded = await uploadManualFiles(user.id, manualFiles).catch(e => {
      throw new Error(`Storage upload failed: ${e.message}`);
    });

    // map Dining to legacy dining_unit
    const diningUnit = manualForm.department.startsWith('Dining - ')
      ? manualForm.department.replace('Dining - ','')
      : null;

    // insert
    const { data, error } = await supabase.from('invoice_logs').insert([{
      source: 'manual',
      vendor: manualForm.company,
      invoice_number: manualForm.invoice_number,
      invoice_total: amountNum,
      department: manualForm.department,
      additional_department: manualForm.additional_department || null,
      account_code: manualForm.account_code || null, // keep legacy single if provided
      purpose: manualForm.purpose,
      expense_type: manualForm.expense_type,
      notes: manualForm.notes || null,
      // ✅ allocations saved as JSON
      allocations: allocations.map(a => ({
        accountCode: String(a.accountCode),
        amount: Number(a.amount),
      })),
      attachments: uploaded,                 
      dining_unit: diningUnit,               
      invoice_date: manualForm.date_of_invoice,
      date_received: manualForm.date_of_invoice,
      status: 'Submitted',
      payment_method: 'N/A',
      submitted_by: user.email,
      created_by: user.id,
      created_by_email: user.email,
      date_submitted: new Date().toISOString()
    }]).select('*').single();

    if (error) throw new Error(`DB insert failed: ${error.message}`);

    // optimistic UI + reset
    setInvoices(prev => [data, ...prev]);
    setIsManualOpen(false);
    setManualFiles([]);
    setAllocations([{ accountCode: '', amount: '' }]); // reset rows
    alert('✅ Manual expense added.');
  } catch (err) {
    console.error('[ManualExpense]', err);
    alert(`❌ ${err.message ?? 'Failed to add manual expense.'}`);
  } finally {
    setSaving(false);
  }
};






const generatePDF = () => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'A4' });

  const dateStr = new Date().toLocaleString();
  const filename = `invoice-log-${new Date().toISOString().slice(0, 10)}.pdf`;

  // Header
  doc.setFontSize(14);
  doc.text('Submitted Invoices — Invoice Log', 40, 40);
  doc.setFontSize(10);
  doc.text(`Generated: ${dateStr}`, 40, 58);

  // (Optional) show active filters in the header
  const filterParts = [];
  if (filters?.diningUnit) filterParts.push(`Unit: ${filters.diningUnit}`);
  if (filters?.status) filterParts.push(`Status: ${filters.status}`);
  if (searchTerm) filterParts.push(`Search: "${searchTerm}"`);
  const filterLine = filterParts.join('  •  ');
  if (filterLine) doc.text(filterLine, 40, 74);

  // Table data
  const head = [[
  'Vendor',
  'Invoice #',
  'Amount ($)',
  'Allocations',              // ← NEW
  'Dining Unit',
  'Invoice Date',
  'Date Received',
  'Submitted By',
  'Payment Method',
  'Status',
  'Date Submitted'
]];

const body = filteredInvoices.map(inv => {
  const allocSummary = Array.isArray(inv.allocations)
    ? inv.allocations.map(a => `${a.accountCode}: $${Number(a.amount || 0).toFixed(2)}`).join(' | ')
    : (inv.account_code ? `${inv.account_code}: $${Number(inv.invoice_total || 0).toFixed(2)}` : '');

  return [
    inv.vendor || '',
    inv.invoice_number || '',
    (parseFloat(inv.invoice_total || 0).toFixed(2)),
    allocSummary,                      // ← matches the 'Allocations' column
    inv.dining_unit || '',
    inv.invoice_date || '',
    inv.date_received || '',
    inv.submitted_by || '',
    inv.payment_method || '',
    inv.status || '',
    inv.date_submitted ? new Date(inv.date_submitted).toLocaleDateString() : '—'
  ];
});


  doc.autoTable({
    head,
    body,
    startY: 90,
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fontStyle: 'bold' },
    didDrawPage: (data) => {
      // Footer with total on each page
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(10);
      doc.text(
        `Total: $${totalAmount.toFixed(2)}   |   Rows: ${filteredInvoices.length}`,
        40,
        pageHeight - 20
      );
    }
  });

  doc.save(filename);
};





return (
 <div className="p-6 max-w-7xl mx-auto">
  <div className="flex items-center justify-between mb-4">
    <BackToAdminDashboard />
    <Link
      to="/invoices"
      className="text-sm bg-indigo-600 text-white px-3 py-2 rounded hover:bg-indigo-700"
    >
      Process an Invoice
    </Link>
  </div>


 

    {/* Manual Expense Modal */}
{isManualOpen && (
  <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
    {/* Modal container: flex column + height cap */}
    <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden">

      {/* Sticky header */}
      <div className="p-6 border-b bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Add Manual Expense</h2>
          <button
            onClick={() => setIsManualOpen(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="px-6 py-4 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* your existing fields unchanged */}
          <label className="flex flex-col text-sm">
            <span className="mb-1 font-medium">Date of Invoice *</span>
            <input
              type="date"
              value={manualForm.date_of_invoice}
              onChange={e => setManualForm({ ...manualForm, date_of_invoice: e.target.value })}
              className="border rounded p-2"
            />
          </label>

          <label className="flex flex-col text-sm">
            <span className="mb-1 font-medium">Company Being Paid *</span>
            <input
              type="text"
              value={manualForm.company}
              onChange={e => setManualForm({ ...manualForm, company: e.target.value })}
              className="border rounded p-2"
            />
          </label>

          <label className="flex flex-col text-sm">
            <span className="mb-1 font-medium">Invoice Total *</span>
            <input
              type="number"
              step="0.01"
              value={manualForm.amount}
              onChange={e => setManualForm({ ...manualForm, amount: e.target.value })}
              className="border rounded p-2"
              placeholder="e.g., 1234.56"
            />
          </label>

          <label className="flex flex-col text-sm">
            <span className="mb-1 font-medium">Department *</span>
            <select
              value={manualForm.department}
              onChange={e => setManualForm({ ...manualForm, department: e.target.value })}
              className="border rounded p-2"
            >
              <option value="">Select…</option>
              {departmentOptions.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col text-sm">
            <span className="mb-1 font-medium">Additional Department (if any)</span>
            <input
              type="text"
              value={manualForm.additional_department}
              onChange={e => setManualForm({ ...manualForm, additional_department: e.target.value })}
              className="border rounded p-2"
            />
          </label>

          <label className="flex flex-col text-sm">
            <span className="mb-1 font-medium">Account Code (legacy single)</span>
            <input
              type="text"
              value={manualForm.account_code}
              onChange={e => setManualForm({ ...manualForm, account_code: e.target.value })}
              className="border rounded p-2"
              placeholder="Optional single 4-digit (legacy)"
            />
          </label>

          <label className="flex flex-col text-sm">
            <span className="mb-1 font-medium">Invoice # from Company *</span>
            <input
              type="text"
              value={manualForm.invoice_number}
              onChange={e => setManualForm({ ...manualForm, invoice_number: e.target.value })}
              className="border rounded p-2"
            />
          </label>

          <label className="flex flex-col text-sm">
            <span className="mb-1 font-medium">Type of Expense *</span>
            <select
              value={manualForm.expense_type}
              onChange={e => setManualForm({ ...manualForm, expense_type: e.target.value })}
              className="border rounded p-2"
            >
              <option value="">Select…</option>
              <option>Ongoing</option>
              <option>One time, expected</option>
              <option>One time, unexpected</option>
              <option>Passthrough/Reimbursable Expense</option>
              <option>Monthly</option>
              <option>Quarterly</option>
              <option>Annual</option>
            </select>
          </label>

          <label className="md:col-span-2 flex flex-col text-sm">
            <span className="mb-1 font-medium">Purpose *</span>
            <input
              type="text"
              value={manualForm.purpose}
              onChange={e => setManualForm({ ...manualForm, purpose: e.target.value })}
              className="border rounded p-2"
            />
          </label>

          <label className="md:col-span-2 flex flex-col text-sm">
            <span className="mb-1 font-medium">Notes</span>
            <textarea
              rows={3}
              value={manualForm.notes}
              onChange={e => setManualForm({ ...manualForm, notes: e.target.value })}
              className="border rounded p-2"
            />
          </label>

          {/* Allocations */}
          <div className="md:col-span-2 border rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Account Code Allocations</h3>
              <button
                type="button"
                onClick={addAllocation}
                className="text-sm px-3 py-1 rounded border hover:bg-gray-50"
              >
                + Add Code
              </button>
            </div>

            <div className="space-y-2">
              {allocations.map((row, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="\d{4}"
                    maxLength={4}
                    placeholder="4-digit code (e.g., 1312)"
                    className="border rounded p-2 w-full"
                    value={row.accountCode}
                    onChange={(e) => updateAllocation(idx, 'accountCode', e.target.value)}
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Amount for this code"
                    className="border rounded p-2 w-full"
                    value={row.amount}
                    onChange={(e) => updateAllocation(idx, 'amount', e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeAllocation(idx)}
                    className="justify-self-start md:justify-self-auto text-sm px-3 py-2 rounded border hover:bg-gray-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-2 text-sm text-gray-600">
              Allocations total: <span className="font-semibold">
                ${sumAllocations().toFixed(2)}
              </span> / Invoice Total: <span className="font-semibold">
                ${Number(manualForm.amount || 0).toFixed(2)}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              “Invoice Total” is the full vendor amount; allocations are what each 4-digit code pays.
            </p>
          </div>

          <label className="md:col-span-2 flex flex-col text-sm">
            <span className="mb-1 font-medium">Attachments (up to 5)</span>
            <input
              type="file"
              multiple
              onChange={(e)=>setManualFiles(Array.from(e.target.files || []).slice(0,5))}
              className="border rounded p-2"
            />
            <span className="text-xs text-gray-500 mt-1">PDF, images, etc. Max 100MB each.</span>
          </label>
        </div>
      </div>

      {/* Sticky footer */}
      <div className="p-6 border-t bg-white sticky bottom-0 z-10">
        <div className="flex justify-end gap-2">
          <button onClick={() => setIsManualOpen(false)} className="px-4 py-2 rounded border">
            Cancel
          </button>
          <button
            onClick={handleManualSubmit}
            disabled={saving}
            className={`px-4 py-2 rounded text-white ${saving ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            {saving ? 'Saving…' : 'Save Expense'}
          </button>
        </div>
      </div>

    </div>
  </div>
)}


    <h1 className="text-2xl font-bold text-blue-900 mb-4">📄 Submitted Invoices ~ Expense Tracker</h1>

{/* FILTERS */}
<div className="flex flex-col md:flex-row md:flex-nowrap gap-4 mb-4">
  <input
    type="text"
    placeholder="Search vendor or invoice #"
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="border p-2 rounded w-full md:w-1/3"
  />

  {/* NEW: Department filter (all Auxiliary + Dining) */}
  <select
    value={filters.department}
    onChange={(e) => setFilters({ ...filters, department: e.target.value })}
    className="border p-2 rounded w-full md:w-1/4"
  >
    <option value="">All Departments</option>
    {mergedDepartmentOptions.map(dep => (
      <option key={dep} value={dep}>{dep}</option>
    ))}
  </select>


  <select
    value={filters.status}
    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
    className="border p-2 rounded w-full md:w-1/4"
  >
    <option value="">All Statuses</option>
    <option value="Submitted">Submitted</option>
    <option value="Processed">Processed</option>
  </select>

  <select
    value={filters.source}
    onChange={(e) => setFilters({ ...filters, source: e.target.value })}
    className="border p-2 rounded w-full md:w-1/4"
  >
    <option value="">All Sources</option>
    <option value="form">Pulled From Invoice</option>
    <option value="manual">Manual Entry</option>
  </select>
</div>


<input
  type="text"
  inputMode="numeric"
  pattern="\d{4}"
  maxLength={4}
  placeholder="4-digit code"
  value={filters.accountCode}
  onChange={(e) =>
    setFilters({ ...filters, accountCode: e.target.value.trim() })
  }
  className="border p-2 rounded w-full md:w-40"
/>


    {/* ACTION BAR */}
    <div className="flex items-center gap-2 mb-2">
      <div className="flex flex-wrap items-center gap-2">
        <CSVLink
          data={filteredInvoices.map((inv) => ({
            Source: inv.source || 'form',
            Department: inv.department || '',
            'Additional Department': inv.additional_department || '',
            Vendor: inv.vendor,
            'Invoice #': inv.invoice_number,
            Amount: inv.invoice_total,
            Unit: inv.dining_unit,
            Purpose: inv.purpose || '',
            'Expense Type': inv.expense_type || '',
            'Account Code': inv.account_code || '',


            Allocations: Array.isArray(inv.allocations)
  ? inv.allocations
      .map(a => `${a.accountCode}: $${Number(a.amount || 0).toFixed(2)}`)
      .join(' | ')
  : (inv.account_code ? `${inv.account_code}: $${Number(inv.invoice_total || 0).toFixed(2)}` : ''),



            Notes: inv.notes || '',
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

        <button
          onClick={generatePDF}
          className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700"
          type="button"
        >
          Export PDF
        </button>

        <button
  onClick={() => { setAllocations([{ accountCode: '', amount: '' }]); setIsManualOpen(true); }}
  className="bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700"
  type="button"
>
  + Add Manual Expense
</button>

      </div>

      <div className="ml-auto whitespace-nowrap text-lg font-semibold text-green-800">
        Total: ${totalAmount.toFixed(2)}
      </div>
    </div>

    {/* TABLE */}
    <div className="overflow-x-auto">
      <table className="min-w-full border text-sm">
        <thead className="bg-gray-100 text-left">
          <tr>
            <th className="p-2 border">Vendor</th>
            <th className="p-2 border">Invoice #</th>
            <th className="p-2 border">Amount ($)</th>
            <th className="p-2 border">Allocations</th>  {/* ← NEW */}
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




              <td className="p-2 border">
  {Array.isArray(inv.allocations) && inv.allocations.length
    ? inv.allocations.map((a, i) => (
        <span key={i} className="inline-block mr-2">
          {a.accountCode}: ${Number(a.amount || 0).toFixed(2)}
        </span>
      ))
    : (inv.account_code
        ? `${inv.account_code}: $${Number(inv.invoice_total || 0).toFixed(2)}`
        : '—')
  }
</td>





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