import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { crearRouter } from './router';
import './index.css';

const cliente = new QueryClient();
const router = crearRouter(cliente);

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    <QueryClientProvider client={cliente}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
