import React from 'react';
import { ShoppingCart, GitCompareArrows } from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { useCompare } from '../context/CompareContext';
import { Link } from 'react-router-dom';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart } = useCart();
  const { addToCompare } = useCompare();

  return (
    <div className="bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 relative group">
      {product.offer && (
        <span className="absolute top-2 left-2 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded z-10">OFERTA</span>
      )}
      {product.stock === 0 && (
        <span className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded z-10">AGOTADO</span>
      )}
      
      <Link to={`/producto/${product.id}`}>
        <img src={product.image_url} alt={product.name} className="w-full h-48 object-cover" />
      </Link>
      
      <div className="p-4">
        <Link to={`/producto/${product.id}`} className="hover:text-yellow-400 transition-colors">
          <h3 className="text-lg font-bold truncate">{product.name}</h3>
        </Link>
        <p className="text-gray-400 text-sm mb-2">{product.category}</p>
        <p className="text-xl font-bold text-yellow-400">${product.price.toLocaleString('es-AR')}</p>
        
        <div className="mt-4 flex justify-between items-center">
          <button
            onClick={() => addToCart(product)}
            disabled={product.stock === 0}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded flex items-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ShoppingCart size={16} className="mr-2" /> Agregar
          </button>
          <button
            onClick={() => addToCompare(product)}
            className="p-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
            title="Comparar"
          >
            <GitCompareArrows size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
