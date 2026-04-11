import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Product } from '../types';

const Admin: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editStock, setEditStock] = useState<number>(0);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('products').select('*').order('id', { ascending: true });
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (product: Product) => {
    setEditingId(product.id);
    setEditPrice(product.price);
    setEditStock(product.stock);
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const saveProduct = async (id: number) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ price: editPrice, stock: editStock })
        .eq('id', id);

      if (error) throw error;
      
      setProducts(prev =>
        prev.map(p => (p.id === id ? { ...p, price: editPrice, stock: editStock } : p))
      );
      setEditingId(null);
    } catch (error) {
      console.error('Error updating product:', error);
    }
  };

  if (loading) return <div className="text-center py-10">Cargando panel de administración...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Panel de Administración</h1>
      
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-700 border-b border-gray-600">
              <th className="p-4">ID</th>
              <th className="p-4">Producto</th>
              <th className="p-4">Categoría</th>
              <th className="p-4">Precio</th>
              <th className="p-4">Stock</th>
              <th className="p-4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => (
              <tr key={product.id} className="border-b border-gray-700 hover:bg-gray-750">
                <td className="p-4">{product.id}</td>
                <td className="p-4">
                  <div className="flex items-center">
                    <img src={product.image_url} alt={product.name} className="w-10 h-10 rounded object-cover mr-3" />
                    {product.name}
                  </div>
                </td>
                <td className="p-4">{product.category}</td>
                <td className="p-4">
                  {editingId === product.id ? (
                    <input 
                      type="number" 
                      value={editPrice} 
                      onChange={(e) => setEditPrice(Number(e.target.value))}
                      className="bg-gray-600 rounded px-2 py-1 w-24"
                    />
                  ) : (
                    `$${product.price.toLocaleString('es-AR')}`
                  )}
                </td>
                <td className="p-4">
                  {editingId === product.id ? (
                    <input 
                      type="number" 
                      value={editStock} 
                      onChange={(e) => setEditStock(Number(e.target.value))}
                      className="bg-gray-600 rounded px-2 py-1 w-20"
                    />
                  ) : (
                    product.stock
                  )}
                </td>
                <td className="p-4">
                  {editingId === product.id ? (
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => saveProduct(product.id)}
                        className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm"
                      >
                        Guardar
                      </button>
                      <button 
                        onClick={cancelEditing}
                        className="bg-gray-600 hover:bg-gray-500 px-3 py-1 rounded text-sm"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => startEditing(product)}
                      className="bg-yellow-500 hover:bg-yellow-600 text-black px-3 py-1 rounded text-sm font-semibold"
                    >
                      Editar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Admin;
