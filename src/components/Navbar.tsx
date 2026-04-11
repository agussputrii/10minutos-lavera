import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Search, MapPin, GitCompareArrows } from 'lucide-react';
import { useBranch } from '../context/BranchContext';
import { useCart } from '../context/CartContext';
import { useCompare } from '../context/CompareContext';

const Navbar: React.FC = () => {
  const { branches, selectedBranch, setSelectedBranch } = useBranch();
  const { cart } = useCart();
  const { compareList, openModal } = useCompare();
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <nav className="bg-gray-800 shadow-lg sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-y-2">
        <Link to="/" className="text-2xl font-bold text-yellow-400">
          MundoVappeo
        </Link>
        
        <div className="flex-1 mx-4 max-w-md hidden md:block">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-700 rounded-full pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <select
              value={selectedBranch.id}
              onChange={(e) => {
                const branch = branches.find(b => b.id === e.target.value);
                if (branch) setSelectedBranch(branch);
              }}
              className="bg-gray-700 border border-gray-600 text-sm rounded-lg p-2 focus:ring-yellow-400 focus:outline-none"
            >
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </div>

          <button onClick={openModal} className="relative p-2 hover:text-yellow-400">
            <GitCompareArrows size={24} />
            {compareList.length > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {compareList.length}
              </span>
            )}
          </button>

          <Link to="/checkout" className="relative p-2 hover:text-yellow-400">
            <ShoppingCart size={24} />
            {cart.length > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
