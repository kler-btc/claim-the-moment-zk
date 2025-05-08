
import { Link } from 'react-router-dom';

export const SiteFooter = () => {
  return (
    <footer className="border-t">
      <div className="container flex flex-col md:flex-row items-center justify-between py-6 px-4 md:px-6">
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
          <Link to="/" className="flex items-center">
            <span className="text-lg font-bold gradient-text">cPOP</span>
            <span className="ml-1 text-lg font-medium">Interface</span>
          </Link>
          <p className="text-xs text-muted-foreground">
            Built with Solana, ZK Compression & Lovable
          </p>
        </div>
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <Link 
            to="/create" 
            className="text-xs text-muted-foreground hover:underline"
          >
            Create Event
          </Link>
          <Link 
            to="/claim" 
            className="text-xs text-muted-foreground hover:underline"
          >
            Claim Token
          </Link>
        </div>
      </div>
    </footer>
  );
};
