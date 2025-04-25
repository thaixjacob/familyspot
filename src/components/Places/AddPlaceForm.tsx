import React, { useState } from 'react';
import { Place } from '../../types';

interface AddPlaceFormProps {
  onSubmit: (place: Omit<Place, 'id'>) => void;
}

const AddPlaceForm: React.FC<AddPlaceFormProps> = ({ onSubmit }) => {
  const [formData, setFormData] = useState<Omit<Place, 'id'>>({
    name: '',
    location: { lat: 0, lng: 0 },
    category: '',
    ageGroups: [],
    priceRange: 'free',
    activityType: 'indoor',
    amenities: {
      changingTables: false,
      playAreas: false,
      highChairs: false,
      accessibility: false,
      kidsMenu: false,
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-4">
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">Nome do Local</label>
        <input
          type="text"
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          required
        />
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">Categoria</label>
        <select
          value={formData.category}
          onChange={e => setFormData({ ...formData, category: e.target.value })}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          required
        >
          <option value="">Selecione uma categoria</option>
          <option value="restaurant">Restaurante</option>
          <option value="park">Parque</option>
          <option value="museum">Museu</option>
          <option value="shopping">Shopping</option>
          <option value="playground">Parquinho</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">Faixa Etária</label>
        <div className="flex flex-wrap gap-2">
          {['0-2', '3-5', '6-9', '10-12', '13+'].map(age => (
            <button
              key={age}
              type="button"
              onClick={() => {
                const newAgeGroups = formData.ageGroups.includes(age)
                  ? formData.ageGroups.filter(a => a !== age)
                  : [...formData.ageGroups, age];
                setFormData({ ...formData, ageGroups: newAgeGroups });
              }}
              className={`px-3 py-1 rounded-full text-sm ${
                formData.ageGroups.includes(age)
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              {age}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">Amenidades</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'changingTables', label: 'Fraldário' },
            { id: 'playAreas', label: 'Área de Brincadeiras' },
            { id: 'highChairs', label: 'Cadeirinhas' },
            { id: 'accessibility', label: 'Acessibilidade' },
            { id: 'kidsMenu', label: 'Cardápio Infantil' },
          ].map(amenity => (
            <label key={amenity.id} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.amenities[amenity.id as keyof typeof formData.amenities]}
                onChange={e => {
                  setFormData({
                    ...formData,
                    amenities: {
                      ...formData.amenities,
                      [amenity.id]: e.target.checked,
                    },
                  });
                }}
                className="form-checkbox h-4 w-4 text-blue-500"
              />
              <span className="text-sm text-gray-700">{amenity.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">Faixa de Preço</label>
        <select
          value={formData.priceRange}
          onChange={e =>
            setFormData({ ...formData, priceRange: e.target.value as Place['priceRange'] })
          }
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          required
        >
          <option value="free">Gratuito</option>
          <option value="cheap">Barato</option>
          <option value="moderate">Moderado</option>
          <option value="expensive">Caro</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">Tipo de Atividade</label>
        <select
          value={formData.activityType}
          onChange={e =>
            setFormData({ ...formData, activityType: e.target.value as Place['activityType'] })
          }
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          required
        >
          <option value="indoor">Indoor</option>
          <option value="outdoor">Outdoor</option>
          <option value="both">Ambos</option>
        </select>
      </div>

      <button
        type="submit"
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
      >
        Adicionar Local
      </button>
    </form>
  );
};

export default AddPlaceForm;
