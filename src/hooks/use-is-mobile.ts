import { useEffect, useState } from 'react';

/**
 * Hook para detectar se o usuário está em um dispositivo móvel e NÃO está usando o PWA
 * Retorna true se estiver em mobile e não em modo standalone (PWA instalado)
 */
export const useIsMobileAndNotPWA = (): boolean => {
  const [isMobileAndNotPWA, setIsMobileAndNotPWA] = useState(false);

  useEffect(() => {
    // Detecta se é dispositivo móvel pelo userAgent
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Detecta se está em modo PWA (standalone)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         ('standalone' in navigator && (navigator as any).standalone === true);

    setIsMobileAndNotPWA(isMobile && !isStandalone);
  }, []);

  return isMobileAndNotPWA;
};
