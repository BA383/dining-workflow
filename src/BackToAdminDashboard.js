// components/BackToAdminDashboard.js
import React from 'react';
import { Link } from 'react-router-dom';

function BackToAdminDashboard() {
  return (
    <div className="mb-4">
      <Link
        to="/"
        className="inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded hover:bg-blue-200 font-medium text-sm"
      >
        ← Return to Admin Overview
      </Link>
    </div>
  );
}

export default BackToAdminDashboard;
