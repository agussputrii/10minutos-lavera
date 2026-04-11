import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useBranch } from '../context/BranchContext';
import { Trash2, Plus, Minus } from 'lucide-react';
import { Link } from 'react-router-dom';

const Checkout: React.FC = () => {
  const { cart, updateQuantity, removeFromCart, total, clearCart } = useCart();
  const { selectedBranch, branches, setSelectedBranch } = useBranch();
  const [name, setName] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'retiro' | 'delivery'>('retiro');
  const [address, setAddress] = useState('');

  const generateWhatsAppLink = () => {
    if (!name) {
      alert('Por favor ingresa tu nombre.');
      return;
    }
    if (deliveryMethod === 'delivery' && !address) {
      alert('Por favor ingresa tu dirección para el delivery.');
      return;
    }

    const phoneNumber = '5492991234567'; // Reemplazar con número real de WhatsApp
    
    let message = `¡Hola MundoVappeo! 👋\nQuiero hacer el siguiente pedido:\n\n`;
    
    cart.forEach(item => {
      message += `🔹 ${item.product.name} x${item.quantity} - $${(item.product.price * item.quantity).toLocaleString('es-AR')}\n`;
    });
    
    message += `\n💰 *Total: $${total.toLocaleString('es-AR')}*`;
    message += `\n👤 Nombre: ${name}`;
    
    if (deliveryMethod === 'retiro') {
      message += `\n📦 Retiro en: ${selectedBranch.name}`;
    } else {
      message += `\n🚚 Delivery a: ${address}`;
    }

    const encodedMessage = encodeURIComponent(message);
    const link = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    
    window.open(link, '_blank');
    clearCart();
  };

  if (cart.length === 0) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4">Tu carrito está vacío</h2>
        <Link to="/" className="text-yellow-400 hover:underline">Volver al catálogo</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Finalizar Compra</h1>
      
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-4">
          {cart.map(item => (
            <div key={item.product.id} className="bg-gray-800 p-4 rounded-lg flex items-center justify-between">
              <div className="flex items-center flex-1">
                <img src={item.product.image_url} alt={item.product.name} className="w-16 h-16 object-cover rounded mr-4" />
                <div>
                  <h3 className="font-bold">{item.product.name}</h3>
                  <p className="text-yellow-400">${item.product.price.toLocaleString('es-AR')}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="p-1 bg-gray-700 rounded">
                  <Minus size={16} />
                </button>
                <span className="w-8 text-center">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="p-1 bg-gray-700 rounded">
                  <Plus size={16} />
                </button>
                <button onClick={() => removeFromCart(item.product.id)} className="p-1 text-red-500 hover:text-red-400 ml-2">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-gray-800 p-6 rounded-lg h-fit">
          <h2 className="text-xl font-bold mb-4">Resumen</h2>
          <div className="border-t border-gray-700 pt-4 mb-4">
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span className="text-yellow-400">${total.toLocaleString('es-AR')}</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre completo</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-700 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                placeholder="Tu nombre"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Método de entrega</label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input 
                    type="radio" 
                    value="retiro"
                    checked={deliveryMethod === 'retiro'}
                    onChange={(e) => setDeliveryMethod('retiro')}
                    className="mr-2 accent-yellow-400"
                  />
                  Retiro en sucursal
                </label>
                <label className="flex items-center">
                  <input 
                    type="radio" 
                    value="delivery"
                    checked={deliveryMethod === 'delivery'}
                    onChange={(e) => setDeliveryMethod('delivery')}
                    className="mr-2 accent-yellow-400"
                  />
                  Delivery
                </label>
              </div>
            </div>

            {deliveryMethod === 'retiro' ? (
              <div>
                <label className="block text-sm font-medium mb-1">Sucursal de retiro</label>
                <select 
                  value={selectedBranch.id}
                  onChange={(e) => {
                    const branch = branches.find(b => b.id === e.target.value);
                    if (branch) setSelectedBranch(branch);
                  }}
                  className="w-full bg-gray-700 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-1">Dirección de entrega</label>
                <input 
                  type="text" 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-gray-700 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  placeholder="Tu dirección"
                />
              </div>
            )}

            <button 
              onClick={generateWhatsAppLink}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Enviar pedido por WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
