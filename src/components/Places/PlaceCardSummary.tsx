import React from 'react';
import { Place } from 'types/Place';

const PlaceCardSummary = ({ place }: { place: Place }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4 hover:shadow-lg transition-shadow">
      <h3 className="text-xl font-bold text-gray-800 mb-2">{place.name}</h3>
      <div className="flex justify-between mb-3">
        <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded">
          {place.category}
        </span>
        <span className="text-green-700 font-medium">{place.priceRange}</span>
      </div>
      <div className="flex flex-wrap gap-1 mb-3">
        {place.ageGroups.map(age => (
          <span
            key={age}
            className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded-full"
          >
            {age} years
          </span>
        ))}
      </div>
      <div className="flex space-x-2 mb-3">
        {place.amenities.changingTables && (
          <span className="text-gray-700 bg-gray-100 rounded-full p-1.5" title="Changing Tables">
            🚼
          </span>
        )}
        {place.amenities.playAreas && (
          <span className="text-gray-700 bg-gray-100 rounded-full p-1.5" title="Play Areas">
            🎮
          </span>
        )}
        {place.amenities.highChairs && (
          <span className="text-gray-700 bg-gray-100 rounded-full p-1.5" title="High Chairs">
            🪑
          </span>
        )}
        {place.amenities.accessibility && (
          <span className="text-gray-700 bg-gray-100 rounded-full p-1.5" title="Accessibility">
            ♿
          </span>
        )}
        {place.amenities.kidsMenu && (
          <span className="text-gray-700 bg-gray-100 rounded-full p-1.5" title="Kids Menu">
            🍽️
          </span>
        )}
      </div>
      <div className="text-sm text-gray-600 border-t pt-2">
        {place.verifications > 0 ? (
          <span className="flex items-center">
            <svg
              className="w-4 h-4 text-green-500 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              ></path>
            </svg>
            Verified by {place.verifications} community member
            {place.verifications !== 1 ? 's' : ''}
          </span>
        ) : (
          <span className="text-gray-500">Not yet verified by community</span>
        )}
      </div>
    </div>
  );
};

export default PlaceCardSummary;
