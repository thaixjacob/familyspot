import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import AuthService from '../../App/Services/AuthService';

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const location = useLocation();
  const authService = AuthService.getInstance();

  if (!authService.isAuthenticated()) {
    // Redireciona para o login, mas salva a página que o usuário tentou acessar
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
