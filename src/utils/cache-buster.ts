'use client';

export const clearPageCache = () => {
  if (typeof window === 'undefined') return;
  
  try {
    // Clear various browser caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
    
    // Clear localStorage entries that might cache page state
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('dashboard') || key.includes('react-query') || key.includes('next'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Clear sessionStorage
    const sessionKeysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.includes('dashboard') || key.includes('react-query') || key.includes('next'))) {
        sessionKeysToRemove.push(key);
      }
    }
    sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
    
  } catch (error) {
    console.warn('Cache clearing failed:', error);
  }
};

export const forcePageRefresh = () => {
  if (typeof window === 'undefined') return;
  
  clearPageCache();
  
  // Force a hard refresh
  window.location.reload();
};

export const getCacheBustingUrl = (baseUrl: string) => {
  const timestamp = Date.now();
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}_cb=${timestamp}`;
};