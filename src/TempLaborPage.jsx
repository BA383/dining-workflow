import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from './supabaseClient';
import Papa from 'papaparse';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';



// Add near the imports
const DEFAULT_UNITS = [
  { name: 'Discovery' },
  { name: 'Regattas' },
  { name: 'Commons' },
  { name: 'Palette' },
  { name: 'Einstein' },
];


const DEFAULT_AGENCIES = [
  { code: 'EE', name: 'Express Employment' },
  { code: 'LF', name: 'Labor Finders' },
  { code: 'IS', name: 'Integrity Staffing' },
];

function TempLaborPage() {
  const [tab, setTab] = useState('log'); // 'log' | 'import' | 'review'

  const [units, setUnits] = useState([]);       // [{id, name, ...}]
  const [agencies, setAgencies] = useState([]); // [{id, name, code, ...}]
  const [entries, setEntries] = useState([]);
  const [refreshTick, setRefreshTick] = useState(0);

  const [editingId, setEditingId] = useState(null);   // id of row being edited
  const [editDraft, setEditDraft] = useState({});     // working copy of that row
  const [rowBusy, setRowBusy] = useState(null);       // id currently saving/deleting


  const [filters, setFilters] = useState({
  unit_id: '',
  agency_id: '',
  weekStart: '',
  start_date: '',  // YYYY-MM-DD
  end_date: '',    // YYYY-MM-DD
});



  // Quick Add form (IDs, not names)
  const [form, setForm] = useState({
    unit_id: '',
    agency_id: '',
    worker_name: '',
    role_title: '',
    date_worked: '',
    hours_worked: '',
    hourly_rate: '',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success'|'error', text: string }

// Put near the top of the component (after useState hooks)
const toMsg = (err) => {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (err.message) return err.message;
  try { return JSON.stringify(err); } catch { return String(err); }
};

const resolveFilterId = (raw, list) => {
  if (!raw) return null;
  if (typeof raw === 'string' && raw.startsWith('name:')) {
    const name = raw.slice(5);
    return list.find(x => x.name === name)?.id || null;
  }
  if (typeof raw === 'string' && raw.startsWith('code:')) {
    const code = raw.slice(5);
    return list.find(x => x.code === code)?.id || null;
  }
  return raw; // assume already a UUID
};




// Set this based on your DB column type:
const DATE_WORKED_IS_TIMESTAMP = true; // set to false if date_worked is a DATE

// Helpers
const endExclusiveIso = (dateStr) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return d.toISOString(); // start of next day UTC
};
const startIso = (dateStr) => new Date(dateStr).toISOString();


const startEdit = (row) => {
  setMessage(null);
  setEditingId(row.id);
  setEditDraft({
    id: row.id,
    worker_name: row.worker_name || '',
    date_worked: row.date_worked || '',
    hours_worked: String(row.hours_worked ?? ''),
    hourly_rate: row.hourly_rate == null ? '' : String(row.hourly_rate),
    status: row.status || 'Logged',
  });
};

const cancelEdit = () => {
  setEditingId(null);
  setEditDraft({});
};

const saveEdit = async () => {
  if (!editingId) return;
  setRowBusy(editingId);
  try {
    const payload = {
      worker_name: editDraft.worker_name.trim(),
      date_worked: editDraft.date_worked,
      hours_worked: Number(editDraft.hours_worked || 0),
      hourly_rate: editDraft.hourly_rate === '' ? null : Number(editDraft.hourly_rate),
      status: editDraft.status,
    };
    const { error } = await supabase
      .from('temp_time_entries')
      .update(payload)
      .eq('id', editingId);

    if (error) {
      setMessage({ type: 'error', text: `Update failed: ${error.message}` });
      return;
    }
    setMessage({ type: 'success', text: 'Row updated.' });
    setEditingId(null);
    setEditDraft({});
    // refresh table (use either your refreshTick or fetchEntries)
    if (typeof setRefreshTick === 'function') setRefreshTick(t => t + 1);
    // or: await fetchEntries();
  } finally {
    setRowBusy(null);
  }
};

const deleteRow = async (id) => {
  if (!window.confirm('Delete this entry? This cannot be undone.')) return;
  setRowBusy(id);
  try {
    const { error } = await supabase
      .from('temp_time_entries')
      .delete()
      .eq('id', id);
    if (error) {
      setMessage({ type: 'error', text: `Delete failed: ${error.message}` });
      return;
    }
    setMessage({ type: 'success', text: 'Row deleted.' });
    if (typeof setRefreshTick === 'function') setRefreshTick(t => t + 1);
    // or: await fetchEntries();
  } finally {
    setRowBusy(null);
  }
};




// Helpers: turn "code:EE" / "name:Express Employment" into real UUIDs
const parseSynthetic = (raw) => {
  if (!raw) return null;
  if (raw.startsWith('code:')) return { type: 'code', value: raw.slice(5) };
  if (raw.startsWith('name:')) return { type: 'name', value: raw.slice(5) };
  return { type: 'id', value: raw }; // assume UUID
};

const ensureAgencyId = async (raw, agencies) => {
  const parsed = parseSynthetic(raw);
  if (!parsed) return null;
  if (parsed.type === 'id') return parsed.value;

  if (parsed.type === 'code') {
    // 1) try in-memory
    const byCode = agencies.find(a => a.code === parsed.value)?.id;
    if (byCode) return byCode;

    // 2) try DB select
    let { data: sel, error: selErr } = await supabase
      .from('temp_agencies')
      .select('id')
      .eq('code', parsed.value)
      .maybeSingle();
    if (sel) return sel.id;

    // 3) insert-or-select on duplicate
    let { data: ins, error: insErr } = await supabase
      .from('temp_agencies')
      .insert({ code: parsed.value, name: parsed.value })
      .select('id')
      .single();

    if (ins) return ins.id;

    if (insErr && insErr.code === '23505') {
      // unique violation -> fetch again
      ({ data: sel, error: selErr } = await supabase
        .from('temp_agencies')
        .select('id')
        .eq('code', parsed.value)
        .single());
      if (sel) return sel.id;
    }
    throw insErr || selErr || new Error('Failed to ensure agency id');
  }

  if (parsed.type === 'name') {
    const byName = agencies.find(a => a.name === parsed.value)?.id;
    if (byName) return byName;

    let { data: sel, error: selErr } = await supabase
      .from('temp_agencies')
      .select('id')
      .eq('name', parsed.value)
      .maybeSingle();
    if (sel) return sel.id;

    let { data: ins, error: insErr } = await supabase
      .from('temp_agencies')
      .insert({ name: parsed.value })
      .select('id')
      .single();

    if (ins) return ins.id;

    if (insErr && insErr.code === '23505') {
      ({ data: sel, error: selErr } = await supabase
        .from('temp_agencies')
        .select('id')
        .eq('name', parsed.value)
        .single());
      if (sel) return sel.id;
    }
    throw insErr || selErr || new Error('Failed to ensure agency id');
  }
};

const dayOfWeek = (dateStr, style = 'short') => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt.toLocaleDateString(undefined, { weekday: style }); // 'Mon' or 'Monday'
};

const clearQuickAdd = () => {
  setMessage(null);
  setForm({
    unit_id: '',
    agency_id: '',
    worker_name: '',
    date_worked: '',
    hours_worked: '',
    hourly_rate: '',
    notes: '',
  });
};


const exportTablePdf = () => {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt" });

  const unitLabel = filters.unit_id ? (units.find(u => u.id === filters.unit_id)?.name || "Selected Unit") : "All Units";
  const agencyLabel = filters.agency_id ? (agencies.find(a => a.id === filters.agency_id)?.name || "Selected Agency") : "All Agencies";
  const rangeLabel = (filters.start_date || filters.end_date)
    ? `${filters.start_date || "…"} → ${filters.end_date || "…"}`
    : "All Dates";

  // Title + meta
  doc.setFontSize(14);
  doc.text("Temp Labor — Review Report", 40, 40);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 58);
  doc.text(`Unit: ${unitLabel}    Agency: ${agencyLabel}    Range: ${rangeLabel}`, 40, 72);
  doc.text(`Rows: ${entries.length}    Total Hours: ${totalHours.toFixed(2)}    Est. Cost: $${totalCost.toFixed(2)}`, 40, 86);

  // Table
  const head = [["Unit","Agency","Worker","Date","Day","Hours","Rate","Status"]];
  const body = entries.map(e => [
    units.find(u => u.id === e.unit_id)?.name || "",
    agencies.find(a => a.id === e.agency_id)?.name || "",
    e.worker_name || "",
    e.date_worked || "",
    dayOfWeek(e.date_worked) || "",
    Number(e.hours_worked || 0).toFixed(2),
    e.hourly_rate == null ? "" : Number(e.hourly_rate).toFixed(2),
    e.status || ""
  ]);

  autoTable(doc, {
    head,
    body,
    startY: 100,
    styles: { fontSize: 9, cellPadding: 4, overflow: 'linebreak' },
    headStyles: { fillColor: [240, 240, 240] },
    columnStyles: {
      5: { halign: "right" }, // Hours
      6: { halign: "right" }  // Rate
    },
    didDrawPage: (data) => {
      // Footer page number
      const pageStr = `Page ${doc.internal.getNumberOfPages()}`;
      doc.setFontSize(9);
      doc.text(pageStr, data.settings.margin.left, doc.internal.pageSize.getHeight() - 10);
    }
  });

  const agencySlug = agencyLabel.replace(/\s+/g, "_");
  const unitSlug = unitLabel.replace(/\s+/g, "_");
  doc.save(`TempLabor_${unitSlug}_${agencySlug}.pdf`);
};



