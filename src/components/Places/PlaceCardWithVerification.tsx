import React from 'react';
import { Place } from '../../types/Place';
import { useVerification } from '../../hooks/useVerification';
import { useAuth } from '../../hooks/useAuth';
import NotificationService from '../../App/Services/notificationService';
import LoadingSpinner from '../../SharedComponents/Loading/LoadingSpinner';

interface PlaceCardWithVerificationProps {
  place: Place;
  onVerify?: () => void;
}

const PlaceCardWithVerification: React.FC<PlaceCardWithVerificationProps> = ({
  place,
  onVerify,
}) => {
  const { user } = useAuth();
  const { loading, addVerification } = useVerification();

  const handleVerify = async () => {
    if (!user) return;

    try {
      await addVerification({
        placeId: place.id,
        userId: user.id,
        status: 'pending',
        date: new Date(),
      });

      if (onVerify) {
        onVerify();
      }
    } catch (error) {
      NotificationService.error(
        'Erro ao verificar lugar',
        error instanceof Error ? { message: error.message } : String(error)
      );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold">{place.name}</h3>
          <p className="text-sm text-gray-600">{place.address}</p>
        </div>
        {place.verifiedBy.length > 0 && (
          <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
            Verificado
          </span>
        )}
      </div>

      <div className="mt-2">
        <div className="flex flex-wrap gap-2">
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
            {place.category}
          </span>
        </div>

        <div className="mt-2">
          <p className="text-sm text-gray-700">
            <span className="font-medium">Faixas etárias:</span> {place.ageGroups.join(', ')}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-medium">Preço:</span> {place.priceRange}
          </p>
        </div>

        <div className="mt-2">
          <p className="text-sm text-gray-700">
            <span className="font-medium">Comodidades:</span>
          </p>
          <div className="flex flex-wrap gap-2 mt-1">
            {Object.entries(place.amenities).map(
              ([key, value]) =>
                value && (
                  <span
                    key={key}
                    className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded"
                  >
                    {key}
                  </span>
                )
            )}
          </div>
        </div>
      </div>

      {user && place.verifiedBy.length === 0 && (
        <button
          onClick={handleVerify}
          disabled={loading}
          className="mt-4 w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
        >
          {loading ? (
            <div className="flex items-center space-x-2">
              <LoadingSpinner size="sm" color="text-white" />
              <span>Verificando</span>
            </div>
          ) : (
            'Verificar Local'
          )}
        </button>
      )}
    </div>
  );
};

export default PlaceCardWithVerification;
