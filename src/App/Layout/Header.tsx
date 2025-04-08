/**
 * Componente Header
 *
 * Este componente é responsável pelo cabeçalho da aplicação, incluindo:
 * - Logo e título da aplicação
 * - Navegação principal
 * - Estado de autenticação do usuário
 * - Mensagem de boas-vindas
 *
 * Props:
 * @param {boolean} showWelcome - Controla a exibição da mensagem de boas-vindas
 * @param {(show: boolean) => void} setShowWelcome - Função para controlar o estado da mensagem de boas-vindas
 *
 * O componente utiliza:
 * - Contexto de usuário para gerenciar autenticação
 * - Contexto de notificações para feedback ao usuário
 * - Firebase Auth para gerenciamento de sessão
 * - React Router para navegação
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../../App/ContextProviders/UserContext';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { useNavigate } from 'react-router-dom';
import NotificationService from '../Services/notificationService';

interface HeaderProps {
  showWelcome: boolean;
  setShowWelcome: (show: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ showWelcome, setShowWelcome }) => {
  const { state, dispatch } = useUser();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      dispatch({ type: 'LOGOUT' });
      await signOut(auth);
      navigate('/');
      NotificationService.success('Logout realizado com sucesso');
    } catch (error) {
      NotificationService.error(
        'Erro ao fazer logout',
        error instanceof Error ? { message: error.message } : String(error)
      );
    }
  };

  return (
    <header className="bg-blue-600 text-white p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">FAMILYSPOT</h1>
        <div className="space-x-4">
          {state.displayName ? (
            <button
              onClick={handleLogout}
              className="bg-transparent text-white px-4 py-2 rounded-md hover:bg-blue-500 transition-colors border border-white"
            >
              Sair
            </button>
          ) : (
            <>
              <Link
                to="/login"
                className="bg-transparent text-white px-4 py-2 rounded-md hover:bg-blue-500 transition-colors"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="bg-white text-blue-600 px-4 py-2 rounded-md hover:bg-blue-50 transition-colors"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
      {showWelcome && (
        <div className="mt-2 bg-blue-500 p-2 rounded-md text-sm animate-fade-in flex justify-between items-center">
          <span>
            Bem-vindo ao FamilySpot
            {state.displayName ? `, ${state.displayName}` : ''}! 🎉
          </span>
          <button onClick={() => setShowWelcome(false)} className="text-white hover:text-blue-100">
            ✕
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;
