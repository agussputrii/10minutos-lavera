import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Product } from '../types';

interface CompareContextType {
  compareList: Product[];
  addToCompare: (product: Product) => void;
  removeFromCompare: (productId: number) => void;
  clearCompare: () => void;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

const CompareContext = createContext<CompareContextType | undefined>(undefined);

export const CompareProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [compareList, setCompareList] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const addToCompare = (product: Product) => {
    setCompareList(prev => {
      if (prev.length >= 3) {
        alert('Solo puedes comparar hasta 3 productos.');
        return prev;
      }
      if (prev.length > 0 && prev[0].category !== product.category) {
        alert('Solo puedes comparar productos de la misma categoría.');
        return prev;
      }
      if (prev.find(p => p.id === product.id)) {
        return prev;
      }
      return [...prev, product];
    });
  };

  const removeFromCompare = (productId: number) => {
    setCompareList(prev => prev.filter(p => p.id !== productId));
  };

  const clearCompare = () => setCompareList([]);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <CompareContext.Provider value={{ compareList, addToCompare, removeFromCompare, clearCompare, isModalOpen, openModal, closeModal }}>
      {children}
    </CompareContext.Provider>
  );
};

export const useCompare = () => {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error('useCompare must be used within a CompareProvider');
  }
  return context;
};
