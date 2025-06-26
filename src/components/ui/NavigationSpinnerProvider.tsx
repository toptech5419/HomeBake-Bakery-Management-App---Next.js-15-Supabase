"use client";

import React, { createContext, useContext, useState } from "react";
import LoadingSpinner from "./LoadingSpinner";

const NavigationSpinnerContext = createContext({
  show: () => {},
  hide: () => {},
});

export function useNavigationSpinner() {
  return useContext(NavigationSpinnerContext);
}

export const NavigationSpinnerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);

  return (
    <NavigationSpinnerContext.Provider value={{
      show: () => setVisible(true),
      hide: () => setVisible(false),
    }}>
      {visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <LoadingSpinner message="Loading..." />
        </div>
      )}
      {children}
    </NavigationSpinnerContext.Provider>
  );
}; 