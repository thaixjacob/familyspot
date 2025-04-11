/**
 * Componente principal da aplicação FamilySpot.
 *
 * Estrutura da Aplicação:
 * - ErrorBoundary (Nível Externo)
 *   - UserProvider
 *     - NotificationProvider
 *       - FilterProvider
 *         - ErrorBoundary (Nível Interno)
 *           - AppContent (Rotas e Conteúdo Principal)
 *           - NotificationToast
 *
 * Sistema de Tratamento de Erros:
 * 1. ErrorBoundary Externo:
 *    - Protege os providers principais (User, Notification, Filter)
 *    - Captura erros críticos de inicialização da aplicação
 *    - Exibe uma UI de fallback para erros de nível superior
 *
 * 2. ErrorBoundary Interno:
 *    - Protege o conteúdo da aplicação (AppContent)
 *    - Captura erros de runtime durante a execução normal
 *    - Mantém os providers funcionando mesmo em caso de erro
 *    - Inclui o sistema de notificações para garantir feedback ao usuário
 *
 * Funcionalidades Principais:
 * - Autenticação e gerenciamento de usuários
 * - Sistema de notificações para feedback
 * - Filtros para busca de locais
 * - Gerenciamento de estado distribuído através de providers
 * - Tratamento gracioso de erros em diferentes níveis
 *
 * @component
 * @example
 * return (
 *   <App />
 * )
 */

import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Place } from './types/Place';
import { auth } from './firebase/config';
import { UserProvider } from './App/ContextProviders/UserContext';
import { useUser } from './App/ContextProviders/UserContext';
import { getDoc, doc, collection, getDocs } from 'firebase/firestore';
import { db } from './firebase/config';
import PrivateRoute from './components/Auth/PrivateRoute';
import { NotificationProvider } from './App/ContextProviders/NotificationContext';
import { useNotification } from './App/ContextProviders/NotificationContext';
import NotificationService from './App/Services/notificationService';
import { FilterProvider } from './App/ContextProviders/FilterContext';
import SignUp from './components/Auth/SignUp';
import Login from './components/Auth/Login';
import MainLayout from './App/Layout/MainLayout';
import NotificationToast from './SharedComponents/Notifications/NotificationToast';
import LoadingSpinner from './SharedComponents/Loading/LoadingSpinner';
import ErrorBoundary from './SharedComponents/ErrorBoundary/ErrorBoundary';

function AppContent() {
  const [allPlaces, setAllPlaces] = useState<Place[]>([]);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const { dispatch } = useUser();
  const { addNotification } = useNotification();

  // Buscar lugares do Firestore
  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        setIsLoading(true);
        const placesCollection = collection(db, 'places');
        const placesSnapshot = await getDocs(placesCollection);
        const placesList: Place[] = placesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as Place;
        });

        setAllPlaces(placesList);
      } catch (error) {
        NotificationService.error(
          'Erro ao buscar lugares',
          error instanceof Error ? { message: error.message } : String(error)
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaces();
  }, []);

  // Monitorar estado de autenticação
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async user => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        dispatch({
          type: 'LOGIN',
          payload: {
            displayName: userData?.displayName || '',
            email: user.email || '',
          },
        });
      } else {
        dispatch({ type: 'LOGOUT' });
      }
    });

    return () => unsubscribe();
  }, [dispatch]);

  useEffect(() => {
    NotificationService.initialize((type, message, details) => {
      addNotification(type as 'info' | 'success' | 'warning' | 'error', message, details);
    });
  }, [addNotification]);

  React.useEffect(() => {
    if (location.state?.showWelcome) {
      setShowWelcome(true);
      setTimeout(() => setShowWelcome(false), 10000);
    }
  }, [location]);

  const handlePlaceAdded = (newPlace: Place) => {
    setAllPlaces(prev => [...prev, newPlace]);
  };

  const handlePlaceFiltered = () => {
    // Esta função é chamada pelo MainLayout quando os filtros são aplicados
    // Não precisamos fazer nada aqui pois a filtragem é gerenciada pelo MainLayout
  };

  return (
    <Routes>
      <Route path="/signup" element={<SignUp />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            {isLoading ? (
              <div className="flex justify-center items-center min-h-screen">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <MainLayout
                showWelcome={showWelcome}
                setShowWelcome={setShowWelcome}
                isLoading={isLoading}
                onPlaceAdded={handlePlaceAdded}
                onPlaceFiltered={handlePlaceFiltered}
                places={allPlaces}
              />
            )}
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Ops! Algo inesperado aconteceu
            </h2>
            <p className="text-gray-600 mb-6">
              Houve um problema ao carregar o aplicativo. Por favor, tente novamente.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Recarregar aplicativo
            </button>
          </div>
        </div>
      }
    >
      <UserProvider>
        <NotificationProvider>
          <FilterProvider>
            <ErrorBoundary
              fallback={
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                  <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-md">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Ops! Algo deu errado</h2>
                    <p className="text-gray-600 mb-6">
                      Ocorreu um erro na aplicação. Seus dados estão seguros e você pode tentar
                      novamente.
                    </p>
                    <button
                      onClick={() => window.location.reload()}
                      className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Tentar novamente
                    </button>
                  </div>
                </div>
              }
            >
              <AppContent />
              <NotificationToast />
            </ErrorBoundary>
          </FilterProvider>
        </NotificationProvider>
      </UserProvider>
    </ErrorBoundary>
  );
}

export default App;
