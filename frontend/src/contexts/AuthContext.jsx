import React, { createContext, useContext, useEffect, useState } from 'react';

// Create context
const AuthContext = createContext();

// Hook to access context
export const useAuth = () => useContext(AuthContext);

// Provider
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-login from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('battleship-user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Fake login
  const login = async (username, password) => {
    setIsLoading(true);
    await new Promise((res) => setTimeout(res, 1000)); // simulate delay
    const userData = { username };
    setUser(userData);
    localStorage.setItem('battleship-user', JSON.stringify(userData));
    setIsLoading(false);
  };

  // Fake register
  const register = async (username, password) => {
    setIsLoading(true);
    await new Promise((res) => setTimeout(res, 1200)); // simulate delay
    const userData = { username };
    setUser(userData);
    localStorage.setItem('battleship-user', JSON.stringify(userData));
    setIsLoading(false);
  };

  // Logout
  const logout = () => {
    setUser(null);
    localStorage.removeItem('battleship-user');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
