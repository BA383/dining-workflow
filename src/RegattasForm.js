import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import BackToAdminDashboard from './BackToAdminDashboard';
import { isAdmin } from './utils/permissions';
import { getCurrentUser } from './utils/userSession';

// ---------- Buffered Input (prevents cursor jumps) ----------
const BufferedInput = ({
  name,
  type = 'text',
  inputMode,
  placeholder,
  value,
  onCommit,         // (val) => void
  className = '',
  commitOn = 'blur' // 'blur' | 'enter' | 'both'
}) => {
  const [buf, setBuf] = useState(value ?? '');
  const lastPropValue = useRef(value ?? '');

  // keep buffer in sync if parent value truly changes (not on every keystroke)
  useEffect(() => {
    const pv = value ?? '';
    if (pv !== lastPropValue.current) {
      lastPropValue.current = pv;
      setBuf(pv);
    }
  }, [value]);

  const commit = useCallback((v) => {
    const nv = v ?? '';
    if (nv !== lastPropValue.current) {
      lastPropValue.current = nv;
      onCommit?.(nv);
    }
  }, [onCommit]);

  return (
    <input
      name={name}
      type={type}
      inputMode={inputMode}
      placeholder={placeholder}
      value={buf}
      onChange={(e) => setBuf(e.target.value)}
      onBlur={commitOn === 'blur' || commitOn === 'both' ? () => commit(buf) : undefined}
      onKeyDown={(e) => {
        if ((commitOn === 'enter' || commitOn === 'both') && e.key === 'Enter') {
          commit(buf);
        }
      }}
      className={className}
      autoComplete="off"
    />
  );
};

