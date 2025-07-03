// src/components/ProtectedRoute.js
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getCurrentUser } from '../utils/userSession'; // adjust path if needed

function ProtectedRoute({ children, requiredRole }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkUser() {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setChecking(false);
    }
    checkUser();
  }, []);

  if (checking) return <p>Loading...</p>;

  if (!user) return <Navigate to="/login" replace />;

  if (requiredRole && user.role !== requiredRole) {
    return <p className="text-red-600 p-4">🚫 Access Denied: {requiredRole}s only.</p>;
  }

  return children;
}

export default ProtectedRoute;
