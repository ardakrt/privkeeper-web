'use client';

import React, { createContext, useState, useContext } from 'react';

type NavContextType = {
  direction: number;
  setDirection: (dir: number) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (isOpen: boolean) => void;
};

const NavigationContext = createContext<NavContextType>({
  direction: 1,
  setDirection: () => {},
  isMobileMenuOpen: false,
  setIsMobileMenuOpen: () => {},
});

export const useNavigation = () => useContext(NavigationContext);

export const NavigationProvider = ({ children }: { children: React.ReactNode }) => {
  const [direction, setDirection] = useState(1);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <NavigationContext.Provider value={{ direction, setDirection, isMobileMenuOpen, setIsMobileMenuOpen }}>
      {children}
    </NavigationContext.Provider>
  );
};
