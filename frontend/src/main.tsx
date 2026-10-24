import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { CmsProvider } from './data';
import { ThemeProvider } from './theme';
import { App } from './pages';
import { addCollection } from '@iconify/react';
import solarIcons from './solar-icons.json';
import './styles.css';
import './editorial.css';
import './interior.css';

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';
addCollection(solarIcons);
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <ThemeProvider>
        <CmsProvider><App /></CmsProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
