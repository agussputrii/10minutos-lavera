import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Branch } from '../types';

interface BranchContextType {
  selectedBranch: Branch;
  setSelectedBranch: (branch: Branch) => void;
  branches: Branch[];
}

const branches: Branch[] = [
  { id: 'gc-28', name: 'Galería Caracol - Local 28' },
  { id: 'gc-47', name: 'Galería Caracol - Local 47' },
  { id: 'gc-85', name: 'Galería Caracol - Local 85' },
  { id: 'ar-765', name: 'Aristides Villanueva 765' },
];

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export const BranchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedBranch, setSelectedBranch] = useState<Branch>(branches[0]);

  return (
    <BranchContext.Provider value={{ selectedBranch, setSelectedBranch, branches }}>
      {children}
    </BranchContext.Provider>
  );
};

export const useBranch = () => {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return context;
};
