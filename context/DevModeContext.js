import React, { createContext, useState } from "react";

export const DevModeContext = createContext({
  devMode: false,
  setDevMode: (value) => {},
});

export const DevModeProvider = ({ children }) => {
  const [devMode, setDevMode] = useState(false);

  return (
    <DevModeContext.Provider value={{ devMode, setDevMode }}>
      {children}
    </DevModeContext.Provider>
  );
};
