import React from 'react';
import BackToAdminDashboard from '../BackToAdminDashboard';
import { isAdmin, isDining } from '../utils/permissions'; // adjust path as needed

function WorkflowManualViewer() {
if (!isAdmin() && !isDining()) {
    return (
      <div className="p-6">
        <p className="text-red-600 font-semibold">🚫 Workflow Manual view is for Dining staff only.</p>
      </div>
    );
  }



  return (
    <div className="p-6">
      <BackToAdminDashboard />
      <h1 className="text-2xl font-bold mb-4">Dining Workflow Manual (Demo)</h1>
      <p className="mb-4 text-gray-700">This demo file will be replaced once the actual manual is available.</p>
      <iframe
        src="/Dining_Workflow_Manual_Demo.pdf"
        title="Dining Workflow Manual"
        className="w-full h-screen border rounded"
      />
    </div>
  );
}

export default WorkflowManualViewer;
