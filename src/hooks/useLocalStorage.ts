"use client";

import { useState, useEffect } from 'react';

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<T>(() => {
    // Prevent build errors from using window object
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key);
      // Parse stored json or if none return initialValue
      // Ensure date strings are converted back to Date objects if needed elsewhere
      const parsedItem = item ? JSON.parse(item, (key, value) => {
        if (key === 'date' && typeof value === 'string') {
          const date = new Date(value);
          // Check if the date is valid before returning
          if (!isNaN(date.getTime())) {
              return date;
          }
        }
        return value;
      }) : initialValue;
      return parsedItem;
    } catch (error) {
      // If error also return initialValue
      console.error(`Error reading localStorage key “${key}”:`, error);
      return initialValue;
    }
  });

   // Return a wrapped version of useState's setter function that ...
   // ... persists the new value to localStorage.
   const setValue = (value: T | ((val: T) => T)) => {
      // Prevent build errors from using window object
     if (typeof window === 'undefined') {
       console.warn(`Tried setting localStorage key “${key}” even though environment is not a client`);
       return;
     }

    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      // Save state
      setStoredValue(valueToStore);
      // Save to local storage
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      // A more advanced implementation would handle the error case
      console.error(`Error setting localStorage key “${key}”:`, error);
    }
  };


  // Read stored value again if the key changes
   useEffect(() => {
     if (typeof window === 'undefined') return;
     try {
       const item = window.localStorage.getItem(key);
       const parsedItem = item ? JSON.parse(item, (key, value) => {
         if (key === 'date' && typeof value === 'string') {
             const date = new Date(value);
             if (!isNaN(date.getTime())) return date;
         }
         return value;
       }) : initialValue;
       setStoredValue(parsedItem);
     } catch (error) {
       console.error(`Error reading localStorage key “${key}” on key change:`, error);
       setStoredValue(initialValue);
     }
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [key]);


  // Listen to storage changes from other tabs/windows
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.storageArea === window.localStorage) {
        try {
          const newValue = event.newValue ? JSON.parse(event.newValue, (key, value) => {
            if (key === 'date' && typeof value === 'string') {
              const date = new Date(value);
              if (!isNaN(date.getTime())) return date;
            }
            return value;
          }) : initialValue;
          setStoredValue(newValue);
        } catch (error) {
          console.error(`Error parsing storage change for key “${key}”:`, error);
          setStoredValue(initialValue);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, initialValue]);

  return [storedValue, setValue];
}

export default useLocalStorage;
