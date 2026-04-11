import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../lib/supabase';
import { Product } from '../types';
import { ShoppingCart, ArrowLeft } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Link } from 'react-router-dom';

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    if (id) fetchProduct(id);
  }, [id]);

  const fetchProduct = async (productId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) throw error;
      setProduct(data);
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-10">Cargando...</div>;
  if (!product) return <div className="text-center py-10">Producto no encontrado</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <Helmet>
        <title>{product.name} | MundoVappeo</title>
        <meta name="description" content={product.description} />
        <meta property="og:title" content={`${product.name} | MundoVappeo`} />
        <meta property="og:description" content={product.description} />
        <meta property="og:image" content={product.image_url} />
      </Helmet>

      <Link to="/" className="inline-flex items-center text-yellow-400 hover:text-yellow-300 mb-6">
        <ArrowLeft size={20} className="mr-2" /> Volver al catálogo
      </Link>

      <div className="grid md:grid-cols-2 gap-8">
        <img src={product.image_url} alt={product.name} className="w-full rounded-lg shadow-lg object-cover" />
        
        <div>
          <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
          <p className="text-gray-400 mb-4">{product.category}</p>
          
          <div className="mb-4">
            {product.offer && (
              <span className="bg-yellow-500 text-black text-sm font-bold px-2 py-1 rounded mr-2">OFERTA</span>
            )}
            {product.stock === 0 && (
              <span className="bg-red-600 text-white text-sm font-bold px-2 py-1 rounded">AGOTADO</span>
            )}
          </div>

          <p className="text-4xl font-bold text-yellow-400 mb-6">${product.price.toLocaleString('es-AR')}</p>
          
          <p className="text-gray-300 mb-6">{product.description}</p>
          
          <button
            onClick={() => addToCart(product)}
            disabled={product.stock === 0}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ShoppingCart size={20} className="mr-2" /> Agregar al carrito
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
