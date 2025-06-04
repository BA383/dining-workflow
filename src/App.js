import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import RegattasForm from './RegattasForm';
import Invoices from './Invoices';
import Dashboard from './Dashboard';
import Tasks from './Tasks';
import GroupEntryForm from './GroupEntryForm';
import InvoicePreview from './InvoicePreview';
import SignUp from './SignUp';
import Login from './Login';
import InventoryForm from './pages/InventoryForm';
import InventoryTable from './pages/InventoryTable';
import InventoryDashboard from './pages/InventoryDashboard';
import InventoryCheckInOut from './pages/InventoryCheckInOut';
import { UserRoleProvider } from './UserRoleContext';
import InventoryActivity from './pages/InventoryActivity';
import InventoryAdminTable from './pages/InventoryAdminTable';
import QuickAccessToolbar from './Components/QuickAccessToolbar';
import InventoryReport from './pages/InventoryReport';
import GeneralReport from './pages/GeneralReport';
import WorkflowManualViewer from './pages/WorkflowManualViewer';


const user = JSON.parse(localStorage.getItem('user') || '{}');

function App() {
  return (
    <UserRoleProvider>
      <Router>
        <div className="flex flex-col min-h-screen">
          {/* ✅ Sticky Auth Header - stays visible during scroll */}
        <header className="sticky top-0 z-50 bg-white shadow px-6 py-3 flex items-center justify-between">
  {/* Left: Logo and Title */}
  <div className="flex items-center gap-3">
    <img src="/cnulogo.png" alt="CNU Logo" className="h-8 w-auto" />
    <h2 className="text-xl font-bold text-blue-900">CNU DINING</h2>
  </div>

  {/* Center: Quick Links */}
  <QuickAccessToolbar />

  {/* Right: Auth Controls */}
  {!user?.email ? (
    <div className="space-x-2">
      <Link to="/signup" className="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-600">Sign Up</Link>
      <Link to="/login" className="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-600">Login</Link>
    </div>
  ) : (
    <div className="flex items-center space-x-4">
      <span className="text-sm text-gray-600">{user.email}</span>
      <button
        onClick={() => {
          localStorage.removeItem('user');
          window.location.href = '/login';
        }}
        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
      >
        Logout
      </button>
    </div>
  )}
</header>


          {/* Main layout: sidebar and content */}
          <div className="flex flex-1">
            {/* Sidebar */}
            <aside className="w-64 bg-blue-900 text-white p-4 flex flex-col min-h-screen">
              {/* 
<div className="bg-blue-800 p-4 flex items-center justify-center gap-3">
  <img src="/cnulogo.png" alt="CNU Logo" className="h-8 w-auto" />
  <h2 className="text-xl font-bold text-white">CNU DINING</h2>
</div> 
*/}


              <nav className="mt-4">
                <ul className="space-y-2">
                  <li><Link to="/" className="block bg-blue-800 text-white px-3 py-2 rounded hover:bg-blue-700">Admin</Link></li>
                  <li><Link to="/deposit" className="block bg-blue-800 text-white px-3 py-2 rounded hover:bg-blue-700">Deposits</Link></li>
                  <li><Link to="/invoices" className="block bg-blue-800 text-white px-3 py-2 rounded hover:bg-blue-700">Invoices</Link></li>
                  <li><Link to="/group-entry" className="block bg-blue-800 text-white px-3 py-2 rounded hover:bg-blue-700">Group Entry</Link></li>
                  <li><Link to="/inventory-dashboard" className="block bg-blue-800 text-white px-3 py-2 rounded hover:bg-blue-700">Inventory</Link></li>
                </ul>
              </nav>

              {/* PDF Manual Link Section */}
<div className="my-6 flex flex-col items-center">
   <Link to="/workflow-manual">
    <img
      src="/DiningWorkflowManual.png"
      alt="Dining Workflow Manual"
      className="h-100 opacity-100 hover:opacity-90 transition"
    />
  </Link>
  <p className="text-xs text-gray-300 mt-2 text-center">
    This is a demo users & T/S guide and will be replaced once the full manual is available.
  </p>
</div>




              <div className="mt-auto">
                <ul className="space-y-2">
                  <li><Link to="/signup" className="block bg-blue-800 text-white px-3 py-2 rounded hover:bg-blue-700">Sign Up</Link></li>
                  <li>
                    <button
                      onClick={() => {
                        localStorage.removeItem('user');
                        window.location.href = '/login';
                      }}
                      className="block bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 w-full text-left"
                    >
                      Log Out
                    </button>
                  </li>
                </ul>
              </div>
            </aside>

            {/* Main content area */}
<main className="flex-1 bg-gray-100 p-8 overflow-auto">
  <Routes>
    <Route path="/" element={<Dashboard />} />
    <Route path="/deposit" element={<RegattasForm />} />
    <Route path="/workflow-manual" element={<WorkflowManualViewer />} /> {/* ✅ Manual viewer */}
    <Route path="/invoices" element={<Invoices />} />
    <Route path="/tasks" element={<Tasks />} />
    <Route path="/group-entry" element={<GroupEntryForm />} />
    <Route path="/invoice-preview" element={<InvoicePreview />} />
    <Route path="/signup" element={<SignUp />} />
    <Route path="/login" element={<Login />} />
    <Route path="/inventory/add" element={<InventoryForm />} />
    <Route path="/inventory-table" element={<InventoryTable />} />
    <Route path="/inventory-dashboard" element={<InventoryDashboard />} />
    <Route path="/inventory-check" element={<InventoryCheckInOut />} />
    <Route path="/inventory-activity" element={<InventoryActivity />} />
    <Route path="/inventory-admin" element={<InventoryAdminTable />} />
    <Route path="/inventory-report" element={<InventoryReport />} />
    <Route path="/general-report" element={<GeneralReport />} />
    {user.role === 'admin' && (
      <Route path="/inventory-admin" element={<InventoryAdminTable />} />
    )}
  </Routes>
</main>

          </div>

          {/* Footer */}
          <footer className="bg-blue-900 text-white text-center py-6">
            One Avenue of the Arts | Newport News, VA 23606 © 2025 Christopher Newport University Dining Services
          </footer>
        </div>
      </Router>
    </UserRoleProvider>
  );
}

export default App;
