// RegattasForm.js – Fully restored complete version with org code display and all form sections

import React, { useState } from 'react';

function Section({ title, children }) {
  const [open, setOpen] = useState(true);
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
    fiscalYear: '', transmittalNumber: '', workDate: '',
    salesTaxable: '', checkSales: '', checkSalesTax: '', salesTaxCollected: '',
    moSalesTaxable: '', moSalesTaxCollected: '', moDiningDollarsTax: '',
    cashOver: '', cashShort: '', diningDollars: '', moDiningDollars: '',
    deptCharges: '', diningLoyalty: '', totalCash: '', totalChecks: '',
    regCreditSales: '', moCreditSales: '', regCreditSalesTax: '', moCreditSalesTax: ''
  };

  const [form, setForm] = useState(initialState);

  const orgCodes = {
    Regattas: '20670',
    Commons: '20660',
    Discovery: '20430',
    Catering: '20450'
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleClear = () => {
    setForm(initialState);
  };

  const toNumber = (val) => parseFloat(val) || 0;
  const formatCurrency = (val) => val === '' ? '' : `$${toNumber(val).toFixed(2)}`;

  const calcCaptainsCash = toNumber(form.salesTaxable) + toNumber(form.salesTaxCollected) + toNumber(form.deptCharges);
  const calcMoCaptainsCash = toNumber(form.moSalesTaxable) + toNumber(form.moSalesTaxCollected);
  const calcSalesExempt = toNumber(form.diningDollars) + toNumber(form.diningLoyalty);
  const calcMoSalesExempt = toNumber(form.moDiningDollars) + toNumber(form.moDiningDollarsTax);
  const regCCDepositTotal = toNumber(form.regCreditSales) + toNumber(form.regCreditSalesTax);
  const moCCDepositTotal = toNumber(form.moCreditSales) + toNumber(form.moCreditSalesTax);

  const orgCode = orgCodes[form.unit];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Dining Deposit Transmittal</h1>

      <Section title="Header Information">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select name="unit" value={form.unit} onChange={handleChange} className="border rounded p-2 w-full">
            <option>Regattas</option>
            <option>Commons</option>
            <option>Discovery</option>
            <option>Catering</option>
          </select>
          <input title="Enter the fiscal year" type="text" name="fiscalYear" placeholder="Fiscal Year" value={form.fiscalYear} onChange={handleChange} className="border rounded p-2 w-full" />
          <input title="Enter transmittal number" type="text" name="transmittalNumber" placeholder="Transmittal #" value={form.transmittalNumber} onChange={handleChange} className="border rounded p-2 w-full" />
          <input title="Select the work date" type="date" name="workDate" value={form.workDate} onChange={handleChange} className="border rounded p-2 w-full" />
        </div>
        <div className="text-sm text-gray-500 mt-2">
          Organization Code for {form.unit}: <strong>{orgCode}</strong>
        </div>
      </Section>

      <Section title="Sales Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input title="Sales of taxable food paid via Captains Cash" type="number" name="salesTaxable" placeholder="Sales Food - Taxable" value={form.salesTaxable} onChange={handleChange} className="border rounded p-2 w-full" />
          <input title="Check payments only, not included in calculations" type="number" name="checkSales" placeholder="Check Sales" value={form.checkSales} onChange={handleChange} className="border rounded p-2 w-full" />
          <input title="Tax from check payments only" type="number" name="checkSalesTax" placeholder="Check Sales Tax" value={form.checkSalesTax} onChange={handleChange} className="border rounded p-2 w-full" />
          <input title="Sales tax collected for regular purchases" type="number" name="salesTaxCollected" placeholder="Sales Tax Collected" value={form.salesTaxCollected} onChange={handleChange} className="border rounded p-2 w-full" />
          <input title="Manual entry for overages" type="number" name="cashOver" placeholder="Cash Over" value={form.cashOver} onChange={handleChange} className="border rounded p-2 w-full" />
          <input title="Manual entry for shortages" type="number" name="cashShort" placeholder="Cash Short" value={form.cashShort} onChange={handleChange} className="border rounded p-2 w-full" />
          <input title="MO taxable sales" type="number" name="moSalesTaxable" placeholder="MO Sales Food - Taxable" value={form.moSalesTaxable} onChange={handleChange} className="border rounded p-2 w-full" />
          <input title="MO tax collected" type="number" name="moSalesTaxCollected" placeholder="MO Sales Tax Collected" value={form.moSalesTaxCollected} onChange={handleChange} className="border rounded p-2 w-full" />
          <input title="Tax glitch from Transact on MO Dining Dollars" type="number" name="moDiningDollarsTax" placeholder="MO Dining Dollars Tax (if glitch)" value={form.moDiningDollarsTax} onChange={handleChange} className="border rounded p-2 w-full" />
          <input title="Auto: Dining Dollars + Dining Loyalty" type="text" placeholder="Sales Food - Exempt" value={formatCurrency(calcSalesExempt)} readOnly className="border bg-gray-100 rounded p-2 w-full" />
          <input title="Auto: MO Dining Dollars + MO DD Tax" type="text" placeholder="MO Sales Food - Exempt" value={formatCurrency(calcMoSalesExempt)} readOnly className="border bg-gray-100 rounded p-2 w-full" />
        </div>
      </Section>

      <Section title="Payment Breakdown">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input title="Auto: Sales Taxable + Tax + Dept Charges" type="text" value={formatCurrency(calcCaptainsCash)} readOnly className="border bg-gray-100 rounded p-2 w-full" />
          <input title="Auto: MO Sales Taxable + MO Tax" type="text" value={formatCurrency(calcMoCaptainsCash)} readOnly className="border bg-gray-100 rounded p-2 w-full" />
          <input title="Dining Dollars (regular)" type="number" name="diningDollars" placeholder="Dining Dollars" value={form.diningDollars} onChange={handleChange} className="border rounded p-2 w-full" />
          <input title="MO Dining Dollars" type="number" name="moDiningDollars" placeholder="MO Dining Dollars" value={form.moDiningDollars} onChange={handleChange} className="border rounded p-2 w-full" />
          <input title="Manual Department Charges" type="number" name="deptCharges" placeholder="Department Charges" value={form.deptCharges} onChange={handleChange} className="border rounded p-2 w-full" />
          <input title="Dining Loyalty Credits" type="number" name="diningLoyalty" placeholder="Dining Loyalty" value={form.diningLoyalty} onChange={handleChange} className="border rounded p-2 w-full" />
        </div>
      </Section>

      <Section title="Deposit Totals">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input title="Total cash physically deposited (if any)" type="number" name="totalCash" placeholder="Total Cash" value={form.totalCash} onChange={handleChange} className="border rounded p-2 w-full" />
          <input title="Total checks received" type="number" name="totalChecks" placeholder="Total Checks" value={form.totalChecks} onChange={handleChange} className="border rounded p-2 w-full" />
          <input title="Credit card sales (regular)" type="number" name="regCreditSales" placeholder="Reg Credit Sales" value={form.regCreditSales} onChange={handleChange} className="border rounded p-2 w-full" />
          <input title="Credit card sales (MO)" type="number" name="moCreditSales" placeholder="MO Credit Sales" value={form.moCreditSales} onChange={handleChange} className="border rounded p-2 w-full" />
          <input title="Tax from regular CC sales" type="number" name="regCreditSalesTax" placeholder="Reg Credit Sales Tax" value={form.regCreditSalesTax} onChange={handleChange} className="border rounded p-2 w-full" />
          <input title="Tax from MO CC sales" type="number" name="moCreditSalesTax" placeholder="MO Credit Sales Tax" value={form.moCreditSalesTax} onChange={handleChange} className="border rounded p-2 w-full" />
          <div className="bg-gray-100 p-2 rounded">Regular CC Deposit Total: <strong>{formatCurrency(regCCDepositTotal)}</strong></div>
          <div className="bg-gray-100 p-2 rounded">MO CC Deposit Total: <strong>{formatCurrency(moCCDepositTotal)}</strong></div>
        </div>
      </Section>

      <Section title="Reference & Calculations">
        <ul className="list-disc pl-6 space-y-2 text-sm text-gray-700">
          <li>Captains Cash & Dept = Sales Taxable + Sales Tax Collected + Dept Charges</li>
          <li>MO Captains Cash = MO Sales Taxable + MO Sales Tax Collected</li>
          <li>Sales Food Exempt = Dining Dollars + Dining Loyalty</li>
          <li>MO Sales Food Exempt = MO Dining Dollars + MO Dining Dollars Tax</li>
        </ul>
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
