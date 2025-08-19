// src/GroupEntryForm.js
import React, {
  useState,
  useMemo,
  useRef,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from 'react';
import { useNavigate } from 'react-router-dom';
import BackToAdminDashboard from './BackToAdminDashboard';

// --- Caret-safe input: preserves cursor position even when parent re-renders ---
const CaretInput = forwardRef(function CaretInput({ onChange, ...props }, ref) {
  const innerRef = useRef(null);
  useImperativeHandle(ref, () => innerRef.current);

  const handleChange = useCallback(
    (e) => {
      const el = innerRef.current;
      const start = el?.selectionStart ?? null;
      const end = el?.selectionEnd ?? null;

      // update parent state
      onChange?.(e);

      // restore caret after value updates
      requestAnimationFrame(() => {
        if (el && document.activeElement === el && start !== null && end !== null) {
          try {
            el.setSelectionRange(start, end);
          } catch {
            // some input types (date/number in some browsers) may not support selection
          }
        }
      });
    },
    [onChange]
  );

  return <input ref={innerRef} onChange={handleChange} {...props} />;
});

// --- Label wrapper using CaretInput ---
const LabelInput = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  readOnly = false,
}) => (
  <div>
    <label htmlFor={name} className="block font-semibold mb-1">
      {label}
    </label>
    <CaretInput
      id={name}
      name={name}
      type={type}
      value={value ?? ''} // keep controlled
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      className={`border p-2 rounded w-full ${readOnly ? 'bg-gray-100' : ''}`}
      autoComplete="off"
    />
  </div>
);

function GroupEntryForm() {
  const navigate = useNavigate();

  // Single, stable form state (no derived values here)
  const [form, setForm] = useState({
    serviceType: '',
    todayDate: '',
    eventDate: '',
    eventTime: '',
    eventStartTime: '',
    eventEndTime: '',
    eventFunction: '',
    eventTitle: '',
    rentalStartDate: '',
    rentalEndDate: '',
    department: '',
    accountNumber: '',
    requesterName: '',
    requesterEmail: '',
    requesterPhone: '',
    guestCount: '',
    venue: '',
    mealType: '',
    eventType: '',
    memo: '',
    externalOrg: '',
    roomCount: '',
    assignedRooms: '',
    desiredSetup: '',
    depositAmount: '',
    depositDueDate: '',
    finalPaymentAmount: '',
    reservationEstimate: '',
    contractDueAmount: '',
    contractDueDate: '',
    billingAddress: '',
    licenseePhone: '',
    federalId: '',
    proposalNumber: '',
    salesRep: '',
    eventPocName: '',
    eventPocEmail: '',
    documentUpload: null, // important for stable shape
  });

  const isCatering = form.serviceType === 'catering';

  // Derived values (don’t write them into state)
  const unitPrice = useMemo(() => {
    if (!form.mealType) return '';
    return form.mealType === 'Breakfast' ? '11.79' : '13.68';
  }, [form.mealType]);

  const totalCost = useMemo(() => {
    const guests = Number.parseInt(form.guestCount, 10);
    if (!unitPrice || !guests || Number.isNaN(guests)) return '';
    return (parseFloat(unitPrice) * guests).toFixed(2);
  }, [unitPrice, form.guestCount]);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'file' ? (files?.[0] ?? null) : value,
    }));
  };

  const handleSubmit = () => {
    navigate('/invoice-preview', {
      state: {
        ...form,
        unitPrice,
        totalCost,
        todayDate: new Date().toLocaleDateString(),
      },
    });
  };

  const handleClear = () => {
    setForm({
      serviceType: '',
      todayDate: '',
      eventDate: '',
      eventTime: '',
      eventStartTime: '',
      eventEndTime: '',
      eventFunction: '',
      eventTitle: '',
      rentalStartDate: '',
      rentalEndDate: '',
      department: '',
      accountNumber: '',
      requesterName: '',
      requesterEmail: '',
      requesterPhone: '',
      guestCount: '',
      venue: '',
      mealType: '',
      eventType: '',
      memo: '',
      externalOrg: '',
      roomCount: '',
      assignedRooms: '',
      desiredSetup: '',
      depositAmount: '',
      depositDueDate: '',
      finalPaymentAmount: '',
      reservationEstimate: '',
      contractDueAmount: '',
      contractDueDate: '',
      billingAddress: '',
      licenseePhone: '',
      federalId: '',
      proposalNumber: '',
      salesRep: '',
      eventPocName: '',
      eventPocEmail: '',
      documentUpload: null,
    });
  };

  const diningVenues = ['Commons', 'Regattas', 'Discovery Café', "Einstein's", 'F.I.T', 'Palette'];
  const cateringVenues = ['Ballroom', 'Outdoor', 'Library', 'Classroom', 'Theater', 'Banquet Hall', 'Other'];

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

        
<div>
  <label
    htmlFor="serviceType"
    className="block font-bold mb-1 text-blue-700 uppercase tracking-wide"
  >
    Select Service Type
  </label>
  <select
    id="serviceType"
    name="serviceType"
    value={form.serviceType}
    onChange={handleChange}
    className="border p-2 rounded w-full focus:ring-2 focus:ring-blue-500"
  >
    <option value="">-- Choose One --</option>
    <option value="dining">Dining Services</option>
    <option value="catering">Catering Event</option>
  </select>
