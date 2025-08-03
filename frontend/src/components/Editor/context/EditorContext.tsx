import React, { createContext, useContext, ReactNode } from 'react';

interface EditorContextType {
  onNodeUpdate: (nodeId: string, updates: any) => void;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

interface EditorProviderProps {
  children: ReactNode;
  onNodeUpdate: (nodeId: string, updates: any) => void;
}

export const EditorProvider: React.FC<EditorProviderProps> = ({ 
  children, 
  onNodeUpdate 
}) => {
  return (
    <EditorContext.Provider value={{ onNodeUpdate }}>
      {children}
    </EditorContext.Provider>
  );
};

export const useEditor = (): EditorContextType => {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
};