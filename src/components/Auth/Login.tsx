import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../firebase/config';
import { useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { useUser } from '../../App/ContextProviders/UserContext';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { dispatch } = useUser();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // Buscar dados do usuário no Firestore
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      const userData = userDoc.data();

      dispatch({
        type: 'LOGIN',
        payload: {
          displayName: userData?.displayName || '',
          email: userCredential.user.email || '',
        },
      });

      // Navega para a página que o usuário tentou acessar originalmente
      navigate(from, {
        state: {
          showWelcome: true,
          displayName: userData?.displayName,
        },
        replace: true,
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-medium mb-1" htmlFor="password">
            Senha <span className="text-red-500">*</span>
          </label>
          <input
            id="password"
            type="password"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          className={`w-full py-2 px-4 rounded-md text-white font-medium ${
            loading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
          disabled={loading}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <div className="mt-4 text-center text-sm text-gray-600">
        Não tem uma conta?{' '}
        <a href="/signup" className="text-blue-600 hover:underline">
          Cadastre-se
        </a>
      </div>
    </div>
  );
};

export default Login;
