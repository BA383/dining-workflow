import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import BackToAdminDashboard from './BackToAdminDashboard';

function Section({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-6 border rounded bg-white shadow">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left p-3 bg-gray-200 font-semibold"
      >
        {title} {open ? '▲' : '▼'}
      </button>
      {open && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
}

function RegattasForm() {
  const initialState = {
    unit: 'Regattas',
    fiscalYear: '',
    transmittalNumber: '',
    workDate: '',
    salesTaxable: '',
    checkSales: '',
    checkSalesTax: '',
    salesTaxCollected: '',
    moSalesTaxable: '',
    moSalesTaxCollected: '',
    moDiningDollarsTax: '',
    cashOver: '',
    cashShort: '',
    diningDollars: '',
    moDiningDollars: '',
    deptCharges: '',
    diningLoyalty: '',
    totalCash: '',
    totalChecks: '',
    regCreditSales: '',
    moCreditSales: '',
    regCreditSalesTax: '',
    moCreditSalesTax: ''
  };

  const [form, setForm] = useState(initialState);
  const [displayTotalCash, setDisplayTotalCash] = useState('');
  const [manualSalesTaxable, setManualSalesTaxable] = useState(false);

  const mapField = (target, label, value) => {
    const cleanLabel = label.toLowerCase();

    if (cleanLabel.includes('mo credit sales tax')) target.moCreditSalesTax = value;
    else if (cleanLabel.includes('mo credit sales')) target.moCreditSales = value;
    else if (cleanLabel.includes('reg credit sales tax')) target.regCreditSalesTax = value;
    else if (cleanLabel.includes('reg credit sales')) target.regCreditSales = value;
    else if (cleanLabel.includes('mo dining dollars tax')) target.moDiningDollarsTax = value;
    else if (cleanLabel.includes('mo dining dollars')) target.moDiningDollars = value;
    else if (cleanLabel.includes('sales food - taxable')) target.salesTaxable = value;
    else if (cleanLabel.includes('sales tax collected')) target.salesTaxCollected = value;
    else if (cleanLabel.includes('cash over')) target.cashOver = value;
    else if (cleanLabel.includes('cash short')) target.cashShort = value;
    else if (cleanLabel.includes('dining loyalty')) target.diningLoyalty = value;
    else if (cleanLabel.includes('dining dollars')) target.diningDollars = value;
    else if (cleanLabel.includes('department charges')) target.deptCharges = value;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      let values = {};
      const text = event.target.result;

      const lines = text.split('\n').map((line) => line.trim());
      lines.forEach((line) => {
        const [label, value] = line.split(',');
        if (!label || value === undefined) return;
        mapField(values, label, value);
      });

      setForm((prev) => ({ ...prev, ...values }));
    };

    if (file.name.endsWith('.xlsx')) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };


useEffect(() => {
  if (!manualSalesTaxable) {
    setForm(prev => ({
      ...prev,
      salesTaxable: prev.totalCash
    }));
  }
}, [form.totalCash, manualSalesTaxable]);

  const orgAcctMap = {
  "Bistro": {
    taxable: "Sales Food Taxable - 20615-6566",
    exempt: "Sales Food Exempt - 20615-6558",
    tax: "Sales Tax Collected - 20615-6570",
    over: "Cash Over - 20615-6510",
    short: "Cash Short - 20615-6512",
    ccDept: "Departmental Charges - 20430-6330",
    dd: "Dining Dollars - 20680-6528",
    loyalty: "Dining Loyalty - 20615-6529",
    cc: "Reg Credit Card Sales - 20615-6566",
    ccTax: "Reg Credit Card Sales Tax - 20615-6570"
  },
  "Pizza": {
    taxable: "Sales Food Taxable - 20673-6566",
    exempt: "Sales Food Exempt - 20673-6558",
    tax: "Sales Tax Collected - 20673-6570",
    over: "Cash Over - 20673-6510",
    short: "Cash Short - 20673-6512",
    ccDept: "Departmental Charges - 20430-6330",
    dd: "Dining Dollars - 20680-6528",
    loyalty: "Dining Loyalty - 20673-6529",
    cc: "Reg Credit Card Sales - 20673-6566",
    ccTax: "Reg Credit Card Sales Tax - 20673-6570"
  },
  "Cafe": {
    taxable: "Sales Food Taxable - 20635-6566",
    exempt: "Sales Food Exempt - 20635-6558",
    tax: "Sales Tax Collected - 20635-6570",
    over: "Cash Over - 20635-6510",
    short: "Cash Short - 20635-6512",
    ccDept: "Departmental Charges - 20430-6330",
    dd: "Dining Dollars - 20680-6528",
    loyalty: "Dining Loyalty - 20635-6529",
    cc: "Reg Credit Card Sales - 20635-6566",
    ccTax: "Reg Credit Card Sales Tax - 20635-6570"
  },
  "Regattas": {
    taxable: "Sales Food Taxable - 20670-6566",
    exempt: "Sales Food Exempt - 20670-6558",
    tax: "Sales Tax Collected - 20670-6570",
    over: "Cash Over - 20670-6510",
    short: "Cash Short - 20670-6512",
    ccDept: "Departmental Charges - 20430-6330",
    dd: "Dining Dollars - 20680-6528",
    loyalty: "Dining Loyalty - 20670-6529",
    cc: "Reg Credit Card Sales - 20670-6566",
    ccTax: "Reg Credit Card Sales Tax - 20670-6570"
  },
  "Commons": {
    taxable: "Sales Food Taxable - 20655-6566",
    exempt: "Sales Food Exempt - 20655-6558",
    tax: "Sales Tax Collected - 20655-6570",
    over: "Cash Over - 20655-6510",
    short: "Cash Short - 20655-6512",
    ccDept: "Departmental Charges - 20430-6330",
    dd: "Dining Dollars - 20680-6528",
    loyalty: "Dining Loyalty - 20655-6529",
    cc: "Reg Credit Card Sales - 20655-6566",
    ccTax: "Reg Credit Card Sales Tax - 20655-6570"
  },
  "Palette": {
    taxable: "Sales Food Taxable - 20685-6566",
    exempt: "Sales Food Exempt - 20685-6558",
    tax: "Sales Tax Collected - 20685-6570",
    over: "Cash Over - 20685-6510",
    short: "Cash Short - 20685-6512",
    ccDept: "Departmental Charges - 20430-6330",
    dd: "Dining Dollars - 20680-6528",
    loyalty: "Dining Loyalty - 20685-6529",
    cc: "Reg Credit Card Sales - 20685-6566",
    ccTax: "Reg Credit Card Sales Tax - 20685-6570"
  },
  "Einstein's": {
    taxable: "Sales Food Taxable - 20640-6566",
    exempt: "Sales Food Exempt - 20640-6558",
    tax: "Sales Tax Collected - 20640-6570",
    over: "Cash Over - 20640-6510",
    short: "Cash Short - 20640-6512",
    ccDept: "Departmental Charges - 20430-6330",
    dd: "Dining Dollars - 20680-6528",
    loyalty: "Dining Loyalty - 20640-6529",
    cc: "Reg Credit Card Sales - 20640-6566",
    ccTax: "Reg Credit Card Sales Tax - 20640-6570"
  },
  "F.I.T": {
    taxable: "Sales Food Taxable - 20620-6566",
    exempt: "Sales Food Exempt - 20620-6558",
    tax: "Sales Tax Collected - 20620-6570",
    over: "Cash Over - 20620-6510",
    short: "Cash Short - 20620-6512",
    ccDept: "Departmental Charges - 20430-6330",
    dd: "Dining Dollars - 20680-6528",
    loyalty: "Dining Loyalty - 20620-6529",
    cc: "Reg Credit Card Sales - 20620-6566",
    ccTax: "Reg Credit Card Sales Tax - 20620-6570"
  }
};


 const handleChange = (e) => {
  const { name, value } = e.target;

  setForm(prev => ({ ...prev, [name]: value }));

  if (name === 'salesTaxable') {
    setManualSalesTaxable(true);
  }
};

  const handleClear = () => setForm(initialState);
  const toNumber = val => parseFloat(val) || 0;
  const formatCurrency = val => val === '' ? '' : `$${toNumber(val).toFixed(2)}`;

  const calcCaptainsCash = toNumber(form.salesTaxable) + toNumber(form.salesTaxCollected) + toNumber(form.deptCharges);
  const calcMoCaptainsCash = toNumber(form.moSalesTaxable) + toNumber(form.moSalesTaxCollected);
  const calcSalesExempt = toNumber(form.diningDollars) + toNumber(form.diningLoyalty) + toNumber(form.deptCharges);

  const calcMoSalesExempt = toNumber(form.moDiningDollars) + toNumber(form.moDiningDollarsTax);
  const regCCDepositTotal = toNumber(form.regCreditSales) + toNumber(form.regCreditSalesTax);
  const moCCDepositTotal = toNumber(form.moCreditSales) + toNumber(form.moCreditSalesTax);

  const unitMap = orgAcctMap[form.unit];




  return (
    <div className="p-6 max-w-6xl mx-auto">
      <BackToAdminDashboard />
      <h1 className="text-2xl font-bold mb-6">Dining Deposit Transmittal</h1>
{/* Upload CSV input */}
<input
  type="file"
  accept=".csv"
  onChange={handleFileUpload}
  className="border p-2 rounded mb-4"
/>
{form.salesTaxable || form.salesTaxCollected || form.diningDollars ? (
  <p className="text-green-600 text-sm mt-2">✅ Form populated from uploaded file.</p>
) : null}


      <Section title="Header Information">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select name="unit" value={form.unit} onChange={handleChange} className="border rounded p-2">
            {Object.keys(orgAcctMap).map((unit) => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
          <input name="fiscalYear" placeholder="Fiscal Year" value={form.fiscalYear} onChange={handleChange} className="border rounded p-2" />
          <div className="mt-4">
  <details className="bg-yellow-100 rounded p-4">
    <summary className="font cursor-pointer text-blue-600 hover:underline">
      View Org & Acct Code Reference for {form.unit}
    </summary>
    <ul className="list-disc pl-6 mt-3 text-sm text-gray-700 space-y-1">
      <li>{unitMap.taxable}</li>
      <li>{unitMap.exempt}</li>
      <li>{unitMap.tax}</li>
      <li>{unitMap.over}</li>
      <li>{unitMap.short}</li>
      <li>{unitMap.ccDept}</li>
      <li>{unitMap.dd}</li>
      <li>{unitMap.loyalty}</li>
      <li>{unitMap.cc}</li>
      <li>{unitMap.ccTax}</li>
    </ul>
  </details>
</div>

          <input name="transmittalNumber" placeholder="Transmittal #" value={form.transmittalNumber} onChange={handleChange} className="border rounded p-2" />
          <input name="workDate" type="date" value={form.workDate} onChange={handleChange} className="border rounded p-2" />
        </div>
        <div className="text-sm text-gray-600 mt-2">
          Example Organization & Acct Code: <strong>{unitMap.taxable}</strong>
        </div>
      </Section>

      <Section title="Sales Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
  <input
    name="salesTaxable"
    type="number"
    placeholder="Sales Food - Taxable"
    value={form.salesTaxable}
    onChange={handleChange}
    className="border rounded p-2 w-full"
  />
  {form.salesTaxable !== '' && (
    <span className="ml-4 text-sm text-gray-600 font-semibold whitespace-nowrap">
      Sales Food - Taxable
    </span>
  )}
</div>
          <div className="flex items-center justify-between">
  <input
    name="salesTaxCollected"
    type="number"
    placeholder="Sales Tax Collected"
    value={form.salesTaxCollected}
    onChange={handleChange}
    className="border rounded p-2 w-full"
  />
  {form.salesTaxCollected !== '' && (
    <span className="ml-4 text-sm text-gray-600 font-semibold whitespace-nowrap">
      Sales Tax Collected
    </span>
  )}
</div>
          

          <div className="flex items-center justify-between">
  <input
    name="diningDollars"
    type="number"
    placeholder="Dining Dollars"
    value={form.diningDollars}
    onChange={handleChange}
    className="border rounded p-2 w-full"
  />
  {form.diningDollars !== '' && (
    <span className="ml-4 text-sm text-gray-600 font-semibold whitespace-nowrap">
      Dining Dollars
    </span>
  )}
</div>
          <div className="flex items-center justify-between">
  <input
    name="diningLoyalty"
    type="number"
    placeholder="Dining Loyalty"
    value={form.diningLoyalty}
    onChange={handleChange}
    className="border rounded p-2 w-full"
  />
  {form.diningLoyalty !== '' && (
    <span className="ml-4 text-sm text-gray-600 font-semibold whitespace-nowrap">
      Dining Loyalty
    </span>
  )}
</div>
          <div className="flex items-center justify-between">
  <input
    name="deptCharges"
    type="number"
    placeholder="Department Charges"
    value={form.deptCharges}
    onChange={handleChange}
    className="border rounded p-2 w-full"
  />
  {form.deptCharges !== '' && (
    <span className="ml-4 text-sm text-gray-600 font-semibold whitespace-nowrap">
      Department Charges
    </span>
  )}
</div>
          

         
<div className="flex items-center justify-between">
  <input
    name="moSalesTaxable"
    type="number"
    placeholder="MO Sales Food - Taxable"
    value={form.moSalesTaxable}
    onChange={handleChange}
    className="border rounded p-2 w-full"
  />
  {form.moSalesTaxable !== '' && (
    <span className="ml-4 text-sm text-gray-600 font-semibold whitespace-nowrap">
      MO Sales Food - Taxable
    </span>
  )}
</div>

          <div className="flex items-center justify-between">
  <input
    name="moSalesTaxCollected"
    type="number"
    placeholder="MO Sales Tax Collected"
    value={form.moSalesTaxCollected}
    onChange={handleChange}
    className="border rounded p-2 w-full"
  />
  {form.moSalesTaxCollected !== '' && (
    <span className="ml-4 text-sm text-gray-600 font-semibold whitespace-nowrap">
      MO Sales Tax Collected
    </span>
  )}
</div>
          <div className="flex items-center justify-between">
  <input
    name="moDiningDollarsTax"
    type="number"
    placeholder="MO Dining Dollars Tax (rare occurrence)"
    value={form.moDiningDollarsTax}
    onChange={handleChange}
    className="border rounded p-2 w-full"
  />
  {form.moDiningDollarsTax !== '' && (
    <span className="ml-4 text-sm text-gray-600 font-semibold whitespace-nowrap">
      MO Dining Dollars Tax
    </span>
  )}
</div>
          <div className="flex items-center justify-between">
  <input
    name="moDiningDollars"
    type="number"
    placeholder="MO Dining Dollars"
    value={form.moDiningDollars}
    onChange={handleChange}
    className="border rounded p-2 w-full"
  />
  {form.moDiningDollars !== '' && (
    <span className="ml-4 text-sm text-gray-600 font-semibold whitespace-nowrap">
      MO Dining Dollars
    </span>
  )}
</div>
          <div className="flex items-center justify-between">
  <input
    placeholder="MO Sales Food - Exempt"
    value={formatCurrency(calcMoSalesExempt)}
    readOnly
    className="border bg-gray-100 rounded p-2 w-full font-bold text-pink-700"

  />
  <span className="ml-4 text-sm text-gray-600 font-semibold whitespace-nowrap">
    MO Sales Food - Exempt
  </span>
</div>



<div className="flex items-center justify-between">
  <input
    placeholder="Sales Food - Exempt"
    value={formatCurrency(calcSalesExempt)}
    readOnly
    className="border bg-gray-100 rounded p-2 w-full font-bold text-pink-700"

  />
  <span className="ml-4 text-sm text-gray-600 font-semibold whitespace-nowrap">
    Reg Sales Food - Exempt 
  </span>
</div>

 </div>
      </Section>
      <Section title="Cash & Check Transactions">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between"></div> 

<div className="flex items-center justify-between">
  <input
    name="cashOver"
    type="number"
    placeholder="Cash Over"
    value={form.cashOver}
    onChange={handleChange}
    className="border rounded p-2 w-full"
  />
  {form.cashOver !== '' && (
    <span className="ml-4 text-sm text-gray-600 font-semibold whitespace-nowrap">
      Cash Over
    </span>
  )}
</div>
          
        
          
          
          <div className="flex items-center justify-between">
  <input
    name="cashShort"
    type="number"
    placeholder="Cash Short"
    value={form.cashShort}
    onChange={handleChange}
    className="border rounded p-2 w-full"
  />
  {form.cashShort !== '' && (
    <span className="ml-4 text-sm text-gray-600 font-semibold whitespace-nowrap">
      Cash Short
    </span>
  )}
</div>
<div className="flex items-center justify-between">
 <input
  name="totalCash"
  placeholder="Total Cash"
  value={form.totalCash}
  onChange={handleChange}
  className="border rounded p-2 w-full"
/>


  {form.totalCash && (
    <span className="ml-4 text-sm text-gray-600 font-semibold whitespace-nowrap">Total Cash</span>
  )}
</div>

          <div className="flex items-center justify-between">
  <input
    name="totalChecks"
    type="number"
    placeholder="Total Checks"
    value={form.totalChecks}
    onChange={handleChange}
    className="border rounded p-2 w-full"
  />
  {form.totalChecks !== '' && (
    <span className="ml-4 text-sm text-gray-600 font-semibold whitespace-nowrap">
      Total Checks
    </span>
  )}
</div>
        </div>
      </Section>

<Section title="Credit Card Transactions">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="relative">
      <input
        name="regCreditSales"
        type="number"
        placeholder="Reg Credit Sales"
        value={form.regCreditSales}
        onChange={handleChange}
        className="border rounded p-2 w-full"
      />
      {form.regCreditSales !== '' && (
        <span className="absolute top-2 right-3 text-sm text-gray-500 font-semibold">
          Reg Credit Sales
        </span>
      )}
    </div>

    <div className="relative">
      <input
        name="regCreditSalesTax"
        type="number"
        placeholder="Reg Credit Sales Tax"
        value={form.regCreditSalesTax}
        onChange={handleChange}
        className="border rounded p-2 w-full"
      />
      {form.regCreditSalesTax !== '' && (
        <span className="absolute top-2 right-3 text-sm text-gray-500 font-semibold">
          Reg Credit Sales Tax
        </span>
      )}
    </div>

    <div className="relative">
      <input
        name="moCreditSales"
        type="number"
        placeholder="MO Credit Sales"
        value={form.moCreditSales}
        onChange={handleChange}
        className="border rounded p-2 w-full"
      />
      {form.moCreditSales !== '' && (
        <span className="absolute top-2 right-3 text-sm text-gray-500 font-semibold">
          MO Credit Sales
        </span>
      )}
    </div>

    <div className="relative">
      <input
        name="moCreditSalesTax"
        type="number"
        placeholder="MO Credit Sales Tax"
        value={form.moCreditSalesTax}
        onChange={handleChange}
        className="border rounded p-2 w-full"
      />
      {form.moCreditSalesTax !== '' && (
        <span className="absolute top-2 right-3 text-sm text-gray-500 font-semibold">
          MO Credit Sales Tax
        </span>
      )}
    </div>
  </div>
</Section>


      <Section title="Summary & Totals">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
  <input
    placeholder="Captains Cash & Dept Charges"
    value={formatCurrency(calcCaptainsCash)}
    readOnly
    className="border bg-gray-100 rounded p-2 w-full font-bold text-purple-700"

  />
  <span className="ml-4 text-sm text-gray-600 font-semibold whitespace-nowrap">
    Captains Cash & Dept Charges
  </span>
</div>

          <div className="flex items-center justify-between">
  <input
    placeholder="MO Captains Cash & Dept Charges"
    value={formatCurrency(calcMoCaptainsCash)}
    readOnly
    className="border bg-gray-100 rounded p-2 w-full font-bold text-purple-700"

  />
  <span className="ml-4 text-sm text-gray-600 font-semibold whitespace-nowrap">
    MO Captains Cash & Dept Charges
  </span>
</div>
          
          <div className="flex items-center justify-between">
  <input
    placeholder="Total Reg Credit Card Sales"
    value={formatCurrency(regCCDepositTotal)}
    readOnly
    className="border bg-gray-100 rounded p-2 w-full font-bold text-green-700"

  />
  <span className="ml-4 text-sm text-gray-600 font-semibold whitespace-nowrap">
    Total Reg Credit Card Sales
  </span>
</div>
          <div className="flex items-center justify-between">
  <input
    placeholder="Total MO Credit Card Sales"
    value={formatCurrency(moCCDepositTotal)}
    readOnly
    className="border bg-gray-100 rounded p-2 w-full font-bold text-green-700"

  />
  <span className="ml-4 text-sm text-gray-600 font-semibold whitespace-nowrap">
    Total MO Credit Card Sales
  </span>
</div>
        </div>
      </Section>

      <Section title="Notes & Guidance">
  <div className="text-sm text-gray-700 space-y-3">
    <p><strong>Sales Food Taxable</strong> = Cash + Checks + Capt's Cash Sales</p>
    <p><strong>Capt's Cash & Dept Charges</strong> = Capt's Cash Sales + Capt's Cash Sales Tax + Dept Charges</p>
    <p><strong>MO Capt's Cash & Dept Charges</strong> = MO Capt's Cash Sales + MO Capt's Cash Sales Tax + Dept Charges</p>
    <p><strong>Sales Food Exempt</strong> = Dining Dollars + Dept Charges + Dining Loyalty</p>
    <p><strong>MO Sales Food Exempt</strong> = MO Dining Dollars + MO Dining Dollars Tax</p>
    <p><strong>Dining Dollars</strong> = Dining Dollars</p>
    <p><strong>Dining Loyalty</strong> = Dining Loyalty</p>
  </div>
</Section>



      <div className="mt-6 flex gap-4">
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Submit Transmittal
        </button>
        <button onClick={handleClear} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
          Clear All Fields
        </button>
      </div>
      

    </div>
  );
}

export default RegattasForm;