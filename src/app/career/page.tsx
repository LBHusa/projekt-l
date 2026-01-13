'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Briefcase, TrendingUp, Calendar, BarChart3 } from 'lucide-react';

const CAREER_MODULES = [
  {
    title: 'Karriere-Quellen',
    description: 'Verwalte deine Einkommensquellen: Jobs, Freelance, Business',
    icon: Briefcase,
    href: '/career/sources',
    available: true,
  },
  {
    title: 'Gehaltshistorie',
    description: 'Verfolge deine Gehaltsentwicklung über die Zeit',
    icon: TrendingUp,
    href: '/career/salary',
    available: false,
  },
  {
    title: 'Karriere-Timeline',
    description: 'Visualisiere deinen Karriereweg und Meilensteine',
    icon: Calendar,
    href: '/career/timeline',
    available: false,
  },
  {
    title: 'Skills & Domains',
    description: 'Verknüpfe deine Karriere mit deinen Skills',
    icon: BarChart3,
    href: '/skills',
    available: true,
  },
];

export default function CareerPage() {
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Karriere</h1>
        <p className="text-gray-600">
          Verwalte deine berufliche Entwicklung, Einkommensquellen und Karriereziele.
        </p>
      </div>

      {/* Module Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {CAREER_MODULES.map((module) => {
          const Icon = module.icon;

          return (
            <Card
              key={module.href}
              className={`p-6 ${
                module.available
                  ? 'hover:shadow-lg transition-shadow cursor-pointer'
                  : 'opacity-60'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">{module.title}</h3>
                  <p className="text-gray-600 mb-4">{module.description}</p>
                  {module.available ? (
                    <Link href={module.href}>
                      <Button>Öffnen</Button>
                    </Link>
                  ) : (
                    <Button variant="outline" disabled>
                      Bald verfügbar
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
