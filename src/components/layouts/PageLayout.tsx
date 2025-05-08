
import { ReactNode } from 'react';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';
import { Outlet } from 'react-router-dom';

interface PageLayoutProps {
  children?: ReactNode;
}

export const PageLayout = ({ children }: PageLayoutProps) => {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 container px-4 md:px-6 py-8">
        {children || <Outlet />}
      </main>
      <SiteFooter />
    </div>
  );
};
