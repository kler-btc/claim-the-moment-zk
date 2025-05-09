import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@tanstack/react-query';
import { WalletContextProvider } from '@/providers/WalletContextProvider';
import { Toaster } from '@/components/ui/sonner';
import { PageLayout } from '@/components/layouts/PageLayout';
import HomePage from '@/pages/HomePage';
import CreateEventPage from '@/pages/CreateEventPage';
import ClaimPage from '@/pages/ClaimPage';
import NotFound from '@/pages/NotFound';

// Create a client
const queryClient = createQueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WalletContextProvider>
        <Router>
          <Routes>
            <Route element={<PageLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/create" element={<CreateEventPage />} />
              <Route path="/claim" element={<ClaimPage />} />
              <Route path="/claim/:eventId" element={<ClaimPage />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Router>
        <Toaster />
      </WalletContextProvider>
    </QueryClientProvider>
  );
}

export default App;
