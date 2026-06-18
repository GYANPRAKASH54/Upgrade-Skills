'use client';

import { SessionProvider } from 'next-auth/react';
import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export function useCart() {
  return useContext(CartContext);
}

export default function Providers({ children }) {
  const [cart, setCart] = useState([]);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('upgradeskills_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error('Failed to parse cart', e);
      }
    }
  }, []);

  // Security: Prevent context menu (right click) and dragging on images and logos globally
  useEffect(() => {
    const handleContextMenu = (e) => {
      const target = e.target;
      if (
        target &&
        (target.tagName === 'IMG' ||
          target.closest('img') ||
          target.tagName === 'svg' ||
          target.closest('svg') ||
          target.tagName === 'PICTURE' ||
          target.closest('picture') ||
          target.closest('[class*="logo"]'))
      ) {
        e.preventDefault();
      }
    };

    const handleDragStart = (e) => {
      const target = e.target;
      if (
        target &&
        (target.tagName === 'IMG' ||
          target.closest('img') ||
          target.tagName === 'svg' ||
          target.closest('svg') ||
          target.tagName === 'PICTURE' ||
          target.closest('picture') ||
          target.closest('[class*="logo"]'))
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('dragstart', handleDragStart);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, []);

  const addToCart = (course) => {
    if (!cart.some((item) => item.id === course.id)) {
      const newCart = [...cart, course];
      setCart(newCart);
      localStorage.setItem('upgradeskills_cart', JSON.stringify(newCart));
    }
  };

  const removeFromCart = (courseId) => {
    const newCart = cart.filter((item) => item.id !== courseId);
    setCart(newCart);
    localStorage.setItem('upgradeskills_cart', JSON.stringify(newCart));
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem('upgradeskills_cart');
  };

  const isInCart = (courseId) => {
    return cart.some((item) => item.id === courseId);
  };

  return (
    <SessionProvider>
      <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, isInCart }}>
        {children}
      </CartContext.Provider>
    </SessionProvider>
  );
}
