import React, { useState } from 'react';
import { useUser } from '../../App/ContextProviders/UserContext';
import { db } from '../../firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import { auth } from '../../firebase/config';
import { logError } from '../../utils/logger';

interface LocationPermissionDialogMobileProps {
  onPermissionGranted: () => void;
  onPermissionDenied: () => void;
}

const LocationPermissionDialogMobile: React.FC<LocationPermissionDialogMobileProps> = ({
  onPermissionGranted,
  onPermissionDenied,
}) => {
  const { state: userState } = useUser();
  const [error, setError] = useState<string | null>(null);

  const handleAllow = async () => {
    try {
      setError(null);
      const permission = await navigator.permissions.query({ name: 'geolocation' });

      if (permission.state === 'granted') {
        onPermissionGranted();
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async () => {
          try {
            if (userState.isAuthenticated && auth.currentUser) {
              const userPrefRef = doc(db, 'userPreferences', auth.currentUser.uid);
              await setDoc(
                userPrefRef,
                {
                  locationPermission: true,
                  updatedAt: new Date(),
                },
                { merge: true }
              );
            }
            onPermissionGranted();
          } catch (error) {
            logError(error, 'mobile_location_preferences_save_error');
            // Mesmo com erro ao salvar preferências, permitimos o uso da localização
            onPermissionGranted();
          }
        },
        error => {
          logError(error, 'mobile_location_permission_error');
          if (userState.isAuthenticated && auth.currentUser) {
            const userPrefRef = doc(db, 'userPreferences', auth.currentUser.uid);
            setDoc(
              userPrefRef,
              {
                locationPermission: false,
                updatedAt: new Date(),
              },
              { merge: true }
            ).catch(err => logError(err, 'mobile_location_denied_preference_save_error'));
          }
          onPermissionDenied();
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      );
    } catch (error) {
      logError(error, 'mobile_location_permission_request_error');
      setError('Ocorreu um erro ao solicitar permissão. Por favor, tente novamente.');
      onPermissionDenied();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-lg">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4">
            <svg
              className="w-12 h-12 text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>

          <h3 className="text-xl font-bold text-gray-800 mb-2">Permissão de Localização</h3>

          <p className="text-gray-600 mb-6 text-sm">
            Para mostrar lugares próximos a você, precisamos da sua permissão para acessar sua
            localização. Esta informação será usada apenas para encontrar lugares próximos e não
            será compartilhada.
          </p>

          {error && (
            <div className="w-full mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="w-full space-y-2">
            <button
              onClick={handleAllow}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors"
            >
              Permitir Localização
            </button>

            <button
              onClick={onPermissionDenied}
              className="w-full py-3 text-gray-600 hover:text-gray-800 font-medium"
            >
              Agora não
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationPermissionDialogMobile;
