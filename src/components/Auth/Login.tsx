/**
 * Componente de Login responsável pela autenticação de usuários.
 *
 * Este componente gerencia o processo de login, incluindo:
 * - Validação de formulário
 * - Autenticação de credenciais
 * - Tratamento de erros
 * - Redirecionamento após login bem-sucedido
 *
 * O componente utiliza o contexto de usuário para gerenciar o estado de autenticação
 * e o serviço de autenticação para interagir com o backend.
 *
 * @returns {JSX.Element} Um formulário de login com validação, feedback de erros
 * e estado de carregamento.
 */
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../../App/ContextProviders/UserContext';
import AuthService from '../../App/Services/AuthService';
import LoadingSpinner from '../../SharedComponents/Loading/LoadingSpinner';
import ErrorBoundary from '../../SharedComponents/ErrorBoundary/ErrorBoundary';
import AuthErrorFallback from './AuthErrorFallback';
import { handleFirestoreOfflineError } from '../Map/ErrorHandling/MapErrorHandler';
import NotificationService from '../../App/Services/notificationService';

interface FormErrors {
  email?: string;
  password?: string;
}

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const { dispatch } = useUser();
  const authService = AuthService.getInstance();

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!email) {
      errors.email = 'Email é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Email inválido';
    }

    if (!password) {
      errors.password = 'Senha é obrigatória';
    } else if (password.length < 6) {
      errors.password = 'Senha deve ter pelo menos 6 caracteres';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await authService.login({ email, password });

      // Aguardar um momento para garantir que a autenticação foi completada
      await new Promise(resolve => setTimeout(resolve, 500));

      dispatch({
        type: 'LOGIN',
        payload: {
          displayName: response.user.displayName || '',
          email: response.user.email || '',
        },
      });

      navigate(from, {
        state: {
          showWelcome: true,
          displayName: response.user.displayName,
        },
        replace: true,
      });
    } catch (error) {
      // Tentar tratar como erro de offline primeiro
      if (error instanceof Error && !handleFirestoreOfflineError(error)) {
        // Se não for erro de offline, continuar com o tratamento normal dos erros de autenticação
        if (error.message.includes('auth/invalid-email')) {
          setError('Email inválido');
        } else if (error.message.includes('auth/wrong-password')) {
          setError('Senha incorreta');
        } else if (error.message.includes('auth/user-not-found')) {
          setError('Usuário não encontrado');
        } else {
          setError('Erro ao fazer login. Tente novamente.');
          NotificationService.error('Erro ao acessar o banco de dados', { message: error.message });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ErrorBoundary fallback={<AuthErrorFallback />}>
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Login</h2>

        {error && <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="email">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                formErrors.email
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="password">
              Senha <span className="text-red-500">*</span>
            </label>
            <input
              id="password"
              type="password"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                formErrors.password
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            {formErrors.password && (
              <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>
            )}
          </div>

          <button
            type="submit"
            className={`w-full py-2 px-4 rounded-md text-white font-medium flex items-center justify-center ${
              loading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <LoadingSpinner size="sm" color="text-white" />
                <span>Entrando</span>
              </div>
            ) : (
              'Entrar'
            )}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-600">
          Não tem uma conta?{' '}
          <a href="/signup" className="text-blue-600 hover:underline">
            Cadastre-se
          </a>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Login;
