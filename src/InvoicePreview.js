import React from 'react';
import { useLocation } from 'react-router-dom';

function InvoicePreview() {
  const { state } = useLocation();

  if (!state) {
    return <div className="p-6 text-center text-red-500">⚠️ No data available to preview.</div>;
  }

  // Detect selection
  const serviceType = state.serviceType || '';
  const isCatering = serviceType === 'catering';
  const isDining = serviceType === 'dining' || (!isCatering && !!state.mealType);

  // Helpers
  const fmt = (v) => (v !== undefined && v !== null && String(v).trim() !== '' ? String(v) : '—');
  const asCurrency = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(2) : '—';
  };
  const asDate = (v) => (v ? v : '—');

  return (
    <div className="p-8 max-w-5xl mx-auto bg-white shadow-xl rounded-xl border border-gray-200 print:shadow-none print:border-0">
      {/* Header */}
      <div className="mb-6 text-center border-b pb-4">
        <h1 className="text-3xl font-extrabold text-blue-900 tracking-wide">
          {isCatering ? 'Catering Event Summary' : 'CNU Dining Invoice'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {isCatering ? 'External/On-Campus Catering Billing Summary' : 'Internal Group Entry Billing Summary'}
        </p>
      </div>

      {/* Core Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-800 mb-8">
        <p><strong>Date Submitted:</strong> {fmt(state.todayDate)}</p>
        <p><strong>Event Date:</strong> {asDate(state.eventDate)}</p>
        <p><strong>Event Time:</strong> {fmt(state.eventTime)}</p>
        <p><strong>Venue:</strong> {fmt(state.venue)}</p>

        {/* Shared internal fields (may be blank for external) */}
        <p><strong>Department / Office:</strong> {fmt(state.department)}</p>
        <p><strong>Account Number:</strong> {fmt(state.accountNumber)}</p>
        <p><strong>Requester Name:</strong> {fmt(state.requesterName)}</p>
        <p><strong>Email:</strong> {fmt(state.requesterEmail)}</p>
        <p><strong>Phone:</strong> {fmt(state.requesterPhone)}</p>

        {/* Dining-specific */}
        {isDining && (
          <>
            <p><strong>Meal Type:</strong> {fmt(state.mealType)}</p>
            <p><strong>Guaranteed Guests:</strong> {fmt(state.guestCount)}</p>
          </>
        )}

        {/* Catering-specific */}
        {isCatering && (
          <>
            <p><strong>Event Type:</strong> {fmt(state.eventType)}</p>
            <p><strong>External Organization / Company:</strong> {fmt(state.externalOrg)}</p>
            <p><strong>Room(s) # Requested:</strong> {fmt(state.roomCount)}</p>
            <p><strong>Sales Contract Rep:</strong> {fmt(state.salesRep)}</p>
            <p><strong>Proposal #:</strong> {fmt(state.proposalNumber)}</p>
            <p><strong>Event POC (CNU):</strong> {fmt(state.eventPocName)}</p>
            <p><strong>POC Email (CNU):</strong> {fmt(state.eventPocEmail)}</p>
          </>
        )}
      </div>

      {/* Rental Period (catering) */}
      {isCatering && (state.rentalStartDate || state.rentalEndDate) && (
        <div className="bg-gray-50 rounded-lg p-6 border mb-8">
          <h2 className="text-xl font-semibold text-blue-800 mb-4">Rental Period</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <p><strong>Rental Start Date:</strong> {asDate(state.rentalStartDate)}</p>
            <p><strong>Rental End Date:</strong> {asDate(state.rentalEndDate)}</p>
          </div>
        </div>
      )}

      {/* Cost Summary */}
      <div className="bg-gray-50 rounded-lg p-6 border mb-8">
        <h2 className="text-xl font-semibold text-blue-800 mb-4">Cost Summary</h2>

        {isDining ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <p><strong>Unit Price:</strong> ${asCurrency(state.unitPrice)}</p>
            <p><strong>Total Cost:</strong> ${asCurrency(state.totalCost)}</p>
            <p className="md:col-span-2"><strong>Memo:</strong> {fmt(state.memo)}</p>
          </div>
        ) : (
          // Catering: show deposit/final/billing details instead
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
              <p><strong>Reservation Estimate:</strong> {fmt(state.reservationEstimate)}</p>
              <p><strong>Deposit Amount:</strong> ${asCurrency(state.depositAmount)}</p>
              <p><strong>Deposit Due Date:</strong> {asDate(state.depositDueDate)}</p>
              <p><strong>Final Payment Amount:</strong> ${asCurrency(state.finalPaymentAmount)}</p>
              <p><strong>Contract Due Amount:</strong> ${asCurrency(state.contractDueAmount)}</p>
              <p><strong>Contract Due Date:</strong> {asDate(state.contractDueDate)}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <p className="md:col-span-2"><strong>Memo / Notes:</strong> {fmt(state.memo)}</p>
              <p><strong>Billing Address:</strong> {fmt(state.billingAddress)}</p>
              <p><strong>Licensee Phone:</strong> {fmt(state.licenseePhone)}</p>
              <p><strong>Federal/Tax ID:</strong> {fmt(state.federalId)}</p>
            </div>
          </>
        )}
      </div>

      {/* Attachment (if any) */}
      {state.documentUpload?.name && (
        <div className="bg-white rounded-lg p-4 border mb-8">
          <p className="text-sm"><strong>Attached Document:</strong> {state.documentUpload.name}</p>
        </div>
      )}

      {/* Action */}
      <div className="flex justify-end">
        <button
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 shadow"
        >
          Print {isCatering ? 'Summary' : 'Invoice'}
        </button>
      </div>
    </div>
  );
}

export default InvoicePreview;
