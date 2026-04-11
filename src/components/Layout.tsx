import React from 'react';
import Navbar from './Navbar';
import AgeVerificationModal from './AgeVerificationModal';
import CompareModal from './CompareModal';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <AgeVerificationModal />
      <CompareModal />
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>
      <footer className="bg-gray-800 py-4 text-center text-gray-400 text-sm">
        © 2024 MundoVappeo. Todos los derechos reservados.
      </footer>
    </div>
  );
};

export default Layout;
