import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BackToAdminDashboard from './BackToAdminDashboard';

function GroupEntryForm() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    todayDate: '',
    eventDate: '',
    eventTime: '',
    department: '',
    accountNumber: '',
    requesterName: '',
    requesterEmail: '',
    requesterPhone: '',
    guestCount: '',
    venue: '',
    mealType: '',
    unitPrice: '',
    totalCost: '',
    memo: ''
  });

  useEffect(() => {
    const price = form.mealType === 'Breakfast' ? 11.79 : form.mealType ? 13.68 : '';
    const guests = parseInt(form.guestCount);
    const total = price && guests ? (price * guests).toFixed(2) : '';
    setForm(prev => ({ ...prev, unitPrice: price, totalCost: total }));
  }, [form.mealType, form.guestCount]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    // Navigate to Invoice Preview
    navigate('/invoice-preview', {
      state: {
        ...form,
        todayDate: new Date().toLocaleDateString()
      }
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <BackToAdminDashboard />
      <h1 className="text-2xl font-bold text-blue-900 mb-6">CNU Internal Group Entry Form</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input type="date" name="todayDate" value={form.todayDate} onChange={handleChange} placeholder="Today's Date" className="border p-2 rounded" />
        <input type="date" name="eventDate" value={form.eventDate} onChange={handleChange} placeholder="Event Date" className="border p-2 rounded" />
        <input type="time" name="eventTime" value={form.eventTime} onChange={handleChange} placeholder="Event Time" className="border p-2 rounded" />
        <input type="text" name="department" value={form.department} onChange={handleChange} placeholder="Department Name" className="border p-2 rounded" />
        <input type="text" name="accountNumber" value={form.accountNumber} onChange={handleChange} placeholder="Account Number" className="border p-2 rounded" />
        <input type="text" name="requesterName" value={form.requesterName} onChange={handleChange} placeholder="Requester Name" className="border p-2 rounded" />
        <input type="email" name="requesterEmail" value={form.requesterEmail} onChange={handleChange} placeholder="Requester Email" className="border p-2 rounded" />
        <input type="text" name="requesterPhone" value={form.requesterPhone} onChange={handleChange} placeholder="Phone Ext." className="border p-2 rounded" />
        <input type="number" name="guestCount" value={form.guestCount} onChange={handleChange} placeholder="# of Guests (Guaranteed)" className="border p-2 rounded" />

        <select name="venue" value={form.venue} onChange={handleChange} className="border p-2 rounded">
          <option value="">Select Venue</option>
          <option>Commons</option>
          <option>Regattas</option>
          <option>Discovery Café</option>
          <option>Einstein's</option>
          <option>F.I.T</option>
          <option>Palette</option>
        </select>

        <select name="mealType" value={form.mealType} onChange={handleChange} className="border p-2 rounded">
          <option value="">Select Meal Type</option>
          <option>Breakfast</option>
          <option>Brunch</option>
          <option>Lunch</option>
          <option>Dinner</option>
        </select>

        <input type="text" name="unitPrice" value={form.unitPrice} readOnly placeholder="Unit Price ($)" className="border bg-gray-100 p-2 rounded" />
        <input type="text" name="totalCost" value={form.totalCost} readOnly placeholder="Total Cost ($)" className="border bg-gray-100 p-2 rounded" />

        <textarea name="memo" value={form.memo} onChange={handleChange} placeholder="Memo / Attendees Info" rows={4} className="border p-2 rounded md:col-span-2"></textarea>
      </div>

      <div className="mt-6">
        <button onClick={handleSubmit} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Submit Group Entry
        </button>
      </div>
    </div>
  );
}

export default GroupEntryForm;
