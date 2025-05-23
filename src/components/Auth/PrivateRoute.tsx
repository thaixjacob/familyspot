/**
 * Componente de rota protegida que controla o acesso a rotas que requerem autenticação.
 *
 * Este componente verifica se o usuário está autenticado antes de permitir o acesso
 * a determinadas rotas da aplicação. Se o usuário não estiver autenticado, ele é
 * redirecionado para a página de login, mantendo a rota original que tentou acessar
 * para redirecionamento posterior após a autenticação.
 *
 * @param {React.ReactNode} children - Os componentes filhos que serão renderizados
 * caso o usuário esteja autenticado.
 * @returns {JSX.Element} Os componentes filhos se autenticado, ou um redirecionamento
 * para a página de login caso contrário.
 */
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import AuthService from '../../App/Services/AuthService';
import ForbiddenPage from '../ErrorPages/ForbiddenPage';

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const location = useLocation();
  const authService = AuthService.getInstance();

  if (!authService.isAuthenticated()) {
    // Se o usuário não estiver autenticado, redireciona para o login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Se o usuário estiver autenticado mas não tiver as permissões necessárias
  // (você pode adicionar mais verificações aqui)
  if (!authService.hasRequiredPermissions()) {
    return <ForbiddenPage />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
