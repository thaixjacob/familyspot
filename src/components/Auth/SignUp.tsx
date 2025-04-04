import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../App/ContextProviders/UserContext';
import AuthService from '../../App/Services/AuthService';
import LoadingSpinner from '../../SharedComponents/Loading/LoadingSpinner';

const SignUp = () => {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { dispatch } = useUser();
  const authService = AuthService.getInstance();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setLoading(true);
      const displayName = nickname.trim() || firstName;

      const response = await authService.signUp({
        name: displayName,
        email,
        password,
      });

      dispatch({
        type: 'LOGIN',
        payload: {
          displayName,
          email: response.user.email || '',
        },
      });

      navigate('/', {
        state: {
          showWelcome: true,
          displayName: displayName,
        },
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Create an Account</h2>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="firstName">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            id="firstName"
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="lastName">
            Last Name
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
          <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="nickname">
            Nickname
          </label>
          <input
            id="nickname"
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            placeholder="How you want to be known in the community"
          />
          <p className="text-gray-500 text-xs mt-1">If not provided, we'll use your first name</p>
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="email">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            type="email"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="password">
            Password <span className="text-red-500">*</span>
          </label>
          <input
            id="password"
            type="password"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <p className="text-gray-500 text-xs mt-1">Password must be at least 6 characters</p>
        </div>

        <div className="mb-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              required
            />
            <span className="ml-2 text-sm text-gray-700">
              I agree to the{' '}
              <a href="/privacy-policy" className="text-blue-600 hover:underline">
                Privacy Policy
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
        Already have an account?{' '}
        <a href="/login" className="text-blue-600 hover:underline">
          Log In
        </a>
      </div>
    </div>
  );
};

export default SignUp;
