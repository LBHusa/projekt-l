'use client';

import { motion } from 'framer-motion';
import { Apple, Download, Settings, QrCode, CheckCircle, ExternalLink } from 'lucide-react';
import { useState } from 'react';

export default function ShortcutInstructions() {
  const [showQR, setShowQR] = useState(false);

  const steps = [
    {
      number: 1,
      title: 'Shortcuts App öffnen',
      description: 'Öffne die Shortcuts App auf deinem iPhone oder iPad.',
      icon: Apple,
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/20',
    },
    {
      number: 2,
      title: 'Shortcut herunterladen',
      description:
        'Tippe auf den Download-Link unten oder scanne den QR-Code, um den vorkonfigurierten Shortcut zu installieren.',
      icon: Download,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
    },
    {
      number: 3,
      title: 'API-Schlüssel einfügen',
      description:
        'Beim ersten Ausführen wirst du nach dem API-Schlüssel gefragt. Kopiere ihn aus dem Feld oben und füge ihn ein.',
      icon: Settings,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
    },
    {
      number: 4,
      title: 'Automation einrichten (Optional)',
      description:
        'Richte eine Automation ein, die den Shortcut täglich automatisch ausführt (z.B. jeden Morgen um 8 Uhr).',
      icon: CheckCircle,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-[var(--background-secondary)] border border-[var(--orb-border)] rounded-xl p-5"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
          <Apple className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h3 className="font-semibold text-adaptive">Apple Shortcut einrichten</h3>
          <p className="text-sm text-adaptive-dim">
            Automatischer Datenimport in 4 Schritten
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-4 mb-6">
        {steps.map((step, index) => (
          <div
            key={step.number}
            className="flex gap-4"
          >
            {/* Icon */}
            <div className={`flex-shrink-0 w-10 h-10 rounded-full ${step.bgColor} flex items-center justify-center`}>
              <step.icon className={`w-5 h-5 ${step.color}`} />
            </div>

            {/* Content */}
            <div className="flex-1">
              <h4 className="font-medium text-adaptive mb-1">
                {step.number}. {step.title}
              </h4>
              <p className="text-sm text-adaptive-dim">{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Download Section */}
      <div className="space-y-3">
        {/* Download Button */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            alert('Shortcut-Download wird nach Backend-Integration verfügbar sein.');
          }}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
        >
          <Download className="w-4 h-4" />
          Shortcut herunterladen
          <ExternalLink className="w-3.5 h-3.5" />
        </a>

        {/* QR Code Toggle */}
        <button
          onClick={() => setShowQR(!showQR)}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-white/5 text-white/80 font-medium hover:bg-white/10 transition-colors"
        >
          <QrCode className="w-4 h-4" />
          {showQR ? 'QR-Code ausblenden' : 'QR-Code anzeigen'}
        </button>

        {/* QR Code Placeholder */}
        {showQR && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-col items-center justify-center bg-white rounded-lg p-6"
          >
            {/* Placeholder for QR Code */}
            <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-gray-300">
              <div className="text-center text-gray-500">
                <QrCode className="w-12 h-12 mx-auto mb-2" />
                <p className="text-sm font-medium">QR-Code</p>
                <p className="text-xs">Nach Backend-Integration verfügbar</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-4 text-center">
              Scanne mit der Kamera-App deines iPhones
            </p>
          </motion.div>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-4 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <p className="text-sm text-blue-200">
          <strong>Hinweis:</strong> Der Shortcut benötigt Zugriff auf deine Health-Daten.
          Beim ersten Ausführen wirst du nach Berechtigungen gefragt. Erlaube den Zugriff
          auf Schlaf und Aktivitätsdaten.
        </p>
      </div>
    </motion.div>
  );
}
