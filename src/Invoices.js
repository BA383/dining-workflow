import React, { useState } from 'react';


function Invoices() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    vendor: '',
    date: '',
    invoiceDate: '',
    invoiceNumber: '',
    entity: '',
    weekEnding: '',
    invoiceTotal: '',
    customerNumber: '',
    orderNumber: '',
    purchaseOrder: '',
    memo: ''
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Invoice submitted');
    // Integrate with DocuSign or backend later
  };

  const handleDownload = () => {
    const content = JSON.stringify(form, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'invoice.json';
    a.click();
    URL.revokeObjectURL(url);
  };


  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Invoice Processing</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="text" name="name" placeholder="Your Full Name" value={form.name} onChange={handleChange} className="border rounded p-2 w-full" />
          <input type="email" name="email" placeholder="Email" value={form.email} onChange={handleChange} className="border rounded p-2 w-full" />
          <select
  name="vendor"
  value={form.vendor}
  onChange={handleChange}
  className="border rounded p-2 w-full"
>
  <option value="">Select Vendor</option>
  <option value="Sysco">Sysco</option>
  <option value="US Foods">QCD</option>
  <option value="Performance Food Group">Keany Produce</option>
  <option value="Other">Temp Agency</option>
</select>

<select
  name="entity"
  value={form.entity}
  onChange={handleChange}
  className="border rounded p-2 w-full"
>
  <option value="">Select Entity</option>
  <option value="CNU Dining Services">CNU Dining Services</option>
  <option value="Business Office">Business Office</option>
  <option value="Auxiliary Services">Auxiliary Services</option>
</select>

          <input type="date" name="date" placeholder="Date" value={form.date} onChange={handleChange} className="border rounded p-2 w-full" />
          <input type="date" name="invoiceDate" placeholder="Invoice Date" value={form.invoiceDate} onChange={handleChange} className="border rounded p-2 w-full" />
          <input type="text" name="invoiceNumber" placeholder="Invoice Number" value={form.invoiceNumber} onChange={handleChange} className="border rounded p-2 w-full" />
          <select
  name="entity"
  value={form.entity}
  onChange={handleChange}
  className="border rounded p-2 w-full"
>
  <option value="">Select Dining Unit</option>
  <option value="Regattas">Regattas</option>
  <option value="Commons">Commons</option>
  <option value="Discovery Cafe">Discovery Cafe</option>
  <option value="Einstein's">Einstein's</option>
  <option value="F.I.T">F.I.T</option>
  <option value="Palette">Palette</option>
</select>

          <input type="date" name="weekEnding" placeholder="Week Ending Date (W/E)" value={form.weekEnding} onChange={handleChange} className="border rounded p-2 w-full" />
          <input type="number" name="invoiceTotal" placeholder="Invoice Total" value={form.invoiceTotal} onChange={handleChange} className="border rounded p-2 w-full" />
          <input type="text" name="customerNumber" placeholder="Customer Number" value={form.customerNumber} onChange={handleChange} className="border rounded p-2 w-full" />
          <input type="text" name="orderNumber" placeholder="Order Number" value={form.orderNumber} onChange={handleChange} className="border rounded p-2 w-full" />
          <input type="text" name="purchaseOrder" placeholder="Purchase Order #" value={form.purchaseOrder} onChange={handleChange} className="border rounded p-2 w-full" />
        </div>

        <textarea name="memo" placeholder="Memo" value={form.memo} onChange={handleChange} rows="4" className="border rounded p-2 w-full"></textarea>

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
