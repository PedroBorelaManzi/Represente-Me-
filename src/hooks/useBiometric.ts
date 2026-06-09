import { useState, useEffect } from 'react';
import { NativeBiometric, BiometricOptions } from '@capgo/capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabase';

export function useBiometric() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    checkAvailability();
    checkIfEnabled();
  }, []);

  const checkAvailability = async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const result = await NativeBiometric.isAvailable();
      setIsAvailable(result.isAvailable);
    } catch (e) {
      setIsAvailable(false);
    }
  };

  const checkIfEnabled = async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const credentials = await NativeBiometric.getCredentials({ server: "representese" });
      if (credentials && credentials.username && credentials.password) {
        setIsEnabled(true);
      }
    } catch (e) {
      setIsEnabled(false);
    }
  };

  const setupBiometric = async (email: string, token: string) => {
    if (!Capacitor.isNativePlatform() || !isAvailable) return false;
    try {
      await NativeBiometric.setCredentials({
        username: email,
        password: token,
        server: "representese",
      });
      setIsEnabled(true);
      return true;
    } catch (error) {
      console.error("Error setting up biometric:", error);
      return false;
    }
  };

  const authenticate = async () => {
    if (!Capacitor.isNativePlatform() || !isAvailable || !isEnabled) return false;
    
    try {
      await NativeBiometric.verifyIdentity({
        reason: "Para fazer login seguro no Represente-Se",
        title: "Log in",
      });

      
        const credentials = await NativeBiometric.getCredentials({ server: "representese" });
        if (credentials.username && credentials.password) {
          // Utilizar o token salvo para setar a sessao
          const { error } = await supabase.auth.setSession({
            access_token: credentials.password,
            refresh_token: credentials.password // Simplificacao. Ideal salvar ambos.
          });
          
          if (!error) return true;
        }
      return false;
    } catch (error) {
      console.error("Biometric auth failed", error);
      return false;
    }
  };

  const clearBiometric = async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await NativeBiometric.deleteCredentials({ server: "representese" });
      setIsEnabled(false);
    } catch (error) {
      console.error("Error clearing biometric credentials:", error);
    }
  };

  return { isAvailable, isEnabled, setupBiometric, authenticate, clearBiometric };
}
