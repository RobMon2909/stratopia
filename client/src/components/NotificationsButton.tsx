// client/src/components/NotificationsButton.tsx

import { useState, useEffect, useCallback } from 'react'; // 'React' ya no se importa
import { useAuth } from '../hooks/useAuth';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  // ... (la función no cambia)
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) { outputArray[i] = rawData.charCodeAt(i); }
  return outputArray;
}

export function NotificationsButton() {
  const { token } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  const subscribeUser = useCallback(async () => {
    if (!token) {
      alert("Debes iniciar sesión para activar las notificaciones.");
      return;
    }
    if (!registration) {
      console.error("El registro del Service Worker no está disponible.");
      return;
    }
    setIsLoading(true);
    try {
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) throw new Error('VITE_VAPID_PUBLIC_KEY no encontrada en .env');
      
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource,
      });

      // La ruta para el modo desarrollo (el proxy se encargará de redirigir)
      await fetch('/api/save_subscription.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ subscription }),
      });
      
      setIsSubscribed(true);
    } catch (error) {
      console.error('Error durante el proceso de suscripción:', error);
      alert('Hubo un error al activar las notificaciones.');
    } finally {
      setIsLoading(false);
    }
  }, [registration, token]);

  const unsubscribeUser = async () => {
    if (!registration) return;
    setIsLoading(true);
    try {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
            await subscription.unsubscribe();
        }
        setIsSubscribed(false);
    } catch (error) {
        console.error('Error al desactivar la suscripción:', error);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
        // Ruta para el modo desarrollo
        const reg = await navigator.serviceWorker.register('/sw.js');
        setRegistration(reg);
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          setIsSubscribed(true);
        }
      } catch (error) {
        console.error("Error durante la inicialización del Service Worker:", error);
      } finally {
        setIsLoading(false);
      }
    };
    initialize();
  }, []);

  if (isLoading) return <p>Cargando notificaciones...</p>;
  
  if (isSubscribed) {
    return (
      <div>
        <p style={{color: 'green'}}>Notificaciones activadas.</p>
        <button onClick={unsubscribeUser} style={{fontSize: '10px', color: 'gray'}}>
          Desactivar
        </button>
      </div>
    );
  }

  if (Notification.permission === 'denied') {
      return <p style={{color: 'orange'}}>Notificaciones bloqueadas.</p>;
  }

  return (
    <button onClick={subscribeUser} disabled={isLoading}>
      Activar Notificaciones
    </button>
  );
}