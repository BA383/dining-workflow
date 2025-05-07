import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

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
}

function App() {
  return (
    <Router>
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
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