</div>


        <LabelInput
          label="Date of Request"
          name="todayDate"
          type="date"
          value={form.todayDate}
          onChange={handleChange}
        />

        <LabelInput
          label="Anticipated Event Date"
          name="eventDate"
          type="date"
          value={form.eventDate}
          onChange={handleChange}
        />
        <LabelInput
          label="Event Time"
          name="eventTime"
          type="time"
          value={form.eventTime}
          onChange={handleChange}
        />

        {isCatering && (
          <LabelInput
            label="External Organization / Company Name"
            name="externalOrg"
            value={form.externalOrg}
            onChange={handleChange}
            placeholder="Organization Name"
          />
        )}

        {isCatering && (
          <>
            <LabelInput
              label="Proposal Number"
              name="proposalNumber"
              value={form.proposalNumber}
              onChange={handleChange}
              placeholder="Enter Proposal Number"
            />
            <LabelInput
              label="Room(s) # Requested"
              name="roomCount"
              value={form.roomCount}
              onChange={handleChange}
              placeholder="Number of Rooms Requested"
            />
            <LabelInput
              label="Sales Contract Representative"
              name="salesRep"
              value={form.salesRep}
              onChange={handleChange}
              placeholder="Sales Representative Name"
            />
            <LabelInput
              label="Event Point of Contact (CNU)"
              name="eventPocName"
              value={form.eventPocName}
              onChange={handleChange}
              placeholder="Auxiliary Services Contact Name"
            />
            <LabelInput
              label="Point of Contact Email (CNU)"
              name="eventPocEmail"
              type="email"
              value={form.eventPocEmail}
              onChange={handleChange}
              placeholder="Contact Email Address"
            />
          </>
        )}

        <LabelInput
          label="Department / Office"
          name="department"
          value={form.department}
          onChange={handleChange}
          placeholder="Department / Office"
        />

        <LabelInput
          label="CNU Account Number"
          name="accountNumber"
          value={form.accountNumber}
          onChange={handleChange}
          placeholder="CNU Account Number"
        />

        <LabelInput
          label="Requester's Full Name"
          name="requesterName"
          value={form.requesterName}
          onChange={handleChange}
          placeholder="Full Name"
        />

        <LabelInput
          label="Requester's Email Address"
          name="requesterEmail"
          type="email"
          value={form.requesterEmail}
          onChange={handleChange}
          placeholder="Email Address"
        />

        <LabelInput
          label="Requester's Phone / Extension"
          name="requesterPhone"
          value={form.requesterPhone}
          onChange={handleChange}
          placeholder="Phone Extension or Contact Number"
        />

        <LabelInput
          label="Guaranteed Guest Count"
          name="guestCount"
          type="number"
          value={form.guestCount}
          onChange={handleChange}
          placeholder="Guest Count"
        />

        {isCatering && (
          <div className="md:col-span-2 border-t pt-4">
            <label className="block font-semibold mb-1">Required Document Upload</label>
            <p className="text-sm text-gray-600 mb-2">
              Upload any required documents (e.g., W-9, Certificate of Insurance, Tax Exemption Form).
            </p>
            <input
              type="file"
              name="documentUpload"
              accept=".pdf,.doc,.docx,.jpg,.png"
              onChange={handleChange}
              className="border p-2 rounded w-full"
            />
          </div>
        )}

        <div className="md:col-span-2 border-t pt-4">
          <label className="block font-semibold mb-1">Venue Setup</label>
          <select
            name="venue"
            value={form.venue}
            onChange={handleChange}
            className="border p-2 rounded w-full"
          >
            <option value="">-- Select Venue --</option>
            {(isCatering ? cateringVenues : diningVenues).map((venue) => (
              <option key={venue} value={venue}>{venue}</option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2 border-t pt-4">
          <label className="block font-semibold mb-1">{isCatering ? 'Event Type' : 'Meal Type'}</label>
          <select
            name={isCatering ? 'eventType' : 'mealType'}
            value={isCatering ? form.eventType : form.mealType}
            onChange={handleChange}
            className="border p-2 rounded w-full"
          >
            <option value="">{`-- Select ${isCatering ? 'Event Type' : 'Meal Type'} --`}</option>
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

        {isCatering && (
          <div className="md:col-span-2 border-t pt-4">
            <details className="bg-gray-50 p-4 rounded">
              <summary className="font-semibold cursor-pointer">Rental Period (If Different from Event Date)</summary>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-medium">Rental Start Date</label>
                  <input
                    type="date"
                    name="rentalStartDate"
                    value={form.rentalStartDate}
                    onChange={handleChange}
                    className="border p-2 rounded w-full"
                  />
                </div>
                <div>
                  <label className="font-medium">Rental End Date</label>
                  <input
                    type="date"
                    name="rentalEndDate"
                    value={form.rentalEndDate}
                    onChange={handleChange}
                    className="border p-2 rounded w-full"
                  />
                </div>
              </div>
            </details>
          </div>
        )}

        {!isCatering && (
          <>
            <div>
              <label className="block font-semibold mb-1">Unit Price ($)</label>
              <input
                type="text"
                name="unitPrice_display"
                value={unitPrice}
                readOnly
                className="border bg-gray-100 p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Total Cost ($)</label>
              <input
                type="text"
                name="totalCost_display"
                value={totalCost}
                readOnly
                className="border bg-gray-100 p-2 rounded w-full"
              />
            </div>
          </>
        )}

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

        {isCatering && (
          <div className="md:col-span-2 border-t pt-4">
            <details className="bg-gray-50 p-4 rounded">
              <summary className="font-semibold cursor-pointer">Deposit and Payment Information</summary>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" name="depositAmount" value={form.depositAmount} onChange={handleChange} placeholder="Deposit Amount ($)" className="border p-2 rounded" />
                <input type="date" name="depositDueDate" value={form.depositDueDate} onChange={handleChange} placeholder="Deposit Due Date" className="border p-2 rounded" />
                <input type="text" name="finalPaymentAmount" value={form.finalPaymentAmount} onChange={handleChange} placeholder="Final Payment Amount ($)" className="border p-2 rounded" />
                <input type="text" name="reservationEstimate" value={form.reservationEstimate} onChange={handleChange} placeholder="Reservation Estimate" className="border p-2 rounded" />
                <input type="text" name="contractDueAmount" value={form.contractDueAmount} onChange={handleChange} placeholder="Contract Due Amount ($)" className="border p-2 rounded" />
                <input type="date" name="contractDueDate" value={form.contractDueDate} onChange={handleChange} placeholder="Contract Due Date" className="border p-2 rounded" />
              </div>
            </details>
          </div>
        )}

        {isCatering && (
          <div className="md:col-span-2 border-t pt-4">
            <details className="bg-gray-50 p-4 rounded">
              <summary className="font-semibold cursor-pointer">Billing Address & Licensee Contact</summary>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" name="billingAddress" value={form.billingAddress} onChange={handleChange} placeholder="Billing Address" className="border p-2 rounded" />
                <input type="text" name="licenseePhone" value={form.licenseePhone} onChange={handleChange} placeholder="Licensee Phone" className="border p-2 rounded" />
                <input type="text" name="federalId" value={form.federalId} onChange={handleChange} placeholder="Federal ID / Tax ID" className="border p-2 rounded" />
              </div>
            </details>
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-4">
        <button onClick={handleSubmit} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Submit Request
        </button>
        <button onClick={handleClear} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
          Clear All Fields
        </button>
      </div>
    </div>
  );
}

export default GroupEntryForm;