// ---------- Component ----------
function RegattasForm() {
  // MOUNT/UNMOUNT probe if you want to confirm remounts:
  // const instanceId = useRef(Math.random().toString(36).slice(2));
  // useEffect(() => {
  //   console.log('RegattasForm MOUNT', instanceId.current);
  //   return () => console.log('RegattasForm UNMOUNT', instanceId.current);
  // }, []);

  const initialState = {
    unit: '',
    fiscalYear: '',
    transmittalNumber: '',
    workDate: '',
    salesTaxable: '',
    salesTaxCollected: '',
    diningDollars: '',
    diningLoyalty: '',
    deptCharges: '',
    moSalesTaxable: '',
    moSalesTaxCollected: '',
    moDiningDollarsTax: '',
    moDiningDollars: '',
    cashOver: '',
    cashShort: '',
    totalCash: '',
    totalChecks: '',
    regCreditSales: '',
    regCreditSalesTax: '',
    moCreditSales: '',
    moCreditSalesTax: ''
  };

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(initialState);
  const [manualSalesTaxable, setManualSalesTaxable] = useState(false);

  // Access
  useEffect(() => {
    const check = async () => {
      const u = await getCurrentUser();
      setUser(u);
      setLoading(false);
    };
    check();
  }, []);

  // Only sync salesTaxable to totalCash if user hasn't overridden it
  useEffect(() => {
    if (!manualSalesTaxable && (form.salesTaxable ?? '') !== (form.totalCash ?? '')) {
      setForm(prev => ({ ...prev, salesTaxable: prev.totalCash ?? '' }));
    }
  }, [form.totalCash, manualSalesTaxable, form.salesTaxable]);

  if (loading) {
    return <div className="p-6"><p className="text-blue-600 font-semibold text-lg">🔄 Checking access...</p></div>;
  }
  if (!user) {
    return <div className="p-6"><p className="text-red-600 font-semibold text-lg">🚫 Access Denied: You must be logged in.</p></div>;
  }
  if (!isAdmin()) {
    return <div className="p-6"><p className="text-red-600 font-semibold text-lg">🚫 Access Denied: Admins only.</p></div>;
  }

  // ---- helpers ----
  const setField = (name, v) => setForm(prev => ({ ...prev, [name]: v ?? '' }));
  const toNumber = (val) => parseFloat(val) || 0;
  const formatCurrency = (val) => val === '' ? '' : `$${toNumber(val).toFixed(2)}`;

  const calcCaptainsCash   = toNumber(form.salesTaxable) + toNumber(form.salesTaxCollected) + toNumber(form.deptCharges);
  const calcMoCaptainsCash = toNumber(form.moSalesTaxable) + toNumber(form.moSalesTaxCollected);
  const calcSalesExempt    = toNumber(form.diningDollars) + toNumber(form.diningLoyalty) + toNumber(form.deptCharges);
  const calcMoSalesExempt  = toNumber(form.moDiningDollars) + toNumber(form.moDiningDollarsTax);
  const regCCDepositTotal  = toNumber(form.regCreditSales) + toNumber(form.regCreditSalesTax);
  const moCCDepositTotal   = toNumber(form.moCreditSales) + toNumber(form.moCreditSalesTax);

  const mapField = (target, label, value) => {
    const clean = (label || '').toLowerCase();
    if (clean.includes('mo credit sales tax')) target.moCreditSalesTax = value;
    else if (clean.includes('mo credit sales')) target.moCreditSales = value;
    else if (clean.includes('reg credit sales tax')) target.regCreditSalesTax = value;
    else if (clean.includes('reg credit sales')) target.regCreditSales = value;
    else if (clean.includes('mo dining dollars tax')) target.moDiningDollarsTax = value;
    else if (clean.includes('mo dining dollars')) target.moDiningDollars = value;
    else if (clean.includes('sales food - taxable')) target.salesTaxable = value;
    else if (clean.includes('sales tax collected')) target.salesTaxCollected = value;
    else if (clean.includes('cash over')) target.cashOver = value;
    else if (clean.includes('cash short')) target.cashShort = value;
    else if (clean.includes('dining loyalty')) target.diningLoyalty = value;
    else if (clean.includes('dining dollars')) target.diningDollars = value;
    else if (clean.includes('department charges')) target.deptCharges = value;
  };

  // Robust CSV/XLSX
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      let csvText = '';
      if (file.name.toLowerCase().endsWith('.xlsx')) {
        const wb = XLSX.read(new Uint8Array(event.target.result), { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        csvText = XLSX.utils.sheet_to_csv(ws);
      } else {
        csvText = event.target.result;
      }
      const values = {};
      String(csvText).split('\n').map(l => l.trim()).forEach(line => {
        if (!line) return;
        const [label, value] = line.split(',');
        if (!label || value === undefined) return;
        mapField(values, label, value);
      });
      setForm(prev => ({ ...prev, ...values }));
    };
    file.name.toLowerCase().endsWith('.xlsx') ? reader.readAsArrayBuffer(file) : reader.readAsText(file);
  };

  const orgAcctMap = {
    "Bistro":   { taxable: "Sales Food Taxable - 20615-6566", exempt: "Sales Food Exempt - 20615-6558", tax: "Sales Tax Collected - 20615-6570", over: "Cash Over - 20615-6510", short: "Cash Short - 20615-6512", ccDept: "Departmental Charges - 20430-6330", dd: "Dining Dollars - 20680-6528", loyalty: "Dining Loyalty - 20615-6529", cc: "Reg Credit Card Sales - 20615-6566", ccTax: "Reg Credit Card Sales Tax - 20615-6570" },
    "Pizza":    { taxable: "Sales Food Taxable - 20673-6566", exempt: "Sales Food Exempt - 20673-6558", tax: "Sales Tax Collected - 20673-6570", over: "Cash Over - 20673-6510", short: "Cash Short - 20673-6512", ccDept: "Departmental Charges - 20430-6330", dd: "Dining Dollars - 20680-6528", loyalty: "Dining Loyalty - 20673-6529", cc: "Reg Credit Card Sales - 20673-6566", ccTax: "Reg Credit Card Sales Tax - 20673-6570" },
    "Cafe":     { taxable: "Sales Food Taxable - 20635-6566", exempt: "Sales Food Exempt - 20635-6558", tax: "Sales Tax Collected - 20635-6570", over: "Cash Over - 20635-6510", short: "Cash Short - 20635-6512", ccDept: "Departmental Charges - 20430-6330", dd: "Dining Dollars - 20680-6528", loyalty: "Dining Loyalty - 20635-6529", cc: "Reg Credit Card Sales - 20635-6566", ccTax: "Reg Credit Card Sales Tax - 20635-6570" },
    "Regattas": { taxable: "Sales Food Taxable - 20670-6566", exempt: "Sales Food Exempt - 20670-6558", tax: "Sales Tax Collected - 20670-6570", over: "Cash Over - 20670-6510", short: "Cash Short - 20670-6512", ccDept: "Departmental Charges - 20430-6330", dd: "Dining Dollars - 20680-6528", loyalty: "Dining Loyalty - 20670-6529", cc: "Reg Credit Card Sales - 20670-6566", ccTax: "Reg Credit Card Sales Tax - 20670-6570" },
    "Commons":  { taxable: "Sales Food Taxable - 20655-6566", exempt: "Sales Food Exempt - 20655-6558", tax: "Sales Tax Collected - 20655-6570", over: "Cash Over - 20655-6510", short: "Cash Short - 20655-6512", ccDept: "Departmental Charges - 20430-6330", dd: "Dining Dollars - 20680-6528", loyalty: "Dining Loyalty - 20655-6529", cc: "Reg Credit Card Sales - 20655-6566", ccTax: "Reg Credit Card Sales Tax - 20655-6570" },
    "Palette":  { taxable: "Sales Food Taxable - 20685-6566", exempt: "Sales Food Exempt - 20685-6558", tax: "Sales Tax Collected - 20685-6570", over: "Cash Over - 20685-6510", short: "Cash Short - 20685-6512", ccDept: "Departmental Charges - 20430-6330", dd: "Dining Dollars - 20680-6528", loyalty: "Dining Loyalty - 20685-6529", cc: "Reg Credit Card Sales - 20685-6566", ccTax: "Reg Credit Card Sales Tax - 20685-6570" },
    "Einstein's": { taxable: "Sales Food Taxable - 20640-6566", exempt: "Sales Food Exempt - 20640-6558", tax: "Sales Tax Collected - 20640-6570", over: "Cash Over - 20640-6510", short: "Cash Short - 20640-6512", ccDept: "Departmental Charges - 20430-6330", dd: "Dining Dollars - 20680-6528", loyalty: "Dining Loyalty - 20640-6529", cc: "Reg Credit Card Sales - 20640-6566", ccTax: "Reg Credit Card Sales Tax - 20640-6570" },
    "F.I.T":    { taxable: "Sales Food Taxable - 20620-6566", exempt: "Sales Food Exempt - 20620-6558", tax: "Sales Tax Collected - 20620-6570", over: "Cash Over - 20620-6510", short: "Cash Short - 20620-6512", ccDept: "Departmental Charges - 20430-6330", dd: "Dining Dollars - 20680-6528", loyalty: "Dining Loyalty - 20620-6529", cc: "Reg Credit Card Sales - 20620-6566", ccTax: "Reg Credit Card Sales Tax - 20620-6570" }
  };
  const unitMap = orgAcctMap[form.unit] || {};

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <BackToAdminDashboard />
      <h1 className="text-2xl font-bold mb-6">Dining Deposit Transmittal</h1>

      <input
        type="file"
        accept=".csv,.xlsx"
        onChange={handleFileUpload}
        className="border p-2 rounded mb-4"
      />
      {(form.salesTaxable || form.salesTaxCollected || form.diningDollars) ? (
        <p className="text-green-600 text-sm mt-2">✅ Form populated from uploaded file.</p>
      ) : null}

      {/* Header */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Header Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            name="unit"
            value={form.unit ?? ''}
            onChange={(e) => setField('unit', e.target.value)}
            className="border rounded p-2"
          >
            <option value="" disabled>— Select Unit —</option>
            {Object.keys(orgAcctMap).map((unit) => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>

          <BufferedInput
            name="fiscalYear"
            placeholder="Fiscal Year"
            value={form.fiscalYear}
            onCommit={(v) => setField('fiscalYear', v)}
            className="border rounded p-2"
            commitOn="both"
          />

          <div className="mt-4">
            <details className="bg-yellow-100 rounded p-4">
              <summary className="font cursor-pointer text-blue-600 hover:underline">
                View Org & Acct Code Reference for {form.unit || '—'}
              </summary>
              {Object.keys(unitMap).length > 0 ? (
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
              ) : (
                <p className="text-sm text-red-600 mt-2">⚠️ No unit selected or data missing.</p>
              )}
            </details>
          </div>

          <BufferedInput
            name="transmittalNumber"
            placeholder="Transmittal #"
            value={form.transmittalNumber}
            onCommit={(v) => setField('transmittalNumber', v)}
            className="border rounded p-2"
            commitOn="both"
          />

          {/* Date uses buffered input pattern too, but type='date' */}
          <BufferedInput
            name="workDate"
            type="date"
            placeholder="Work Date"
            value={form.workDate}
            onCommit={(v) => setField('workDate', v)}
            className="border rounded p-2"
            commitOn="both"
          />
        </div>

        <div className="text-sm text-gray-600 mt-2">
          Example Organization & Acct Code: <strong>{unitMap?.taxable || 'N/A'}</strong>
        </div>
      </div>

      {/* Sales Information */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Sales Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
            <BufferedInput
              name="salesTaxable"
              type="text"
              inputMode="decimal"
              placeholder="Sales Food - Taxable"
              value={form.salesTaxable}
              onCommit={(v) => { setField('salesTaxable', v); setManualSalesTaxable(true); }}
              className="border rounded p-2 w-full"
              commitOn="both"
            />
            <span className="ml-4 text-sm text-gray-600 font-semibold whitespace-nowrap opacity-75">Sales Food - Taxable</span>
          </div>

          <div className="flex items-center justify-between">
            <BufferedInput
              name="salesTaxCollected"
              type="text"
              inputMode="decimal"
              placeholder="Sales Tax Collected"
              value={form.salesTaxCollected}
              onCommit={(v) => setField('salesTaxCollected', v)}
              className="border rounded p-2 w-full"
              commitOn="both"
            />
            <span className="ml-4 text-sm text-gray-600 font-semibold whitespace-nowrap opacity-75">Sales Tax Collected</span>
          </div>

          <div className="flex items-center justify-between">
            <BufferedInput
              name="diningDollars"
              type="text"
              inputMode="decimal"
              placeholder="Dining Dollars"
              value={form.diningDollars}
              onCommit={(v) => setField('diningDollars', v)}
              className="border rounded p-2 w-full"
              commitOn="both"
            />
            <span className="ml-4 text-sm text-gray-600 font-semibold whitespace-nowrap opacity-75">Dining Dollars</span>
          </div>

          <div className="flex items-center justify-between">
            <BufferedInput
              name="diningLoyalty"
              type="text"
              inputMode="decimal"
              placeholder="Dining Loyalty"
              value={form.diningLoyalty}
              onCommit={(v) => setField('diningLoyalty', v)}
              className="border rounded p-2 w-full"
              commitOn="both"
            />
            <span className="ml-4 text-sm text-gray-600 font-semibold whitespace-nowrap opacity-75">Dining Loyalty</span>
          </div>

          <div className="flex items-center justify-between">
            <BufferedInput
              name="deptCharges"
              type="text"
              inputMode="decimal"
              placeholder="Department Charges"
              value={form.deptCharges}
              onCommit={(v) => setField('deptCharges', v)}
              className="border rounded p-2 w-full"
              commitOn="both"
            />
            <span className="ml-4 text-sm text-gray-600 font-semibold whitespace-nowrap opacity-75">Department Charges</span>
          </div>

          <div className="flex items-center justify-between">
            <BufferedInput
              name="moSalesTaxable"
              type="text"
              inputMode="decimal"
              placeholder="MO Sales Food - Taxable"
              value={form.moSalesTaxable}
              onCommit={(v) => setField('moSalesTaxable', v)}
              className="border rounded p-2 w-full"
              commitOn="both"
            />
            <span className="ml-4 text-sm text-gray-600 font-semibold whitespace-nowrap opacity-75">MO Sales Food - Taxable</span>
          </div>

          <div className="flex items-center justify-between">
            <BufferedInput
              name="moSalesTaxCollected"
              type="text"
              inputMode="decimal"
              placeholder="MO Sales Tax Collected"
              value={form.moSalesTaxCollected}
              onCommit={(v) => setField('moSalesTaxCollected', v)}
              className="border rounded p-2 w-full"
              commitOn="both"
            />
            <span className="ml-4 text-sm text-gray-600 font-semibold whitespace-nowrap opacity-75">MO Sales Tax Collected</span>
          </div>

          <div className="flex items-center justify-between">
            <BufferedInput
              name="moDiningDollarsTax"
              type="text"
              inputMode="decimal"
              placeholder="MO Dining Dollars Tax (rare occurrence)"
              value={form.moDiningDollarsTax}
              onCommit={(v) => setField('moDiningDollarsTax', v)}
              className="border rounded p-2 w-full"
              commitOn="both"
            />
            <span className="ml-4 text-sm text-gray-600 font-semibold whitespace-nowrap opacity-75">MO Dining Dollars Tax</span>
          </div>

          <div className="flex items-center justify-between">
            <BufferedInput
              name="moDiningDollars"
              type="text"
              inputMode="decimal"
              placeholder="MO Dining Dollars"
              value={form.moDiningDollars}
              onCommit={(v) => setField('moDiningDollars', v)}
              className="border rounded p-2 w-full"
              commitOn="both"
            />
            <span className="ml-4 text-sm text-gray-600 font-semibold whitespace-nowrap opacity-75">MO Dining Dollars</span>
          </div>

          <div className="flex items-center justify-between">
            <input
              placeholder="MO Sales Food - Exempt"
              value={formatCurrency(calcMoSalesExempt)}
              readOnly
              className="border bg-gray-100 rounded p-2 w-full font-bold text-pink-700"
            />
            <span className="ml-4 text-sm text-gray-600 font-semibold whitespace-nowrap">MO Sales Food - Exempt</span>
          </div>

          <div className="flex items-center justify-between">
            <input
              placeholder="Sales Food - Exempt"
              value={formatCurrency(calcSalesExempt)}
              readOnly
              className="border bg-gray-100 rounded p-2 w-full font-bold text-pink-700"
            />
            <span className="ml-4 text-sm text-gray-600 font-semibold whitespace-nowrap">Reg Sales Food - Exempt</span>
          </div>
        </div>
      </div>

      {/* Cash & Checks */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Cash & Check Transactions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col">
            <BufferedInput
              name="cashOver"
              type="text"
              inputMode="decimal"
              placeholder="Cash Over"
              value={form.cashOver}
              onCommit={(v) => setField('cashOver', v)}
              className="border rounded p-2 w-full"
              commitOn="both"
            />
            <span className="mt-1 text-sm text-gray-600 font-semibold">Cash Over</span>
          </div>

          <div className="flex flex-col">
            <BufferedInput
              name="cashShort"
              type="text"
              inputMode="decimal"
              placeholder="Cash Short"
              value={form.cashShort}
              onCommit={(v) => setField('cashShort', v)}
              className="border rounded p-2 w-full"
              commitOn="both"
            />
            <span className="mt-1 text-sm text-gray-600 font-semibold">Cash Short</span>
          </div>

          <div className="flex flex-col">
            <BufferedInput
              name="totalCash"
              type="text"
              inputMode="decimal"
              placeholder="Total Cash"
              value={form.totalCash}
              onCommit={(v) => setField('totalCash', v)}
              className="border rounded p-2 w-full"
              commitOn="both"
            />
            <span className="mt-1 text-sm text-gray-600 font-semibold">Total Cash</span>
          </div>

          <div className="flex flex-col">
            <BufferedInput
              name="totalChecks"
              type="text"
              inputMode="decimal"
              placeholder="Total Checks"
              value={form.totalChecks}
              onCommit={(v) => setField('totalChecks', v)}
              className="border rounded p-2 w-full"
              commitOn="both"
            />
            <span className="mt-1 text-sm text-gray-600 font-semibold">Total Checks</span>
          </div>
        </div>
      </div>

      {/* Credit Cards */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Credit Card Transactions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
            <BufferedInput
              name="regCreditSales"
              type="text"
              inputMode="decimal"
              placeholder="Reg Credit Sales"
              value={form.regCreditSales}
              onCommit={(v) => setField('regCreditSales', v)}
              className="border rounded p-2 w-full"
              commitOn="both"
            />
            <span className="ml-4 text-sm text-gray-600 font-semibold whitespace-nowrap">Reg Credit Sales</span>
          </div>

          <div className="flex items-center justify-between">
            <BufferedInput
              name="regCreditSalesTax"
              type="text"
              inputMode="decimal"
              placeholder="Reg Credit Sales Tax"
              value={form.regCreditSalesTax}
              onCommit={(v) => setField('regCreditSalesTax', v)}
              className="border rounded p-2 w-full"
              commitOn="both"
            />
            <span className="ml-4 text-sm text-gray-600 font-semibold whitespace-nowrap">Reg Credit Sales Tax</span>
          </div>

          <div className="flex items-center justify-between">
            <BufferedInput
              name="moCreditSales"
              type="text"
              inputMode="decimal"
              placeholder="MO Credit Sales"
              value={form.moCreditSales}
              onCommit={(v) => setField('moCreditSales', v)}
              className="border rounded p-2 w-full"
              commitOn="both"
            />
            <span className="ml-4 text-sm text-gray-600 font-semibold whitespace-nowrap">MO Credit Sales</span>
          </div>

          <div className="flex items-center justify-between">
            <BufferedInput
              name="moCreditSalesTax"
              type="text"
              inputMode="decimal"
              placeholder="MO Credit Sales Tax"
              value={form.moCreditSalesTax}
              onCommit={(v) => setField('moCreditSalesTax', v)}
              className="border rounded p-2 w-full"
              commitOn="both"
            />
            <span className="ml-4 text-sm text-gray-600 font-semibold whitespace-nowrap">MO Credit Sales Tax</span>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Summary & Totals</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
            <input
              placeholder="Captains Cash & Dept Charges"
              value={formatCurrency(calcCaptainsCash)}
              readOnly
              className="border bg-gray-100 rounded p-2 w-full font-bold text-purple-700"
            />
            <span className="ml-4 text-sm text-gray-600 font-semibold whitespace-nowrap">Captains Cash & Dept Charges</span>
          </div>

          <div className="flex items-center justify-between">
            <input
              placeholder="MO Captains Cash & Dept Charges"
              value={formatCurrency(calcMoCaptainsCash)}
              readOnly
              className="border bg-gray-100 rounded p-2 w-full font-bold text-purple-700"
            />
            <span className="ml-4 text-sm text-gray-600 font-semibold whitespace-nowrap">MO Captains Cash & Dept Charges</span>
          </div>

          <div className="flex items-center justify-between">
            <input
              placeholder="Total Reg Credit Card Sales"
              value={formatCurrency(regCCDepositTotal)}
              readOnly
              className="border bg-gray-100 rounded p-2 w-full font-bold text-green-700"
            />
            <span className="ml-4 text-sm text-gray-600 font-semibold whitespace-nowrap">Total Reg Credit Card Sales</span>
          </div>

          <div className="flex items-center justify-between">
            <input
              placeholder="Total MO Credit Card Sales"
              value={formatCurrency(moCCDepositTotal)}
              readOnly
              className="border bg-gray-100 rounded p-2 w-full font-bold text-green-700"
            />
            <span className="ml-4 text-sm text-gray-600 font-semibold whitespace-nowrap">Total MO Credit Card Sales</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Notes & Guidance</h2>
        <div className="text-sm text-gray-700 space-y-3">
          <p><strong>Sales Food Taxable</strong> = Cash + Checks + Capt's Cash Sales</p>
          <p><strong>Capt's Cash & Dept Charges</strong> = Capt's Cash Sales + Capt's Cash Sales Tax + Dept Charges</p>
          <p><strong>MO Capt's Cash & Dept Charges</strong> = MO Capt's Cash Sales + MO Capt's Cash Sales Tax + Dept Charges</p>
          <p><strong>Sales Food Exempt</strong> = Dining Dollars + Dept Charges + Dining Loyalty</p>
          <p><strong>MO Sales Food Exempt</strong> = MO Dining Dollars + MO Dining Dollars Tax</p>
          <p><strong>Dining Dollars</strong> = Dining Dollars</p>
          <p><strong>Dining Loyalty</strong> = Dining Loyalty</p>
        </div>
      </div>

      <div className="mt-6 flex gap-4">
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Submit Transmittal
        </button>
        <button
          onClick={() => { setForm(initialState); setManualSalesTaxable(false); }}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Clear All Fields
        </button>
      </div>
    </div>
  );
}

// Memo guards against unnecessary re-renders (doesn't fix true *remounts*)
export default React.memo(RegattasForm);
