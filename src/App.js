// DiningWorkflowApp.jsx - Full layout with sidebar navigation and routes

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import RegattasForm from './RegattasForm';

function Home() {
  return <div className="p-6">Welcome to the Dining Workflow System</div>;
}

function Invoices() {
  return <div className="p-6">Invoice Processing (Coming Soon)</div>;
}

function GroupEntry() {
  return <div className="p-6">Group Entry Form (Coming Soon)</div>;
}

function Tasks() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">My Tasks</h2>
      <div className="mb-4">
        <h3 className="font-medium">🟡 Needs Action</h3>
        <ul className="list-disc list-inside text-sm text-gray-700">
          <li>Submit Regattas deposit for May 5</li>
          <li>Review pending invoice #9348</li>
        </ul>
      </div>
      <div>
        <h3 className="font-medium">✅ Completed</h3>
        <ul className="list-disc list-inside text-sm text-gray-700">
          <li>Group entry logged for May 3</li>
        </ul>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-64 bg-gray-800 text-white p-6">
  <h1 className="text-xl font-bold mb-6">Dining Admin</h1>
  <nav className="flex flex-col gap-3">
    <Link to="/" className="hover:underline">Home</Link>
    <Link to="/deposits" className="hover:underline">Deposits</Link>
    <Link to="/invoices" className="hover:underline">Invoices</Link>
    <Link to="/groups" className="hover:underline">Group Entry</Link>
    <Link to="/tasks" className="hover:underline">My Tasks</Link>
  </nav>
</aside>


        {/* Main Content */}
        <main className="flex-1 bg-gray-100">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/deposits" element={<RegattasForm />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/groups" element={<GroupEntry />} />
            <Route path="/tasks" element={<Tasks />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
