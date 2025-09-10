import React, { useState, useRef } from 'react';
import BackToAdminDashboard from './BackToAdminDashboard';
import { supabase } from './supabaseClient';
import { Link } from 'react-router-dom';


// Single source of truth for form defaults (OK to keep outside the component)
const INITIAL_FORM = {
  name: '',
  email: '',
  vendor: '',
  invoiceDate: '',
  date: '',                    // Date invoice was received by submitter
  invoiceNumber: '',              // legacy compatibility (auto-filled for Dining)
  entity: '',
  weekEnding: '',
  invoiceTotal: '',
  customerNumber: '',
  orderNumber: '',
  purchaseOrder: '',
  memo: '',
  submittedBy: '',
  originalRecipient: '',
  // NEW fields for Auxiliary
  department: '',              // REQUIRED
  additionalDepartment: '',
  purpose: '',                 // REQUIRED
  expenseType: '',             // REQUIRED
  paymentMethod: '',
};

const DEPARTMENT_OPTIONS = [
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


export default function Invoices() {
  // ✅ All hooks go INSIDE the component
  const fileInputRef = useRef(null);
  const [form, setForm] = useState(INITIAL_FORM);

  // Temp Agency handling
  const [showTempVendors, setShowTempVendors] = useState(false);
  const [tempVendor, setTempVendor] = useState('');

  // Attachments + saving state
  const [files, setFiles] = useState([]); // File[]
  const [saving, setSaving] = useState(false);

  const clearForm = () => {
    setForm(INITIAL_FORM);
    setShowTempVendors(false);
    setTempVendor('');
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleVendorChange = (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, vendor: value }));
    setShowTempVendors(value === 'Temp Agency');
    if (value !== 'Temp Agency') setTempVendor('');
  };

  const handleFileChange = (e) => {
    const picked = Array.from(e.target.files || []).slice(0, 5);
    setFiles(picked);
  };

  const uploadFiles = async (uid, fileList) => {
    if (!fileList?.length) return [];
    const uploads = await Promise.all(fileList.map(async (file, idx) => {
      const ext = file.name.split('.').pop() || 'bin';
      const path = `${uid}/${Date.now()}_${idx}.${ext}`;
      const { data, error } = await supabase.storage
        .from('aux-expenses')
        .upload(path, file, { upsert: false });
      if (error) throw error;
      return { name: file.name, path, size: file.size, type: file.type };
    }));
    return uploads;
  };


