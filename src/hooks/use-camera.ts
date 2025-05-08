
import { useState, useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';

export interface CameraPermissionState {
  hasPermission: boolean | null;
  isLoading: boolean;
  error: Error | null;
  requestPermission: () => Promise<boolean>;
}

export const useCamera = (): CameraPermissionState => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const checkPermission = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Check if the browser supports the MediaDevices API
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported in your browser");
      }
      
      // Try to access the camera
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      
      // If successful, stop all tracks and return true
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
      setError(null);
      return true;
    } catch (err) {
      const permissionErr = err as Error;
      setError(permissionErr);
      
      // Check if the error is due to denied permission
      if (permissionErr.name === 'NotAllowedError' || 
          permissionErr.name === 'PermissionDeniedError') {
        setHasPermission(false);
        toast({
          title: "Camera Access Denied",
          description: "Please allow camera access to scan QR codes",
          variant: "destructive",
        });
      } else {
        // Handle other errors
        setHasPermission(null);
        toast({
          title: "Camera Error",
          description: permissionErr.message || "Could not access camera",
          variant: "destructive",
        });
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check permission on component mount
    checkPermission();
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    return await checkPermission();
  };

  return {
    hasPermission,
    isLoading,
    error,
    requestPermission
  };
};
