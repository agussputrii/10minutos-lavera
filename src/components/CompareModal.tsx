import React from 'react';
import { X } from 'lucide-react';
import { useCompare } from '../context/CompareContext';

const CompareModal: React.FC = () => {
  const { compareList, removeFromCompare, clearCompare, isModalOpen, closeModal } = useCompare();

  if (!isModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative">
        <div className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Comparador de Productos</h2>
          <button onClick={closeModal} className="p-2 hover:bg-gray-700 rounded-full">
            <X size={24} />
          </button>
        </div>
        
        {compareList.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No tienes productos para comparar. Agrega productos desde el catálogo.
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {compareList.map(product => (
              <div key={product.id} className="bg-gray-700 p-4 rounded-lg relative">
                <button 
                  onClick={() => removeFromCompare(product.id)}
                  className="absolute top-2 right-2 text-gray-400 hover:text-white"
                >
                  <X size={18} />
                </button>
                <img src={product.image_url} alt={product.name} className="w-full h-40 object-cover mb-4 rounded" />
                <h3 className="font-bold text-lg mb-2">{product.name}</h3>
                <p className="text-yellow-400 font-bold text-xl mb-2">${product.price.toLocaleString('es-AR')}</p>
                <p className="text-sm text-gray-300 mb-2">{product.description}</p>
                <div className="text-sm">
                  <p><span className="font-semibold">Categoría:</span> {product.category}</p>
                  <p><span className="font-semibold">Stock:</span> {product.stock > 0 ? product.stock : 'Agotado'}</p>
                  <p><span className="font-semibold">Oferta:</span> {product.offer ? 'Sí' : 'No'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="p-4 border-t border-gray-700 flex justify-end">
          <button 
            onClick={clearCompare}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            Limpiar comparador
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompareModal;
