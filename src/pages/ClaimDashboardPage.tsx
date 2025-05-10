
import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getWalletClaimHistory, getEventDetails } from '@/utils/eventServices';
import { formatDate, formatTransactionId } from '@/utils/formatters';

interface ClaimRecord {
  id: number;
  eventId: string;
  walletAddress: string;
  transactionId?: string;
  status: 'pending' | 'confirmed' | 'failed';
  createdAt: string;
  error?: string;
}

interface EnrichedClaimRecord extends ClaimRecord {
  eventTitle?: string;
}

const ClaimDashboardPage = () => {
  const { connected, publicKey } = useWallet();
  const [isLoading, setIsLoading] = useState(true);
  const [claims, setClaims] = useState<EnrichedClaimRecord[]>([]);

  useEffect(() => {
    async function loadClaims() {
      if (!connected || !publicKey) {
        setClaims([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Get claims for this wallet
        const walletClaims = await getWalletClaimHistory(publicKey.toString());
        
        // Enrich with event details
        const enrichedClaims = await Promise.all(
          walletClaims.map(async (claim) => {
            const eventDetails = await getEventDetails(claim.eventId);
            return {
              ...claim,
              eventTitle: eventDetails?.title || 'Unknown Event'
            };
          })
        );
        
        setClaims(enrichedClaims);
      } catch (error) {
        console.error('Error loading claims:', error);
        toast.error("Error Loading Claims", {
          description: "Failed to load your claim history. Please try again later."
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadClaims();
  }, [connected, publicKey]);

  if (!connected) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Your Claimed Tokens</CardTitle>
            <CardDescription>
              Connect your wallet to view tokens you've claimed
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <p>Please connect your wallet to view your claimed tokens.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-2">Your Claimed Tokens</h1>
      <p className="text-muted-foreground mb-8">
        View all the compressed tokens you've claimed from events
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Claim History</CardTitle>
          <CardDescription>
            All tokens you've claimed with this wallet
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : claims.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">You haven't claimed any tokens yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event Name</TableHead>
                    <TableHead>Claimed On</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Transaction</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claims.map((claim) => (
                    <TableRow key={claim.id}>
                      <TableCell className="font-medium">{claim.eventTitle}</TableCell>
                      <TableCell>{formatDate(claim.createdAt)}</TableCell>
                      <TableCell>
                        <Badge 
                          className={
                            claim.status === 'confirmed' ? 'bg-green-100 text-green-800' : 
                            claim.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-red-100 text-red-800'
                          }
                        >
                          {claim.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {claim.transactionId ? (
                          <a 
                            href={`https://explorer.solana.com/tx/${claim.transactionId}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {formatTransactionId(claim.transactionId)}
                          </a>
                        ) : (
                          'N/A'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClaimDashboardPage;
