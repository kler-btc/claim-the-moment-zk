
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WalletContextProvider } from "./providers/WalletContextProvider";
import { PageLayout } from "./components/layouts/PageLayout";
import HomePage from "./pages/HomePage";
import CreateEventPage from "./pages/CreateEventPage";
import ClaimPage from "./pages/ClaimPage";
import NotFound from "./pages/NotFound";

// Create a client
const queryClient = {
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  }
};

const App = () => (
  <QueryClientProvider client={queryClient as any}>
    <WalletContextProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <PageLayout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/create" element={<CreateEventPage />} />
              <Route path="/claim" element={<ClaimPage />} />
              <Route path="/claim/:eventId" element={<ClaimPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </PageLayout>
        </BrowserRouter>
      </TooltipProvider>
    </WalletContextProvider>
  </QueryClientProvider>
);

export default App;
