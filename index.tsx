
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Auth0Provider } from '@auth0/auth0-react';
import { ToastProvider } from './components/ToastProvider';
import AdminApp from './components/admin/AdminApp';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const isAdminRoute = window.location.pathname.startsWith('/admin');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {isAdminRoute ? (
      <AdminApp />
    ) : (
      <Auth0Provider
        domain={import.meta.env.VITE_AUTH0_DOMAIN as string}
        clientId={import.meta.env.VITE_AUTH0_CLIENT_ID as string}
        authorizationParams={{
          redirect_uri: window.location.origin + '/callback'
        }}
        onRedirectCallback={(appState) => {
          const target = (appState && (appState as any).returnTo) || '/';
          window.history.replaceState({}, document.title, target);
        }}
        cacheLocation="localstorage"
        useRefreshTokens
      >
        <ToastProvider>
          <App />
        </ToastProvider>
      </Auth0Provider>
    )}
  </React.StrictMode>
);
