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
import { FilterProvider, useFilter } from './App/ContextProviders/FilterContext';
import SignUp from './components/Auth/SignUp';
import Login from './components/Auth/Login';
import MainLayout from './App/Layout/MainLayout';
import NotificationToast from './SharedComponents/Notifications/NotificationToast';
import LoadingSpinner from './SharedComponents/Loading/LoadingSpinner';

function AppContent() {
  const [filteredPlaces, setFilteredPlaces] = useState<Place[]>([]);
  const [allPlaces, setAllPlaces] = useState<Place[]>([]);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const { dispatch } = useUser();
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

  // Handle filtering
  useEffect(() => {
    const filtered = allPlaces.filter(place => {
      if (filters.category !== 'all' && place.category !== filters.category) {
        return false;
      }

      if (filters.ageGroups.length > 0) {
        const hasMatchingAgeGroup = place.ageGroups.some(age => filters.ageGroups.includes(age));
        if (!hasMatchingAgeGroup) return false;
      }

      if (filters.priceRange.length > 0 && !filters.priceRange.includes(place.priceRange)) {
        return false;
      }

      for (const [key, value] of Object.entries(filters.amenities)) {
        if (value && !place.amenities[key as keyof typeof place.amenities]) {
          return false;
        }
      }

      return true;
    });

    setFilteredPlaces(filtered);
  }, [filters, allPlaces]);

  const handlePlaceAdded = (newPlace: Place) => {
    setAllPlaces(prev => [...prev, newPlace]);
    setFilteredPlaces(prev => [...prev, newPlace]);
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
                filteredPlaces={filteredPlaces}
                isLoading={isLoading}
                onPlaceAdded={handlePlaceAdded}
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
