import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { saveFileToIndexedDB, getFileFromIndexedDB, deleteFileFromIndexedDB } from '../lib/storage';

interface UploadDraft {
  file: File | null;
  category: string;
  value: string;
  isOpen: boolean;
  clientId?: string;
}

interface UploadContextType {
  drafts: Record<string, UploadDraft>;
  setDraft: (clientId: string, draft: Partial<UploadDraft>) => void;
  clearDraft: (clientId: string) => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: ReactNode }) {
  const [drafts, setDrafts] = useState<Record<string, UploadDraft>>(() => {
    const saved = localStorage.getItem('upload_drafts_metadata');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        Object.keys(parsed).forEach(key => {
          parsed[key].file = null;
        });
        return parsed;
      } catch (e) {
        return {};
      }
    }
    return {};
  });

  useEffect(() => {
    const loadFiles = async () => {
      console.log('[UploadContext] Início do carregamento de arquivos do IndexedDB...');
      const keys = Object.keys(drafts);
      for (const key of keys) {
        try {
          const file = await getFileFromIndexedDB(key);
          if (file) {
            console.log([UploadContext] Arquivo restaurado para:  ());
            setDrafts(prev => ({
              ...prev,
              [key]: { ...prev[key], file }
            }));
          }
        } catch (e) {
          console.error('[UploadContext] Erro ao carregar arquivo:', e);
        }
      }
    };
    loadFiles();
  }, []);

  useEffect(() => {
    const metadata = { ...drafts };
    Object.keys(metadata).forEach(key => {
      const { file, ...rest } = metadata[key];
      (metadata as any)[key] = rest;
    });
    localStorage.setItem('upload_drafts_metadata', JSON.stringify(metadata));
  }, [drafts]);

  const setDraft = async (clientId: string, partialDraft: Partial<UploadDraft>) => {
    console.log([UploadContext] Atualizando rascunho para: , partialDraft);
    if (partialDraft.file !== undefined) {
      if (partialDraft.file) {
        await saveFileToIndexedDB(clientId, partialDraft.file);
      } else {
        await deleteFileFromIndexedDB(clientId);
      }
    }

    setDrafts(prev => ({
      ...prev,
      [clientId]: {
        ...(prev[clientId] || { file: null, category: '', value: '', isOpen: false }),
        ...partialDraft
      }
    }));
  };

  const clearDraft = async (clientId: string) => {
    console.log([UploadContext] Limpando rascunho: );
    await deleteFileFromIndexedDB(clientId);
    setDrafts(prev => {
      const newDrafts = { ...prev };
      delete newDrafts[clientId];
      return newDrafts;
    });
  };

  return (
    <UploadContext.Provider value={{ drafts, setDraft, clearDraft }}>
      {children}
    </UploadContext.Provider>
  );
}

export const useUpload = () => {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
};