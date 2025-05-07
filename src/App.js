import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
<<<<<<< HEAD
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

function MyTasks() {
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
=======

function Home() {
  return <h2 className="text-xl">Welcome to Dining Services Workflow Portal</h2>;
}

function DepositTransmittal() {
  return <h2 className="text-xl">Start a New Deposit Transmittal</h2>;
}

function InvoiceProcessing() {
  return <h2 className="text-xl">Submit an Invoice for Approval</h2>;
}

function GroupEntryForm() {
  return <h2 className="text-xl">Submit a Group Entry Request</h2>;
>>>>>>> 7d07f39a4a5168d23c0d23f8537c0aff446e3fc3
}

function App() {
  return (
    <Router>
<<<<<<< HEAD
      <div className="flex min-h-screen">
        <aside className="w-64 bg-gray-800 text-white p-6 space-y-4">
          <h1 className="text-xl font-bold">Dining Admin</h1>
          <nav className="flex flex-col gap-3">
            <Link to="/" className="hover:underline">Home</Link>
            <Link to="/deposits" className="hover:underline">Deposits</Link>
            <Link to="/invoices" className="hover:underline">Invoices</Link>
            <Link to="/groups" className="hover:underline">Group Entry</Link>
            <Link to="/tasks" className="hover:underline">My Tasks</Link>
          </nav>
        </aside>
        <main className="flex-1 bg-gray-100">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/deposits" element={<RegattasForm />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/groups" element={<GroupEntry />} />
            <Route path="/tasks" element={<MyTasks />} />
=======
      <div className="flex h-screen">
        {/* Sidebar */}
        <nav className="w-64 bg-gray-800 text-white p-4">
          <h1 className="text-2xl font-bold mb-6">Dining Admin</h1>
          <ul className="space-y-4">
            <li><Link to="/" className="hover:underline">Home</Link></li>
            <li><Link to="/deposit" className="hover:underline">Deposit Transmittal</Link></li>
            <li><Link to="/invoice" className="hover:underline">Invoice Processing</Link></li>
            <li><Link to="/group-entry" className="hover:underline">Group Entry Form</Link></li>
          </ul>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-6 bg-gray-100">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/deposit" element={<DepositTransmittal />} />
            <Route path="/invoice" element={<InvoiceProcessing />} />
            <Route path="/group-entry" element={<GroupEntryForm />} />
>>>>>>> 7d07f39a4a5168d23c0d23f8537c0aff446e3fc3
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
