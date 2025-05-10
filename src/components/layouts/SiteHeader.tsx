
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { WalletButton } from '../WalletButton';

export const SiteHeader: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur">
      <div className="container flex items-center justify-between h-16 px-4 md:px-6">
        <div className="flex items-center">
          <Link to="/" className="flex items-center">
            <span className="text-xl font-bold gradient-text animate-gradient-flow">cPOP</span>
            <span className="ml-2 text-xl font-medium">Interface</span>
          </Link>
          <nav className="hidden md:flex ml-10 space-x-6">
            <Link to="/create" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
              Create Event
            </Link>
            <Link to="/claim" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
              Claim Token
            </Link>
            <Link to="/events" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
              My Events
            </Link>
            <Link to="/my-tokens" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
              My Tokens
            </Link>
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          <WalletButton />
          <button 
            className="md:hidden block" 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden container px-4">
          <nav className="flex flex-col py-4 space-y-4">
            <Link 
              to="/create" 
              className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Create Event
            </Link>
            <Link 
              to="/claim" 
              className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Claim Token
            </Link>
            <Link 
              to="/events" 
              className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              My Events
            </Link>
            <Link 
              to="/my-tokens" 
              className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              My Tokens
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
};
