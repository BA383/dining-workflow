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
import { UserRoleProvider } from './UserRoleContext'; // ✅ wrap app in this

function App() {
  return (
    <UserRoleProvider>
      <Router>
        <div className="flex flex-col min-h-screen">
          {/* Content Area */}
          <div className="flex flex-1">
            {/* Sidebar */}
            <aside className="w-64 bg-blue-900 text-white p-4 flex flex-col justify-between min-h-screen">
              {/* Top Section: Logo + Navigation */}
              <div>
                <div className="bg-blue-800 p-4 text-center">
                  <h2 className="text-xl font-bold">CNU DINING</h2>
                </div>

                <nav className="mt-4">
                  <ul className="space-y-2">
                    <li>
                      <Link to="/" className="block bg-blue-800 text-white px-3 py-2 rounded hover:bg-blue-700">Admin</Link>
                    </li>
                    <li>
                      <Link to="/deposit" className="block bg-blue-800 text-white px-3 py-2 rounded hover:bg-blue-700">Deposits</Link>
                    </li>
                    <li>
                      <Link to="/invoices" className="block bg-blue-800 text-white px-3 py-2 rounded hover:bg-blue-700">Invoices</Link>
                    </li>
                    <li>
                      <Link to="/group-entry" className="block bg-blue-800 text-white px-3 py-2 rounded hover:bg-blue-700">Group Entry</Link>
                    </li>
                    <li>
                      <Link to="/inventory-dashboard" className="block bg-blue-800 text-white px-3 py-2 rounded hover:bg-blue-700">
                        Inventory
                      </Link>
                    </li>
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
                </nav>
              </div>

              {/* Bottom Section: Fixed Image */}
              <div className="pt-4">
                <img
                  src="/knotted_rope.png"
                  alt="Knotted Rope"
                  className="mx-auto max-h-90 object-contain opacity-130"
                />
              </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 bg-gray-100 p-8 overflow-auto">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/deposit" element={<RegattasForm />} />
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
