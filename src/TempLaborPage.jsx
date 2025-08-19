import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';
import Papa from 'papaparse';

const agencies = [
  { code: 'EE', name: 'Express Employment' },
  { code: 'IS', name: 'Integrity Staffing' },
  { code: 'LF', name: 'Labor Finders' },
];

const UNITS = ['Discovery', 'Regattas', 'Commons', 'Palette', 'Einstein'];

function TempLaborPage() {
  const [tab, setTab] = useState('log'); // 'log' | 'import' | 'review'
  const [units, setUnits] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [entries, setEntries] = useState([]);

  const [filters, setFilters] = useState({
    unit: '',
    agency: '',
    weekStart: '',  // yyyy-mm-dd (Monday)
  });


const [form, setForm] = useState({
  agency: '',
  workerName: '',
  hours: '',
  rate: '',
  date: '',
});

const handleChange = (e) => {
  const { name, value } = e.target;
  setForm((prev) => ({
    ...prev,
    [name]: value,
  }));
};



  // Load reference data
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.from('units').select('*').order('name');
      const { data: a } = await supabase.from('temp_agencies').select('*').order('name');
      setUnits(u || []);
      setAgencies(a || []);
    })();
  }, []);

  // Load time entries for view
  useEffect(() => {
    (async () => {
      let q = supabase.from('temp_time_entries').select('*').order('date_worked', { ascending: false }).limit(2000);
      if (filters.unit) {
        const unitId = units.find(x => x.name === filters.unit)?.id;
        if (unitId) q = q.eq('unit_id', unitId);
      }
      if (filters.agency) {
        const agencyId = agencies.find(x => x.name === filters.agency)?.id;
        if (agencyId) q = q.eq('agency_id', agencyId);
      }
      const { data } = await q;
      setEntries(data || []);
    })();
  }, [filters.unit, filters.agency, units, agencies]);

  // Quick add form state  (renamed to quickForm to avoid conflict)
const [quickForm, setQuickForm] = useState({
  unit: '',
  agency: '',
  worker_name: '',
  role_title: '',
  date_worked: '',
  hours_worked: '',
  hourly_rate: '',
  notes: '',
});

const handleQuickChange = (e) => {
  const { name, value } = e.target;
  setQuickForm((prev) => ({ ...prev, [name]: value }));
};