// Keep this helper too (above openPrintReport)
const escapeHtml = (s) => {
  if (s == null) return '';
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
};

// Build the full HTML string for the report based on current state
const buildReportHtml = () => {
  const unitLabel =
    filters.unit_id ? (units.find(u => u.id === filters.unit_id)?.name || 'Selected Unit') : 'All Units';
  const agencyLabel =
    filters.agency_id ? (agencies.find(a => a.id === filters.agency_id)?.name || 'Selected Agency') : 'All Agencies';
  const rangeLabel =
    (filters.start_date || filters.end_date)
      ? `${filters.start_date || '…'} → ${filters.end_date || '…'}`
      : 'All Dates';

  const rowsHtml = (entries || []).map(e => {
    const unitName = units.find(u => u.id === e.unit_id)?.name || '';
    const agencyName = agencies.find(a => a.id === e.agency_id)?.name || '';
    const hours = Number(e.hours_worked || 0).toFixed(2);
    const rate = (e.hourly_rate ?? '') === '' ? '' : Number(e.hourly_rate).toFixed(2);
    return `
      <tr>
        <td>${escapeHtml(unitName)}</td>
        <td>${escapeHtml(agencyName)}</td>
        <td>${escapeHtml(e.worker_name || '')}</td>        
        <td>${escapeHtml(e.date_worked || '')}</td>
        <td>${escapeHtml(dayOfWeek(e.date_worked) || '')}</td>
        <td style="text-align:right;">${hours}</td>
        <td style="text-align:right;">${rate}</td>
        <td>${escapeHtml(e.status || '')}</td>
      </tr>
    `;
  }).join('');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Temp Labor Report</title>
<style>
  *{box-sizing:border-box}
  body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;margin:24px;color:#0f172a}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px}
  .title{font-size:20px;font-weight:700}
  .meta{font-size:12px;color:#475569}
  .pill{display:inline-block;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:9999px;padding:6px 10px;margin-right:8px;font-size:12px}
  .summary{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
  .totals{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 16px}
  .total{border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;font-size:13px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  thead th{text-align:left;background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:8px}
  tbody td{border-top:1px solid #f1f5f9;padding:8px}
  @media print{@page{size:auto;margin:12mm}.noprint{display:none!important}}
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">Temp Labor — Review Report</div>
      <div class="meta">Generated: ${new Date().toLocaleString()}</div>
    </div>
    <button class="noprint" onclick="window.print()" style="padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;cursor:pointer;">Print</button>
  </div>

  <div class="summary">
    <span class="pill"><b>Unit:</b> ${escapeHtml(unitLabel)}</span>
    <span class="pill"><b>Agency:</b> ${escapeHtml(agencyLabel)}</span>
    <span class="pill"><b>Range:</b> ${escapeHtml(rangeLabel)}</span>
  </div>

  <div class="totals">
    <div class="total"><b>Rows:</b> ${entries.length}</div>
    <div class="total"><b>Total Hours:</b> ${Number(totalHours || 0).toFixed(2)}</div>
    <div class="total"><b>Est. Cost:</b> $${Number(totalCost || 0).toFixed(2)}</div>
  </div>

  <table>
    <thead>
  <tr>
    <th>Unit</th>
    <th>Agency</th>
    <th>Worker</th>
    <th>Date</th>
    <th>Day</th>
    <th style="text-align:right;">Hours</th>
    <th style="text-align:right;">Rate</th>
    <th>Status</th>
  </tr>
</thead>
    <tbody>${rowsHtml || '<tr><td colspan="8" style="padding:16px;color:#64748b;">No rows for current filters.</td></tr>'}</tbody>
  </table>
</body>
</html>`;
};


const openPrintReport = () => {
  try {
    const html = buildReportHtml();

    // Create hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      console.error('Print iframe document not available');
      document.body.removeChild(iframe);
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    // Give it a tick to render, then print, then clean up
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('iframe print failed:', e);
      } finally {
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 500);
      }
    }, 100);
  } catch (err) {
    console.error('openPrintReport failed:', err);
  }
};



const ensureUnitId = async (raw, units) => {
  const parsed = parseSynthetic(raw);
  if (!parsed) return null;
  if (parsed.type === 'id') return parsed.value;

  if (parsed.type === 'name') {
    const byName = units.find(u => u.name === parsed.value)?.id;
    if (byName) return byName;

    let { data: sel, error: selErr } = await supabase
      .from('units')
      .select('id')
      .eq('name', parsed.value)
      .maybeSingle();
    if (sel) return sel.id;

    let { data: ins, error: insErr } = await supabase
      .from('units')
      .insert({ name: parsed.value })
      .select('id')
      .single();

    if (ins) return ins.id;

    if (insErr && insErr.code === '23505') {
      ({ data: sel, error: selErr } = await supabase
        .from('units')
        .select('id')
        .eq('name', parsed.value)
        .single());
      if (sel) return sel.id;
    }
    throw insErr || selErr || new Error('Failed to ensure unit id');
  }

  return null;
};


 // Load reference data (units + agencies) with safe fallback + auto-seed
useEffect(() => {
  (async () => {
    // -------- UNITS --------
    const { data: uData, error: uErr } = await supabase
      .from('units')
      .select('id, name')
      .order('name');

    if (uErr) {
      console.warn('units select failed; falling back:', uErr?.message);
      setUnits(DEFAULT_UNITS.map(u => ({ name: u.name })));
    } else if (uData && uData.length > 0) {
      setUnits(uData);
    } else {
      // seed units if empty
      const { error: uSeedErr } = await supabase.from('units').insert(DEFAULT_UNITS);
      if (uSeedErr) {
        console.warn('units seed failed; falling back:', uSeedErr?.message);
        setUnits(DEFAULT_UNITS.map(u => ({ name: u.name })));
      } else {
        const { data: uAfterSeed } = await supabase
          .from('units')
          .select('id, name')
          .order('name');
        setUnits(uAfterSeed || DEFAULT_UNITS.map(u => ({ name: u.name })));
      }
    }

    // -------- AGENCIES --------
    const { data: aData, error: aErr } = await supabase
      .from('temp_agencies')
      .select('id, name, code')
      .order('name');

    if (aErr) {
      console.warn('agencies select failed; falling back:', aErr?.message);
      setAgencies(DEFAULT_AGENCIES.map(a => ({ name: a.name, code: a.code })));
    } else if (aData && aData.length > 0) {
      setAgencies(aData);
    } else {
      // seed agencies if empty
      const { error: aSeedErr } = await supabase.from('temp_agencies').insert(DEFAULT_AGENCIES);
      if (aSeedErr) {
        console.warn('agencies seed failed; falling back:', aSeedErr?.message);
        setAgencies(DEFAULT_AGENCIES.map(a => ({ name: a.name, code: a.code })));
      } else {
        const { data: aAfterSeed } = await supabase
          .from('temp_agencies')
          .select('id, name, code')
          .order('name');
        setAgencies(aAfterSeed || DEFAULT_AGENCIES.map(a => ({ name: a.name, code: a.code })));
      }
    }
  })();
}, []);



  // ✅ Centralized fetch
const fetchEntries = useCallback(async () => {
  let q = supabase
    .from('temp_time_entries')
    .select('*')
    .order('date_worked', { ascending: false })
    .limit(2000);

  const unitId = resolveFilterId(filters.unit_id, units);
  const agencyId = resolveFilterId(filters.agency_id, agencies);

  if (unitId) q = q.eq('unit_id', unitId);
  if (agencyId) q = q.eq('agency_id', agencyId);

  // Date range filters
  if (filters.start_date) {
    q = DATE_WORKED_IS_TIMESTAMP
      ? q.gte('date_worked', startIso(filters.start_date))
      : q.gte('date_worked', filters.start_date);
  }
  if (filters.end_date) {
    q = DATE_WORKED_IS_TIMESTAMP
      ? q.lt('date_worked', endExclusiveIso(filters.end_date)) // end-exclusive for timestamps
      : q.lte('date_worked', filters.end_date);               // inclusive for DATE
  }

  const { data, error } = await q;
  if (!error) setEntries(data || []);
}, [
  filters.unit_id,
  filters.agency_id,
  filters.start_date,
  filters.end_date,
  units,
  agencies,
]);

// 🔁 Replace your old loader with these two effects:
useEffect(() => {
  fetchEntries();
}, [fetchEntries, refreshTick /* remove refreshTick if you didn't add it */]);

useEffect(() => {
  if (tab === 'review') fetchEntries();
}, [tab, fetchEntries]);


  // Quick Add
const onQuickAdd = async () => {
  setMessage(null);

  try {
    const unitId = await ensureUnitId(form.unit_id, units);
    const agencyId = await ensureAgencyId(form.agency_id, agencies);

    if (!unitId || !agencyId || !form.worker_name || !form.date_worked || !form.hours_worked) {
      setMessage({ type: 'error', text: 'Please complete Unit, Agency, Worker, Date, and Hours.' });
      return;
    }

    setSubmitting(true);

    const payload = {
      unit_id: unitId,
      agency_id: agencyId,
      worker_name: form.worker_name,
      role_title: form.role_title || null,
      date_worked: form.date_worked,
      hours_worked: parseFloat(form.hours_worked),
      hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : null,
      notes: form.notes || null,
      status: 'Logged',
    };

    const { error } = await supabase.from('temp_time_entries').insert(payload);
    if (error) {
      setMessage({ type: 'error', text: `Insert failed: ${toMsg(error)}` });
      return;
    }

    // success
    setMessage({ type: 'success', text: 'Entry added.' });
    setForm({
      unit_id: '',
      agency_id: '',
      worker_name: '',
      role_title: '',
      date_worked: '',
      hours_worked: '',
      hourly_rate: '',
      notes: '',
    });




    // refresh list & also refresh agencies/units in case we auto-created one
    setFilters((f) => ({ ...f }));
    const [{ data: u }, { data: a }] = await Promise.all([
      supabase.from('units').select('id, name').order('name'),
      supabase.from('temp_agencies').select('id, name, code').order('name'),
    ]);
    if (u) setUnits(u);
    if (a) setAgencies(a);

} catch (err) {
  console.error('Quick Add failed:', err);
  setMessage({ type: 'error', text: toMsg(err) });

  } finally {
    setSubmitting(false);
  }
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

// --- Add these helpers ABOVE mapCsvRow ---
const getVal = (row, candidates) => {
  const map = {};
  for (const k in row) map[k.trim().toLowerCase()] = row[k];
  for (const c of candidates) {
    const v = map[c.trim().toLowerCase()];
    if (v != null && v !== '') return v;
  }
  return '';
};

// "3:30" -> 3.5, "3.5" -> 3.5
const parseHours = (v) => {
  if (v == null) return 0;
  const s = String(v).trim();
  const hhmm = /^(\d+):(\d{1,2})(?::\d{1,2})?$/.exec(s);
  if (hhmm) {
    const h = Number(hhmm[1] || 0);
    const m = Number(hhmm[2] || 0);
    return h + m / 60;
  }
  const f = parseFloat(s.replace(',', '.'));
  return Number.isFinite(f) ? f : 0;
};

// Normalize many formats -> "YYYY-MM-DD"
const normalizeDate = (v) => {
  if (!v) return '';
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10); // already ISO-like
  const md = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/.exec(s); // MM/DD/YYYY
  if (md) {
    const mm = md[1].padStart(2, '0');
    const dd = md[2].padStart(2, '0');
    const yyyy = md[3];
    return `${yyyy}-${mm}-${dd}`;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
};

// --- Replace ONLY mapCsvRow with this (note: no role_title) ---
const mapCsvRow = (row) => ({
  worker_name:  getVal(row, ['WorkerName', 'Employee', 'Employee Name', 'Name']),
  date_worked:  normalizeDate(getVal(row, ['Date Worked', 'Date', 'WorkDate', 'Work Date', 'Shift Date', 'Start Date'])),
  hours_worked: parseHours(getVal(row, ['Hours', 'TotalHours', 'Duration', 'Time Worked', 'Total Time', 'Regular Hours', 'Total Hours'])),
  hourly_rate: (() => {
    const v = getVal(row, ['Rate', 'Hourly Rate', 'Pay Rate', 'Hourly Pay Rate']);
    if (v === '') return null;
    const f = parseFloat(String(v).replace(',', '.'));
    return Number.isFinite(f) ? f : null;
  })(),
  notes:       getVal(row, ['Notes', 'Note', 'Comments', 'Comment']),
});


  const importPreviewRows = useMemo(() => csvPreview.map(mapCsvRow), [csvPreview]);

  const commitImport = async (unit_id, agency_id) => {
    if (!unit_id || !agency_id) return;

    const payload = importPreviewRows
      .filter((r) => r.worker_name && r.date_worked && r.hours_worked >= 0)
      .map((r) => ({ ...r, unit_id, agency_id, status: 'Logged' }));

    if (payload.length) {
      const { error } = await supabase.from('temp_time_entries').insert(payload);
      if (!error) {
        setCsvPreview([]);
        setTab('review');
        setFilters((f) => ({ ...f, unit_id, agency_id })); // show what was imported
      }
    }
  };

  // Export CSV
  const exportAgencyCsv = () => {
    const rows = entries.map((e) => ({
      Unit: units.find((u) => u.id === e.unit_id)?.name || '',
      Agency: agencies.find((a) => a.id === e.agency_id)?.name || '',
      Worker: e.worker_name,      
      Date: e.date_worked,
      Day: dayOfWeek(e.date_worked, 'long'), // e.g., "Monday"
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

    const agencyLabel = agencies.find((a) => a.id === filters.agency_id)?.name || 'AllAgencies';
    const unitLabel = units.find((u) => u.id === filters.unit_id)?.name || 'AllUnits';
    const agencySlug = agencyLabel.replace(/\s+/g, '_');
    const unitSlug = unitLabel.replace(/\s+/g, '_');

    a.download = `TempHours_${unitSlug}_${agencySlug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalHours = useMemo(
    () => entries.reduce((s, r) => s + Number(r.hours_worked || 0), 0),
    [entries]
  );
  const totalCost = useMemo(
    () => entries.reduce((s, r) => s + Number(r.hourly_rate || 0) * Number(r.hours_worked || 0), 0),
    [entries]
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-blue-900 mb-4">Temp Labor Timesheets</h1>

      {/* Filters & Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Unit</label>
          
          
         
<select
  className="border p-2 rounded w-full"
  value={filters.unit_id || ''}
  onChange={(e) => setFilters(f => ({ ...f, unit_id: e.target.value }))}
>
  <option value="">All Units</option>
  {units.map(u => (
    <option
      key={u.id ?? u.name}
      value={u.id ?? `name:${u.name}`}   // << non-empty fallback
    >
      {u.name}{!u.id ? ' (setup needed)' : ''}
    </option>
  ))}
</select>

        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Agency</label>
          

<select
  className="border p-2 rounded w-full"
  value={filters.agency_id || ''}
  onChange={(e) => setFilters(f => ({ ...f, agency_id: e.target.value }))}
>
  <option value="">All Agencies</option>
  {agencies.map(a => (
    <option
      key={a.id ?? a.code ?? a.name}
      value={a.id ?? (a.code ? `code:${a.code}` : `name:${a.name}`)}  // << fallback
    >
      {a.name}
    </option>
  ))}
</select>
        </div>


        {/* Start/End Date */}
  <div>
    <label className="block text-sm font-semibold mb-1">Start Date</label>
    <input
      type="date"
      className="border p-2 rounded w-full"
      value={filters.start_date || ''}
      onChange={(e) => setFilters(f => ({ ...f, start_date: e.target.value }))}
    />
  </div>

  <div>
    <label className="block text-sm font-semibold mb-1">End Date</label>
    <input
      type="date"
      className="border p-2 rounded w-full"
      value={filters.end_date || ''}
      onChange={(e) => setFilters(f => ({ ...f, end_date: e.target.value }))}
    />
  </div>


  {/* Tabs + Export button */}
        <div className="md:col-span-2 flex gap-2 items-end">
  {['log', 'import', 'review'].map((t) => {
    const isActive = tab === t;
    const isGreenWhenInactive = t === 'log' || t === 'review';
    const base = 'px-3 py-2 rounded border transition';

    const classes = isActive
      ? `${base} bg-blue-600 text-white border-blue-600`
      : isGreenWhenInactive
        ? `${base} bg-green-600 text-white border-green-600 hover:bg-green-700`
        : `${base} bg-white hover:bg-gray-50`;

    return (
      <button key={t} onClick={() => setTab(t)} className={classes}>
        {t === 'log' ? 'Log Hours' : t === 'import' ? 'Import CSV' : 'Review & Export'}
      </button>
    );
  })}
          <button
  onClick={openPrintReport}
  className="px-3 py-2 rounded border bg-gray-100 hover:bg-gray-200"
>
  Print Report
</button>
<button
  onClick={exportAgencyCsv}
  className="ml-auto px-3 py-2 rounded border bg-gray-100 hover:bg-gray-200"
>
  Export CSV
</button>

<button
  onClick={exportTablePdf}
  className="px-3 py-2 rounded border bg-gray-100 hover:bg-gray-200"
>
  Export PDF
</button>

          
        </div>
      </div>

      {/* Tabs */}
      {tab === 'log' && (
        <div className="bg-white border rounded p-4">
          <h2 className="font-semibold mb-1">Quick Add</h2>
          <p className="text-xs text-gray-500 mb-3">Fill out the fields below and click <b>Add</b> to save a row.</p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Unit by ID */}
          

<select
  name="unit_id"
  className="border p-2 rounded"
  value={form.unit_id || ''}
  onChange={(e) => setForm(f => ({ ...f, unit_id: e.target.value }))}
>
  <option value="">Unit</option>
  {units.map(u => (
    <option
      key={u.id ?? u.name}
      value={u.id ?? `name:${u.name}`}   // << non-empty fallback
    >
      {u.name}{!u.id ? ' (setup needed)' : ''}
    </option>
  ))}
</select>


            {/* Agency by ID */}
<select
  name="agency_id"
  className="border p-2 rounded"
  value={form.agency_id || ''}
  onChange={(e) => setForm((f) => ({ ...f, agency_id: e.target.value }))}
>
  <option value="">Agency</option>
  {agencies.map((a) => {
    const value = a.id ?? (a.code ? `code:${a.code}` : `name:${a.name}`);
    return (
      <option key={a.id ?? a.code ?? a.name} value={value}>
        {a.name || a.code}
      </option>
    );
  })}
</select>


            <input
              name="worker_name"
              className="border p-2 rounded"
              placeholder="Worker name"
              value={form.worker_name}
              onChange={(e) => setForm((f) => ({ ...f, worker_name: e.target.value }))}
            />
            <input
              name="role_title"
              className="border p-2 rounded"
              placeholder="Role/title"
              value={form.role_title}
              onChange={(e) => setForm((f) => ({ ...f, role_title: e.target.value }))}
            />
            <input
              name="date_worked"
              className="border p-2 rounded"
              type="date"
              value={form.date_worked}
              onChange={(e) => setForm((f) => ({ ...f, date_worked: e.target.value }))}
            />
            <input
              name="hours_worked"
              className="border p-2 rounded"
              type="number"
              step="0.01"
              placeholder="Hours"
              value={form.hours_worked}
              onChange={(e) => setForm((f) => ({ ...f, hours_worked: e.target.value }))}
            />
            <input
              name="hourly_rate"
              className="border p-2 rounded"
              type="number"
              step="0.01"
              placeholder="Rate (optional)"
              value={form.hourly_rate}
              onChange={(e) => setForm((f) => ({ ...f, hourly_rate: e.target.value }))}
            />
            <input
              name="notes"
              className="border p-2 rounded col-span-1 md:col-span-2"
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />

            <button
              onClick={onQuickAdd}
              disabled={submitting}
              className="bg-blue-600 text-white rounded px-3 py-2 md:col-span-1 disabled:opacity-50"
            >
              {submitting ? 'Adding…' : 'Add'}
            </button>

<button
  type="button"
  onClick={clearQuickAdd}
  className="border rounded px-3 py-2 md:col-span-1 bg-white hover:bg-gray-50"
>
  Clear
</button>


            {message && (
              <div
                className={`md:col-span-3 text-sm ${
                  message.type === 'error' ? 'text-red-600' : 'text-green-700'
                }`}
              >
                {message.text}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'import' && (
        <div className="bg-white border rounded p-4">
          <h2 className="font-semibold mb-3">Import CSV</h2>
          <div className="flex items-center gap-3 mb-3">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => e.target.files?.[0] && handleCsvFile(e.target.files[0])}
            />
          </div>

          {csvPreview.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-sm font-semibold mb-1">Apply to Unit</label>
                  <select
                    className="border p-2 rounded w-full"
                    value={filters.unit_id}
                    onChange={(e) => setFilters((f) => ({ ...f, unit_id: e.target.value }))}
                  >
                    <option value="">Select Unit</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">Apply to Agency</label>
                  <select
                    className="border p-2 rounded w-full"
                    value={filters.agency_id}
                    onChange={(e) => setFilters((f) => ({ ...f, agency_id: e.target.value }))}
                  >
                    <option value="">Select Agency</option>
                    {agencies.map((a) => (
                      <option key={a.id || a.code} value={a.id || ''}>
                        {a.name || a.code}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    disabled={!filters.unit_id || !filters.agency_id}
                    onClick={() => commitImport(filters.unit_id, filters.agency_id)}
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
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-left">Day</th>
                      <th className="p-2 text-right">Hours</th>
                      <th className="p-2 text-right">Rate</th>
                      <th className="p-2 text-left">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreviewRows.map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{r.worker_name}</td>                     
                        <td className="p-2">{r.date_worked}</td>
                        <td className="p-2">{dayOfWeek(r.date_worked)}</td>
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



          {/* Agency Toggle Pills */}
<div className="flex items-center justify-between gap-3 mb-3">
  <div className="overflow-x-auto no-scrollbar">
    <div className="flex gap-2">
      {/* All agencies */}
      <button
        type="button"
        onClick={() => setFilters(f => ({ ...f, agency_id: '' }))}
        className={`px-3 py-1.5 rounded-full border text-sm whitespace-nowrap
          ${!filters.agency_id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-50'}`}
        aria-pressed={!filters.agency_id}
      >
        All Agencies
      </button>

      {/* One pill per agency with a real UUID */}
      {agencies
        .filter(a => a.id) // only show selectable ones
        .map(a => (
          <button
            key={a.id}
            type="button"
            onClick={() => setFilters(f => ({ ...f, agency_id: a.id }))}
            className={`px-3 py-1.5 rounded-full border text-sm whitespace-nowrap
              ${filters.agency_id === a.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-50'}`}
            aria-pressed={filters.agency_id === a.id}
            title={a.name}
          >
            {a.name}
          </button>
        ))}
    </div>
  </div>

  {/* Optional: keep your Export button aligned right */}
  <button
    onClick={exportAgencyCsv}
    className="px-3 py-2 rounded border bg-gray-100 hover:bg-gray-200"
  >
    Export CSV
  </button>
</div>




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
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">Day</th>
                  <th className="p-2 text-right">Hours</th>
                  <th className="p-2 text-right">Rate</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">Actions</th> {/* NEW */}
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                 <tr key={e.id} className="border-t">
  <td className="p-2">{units.find(u => u.id === e.unit_id)?.name || ''}</td>
  <td className="p-2">{agencies.find(a => a.id === e.agency_id)?.name || ''}</td>

  {/* Worker */}
  <td className="p-2">
    {editingId === e.id ? (
      <input
        className="border p-1 rounded w-full"
        value={editDraft.worker_name}
        onChange={(ev) => setEditDraft(d => ({ ...d, worker_name: ev.target.value }))}
      />
    ) : e.worker_name}
  </td>

  {/* Date */}
  <td className="p-2">
    {editingId === e.id ? (
      <input
        type="date"
        className="border p-1 rounded w-full"
        value={editDraft.date_worked}
        onChange={(ev) => setEditDraft(d => ({ ...d, date_worked: ev.target.value }))}
      />
    ) : e.date_worked}
  </td>

  {/* Day (read-only) */}
  <td className="p-2">{dayOfWeek(editingId === e.id ? editDraft.date_worked : e.date_worked)}</td>

  {/* Hours */}
  <td className="p-2 text-right">
    {editingId === e.id ? (
      <input
        type="number"
        step="0.01"
        className="border p-1 rounded w-full text-right"
        value={editDraft.hours_worked}
        onChange={(ev) => setEditDraft(d => ({ ...d, hours_worked: ev.target.value }))}
      />
    ) : e.hours_worked}
  </td>

  {/* Rate */}
  <td className="p-2 text-right">
    {editingId === e.id ? (
      <input
        type="number"
        step="0.01"
        className="border p-1 rounded w-full text-right"
        value={editDraft.hourly_rate}
        onChange={(ev) => setEditDraft(d => ({ ...d, hourly_rate: ev.target.value }))}
      />
    ) : (e.hourly_rate ?? '')}
  </td>

  {/* Status */}
  <td className="p-2">
    {editingId === e.id ? (
      <select
        className="border p-1 rounded"
        value={editDraft.status}
        onChange={(ev) => setEditDraft(d => ({ ...d, status: ev.target.value }))}
      >
        {['Logged','Exported','Invoiced'].map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    ) : e.status}
  </td>

  {/* Actions */}
  <td className="p-2">
    {editingId === e.id ? (
      <div className="flex gap-2">
        <button
          onClick={saveEdit}
          disabled={rowBusy === e.id}
          className="px-2 py-1 rounded bg-blue-600 text-white disabled:opacity-50"
        >
          Save
        </button>
        <button
          onClick={cancelEdit}
          className="px-2 py-1 rounded border bg-white hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    ) : (
      <div className="flex gap-2">
        <button
          onClick={() => startEdit(e)}
          className="px-2 py-1 rounded border bg-white hover:bg-gray-50"
        >
          Edit
        </button>
        <button
          onClick={() => deleteRow(e.id)}
          disabled={rowBusy === e.id}
          className="px-2 py-1 rounded border bg-white hover:bg-gray-50 text-red-700"
        >
          Delete
        </button>
      </div>
    )}
  </td>
</tr>

                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-500 mt-2">
            Tip: after exporting and emailing an agency, you can update those rows to status <b>Exported</b> or <b>Invoiced</b> later.
          </p>
        </div>
      )}
    </div>
  );
}

export default TempLaborPage;
