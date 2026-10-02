import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { CmsProvider } from './data';
import { ThemeProvider } from './theme';
import { App } from './pages';
import './styles.css';
import './editorial.css';

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <ThemeProvider>
        <CmsProvider><App /></CmsProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
