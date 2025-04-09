/**
 * Componente de cadastro de novos usuários.
 *
 * Este componente gerencia o processo de criação de conta, incluindo:
 * - Validação de formulário com campos obrigatórios
 * - Coleta de informações pessoais (nome, sobrenome, apelido)
 * - Validação de email e senha
 * - Integração com o serviço de autenticação
 * - Tratamento de erros específicos do processo de cadastro
 * - Redirecionamento após cadastro bem-sucedido
 *
 * O componente utiliza o contexto de usuário para atualizar o estado da aplicação
 * após o cadastro bem-sucedido.
 *
 * @returns {JSX.Element} Um formulário de cadastro com validação, feedback de erros
 * e estado de carregamento.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../App/ContextProviders/UserContext';
import AuthService from '../../App/Services/AuthService';
import LoadingSpinner from '../../SharedComponents/Loading/LoadingSpinner';
import ErrorBoundary from '../../SharedComponents/ErrorBoundary/ErrorBoundary';
import AuthErrorFallback from './AuthErrorFallback';

interface FormErrors {
  firstName?: string;
  email?: string;
  password?: string;
}

const SignUp = () => {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const { dispatch } = useUser();
  const authService = AuthService.getInstance();

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!firstName.trim()) {
      errors.firstName = 'Nome é obrigatório';
    }

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

      const response = await authService.signUp({
        name: firstName,
        lastName: lastName,
        email,
        password,
      });

      dispatch({
        type: 'LOGIN',
        payload: {
          displayName: firstName,
          email: response.user.email || '',
        },
      });

      navigate('/', {
        state: {
          showWelcome: true,
          displayName: firstName,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('auth/email-already-in-use')) {
          setError('Este email já está em uso');
        } else if (error.message.includes('auth/invalid-email')) {
          setError('Email inválido');
        } else if (error.message.includes('auth/weak-password')) {
          setError('Senha muito fraca');
        } else {
          setError('Erro ao criar conta. Tente novamente.');
        }
      } else {
        setError('Erro desconhecido ao criar conta');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ErrorBoundary fallback={<AuthErrorFallback />}>
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Criar Conta</h2>

        {error && <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="firstName">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              id="firstName"
              type="text"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                formErrors.firstName
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              required
            />
            {formErrors.firstName && (
              <p className="text-red-500 text-xs mt-1">{formErrors.firstName}</p>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="lastName">
              Sobrenome
            </label>
            <input
              id="lastName"
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
            />
          </div>

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
              minLength={6}
            />
            {formErrors.password && (
              <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>
            )}
            <p className="text-gray-500 text-xs mt-1">A senha deve ter pelo menos 6 caracteres</p>
          </div>

          <div className="mb-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                required
              />
              <span className="ml-2 text-sm text-gray-700">
                Eu concordo com a{' '}
                <a href="/privacy-policy" className="text-blue-600 hover:underline">
                  Política de Privacidade
                </a>
              </span>
            </label>
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
                <span>Criando conta</span>
              </div>
            ) : (
              'Cadastrar'
            )}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-600">
          Já tem uma conta?{' '}
          <a href="/login" className="text-blue-600 hover:underline">
            Entrar
          </a>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default SignUp;
