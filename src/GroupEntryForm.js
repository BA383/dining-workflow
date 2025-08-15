import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BackToAdminDashboard from './BackToAdminDashboard';

function GroupEntryForm() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    serviceType: '',
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
    memo: '',
    eventType: '',
    externalOrg: ''
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
    navigate('/invoice-preview', {
      state: {
        ...form,
        todayDate: new Date().toLocaleDateString()
      }
    });
  };

  const isCatering = form.serviceType === 'catering';

  const handleClear = () => {
  setForm({
    serviceType: '',
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
    memo: '',
    eventType: '',
    externalOrg: ''
  });
};
const diningVenues = [
  'Commons',
  'Regattas',
  'Discovery Café',
  "Einstein's",
  'F.I.T',
  'Palette'
];

const cateringVenues = [
  'Ballroom',
  'Outdoor',
  'Library',
  'Classroom',
  'Theater',
  'Banquet Hall',
  'Other'
];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <BackToAdminDashboard />
      <h1 className="text-2xl font-bold text-blue-900 mb-2">
  {isCatering ? 'Catering Event Request Form' : 'Dining & Event Services Request Form'}
</h1>
<p className="text-gray-700 mb-6">
  {isCatering
    ? 'Use this form to initiate event catering services.'
    : 'Use this form to request internal dining arrangements.'}
</p>


      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <select name="serviceType" value={form.serviceType} onChange={handleChange} className="border p-2 rounded">
          <option value="">Select Service Type</option>
          <option value="dining">Dining Services</option>
          <option value="catering">Catering Event</option>
        </select>

        <div>
          <label className="font-medium">Date of Request</label>
          <input type="date" name="todayDate" value={form.todayDate} onChange={handleChange} className="border p-2 rounded w-full" />
        </div>
        <div>
          <label className="font-medium">Anticipated Event Date</label>
          <input type="date" name="eventDate" value={form.eventDate} onChange={handleChange} className="border p-2 rounded w-full" />
        </div>
        <div>
          <label className="font-medium">Anticipated Event Start Time</label>
          <input type="time" name="eventTime" value={form.eventTime} onChange={handleChange} className="border p-2 rounded w-full" />
        </div>

        {isCatering && (
          <input type="text" name="externalOrg" value={form.externalOrg} onChange={handleChange} placeholder="Organization / Company Name" className="border p-2 rounded" />
        )}

        <div>
          <label className="font-medium">Department / Office</label>
          <input type="text" name="department" value={form.department} onChange={handleChange} className="border p-2 rounded w-full" />
        </div>
        <div>
          <label className="font-medium">CNU Account Number</label>
          <input type="text" name="accountNumber" value={form.accountNumber} onChange={handleChange} className="border p-2 rounded w-full" />
        </div>

        <div>
          <label className="font-medium">Full Name</label>
          <input type="text" name="requesterName" value={form.requesterName} onChange={handleChange} className="border p-2 rounded w-full" />
        </div>
        <div>
          <label className="font-medium">Email Address</label>
          <input type="email" name="requesterEmail" value={form.requesterEmail} onChange={handleChange} className="border p-2 rounded w-full" />
        </div>
        <div>
          <label className="font-medium">Phone Extension / Contact Number</label>
          <input type="text" name="requesterPhone" value={form.requesterPhone} onChange={handleChange} className="border p-2 rounded w-full" />
        </div>

        <div>
          <label className="font-medium">Guaranteed Guest Count</label>
          <input type="number" name="guestCount" value={form.guestCount} onChange={handleChange} className="border p-2 rounded w-full" />
        </div>

    

  {/* Venue Selection */}
  <div>
    <label className="block font-semibold mb-1">Venue</label>
    <select
      name="venue"
      value={form.venue}
      onChange={handleChange}
      className="border p-2 rounded w-full"
    >
      <option value="">-- Select Venue --</option>
      {(isCatering ? cateringVenues : diningVenues).map((venue) => (
        <option key={venue} value={venue}>
          {venue}
        </option>
      ))}
    </select>
  </div>

  {/* Meal Type or Event Type */}
  <div>
    <label className="block font-semibold mb-1">
      {isCatering ? 'Event Type' : 'Meal Type'}
    </label>
    <select
      name={isCatering ? 'eventType' : 'mealType'}
      value={isCatering ? form.eventType : form.mealType}
      onChange={handleChange}
      className="border p-2 rounded w-full"
    >
      <option value="">-- Select {isCatering ? 'Event Type' : 'Meal Type'} --</option>
      {isCatering ? (
        <>
          <option>Wedding</option>
          <option>Seminar</option>
          <option>Graduation</option>
          <option>Homegoing Service</option>
          <option>Banquet</option>
          <option>Other</option>
        </>
      ) : (
        <>
          <option>Breakfast</option>
          <option>Brunch</option>
          <option>Lunch</option>
          <option>Dinner</option>
        </>
      )}
    </select>
  </div>

  {/* Unit Price */}
  <div>
    <label className="block font-semibold mb-1">Unit Price ($)</label>
    <input
      type="text"
      name="unitPrice"
      value={form.unitPrice}
      readOnly
      className="border bg-gray-100 p-2 rounded w-full"
    />
  </div>

  {/* Total Cost */}
  <div>
    <label className="block font-semibold mb-1">Total Cost ($)</label>
    <input
      type="text"
      name="totalCost"
      value={form.totalCost}
      readOnly
      className="border bg-gray-100 p-2 rounded w-full"
    />
  </div>

  {/* Memo */}
  <div className="md:col-span-2">
    <label className="block font-semibold mb-1">Memo / Attendees Info</label>
    <textarea
      name="memo"
      value={form.memo}
      onChange={handleChange}
      placeholder="Add notes about attendees, setup details, or other instructions"
      rows={4}
      className="border p-2 rounded w-full"
    />
  </div>

</div>


      <div className="mt-6 flex gap-4">
  <button
    onClick={handleSubmit}
    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
  >
    Submit Request
  </button>

  <button
    onClick={handleClear}
    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
  >
    Clear All Fields 
  </button>
</div>

    </div>
  );
}

export default GroupEntryForm;
