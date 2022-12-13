import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './App.css';
import EksViewer3DPage from './components/pages/EksViewer3DPage';

const App: React.FC = () => {
  return (
    <ErrorBoundary
      FallbackComponent={
        ({ error, resetErrorBoundary }) => {
          return (
            <div>
              <p>Something went wrong:</p>
              <pre>{error.message}</pre>
            </div>
          )
        }
      }
    >
      <Router>
        <Routes>
          <Route path="/" element={<EksViewer3DPage />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
};

export default App;
