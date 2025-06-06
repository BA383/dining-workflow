// src/components/BackToInventoryDashboard.js
import React from 'react';
import { Link } from 'react-router-dom';

export default function BackToInventoryDashboard() {
  return (
    <Link
      to="/inventory-dashboard"
      className="inline-block mb-4 bg-gray-200 text-blue-700 px-4 py-2 rounded hover:bg-gray-300"
    >
      ← Back to Inventory Dashboard
    </Link>
  );
}
