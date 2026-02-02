import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Equipment Shop | Projekt L',
  description: 'Kaufe Equipment mit deinem verdienten Gold',
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
