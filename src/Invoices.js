import React, { useState } from 'react';
import BackToAdminDashboard from './BackToAdminDashboard';
import { supabase } from './supabaseClient'; // adjust path as needed


function Invoices() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    vendor: '',
    date: '',
    invoiceDate: '',
    invoiceNumber: '',
    diningUnit: '',
    entity: '',
    weekEnding: '',
    invoiceTotal: '',
    customerNumber: '',
    orderNumber: '',
    purchaseOrder: '',
    memo: '',
    submittedBy: '',
    originalRecipient: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  const { error } = await supabase.from('invoice_logs').insert({
    name: form.name,
    email: form.email,
    vendor: form.vendor,
    submitted_by: form.submittedBy,
    original_recipient: form.originalRecipient,
    entity: form.entity,
    dining_unit: form.diningUnit,
    invoice_date: form.invoiceDate,
    invoice_number: form.invoiceNumber,
    invoice_total: form.invoiceTotal,
    customer_number: form.customerNumber,
    order_number: form.orderNumber,
    purchase_order: form.purchaseOrder,
    week_ending: form.weekEnding,
    memo: form.memo
  });

  if (error) {
    alert('Failed to submit invoice.');
    console.error(error);
  } else {
    alert('Invoice successfully submitted and saved!');
    setForm({ // optional: reset the form
      name: '', email: '', vendor: '', date: '', invoiceDate: '',
      invoiceNumber: '', diningUnit: '', entity: '', weekEnding: '',
      invoiceTotal: '', customerNumber: '', orderNumber: '',
      purchaseOrder: '', memo: '', submittedBy: '', originalRecipient: ''
    });
  }
};


  const handleDownload = () => {
    const content = JSON.stringify(form, null, 2);
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

          <input type="text" name="name" placeholder="Your Full Name" value={form.name} onChange={handleChange} className="border rounded p-2 w-full" />
          <input type="email" name="email" placeholder="Your Email" value={form.email} onChange={handleChange} className="border rounded p-2 w-full" />

          <select name="vendor" value={form.vendor} onChange={handleChange} className="border rounded p-2 w-full">
            <option value="">Select Vendor</option>
            <option value="Sysco">Sysco</option>
            <option value="QCD">QCD</option>
            <option value="Keany Produce">Keany Produce</option>
            <option value="Temp Agency">Temp Agency</option>
            <option value="Other">Other</option>
          </select>

          <select name="submittedBy" value={form.submittedBy} onChange={handleChange} className="border rounded p-2 w-full">
            <option value="">Submitted By</option>
            <option value="Vendor">Vendor (Self-submitted)</option>
            <option value="Dining Admin">Dining Admin / Fiscal Tech</option>
            <option value="Ops Manager">Operations Manager / Director</option>
            <option value="Business Office">Business Office (State)</option>
          </select>

        <div className="mb-4">
  <label htmlFor="originalRecipient" className="block text-sm font-medium text-gray-700 mb-1">
    Who originally received this invoice?
  </label>
  <input
    type="text"
    id="originalRecipient"
    name="originalRecipient"
    placeholder="e.g., Dining Services, Director, Business Office"
    value={form.originalRecipient}
    onChange={handleChange}
    className="border rounded p-2 w-full"
  />
</div>


          <input type="date" name="date" placeholder="Today's Date" value={form.date} onChange={handleChange} className="border rounded p-2 w-full" />
          <input type="date" name="invoiceDate" placeholder="Invoice Date" value={form.invoiceDate} onChange={handleChange} className="border rounded p-2 w-full" />
          <input type="text" name="invoiceNumber" placeholder="Invoice Number" value={form.invoiceNumber} onChange={handleChange} className="border rounded p-2 w-full" />

          <select name="diningUnit" value={form.diningUnit} onChange={handleChange} className="border rounded p-2 w-full">
            <option value="">Select Dining Unit</option>
            <option value="Regattas">Regattas</option>
            <option value="Commons">Commons</option>
            <option value="Discovery Cafe">Discovery Cafe</option>
            <option value="Einstein's">Einstein's</option>
            <option value="F.I.T">F.I.T</option>
            <option value="Palette">Palette</option>
          </select>

          <select name="entity" value={form.entity} onChange={handleChange} className="border rounded p-2 w-full">
            <option value="">Select Paying Entity</option>
            <option value="CNU Dining Services">Christopher Newport University</option>
            <option value="Business Office">Other</option>
          </select>

          <input type="date" name="weekEnding" placeholder="Week Ending Date (W/E)" value={form.weekEnding} onChange={handleChange} className="border rounded p-2 w-full" />
          <input type="number" name="invoiceTotal" placeholder="Invoice Total ($)" value={form.invoiceTotal} onChange={handleChange} className="border rounded p-2 w-full" />
          <input type="text" name="customerNumber" placeholder="Customer Number" value={form.customerNumber} onChange={handleChange} className="border rounded p-2 w-full" />
          <input type="text" name="orderNumber" placeholder="Order Number" value={form.orderNumber} onChange={handleChange} className="border rounded p-2 w-full" />
          <input type="text" name="purchaseOrder" placeholder="Purchase Order #" value={form.purchaseOrder} onChange={handleChange} className="border rounded p-2 w-full" />
        </div>

        <textarea name="memo" placeholder="Memo or Notes" value={form.memo} onChange={handleChange} rows="4" className="border rounded p-2 w-full"></textarea>

        <div className="flex gap-4">
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Submit Invoice
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
