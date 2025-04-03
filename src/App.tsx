import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import Map from './components/Map/Map';
import FilterPanel from './components/Filters/FilterPanel';
import PlaceCard from './components/Places/PlaceCard';
import SignUp from './components/Auth/SignUp';
import Login from './components/Auth/Login';
import { Place } from './types/Place';
import { signOut } from 'firebase/auth';
import { auth } from './firebase/config';
import { UserProvider } from './App/ContextProviders/UserContext';
import { useUser } from './App/ContextProviders/UserContext';
import { getDoc, doc, collection, getDocs } from 'firebase/firestore';
import { db } from './firebase/config';
import PrivateRoute from './components/Auth/PrivateRoute';
import { NotificationProvider } from './App/ContextProviders/NotificationContext';
import NotificationToast from './components/Notifications/NotificationToast';
import { useNotification } from './App/ContextProviders/NotificationContext';
import NotificationService from './services/notificationService';
import { FilterProvider, useFilter } from './App/ContextProviders/FilterContext';

function AppContent() {
  const [filteredPlaces, setFilteredPlaces] = useState<Place[]>([]);
  const [allPlaces, setAllPlaces] = useState<Place[]>([]);
  const [showWelcome, setShowWelcome] = useState(false);
  const [user, setUser] = useState(auth.currentUser);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { dispatch, state } = useUser();
  const { addNotification } = useNotification();
  const { filters } = useFilter();

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
        setFilteredPlaces(placesList);
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
      setUser(user);
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

  const handleLogout = async () => {
    try {
      setUser(null);
      setShowWelcome(false);
      dispatch({ type: 'LOGOUT' });
      await signOut(auth);
      navigate('/');
      NotificationService.success('Logout realizado com sucesso');
    } catch (error) {
      NotificationService.error(
        'Erro ao fazer logout',
        error instanceof Error ? { message: error.message } : String(error)
      );
      setUser(auth.currentUser);
    }
  };

  React.useEffect(() => {
    if (location.state?.showWelcome && user) {
      setShowWelcome(true);
      setTimeout(() => setShowWelcome(false), 10000);
    }
  }, [location, user]);

  // Handle filtering
  useEffect(() => {
    // Filter the places based on the selected criteria
    const filtered = allPlaces.filter(place => {
      // Filter by category
      if (filters.category !== 'all' && place.category !== filters.category) {
        return false;
      }

      // Filter by age groups
      if (filters.ageGroups.length > 0) {
        const hasMatchingAgeGroup = place.ageGroups.some(age => filters.ageGroups.includes(age));
        if (!hasMatchingAgeGroup) return false;
      }

      // Filter by price range
      if (filters.priceRange.length > 0 && !filters.priceRange.includes(place.priceRange)) {
        return false;
      }

      // Filter by amenities
      for (const [key, value] of Object.entries(filters.amenities)) {
        if (value && !place.amenities[key as keyof typeof place.amenities]) {
          return false;
        }
      }

      return true;
    });

    setFilteredPlaces(filtered);
  }, [filters, allPlaces]);

  // Função para adicionar um novo lugar
  const handlePlaceAdded = (newPlace: Place) => {
    setAllPlaces(prev => [...prev, newPlace]);
    setFilteredPlaces(prev => [...prev, newPlace]);
  };

  const MainContent = () => (
    <div className="flex flex-col h-screen">
      <header className="bg-blue-600 text-white p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">FAMILYSPOT</h1>
          <div className="space-x-4">
            {user ? (
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
            <button
              onClick={() => setShowWelcome(false)}
              className="text-white hover:text-blue-100"
            >
              ✕
            </button>
          </div>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar with filters and place cards */}
        <div className="w-96 bg-gray-50 p-4 overflow-y-auto flex flex-col">
          <FilterPanel />

          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Places ({filteredPlaces.length})
            </h2>
            {isLoading ? (
              <div className="text-center py-6 text-gray-500">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                Carregando lugares...
              </div>
            ) : filteredPlaces.length > 0 ? (
              <div className="space-y-4">
                {filteredPlaces.map(place => (
                  <PlaceCard key={place.id} place={place} />
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                Nenhum lugar corresponde aos seus filtros
              </div>
            )}
          </div>
        </div>

        {/* Map area */}
        <div className="flex-1 h-full">
          <Map places={filteredPlaces} onPlaceAdded={handlePlaceAdded} />
        </div>
      </div>
    </div>
  );

  return (
    <Routes>
      <Route path="/signup" element={<SignUp />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <MainContent />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <UserProvider>
      <NotificationProvider>
        <FilterProvider>
          <AppContent />
        </FilterProvider>
        <NotificationToast />
      </NotificationProvider>
    </UserProvider>
  );
}

export default App;
