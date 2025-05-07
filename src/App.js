import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import RegattasForm from './RegattasForm';

function Home() {
  return <h2 className="text-xl">Welcome to Dining Services Workflow Portal</h2>;
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
            <li><Link to="/regattas" className="hover:underline">Regattas Transmittal</Link></li>
          </ul>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-6 bg-gray-100">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/regattas" element={<RegattasForm />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
