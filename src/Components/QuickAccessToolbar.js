import React from 'react';
import { Link } from 'react-router-dom';
import { ScanIcon, BanknoteIcon, FileTextIcon, ShieldIcon, BarChartIcon, BookOpenIcon } from 'lucide-react';

function QuickAccessToolbar() {
  return (
    <div className="bg-white shadow-md border-t md:border-none md:shadow-none fixed bottom-0 md:static w-full z-50">
      <div className="max-w-6xl mx-auto flex justify-around md:justify-end gap-6 py-2 px-4">
        <Link to="/inventory-check" className="flex flex-col items-center text-xs text-blue-700 hover:text-blue-900">
          <ScanIcon className="h-5 w-5" />
          Check In/Out
        </Link>
        <Link to="/deposit" className="flex flex-col items-center text-xs text-blue-700 hover:text-blue-900">
          <BanknoteIcon className="h-5 w-5" />
          Deposit
        </Link>
        <Link to="/invoices" className="flex flex-col items-center text-xs text-blue-700 hover:text-blue-900">
          <FileTextIcon className="h-5 w-5" />
          Invoices
        </Link>
        <Link to="/inventory-admin" className="flex flex-col items-center text-xs text-blue-700 hover:text-blue-900">
          <ShieldIcon className="h-5 w-5" />
          Admin Inventory 
        </Link>
        <Link to="/general-report" className="flex flex-col items-center text-xs text-blue-700 hover:text-blue-900">
          <BarChartIcon className="h-5 w-5" />
          Director's Reports
        </Link>
        <Link to="/workflow-manual" className="flex flex-col items-center text-xs text-blue-700 hover:text-blue-900">
          <BookOpenIcon className="h-5 w-5" />
          Manual
        </Link>
      </div>
    </div>
  );
}

export default QuickAccessToolbar;
