import { Routes, Route } from 'react-router-dom';
import { ReactFlowProvider } from 'reactflow';
import { AppProvider } from './context/AppContext';
import { lazy, Suspense } from 'react';
import './App.css';

// Lazy load компонентов для улучшения производительности
const Dashboard = lazy(() => import('./components/Dashboard/Dashboard'));
const Editor = lazy(() => import('./components/Editor/Editor'));

// Компонент загрузки
const LoadingSpinner = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh',
    fontSize: '18px',
    color: '#6b7280'
  }}>
    <div style={{
      width: '32px',
      height: '32px',
      border: '3px solid #f3f4f6',
      borderTop: '3px solid #3b82f6',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      marginRight: '12px'
    }}></div>
    Загрузка...
  </div>
);

function App() {
  return (
    <AppProvider>
      <div className="app">
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route 
              path="/editor/:botId?" 
              element={
                <ReactFlowProvider>
                  <Editor />
                </ReactFlowProvider>
              } 
            />
          </Routes>
        </Suspense>
      </div>
    </AppProvider>
  );
}

export default App;
