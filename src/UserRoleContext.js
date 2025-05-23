// src/UserRoleContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';

export const UserRoleContext = createContext();

export const UserRoleProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const login = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <UserRoleContext.Provider value={{ user, login, logout }}>
      {children}
    </UserRoleContext.Provider>
  );
};

export const useUser = () => useContext(UserRoleContext);
