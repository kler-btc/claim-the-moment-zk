
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { WalletContextProvider } from '@/providers/WalletContextProvider';
import { Toaster } from '@/components/ui/sonner';
import { PageLayout } from '@/components/layouts/PageLayout';
import HomePage from '@/pages/HomePage';
import CreateEventPage from '@/pages/CreateEventPage';
import ClaimPage from '@/pages/ClaimPage';
import EventDashboardPage from '@/pages/EventDashboardPage';
import ClaimDashboardPage from '@/pages/ClaimDashboardPage';
import NotFound from '@/pages/NotFound';
import { createQueryClient } from '@/lib/query-client';
import Index from '@/pages/Index';

// Create a client using our utility function
const queryClient = createQueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WalletContextProvider>
        <Router>
          <Routes>
            <Route element={<PageLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/create" element={<CreateEventPage />} />
              <Route path="/claim" element={<ClaimPage />} />
              <Route path="/claim/:eventId" element={<ClaimPage />} />
              <Route path="/events" element={<EventDashboardPage />} />
              <Route path="/my-tokens" element={<ClaimDashboardPage />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
          <Toaster />
        </Router>
      </WalletContextProvider>
    </QueryClientProvider>
  );
}

export default App;
