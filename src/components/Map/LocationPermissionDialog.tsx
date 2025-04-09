import React from 'react';
import { useUser } from '../../App/ContextProviders/UserContext';
import { db } from '../../firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import { auth } from '../../firebase/config';
import { logError } from '../../utils/logger';

interface LocationPermissionDialogProps {
  onPermissionGranted: () => void;
  onPermissionDenied: () => void;
}

const LocationPermissionDialog: React.FC<LocationPermissionDialogProps> = ({
  onPermissionGranted,
  onPermissionDenied,
}) => {
  const { state: userState } = useUser();

  const handleAllow = async () => {
    try {
      // Solicitar permissão de localização
      const permission = await navigator.permissions.query({ name: 'geolocation' });

      if (permission.state === 'granted') {
        // Se já tiver permissão, apenas notifica o componente pai
        onPermissionGranted();
        return;
      }

      // Se não tiver permissão, solicita
      navigator.geolocation.getCurrentPosition(
        async () => {
          // Se o usuário permitir, salva a preferência no Firestore
          if (userState.isAuthenticated && auth.currentUser) {
            await setDoc(
              doc(db, 'userPreferences', auth.currentUser.uid),
              {
                locationPermission: true,
                updatedAt: new Date(),
              },
              { merge: true }
            );
          }

          // Notifica o componente pai
          onPermissionGranted();
        },
        () => {
          // Se o usuário negar, salva a preferência no Firestore
          if (userState.isAuthenticated && auth.currentUser) {
            setDoc(
              doc(db, 'userPreferences', auth.currentUser.uid),
              {
                locationPermission: false,
                updatedAt: new Date(),
              },
              { merge: true }
            );
          }

          // Notifica o componente pai
          onPermissionDenied();
        }
      );
    } catch (error) {
      logError(error, 'location_permission_request_error');
      onPermissionDenied();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Permissão de Localização</h3>
        <p className="text-gray-600 mb-6">
          Para mostrar lugares próximos a você, precisamos da sua permissão para acessar sua
          localização. Esta informação será usada apenas para encontrar lugares próximos e não será
          compartilhada.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onPermissionDenied}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Agora não
          </button>
          <button
            onClick={handleAllow}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Permitir Localização
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationPermissionDialog;
