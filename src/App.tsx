import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { BranchProvider } from './context/BranchContext';
import { CartProvider } from './context/CartContext';
import { CompareProvider } from './context/CompareContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import Checkout from './pages/Checkout';
import Admin from './pages/Admin';

const App: React.FC = () => {
  return (
    <HelmetProvider>
      <BranchProvider>
        <CartProvider>
          <CompareProvider>
            <Router>
              <Layout>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/producto/:id" element={<ProductDetail />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/admin" element={<Admin />} />
                </Routes>
              </Layout>
            </Router>
          </CompareProvider>
        </CartProvider>
      </BranchProvider>
    </HelmetProvider>
  );
};

export default App;