const onQuickAdd = async () => {
  if (!quickForm.unit || !quickForm.agency || !quickForm.worker_name || !quickForm.date_worked || !quickForm.hours_worked) return;

  const unitId = units.find(x => x.name === quickForm.unit)?.id;
  const agencyId = agencies.find(x => (x.name || x.code) === quickForm.agency)?.id;
  if (!unitId || !agencyId) return;

  await supabase.from('temp_time_entries').insert({
    unit_id: unitId,
    agency_id: agencyId,
    worker_name: quickForm.worker_name,
    role_title: quickForm.role_title || null,
    date_worked: quickForm.date_worked,
    hours_worked: parseFloat(quickForm.hours_worked),
    hourly_rate: quickForm.hourly_rate ? parseFloat(quickForm.hourly_rate) : null,
    notes: quickForm.notes || null,
    status: 'Logged',
  });

  setQuickForm({
    unit: '',
    agency: '',
    worker_name: '',
    role_title: '',
    date_worked: '',
    hours_worked: '',
    hourly_rate: '',
    notes: '',
  });

  // refresh
  setFilters({ ...filters }); // trigger reload
};


  // CSV Import
  const [csvPreview, setCsvPreview] = useState([]);

  const handleCsvFile = (file) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        setCsvPreview(res.data);
        setTab('import');
      },
    });
  };

  // Map CSV columns to our schema (adjust mapping to your EasyTimeClock export)
  const mapCsvRow = (row) => {
    // Try common column names; adapt these to your file headers
    return {
      worker_name: row.WorkerName || row.Employee || row.Name || '',
      role_title: row.Role || row.Title || '',
      date_worked: (row.Date || row.WorkDate || '').slice(0,10),
      hours_worked: parseFloat(row.Hours || row.TotalHours || row.Duration || '0'),
      hourly_rate: row.Rate ? parseFloat(row.Rate) : null,
      notes: row.Notes || '',
    };
  };

  const importPreviewRows = useMemo(() => csvPreview.map(mapCsvRow), [csvPreview]);

  const commitImport = async (unitName, agencyName) => {
    const unitId = units.find(x => x.name === unitName)?.id;
    const agencyId = agencies.find(x => x.name === agencyName)?.id;
    if (!unitId || !agencyId) return;

    const payload = importPreviewRows
      .filter(r => r.worker_name && r.date_worked && r.hours_worked >= 0)
      .map(r => ({ ...r, unit_id: unitId, agency_id: agencyId, status: 'Logged' }));

    if (payload.length) {
      await supabase.from('temp_time_entries').insert(payload);
      setCsvPreview([]);
      setTab('review');
      setFilters({ ...filters, unit: unitName, agency: agencyName }); // show what was imported
    }
  };

  // Export CSV for agency email
  const exportAgencyCsv = () => {
    // Build a clean CSV with the fields agencies expect
    const rows = entries.map(e => ({
      Unit: units.find(u => u.id === e.unit_id)?.name || '',
      Agency: agencies.find(a => a.id === e.agency_id)?.name || '',
      Worker: e.worker_name,
      Role: e.role_title || '',
      Date: e.date_worked,
      Hours: e.hours_worked,
      Rate: e.hourly_rate ?? '',
      Notes: e.notes ?? '',
      Status: e.status,
      Invoice: e.invoice_number ?? '',
    }));

    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const agencySlug = (filters.agency || 'AllAgencies').replace(/\s+/g, '_');
    const unitSlug = (filters.unit || 'AllUnits').replace(/\s+/g, '_');
    a.download = `TempHours_${unitSlug}_${agencySlug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalHours = useMemo(() => entries.reduce((s, r) => s + Number(r.hours_worked || 0), 0), [entries]);
  const totalCost = useMemo(() => entries.reduce((s, r) => s + (Number(r.hourly_rate || 0) * Number(r.hours_worked || 0)), 0), [entries]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-blue-900 mb-4">Temp Labor</h1>

      {/* Filters & Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Unit</label>
          <select
            className="border p-2 rounded w-full"
            value={filters.unit}
            onChange={(e) => setFilters(f => ({ ...f, unit: e.target.value }))}
          >
            <option value="">All Units</option>
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>

<div>
  <label className="block font-semibold mb-1">Agency</label>
  <select
    name="agency"
    value={form.agency}
    onChange={handleChange}
    className="border p-2 rounded w-full"
  >
    <option value="">-- Select Agency --</option>
    {agencies.map((a) => (
      <option key={a.code} value={a.code}>
        {a.name}
      </option>
    ))}
  </select>
</div>


        <div className="md:col-span-2 flex gap-2 items-end">
          {['log','import','review'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 rounded border ${tab===t ? 'bg-blue-600 text-white' : 'bg-white'}`}
            >
              {t === 'log' ? 'Log Hours' : t === 'import' ? 'Import CSV' : 'Review & Export'}
            </button>
          ))}
          <button onClick={exportAgencyCsv} className="ml-auto px-3 py-2 rounded border bg-gray-100 hover:bg-gray-200">
            Export CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      {tab === 'log' && (
        <div className="bg-white border rounded p-4">
          <h2 className="font-semibold mb-3">Quick Add</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select className="border p-2 rounded" value={form.unit} onChange={(e)=>setForm({...form, unit: e.target.value})}>
              <option value="">Unit</option>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <select className="border p-2 rounded" value={form.agency} onChange={(e)=>setForm({...form, agency: e.target.value})}>
              <option value="">Agency</option>
              {agencies.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
            </select>
            <input className="border p-2 rounded" placeholder="Worker name" value={form.worker_name} onChange={(e)=>setForm({...form, worker_name: e.target.value})}/>
            <input className="border p-2 rounded" placeholder="Role/title" value={form.role_title} onChange={(e)=>setForm({...form, role_title: e.target.value})}/>
            <input className="border p-2 rounded" type="date" value={form.date_worked} onChange={(e)=>setForm({...form, date_worked: e.target.value})}/>
            <input className="border p-2 rounded" type="number" step="0.01" placeholder="Hours" value={form.hours_worked} onChange={(e)=>setForm({...form, hours_worked: e.target.value})}/>
            <input className="border p-2 rounded" type="number" step="0.01" placeholder="Rate (optional)" value={form.hourly_rate} onChange={(e)=>setForm({...form, hourly_rate: e.target.value})}/>
            <input className="border p-2 rounded col-span-1 md:col-span-2" placeholder="Notes" value={form.notes} onChange={(e)=>setForm({...form, notes: e.target.value})}/>
            <button onClick={onQuickAdd} className="bg-blue-600 text-white rounded px-3 py-2 md:col-span-1">Add</button>
          </div>
        </div>
      )}

      {tab === 'import' && (
        <div className="bg-white border rounded p-4">
          <h2 className="font-semibold mb-3">Import CSV</h2>
          <div className="flex items-center gap-3 mb-3">
            <input type="file" accept=".csv" onChange={(e)=> e.target.files?.[0] && handleCsvFile(e.target.files[0])}/>
          </div>
          {csvPreview.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-sm font-semibold mb-1">Apply to Unit</label>
                  <select className="border p-2 rounded w-full" value={filters.unit}
                          onChange={(e)=> setFilters(f=>({...f, unit: e.target.value}))}>
                    <option value="">Select Unit</option>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Apply to Agency</label>
                  <select className="border p-2 rounded w-full" value={filters.agency}
                          onChange={(e)=> setFilters(f=>({...f, agency: e.target.value}))}>
                    <option value="">Select Agency</option>
                    {agencies.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    disabled={!filters.unit || !filters.agency}
                    onClick={()=>commitImport(filters.unit, filters.agency)}
                    className="bg-blue-600 text-white rounded px-3 py-2 disabled:opacity-50"
                  >
                    Commit Import
                  </button>
                </div>
              </div>

              <div className="overflow-auto border rounded max-h-80">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left">Worker</th>
                      <th className="p-2 text-left">Role</th>
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-right">Hours</th>
                      <th className="p-2 text-right">Rate</th>
                      <th className="p-2 text-left">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreviewRows.map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{r.worker_name}</td>
                        <td className="p-2">{r.role_title}</td>
                        <td className="p-2">{r.date_worked}</td>
                        <td className="p-2 text-right">{r.hours_worked}</td>
                        <td className="p-2 text-right">{r.hourly_rate ?? ''}</td>
                        <td className="p-2">{r.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'review' && (
        <div className="bg-white border rounded p-4">
          <h2 className="font-semibold mb-3">Review & Export</h2>
          <div className="flex gap-4 mb-3 text-sm">
            <div className="px-3 py-2 border rounded">Rows: <b>{entries.length}</b></div>
            <div className="px-3 py-2 border rounded">Total Hours: <b>{totalHours.toFixed(2)}</b></div>
            <div className="px-3 py-2 border rounded">Est. Cost: <b>${totalCost.toFixed(2)}</b></div>
          </div>
          <div className="overflow-auto border rounded max-h-96">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left">Unit</th>
                  <th className="p-2 text-left">Agency</th>
                  <th className="p-2 text-left">Worker</th>
                  <th className="p-2 text-left">Role</th>
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-right">Hours</th>
                  <th className="p-2 text-right">Rate</th>
                  <th className="p-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e.id} className="border-t">
                    <td className="p-2">{units.find(u=>u.id===e.unit_id)?.name || ''}</td>
                    <td className="p-2">{agencies.find(a=>a.id===e.agency_id)?.name || ''}</td>
                    <td className="p-2">{e.worker_name}</td>
                    <td className="p-2">{e.role_title || ''}</td>
                    <td className="p-2">{e.date_worked}</td>
                    <td className="p-2 text-right">{e.hours_worked}</td>
                    <td className="p-2 text-right">{e.hourly_rate ?? ''}</td>
                    <td className="p-2">{e.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-2">Tip: after exporting and emailing an agency, you can update those rows to status <b>Exported</b> or <b>Invoiced</b> later.</p>
        </div>
      )}
    </div>
  );
}

export default TempLaborPage;
