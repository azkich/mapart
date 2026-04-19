import { useCallback, useRef } from 'react';
import { useMapart } from '../context/MapartContext';
import { validateFile, validateImageDimensions } from '../utils/validation';

export const useImageUpload = () => {
  const { actions } = useMapart();
  const fileInputRef = useRef(null);

  // Load image from URL with validation
  const loadImageFromURL = useCallback((imageURL, baseFilename) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        const dimensionErrors = validateImageDimensions(img);
        if (dimensionErrors.length > 0) {
          reject(new Error(dimensionErrors.join(', ')));
          return;
        }
        
        actions.setUploadedImage(img, baseFilename);
        resolve(img);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = imageURL;
    });
  }, [actions]);

  // Handle file selection
  const handleFileSelect = useCallback((file) => {
    return new Promise((resolve, reject) => {
      // Validate file
      const validationErrors = validateFile(file);
      if (validationErrors.length > 0) {
        reject(new Error(validationErrors.join(', ')));
        return;
      }

      // Create object URL and load image
      const imgUrl = URL.createObjectURL(file);
      const baseFilename = file.name.replace(/\.[^/.]+$/, "");
      
      loadImageFromURL(imgUrl, baseFilename)
        .then(resolve)
        .catch(reject);
    });
  }, [loadImageFromURL]);

  // Handle file dialog
  const handleFileDialog = useCallback((e) => {
    const files = e.target.files;
    if (!files.length) return;

    const file = files[0];
    handleFileSelect(file).catch(error => {
      console.error('File upload error:', error);
      // Here you could show a user-friendly error message
    });
  }, [handleFileSelect]);

  // Handle drag and drop
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files.length) {
      const file = files[0];
      handleFileSelect(file).catch(error => {
        console.error('Drop error:', error);
      });
    }
  }, [handleFileSelect]);

  // Handle paste
  const handlePaste = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.clipboardData.files;
    if (files.length) {
      const file = files[0];
      handleFileSelect(file).catch(error => {
        console.error('Paste error:', error);
      });
    }
  }, [handleFileSelect]);

  // Handle drag over
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return {
    fileInputRef,
    handleFileDialog,
    handleDrop,
    handlePaste,
    handleDragOver,
    handleFileSelect,
    loadImageFromURL,
  };
};
