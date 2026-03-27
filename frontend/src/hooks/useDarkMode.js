  // src/hooks/useDarkMode.js
  import { createContext, useContext, useState, useEffect } from 'react';

  const Ctx = createContext({ dark: false, toggle: () => {} });

  export function DarkModeProvider({ children }) {
    const [dark, setDark] = useState(() => {
      try {
        const v = localStorage.getItem('novus-dark');
        return v !== null ? v === 'true' : window.matchMedia('(prefers-color-scheme: dark)').matches;
      } catch { return false; }
    });

    useEffect(() => {
      document.documentElement.classList.toggle('dark', dark);
      localStorage.setItem('novus-dark', String(dark));
    }, [dark]);

    return <Ctx.Provider value={{ dark, toggle: () => setDark(d => !d) }}>{children}</Ctx.Provider>;
  }

  export default function useDarkMode() {
    return useContext(Ctx);
  }