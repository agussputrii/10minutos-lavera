import React, { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';

const AgeVerificationModal: React.FC = () => {
  const [isAdult, setIsAdult] = useState<boolean>(() => {
    return localStorage.getItem('mundovappeo_adult') === 'true';
  });

  useEffect(() => {
    if (isAdult) {
      localStorage.setItem('mundovappeo_adult', 'true');
    }
  }, [isAdult]);

  if (isAdult) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl text-center max-w-sm mx-4">
        <ShieldCheck className="mx-auto mb-4 text-yellow-400" size={48} />
        <h2 className="text-2xl font-bold mb-4">Verificación de Edad</h2>
        <p className="mb-6">Debes ser mayor de 18 años para ingresar a este sitio.</p>
        <button
          onClick={() => setIsAdult(true)}
          className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded transition-colors"
        >
          Soy mayor de 18 años
        </button>
      </div>
    </div>
  );
};

export default AgeVerificationModal;
