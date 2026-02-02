import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Wochen-Rueckblicke | Projekt L',
  description: 'Deine AI-generierten woechentlichen Insights',
};

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
