
import { useWallet } from '@solana/wallet-adapter-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const HomePage = () => {
  const { connected } = useWallet();

  return (
    <div className="space-y-12">
      <section className="text-center space-y-6 py-12">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold">
          <span className="gradient-text animate-gradient-flow">Compressed</span> Proof of Participation
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Create and distribute event tokens with ZK compression technology on Solana
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button asChild className="solana-gradient-bg">
            <Link to="/create">Create Event</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/claim">Claim Token</Link>
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="rounded-full w-12 h-12 flex items-center justify-center solana-gradient-bg mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M7 7h.01" />
                <path d="M12 7h.01" />
                <path d="M17 7h.01" />
                <path d="M7 12h.01" />
                <path d="M12 12h.01" />
                <path d="M17 12h.01" />
                <path d="M7 17h.01" />
                <path d="M12 17h.01" />
                <path d="M17 17h.01" />
              </svg>
            </div>
            <h3 className="text-lg font-bold mb-2">Create Events</h3>
            <p className="text-muted-foreground">
              Easily set up events and mint compressed tokens for all your attendees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="rounded-full w-12 h-12 flex items-center justify-center solana-gradient-bg mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <line x1="2" x2="22" y1="10" y2="10" />
              </svg>
            </div>
            <h3 className="text-lg font-bold mb-2">Generate QR Codes</h3>
            <p className="text-muted-foreground">
              Create shareable QR codes that attendees can scan to claim their tokens
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="rounded-full w-12 h-12 flex items-center justify-center solana-gradient-bg mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <path d="M19 5v14H5V5h14z" />
                <path d="M9 9h6v6H9V9z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold mb-2">Claim Tokens</h3>
            <p className="text-muted-foreground">
              Instantly receive compressed event tokens in your Solana wallet
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="py-12">
        <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          <div className="space-y-2">
            <div className="rounded-full w-10 h-10 flex items-center justify-center solana-gradient-bg mx-auto mb-2">
              <span className="text-white font-bold">1</span>
            </div>
            <h3 className="font-medium">Connect Your Wallet</h3>
            <p className="text-sm text-muted-foreground">Link your Solana wallet to get started</p>
          </div>
          <div className="space-y-2">
            <div className="rounded-full w-10 h-10 flex items-center justify-center solana-gradient-bg mx-auto mb-2">
              <span className="text-white font-bold">2</span>
            </div>
            <h3 className="font-medium">Create Your Event</h3>
            <p className="text-sm text-muted-foreground">Enter event details and generate tokens</p>
          </div>
          <div className="space-y-2">
            <div className="rounded-full w-10 h-10 flex items-center justify-center solana-gradient-bg mx-auto mb-2">
              <span className="text-white font-bold">3</span>
            </div>
            <h3 className="font-medium">Share QR Code</h3>
            <p className="text-sm text-muted-foreground">Display QR code for attendees to scan</p>
          </div>
          <div className="space-y-2">
            <div className="rounded-full w-10 h-10 flex items-center justify-center solana-gradient-bg mx-auto mb-2">
              <span className="text-white font-bold">4</span>
            </div>
            <h3 className="font-medium">Attendees Claim</h3>
            <p className="text-sm text-muted-foreground">Participants receive their tokens</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
