import React from 'react';
import { useLocation } from 'react-router-dom';

function InvoicePreview() {
  const { state } = useLocation();

  if (!state) {
    return <div className="p-6 text-center text-red-500">⚠️ No data available to preview.</div>;
  }


  return (
    <div className="p-8 max-w-5xl mx-auto bg-white shadow-xl rounded-xl border border-gray-200">
      {/* Header */}
      <div className="mb-6 text-center border-b pb-4">
        <h1 className="text-3xl font-extrabold text-blue-900 tracking-wide">CNU Dining Invoice</h1>
        <p className="text-sm text-gray-500 mt-1">Internal Group Entry Billing Summary</p>
      </div>

      {/* Invoice Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-800 mb-8">
        <p><strong>Date Submitted:</strong> {state.todayDate}</p>
        <p><strong>Event Date:</strong> {state.eventDate}</p>
        <p><strong>Event Time:</strong> {state.eventTime}</p>
        <p><strong>Department:</strong> {state.department}</p>
        <p><strong>Account Number:</strong> {state.accountNumber}</p>
        <p><strong>Requester Name:</strong> {state.requesterName}</p>
        <p><strong>Email:</strong> {state.requesterEmail}</p>
        <p><strong>Phone:</strong> {state.requesterPhone}</p>
        <p><strong>Venue:</strong> {state.venue}</p>
        <p><strong>Meal Type:</strong> {state.mealType}</p>
        <p><strong>Guests:</strong> {state.guestCount}</p>
      </div>

      {/* Pricing Breakdown */}
      <div className="bg-gray-50 rounded-lg p-6 border mb-8">
        <h2 className="text-xl font-semibold text-blue-800 mb-4">Cost Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <p><strong>Unit Price:</strong> ${parseFloat(state.unitPrice).toFixed(2)}</p>
          <p><strong>Total Cost:</strong> ${parseFloat(state.totalCost).toFixed(2)}</p>
          <p className="md:col-span-2"><strong>Memo:</strong> {state.memo || '—'}</p>
        </div>
      </div>

      {/* Action */}
      <div className="flex justify-end">
        <button
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 shadow"
        >
          Print Invoice
        </button>
      </div>
    </div>
  );
}

export default InvoicePreview;