// ⬇️ allocations state + helpers (INSIDE the component, not inside handleSubmit)
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







  const handleSubmit = async (e) => {
  e.preventDefault();
  setSaving(true);
  try {
    // Required fields
    const vendorName =
      form.vendor === 'Temp Agency' && tempVendor ? tempVendor : form.vendor;

    const required = [
      'department', 'invoiceDate', 'date', 'invoiceNumber',
      'invoiceTotal', 'purpose', 'expenseType'
    ];
    for (const k of required) {
      const v = k === 'vendor' ? vendorName : form[k];
      if (!String(v ?? '').trim()) {
        throw new Error(`Please fill required field: ${k.replace(/([A-Z])/g, ' $1').trim()}`);
      }
    }

    const amountNum = Number(form.invoiceTotal);
    if (Number.isNaN(amountNum) || amountNum < 0) {
      throw new Error('Invoice Total must be a valid non-negative number.');
    }

    // Allocations validation
    const invTotal = amountNum;
    const allocTotal = sumAllocations();
    if (allocations.some(a => !a.accountCode || String(a.accountCode).trim().length !== 4)) {
      throw new Error('Each allocation needs a 4-digit account code.');
    }
    if (allocTotal <= 0) {
      throw new Error('Please allocate a positive amount to at least one account code.');
    }
    if (Math.abs(allocTotal - invTotal) > 0.005) {
      throw new Error(`Allocations ($${allocTotal.toFixed(2)}) must equal the Invoice Total ($${invTotal.toFixed(2)}).`);
    }

    // Auth/session
    const { data: sessionRes, error: sessErr } = await supabase.auth.getSession();
    if (sessErr) throw new Error(`Auth session error: ${sessErr.message}`);
    if (!sessionRes?.session?.access_token) {
      const { data: ref } = await supabase.auth.refreshSession();
      if (!ref?.session?.access_token) throw new Error('No active session. Please sign in again.');
    }

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr) throw new Error(`Auth user error: ${userErr.message}`);
    if (!user) throw new Error('You must be signed in.');

    // Upload files (if any)
    const uploaded = await uploadFiles(user.id, files).catch(e => {
      throw new Error(`Storage upload failed: ${e.message}`);
    });

    // Map Dining to legacy dining_unit
    const diningUnit = form.department.startsWith('Dining - ')
      ? form.department.replace('Dining - ', '')
      : null;

    // INSERT (✅ allocations are INSIDE the object)
    const { data: inserted, error: insertErr } = await supabase
      .from('invoice_logs')
      .insert([{
        source: 'form',

        // common/legacy fields
        name: form.name || null,
        email: form.email || null,
        vendor: vendorName,
        submitted_by: form.submittedBy || form.email || null,
        original_recipient: form.originalRecipient || null,
        entity: form.entity || null,
        dining_unit: diningUnit,
        invoice_date: form.invoiceDate,
        date_received: form.date,
        invoice_number: form.invoiceNumber,
        invoice_total: amountNum,
        customer_number: form.customerNumber || null,
        order_number: form.orderNumber || null,
        purchase_order: form.purchaseOrder || null,
        week_ending: form.weekEnding || null,
        memo: form.memo || null,
        payment_method: form.paymentMethod || null,

        // auxiliary fields
        department: form.department,
        additional_department: form.additionalDepartment || null,
        account_code: form.accountCode || null, // optional single code (legacy)
        purpose: form.purpose,
        expense_type: form.expenseType,

        // ✅ allocations included here
        allocations: allocations.map(a => ({
          accountCode: String(a.accountCode),
          amount: Number(a.amount),
        })),

        // files + audit
        attachments: uploaded,  // [{name, path, size, type}]
        created_by: user.id,
        created_by_email: user.email,
        date_submitted: new Date().toISOString(),
        status: 'Submitted',
      }])
      .select('*')
      .single();

    if (insertErr) throw new Error(`DB insert failed: ${insertErr.message}`);

    alert('Invoice successfully submitted and saved!');

    // Reset form + allocations + files
    setForm(INITIAL_FORM);
    setAllocations([{ accountCode: '', amount: '' }]);
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowTempVendors(false);
    setTempVendor('');
  } catch (err) {
    console.error('[Invoice Form]', err);
    alert(`❌ ${err.message ?? 'Failed to submit invoice.'}`);
  } finally {
    setSaving(false);
  }
};


  const handleDownload = () => {
    const content = JSON.stringify({ ...form, resolvedVendor: form.vendor === 'Temp Agency' && tempVendor ? tempVendor : form.vendor }, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${form.vendor || 'vendor'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
  <div className="flex items-center justify-between mb-4">
    <BackToAdminDashboard />
    <Link
      to="/invoice-log"
      className="text-sm bg-slate-700 text-white px-3 py-2 rounded hover:bg-slate-800"
    >
      See Expense Tracker
    </Link>
  </div>

  <h1 className="text-2xl font-bold mb-6 text-blue-900">Invoice Processing</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Contact */}
          
          <div>
  <label
    htmlFor="name"
    className="block text-sm font-medium text-gray-700 mb-1"
  >
    Your Full Name
  </label>

  <input
    id="name"
    type="text"
    name="name"
    value={form.name}
    onChange={handleChange}
    className="border rounded p-2 w-full"
    placeholder="e.g., Jane Doe"
    // required  // <- optional
  />
</div>

          
          <div>
  <label
    htmlFor="email"
    className="block text-sm font-medium text-gray-700 mb-1"
  >
    Your Email
  </label>

  <input
    id="email"
    type="email"
    name="email"
    value={form.email}
    onChange={handleChange}
    className="border rounded p-2 w-full"
    placeholder="you@example.com"
    autoComplete="email"   // optional but nice
    // required             // optional
  />
</div>


          {/* Department (NEW, required) */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
            <select
              name="department"
              value={form.department}
              onChange={handleChange}
              className="border rounded p-2 w-full"
            >
              <option value="">Select Department</option>
              {DEPARTMENT_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Additional Department (optional) */}
          <input
            type="text"
            name="additionalDepartment"
            placeholder="Additional Department (if any)"
            value={form.additionalDepartment}
            onChange={handleChange}
            className="border rounded p-2 w-full"
          />

          {/* Vendor (Temp Agency flow preserved) */}
          <select
            name="vendor"
            value={form.vendor}
            onChange={handleVendorChange}
            className="border rounded p-2 w-full"
          >
            <option value="">Select Vendor</option>
            <option value="Sysco">Sysco</option>
            <option value="QCD">QCD</option>
            <option value="Keany Produce">Keany Produce</option>
            <option value="Temp Agency">Temp Agency</option>
            <option value="Other">Other</option>
          </select>

          {showTempVendors && (
            <>
              <select
                value={tempVendor}
                onChange={(e) => setTempVendor(e.target.value)}
                className="border rounded p-2 w-full"
              >
                <option value="">Select Temp Agency</option>
                <option value="Labor Finders">Labor Finders</option>
                <option value="Integrity Staffing">Integrity Staffing</option>
                <option value="Express Employment">Express Employment</option>
              </select>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Week Ending (W/E)</label>
                <input
                  type="date"
                  name="weekEnding"
                  value={form.weekEnding}
                  onChange={handleChange}
                  className="border rounded p-2 w-full"
                />
              </div>
            </>
          )}

          {/* Submitted By / Original Recipient */}
          <select name="submittedBy" value={form.submittedBy} onChange={handleChange} className="border rounded p-2 w-full">
            <option value="">Submitted By</option>
            <option value="Vendor">Vendor (Self-submitted)</option>
            <option value="Dining Admin">Dining Admin / Fiscal Tech</option>
            <option value="Ops Manager">Operations Manager / Director</option>
            <option value="Business Office">Business Office (State)</option>
          </select>
          <input
            type="text"
            name="originalRecipient"
            placeholder="Who originally received this invoice?"
            value={form.originalRecipient}
            onChange={handleChange}
            className="border rounded p-2 w-full"
          />

          {/* Dates / Numbers */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date *</label>
            <input type="date" name="invoiceDate" value={form.invoiceDate} onChange={handleChange} className="border rounded p-2 w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number *</label>
            <input type="text" name="invoiceNumber" value={form.invoiceNumber} onChange={handleChange} className="border rounded p-2 w-full" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Invoice Was Received by Submitter *</label>
            <input type="date" name="date" value={form.date} onChange={handleChange} className="border rounded p-2 w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Week Ending (optional)</label>
            <input type="date" name="weekEnding" value={form.weekEnding} onChange={handleChange} className="border rounded p-2 w-full" />
          </div>

          {/* Money / Coding */}
          <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Total ($) *</label>
  <input
    type="number"
    step="0.01"
    inputMode="decimal"
    min="0"
    name="invoiceTotal"
    value={form.invoiceTotal}
    onChange={handleChange}
    className="border rounded p-2 w-full"
    placeholder="e.g., $1234.56"
  />
</div>



{/* Account Code Allocations */}
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
      ${Number(form.invoiceTotal || 0).toFixed(2)}
    </span>
  </div>
  <p className="mt-1 text-xs text-gray-500">
    Tip: This should answer “is the Amount the invoice or what our code pays?”
    — The box above is the full Invoice Total; allocations here are what each code pays.
  </p>
</div>







          <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
  <select
    name="paymentMethod"
    value={form.paymentMethod}
    onChange={handleChange}
    className="border rounded p-2 w-full"
  >
    <option value="">Select method</option>
    <option value="SPCC">SPCC</option>
    <option value="AP Office">AP Office</option>
  </select>
</div>

          

          {/* Purpose / Expense Type */}
          <input type="text" name="purpose" placeholder="Purpose *" value={form.purpose} onChange={handleChange} className="border rounded p-2 w-full md:col-span-2" />
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Type of Expense *</label>
            <select
              name="expenseType"
              value={form.expenseType}
              onChange={handleChange}
              className="border rounded p-2 w-full"
            >
              <option value="">Select type…</option>
              {EXPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

         
          {/* Entity */}
          <select name="entity" value={form.entity} onChange={handleChange} className="border rounded p-2 w-full">
            <option value="">Select Paying Entity</option>
            <option value="Christopher Newport University">Christopher Newport University</option>
            <option value="Business Office">Other</option>
          </select>
        </div>
{/* Memo */}
<textarea
  name="memo"
  placeholder="Memo or Notes"
  value={form.memo}
  onChange={handleChange}
  rows="4"
  className="border rounded p-2 w-full"
/>

{/* Attachments (single input) */}
<div className="mt-2">
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Attachments (up to 5, max 100MB each)
  </label>
  <input
    ref={fileInputRef}
    type="file"
    multiple
    onChange={handleFileChange}
    className="border rounded p-2 w-full"
    // accept=".pdf,image/*"  // optional
  />
</div>

{/* Actions */}
<div className="mt-6 flex flex-wrap items-center gap-3">
  <button
    type="submit"
    disabled={saving}
    className="inline-flex items-center justify-center h-10 px-4 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
  >
    {saving ? 'Submitting…' : 'Submit Invoice'}
  </button>

  {/* Clear Fields */}
  <button
    type="button"
    onClick={clearForm}
    className="inline-flex items-center justify-center h-10 px-4 rounded border border-gray-300 bg-red-500 hover:bg-gray-50"
  >
    Clear All Fields
  </button>

  <button
    type="button"
    onClick={handleDownload}
    className="inline-flex items-center justify-center h-10 px-4 rounded bg-gray-600 text-white hover:bg-gray-700"
  >
    Download Copy
  </button>
</div>

      </form>
    </div>
  );
}

