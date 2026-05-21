import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'sm_gallery';

export function useGallery() {
  const [images, setImages] = useState([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setImages(JSON.parse(saved));
    } catch {}
  }, []);

  const addImage = useCallback((item) => {
    setImages(prev => {
      const next = [item, ...prev].slice(0, 100); // keep last 100
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeImage = useCallback((id) => {
    setImages(prev => {
      const next = prev.filter(i => i.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setImages([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { images, addImage, removeImage, clearAll };
}
