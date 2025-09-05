import React, { useState } from 'react';
import BackToAdminDashboard from './BackToAdminDashboard';
import { supabase } from './supabaseClient';

const DEPARTMENT_OPTIONS = [
  'Dining - Bistro','Dining - Regattas','Dining - Commons','Captains Card','Parking Services',
  'Catering','Scheduling, Events, and Conferences','Dining - Pizza','Dining - Fit','Dining - Pallete Cafe',
  'Dining - Concessions','Dining - Einsteins','Dining - Discovery Cafe (CFA and Grill\'d)','Summer Camps and Conferences'
];

const EXPENSE_TYPES = [
  'Ongoing',
  'One time, expected',
  'One time, unexpected',
  'Passthrough/Reimbursable Expense'
];

function Invoices() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    vendor: '',
    invoiceDate: '',
    date: '',                    // Date invoice was received by submitter
    invoiceNumber: '',
    diningUnit: '',              // kept for legacy compatibility (filled automatically for Dining)
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
    accountCode: '',
    purpose: '',                 // REQUIRED
    expenseType: '',             // REQUIRED
    paymentMethod: '',
  });

  // Temp Agency handling (keeps your current behavior)
  const [showTempVendors, setShowTempVendors] = useState(false);
  const [tempVendor, setTempVendor] = useState('');

  // Attachments
  const [files, setFiles] = useState([]); // File[]
  const [saving, setSaving] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Validate required fields
      const required = [
        'department', 'vendor', 'invoiceDate', 'date', 'invoiceNumber', 'invoiceTotal', 'purpose', 'expenseType'
      ];
      for (const k of required) {
        if (!String((k === 'vendor' ? (form.vendor === 'Temp Agency' ? tempVendor : form.vendor) : form[k]) || '').trim()) {
          throw new Error(`Please fill required field: ${k.replace(/([A-Z])/g, ' $1').trim()}`);
        }
      }
      const amountNum = Number(form.invoiceTotal);
      if (Number.isNaN(amountNum) || amountNum < 0) {
        throw new Error('Invoice Total must be a valid non-negative number.');
      }

      // Ensure session
      const { data: sessionRes, error: sessErr } = await supabase.auth.getSession();
      if (sessErr) throw new Error(`Auth session error: ${sessErr.message}`);
      if (!sessionRes?.session?.access_token) {
        const { data: ref } = await supabase.auth.refreshSession();
        if (!ref?.session?.access_token) throw new Error('No active session. Please sign in again.');
      }

      // Get user for created_by and upload path
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw new Error(`Auth user error: ${userErr.message}`);
      if (!user) throw new Error('You must be signed in.');

      // Resolve vendor name (Temp Agency or regular)
      const vendorName = form.vendor === 'Temp Agency' && tempVendor ? tempVendor : form.vendor;

      // Upload attachments
      const uploaded = await uploadFiles(user.id, files)
        .catch(e => { throw new Error(`Storage upload failed: ${e.message}`); });

      // Map Dining department to legacy dining_unit (kept for your table)
      const diningUnit =
        form.department.startsWith('Dining - ')
          ? form.department.replace('Dining - ', '')
          : null;

      // Insert into invoice_logs with new fields
      const { data, error } = await supabase.from('invoice_logs').insert([{
        source: 'form',                          // NEW: distinguishes from manual
        // Common/legacy fields you already had:
        name: form.name || null,
        email: form.email || null,
        vendor: vendorName,
        submitted_by: form.submittedBy || form.email || null,
        original_recipient: form.originalRecipient || null,
        entity: form.entity || null,
        dining_unit: diningUnit,                 // legacy; null for non-Dining
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
        status: 'Submitted',
        date_submitted: new Date().toISOString(),

        // NEW Auxiliary fields:
        department: form.department,
        additional_department: form.additionalDepartment || null,
        account_code: form.accountCode || null,
        purpose: form.purpose,
        expense_type: form.expenseType,
        attachments: uploaded,                   // [{name,path,size,type}]
        created_by: user.id,
        created_by_email: user.email,
      }]).select('*').single();

      if (error) throw new Error(`DB insert failed: ${error.message}`);

      alert('Invoice successfully submitted and saved!');
      // Reset form
      setForm({
        name: '', email: '', vendor: '', invoiceDate: '', date: '',
        invoiceNumber: '', diningUnit: '', entity: '', weekEnding: '',
        invoiceTotal: '', customerNumber: '', orderNumber: '',
        purchaseOrder: '', memo: '', submittedBy: '', originalRecipient: '',
        department: '', additionalDepartment: '', accountCode: '',
        purpose: '', expenseType: '', paymentMethod: ''
      });
      setShowTempVendors(false);
      setTempVendor('');
      setFiles([]);
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
      <BackToAdminDashboard />
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
  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Total *</label>
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

          <input type="text" name="accountCode" placeholder="Account Code (4 digits)" value={form.accountCode} onChange={handleChange} className="border rounded p-2 w-full" />

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

          {/* Legacy Dining unit (auto-filled for Dining departments; you can hide this if you prefer) */}
          <select name="diningUnit" value={form.diningUnit} onChange={handleChange} className="border rounded p-2 w-full">
            <option value="">Select Dining Unit (if applicable)</option>
            <option value="Regattas">Regattas</option>
            <option value="Commons">Commons</option>
            <option value="Discovery Cafe">Discovery Cafe</option>
            <option value="Einstein's">Einstein's</option>
            <option value="F.I.T">F.I.T</option>
            <option value="Palette">Palette</option>
          </select>

          {/* Entity */}
          <select name="entity" value={form.entity} onChange={handleChange} className="border rounded p-2 w-full">
            <option value="">Select Paying Entity</option>
            <option value="Christopher Newport University">Christopher Newport University</option>
            <option value="Business Office">Other</option>
          </select>
        </div>

        {/* Memo */}
        <textarea name="memo" placeholder="Memo or Notes" value={form.memo} onChange={handleChange} rows="4" className="border rounded p-2 w-full"></textarea>

        {/* Attachments (NEW) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Attachments (up to 5, max 100MB each)</label>
          <input type="file" multiple onChange={handleFileChange} className="border rounded p-2 w-full" />
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className={`px-4 py-2 rounded text-white ${saving ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {saving ? 'Submitting…' : 'Submit Invoice'}
          </button>
          <button type="button" onClick={handleDownload} className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700">
            Download Copy
          </button>
        </div>
      </form>
    </div>
  );
}

export default Invoices;
