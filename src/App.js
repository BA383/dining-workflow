import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
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
import WasteAndTransferForm from './pages/WasteAndTransferForm';
import RecipeConversion from './pages/RecipeConversion';
import MenuProduction from './pages/MenuProduction';
import ViewRecipes from './pages/ViewRecipes';
import AdminUserManager from './pages/AdminUserManager';
import ResetPassword from './pages/ResetPassword';
import RunEOMInventory from './pages/RunEOMInventory';
import ProductionInsights from './pages/ProductionInsights';
import InvoiceLog from './pages/InvoiceLog'; // adjust path if needed
import AuthGate from './Components/AuthGate'; // ⬅️ import it at the top





function AppContent() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));

  useEffect(() => {
    const interval = setInterval(() => {
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      setUser(stored);
    }, 500); // check every 0.5 sec

    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser({});
    window.location.href = '/login';
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/cnulogo.png" alt="CNU Logo" className="h-8 w-auto" />
         <h2 className="text-base md:text-xl font-bold text-blue-900">CNU DINING</h2>

        </div>

        <QuickAccessToolbar />

        {!user?.email ? (
  <div className="flex items-center space-x-2">
    <Link
  to="/signup"
  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow whitespace-nowrap text-center"
>
  Sign Up
</Link>

    <Link
      to="/login"
      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow"
    >
      Login
    </Link>
  </div>
        ) : (
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{user.email}</span>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        )}
      </header>

      {/* Main layout */}
      <div className="flex flex-1">
        <aside className="w-64 bg-blue-900 text-white p-4 flex flex-col min-h-screen">
          <nav className="mt-4">
            <ul className="space-y-2">
              <li><Link to="/" className="block bg-blue-800 text-white px-3 py-2 rounded hover:bg-blue-700">Admin</Link></li>
              <li><Link to="/deposit" className="block bg-blue-800 text-white px-3 py-2 rounded hover:bg-blue-700">Deposits</Link></li>
              <li><Link to="/invoices" className="block bg-blue-800 text-white px-3 py-2 rounded hover:bg-blue-700">Invoices</Link></li>
              <li><Link to="/group-entry" className="block bg-blue-800 text-white px-3 py-2 rounded hover:bg-blue-700">Group Entry</Link></li>
              <li><Link to="/inventory-dashboard" className="block bg-blue-800 text-white px-3 py-2 rounded hover:bg-blue-700">Inventory</Link></li>
            </ul>
          </nav>

{user?.role === 'admin' && (
  <>
    <hr className="my-3 border-gray-600" />
    <p className="text-xs text-gray-300 mb-2">Admin Tools</p>
    <li>
      <Link
  to="/admin/users"
  className="block bg-blue-800 text-white px-3 py-2 rounded hover:bg-blue-700"
>
  Manage Users
</Link>

<Link
  to="/invoice-log"
  className="block bg-blue-800 text-white px-3 py-2 rounded hover:bg-blue-700 mt-2"
>
  Purchase Log
</Link>
    </li>
  </>
)}



          {/* Manual Link */}
          <div className="my-6 flex flex-col items-center">
            <Link to="/workflow-manual">
              <img src="/DiningWorkflowManual.png" alt="Manual" className="h-100 opacity-100 hover:opacity-90 transition" />
            </Link>
            <p className="text-xs text-gray-300 mt-2 text-center">
              This is a demo users & T/S guide and will be replaced once the full manual is available.
            </p>
          </div>

          {/* Footer links */}
          <div className="mt-auto">
  <ul className="space-y-2">
    {!user?.email ? (
      <>
        <li>
          <Link to="/signup" className="block bg-blue-800 text-white px-3 py-2 rounded hover:bg-blue-700">
            Sign Up
          </Link>
        </li>
        <li>
          <Link to="/login" className="block bg-green-700 text-white px-3 py-2 rounded hover:bg-green-600">
            Log In
          </Link>
        </li>
      </>
    ) : (
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
    )}
  </ul>
</div>

        </aside>

        {/* Main content area */}
        <main className="flex-1 bg-gray-100 p-8 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/deposit" element={<RegattasForm />} />
            <Route path="/workflow-manual" element={<WorkflowManualViewer />} />
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
            <Route path="/waste-transfer" element={<WasteAndTransferForm />} />
            <Route path="/recipe-conversion" element={<RecipeConversion />} />
            <Route path="/menu-production" element={<MenuProduction />} />
            <Route path="/view-recipes" element={<ViewRecipes />} />
            <Route path="/admin/users" element={<AdminUserManager />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/run-eom-inventory" element={<RunEOMInventory />} />
            <Route path="/production-insights" element={<ProductionInsights />} />
            <Route path="/invoice-log" element={<InvoiceLog />} />
          </Routes>
        </main>
      </div>

      <footer className="bg-blue-900 text-white text-center py-6">
        One Avenue of the Arts | Newport News, VA 23606 © 2025 Christopher Newport University Dining Services
      </footer>
    </div>
  );
}



function App() {
  return (
    <UserRoleProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />

          {/* Protected app */}
          <Route
            path="*"
            element={
              <AuthGate>
                <AppContent />
              </AuthGate>
            }
          />
        </Routes>
      </Router>
    </UserRoleProvider>
  );
}


export default App;
