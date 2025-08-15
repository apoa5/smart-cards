// src/components/PublicRoute.jsx
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useContext(AuthContext);

  if (loading) return null;
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

export default PublicRoute;
