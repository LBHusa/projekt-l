// ============================================
// AI Chat Demo Page
// ============================================

import { AIChat } from '@/components/ai-chat';

export default function AIChatDemoPage() {
  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">
          AI Skill-Management Chatbot Demo
        </h1>

        <AIChat />

        <div className="mt-8 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-2">
            ℹ️ Hinweise
          </h2>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• Der Chatbot nutzt Claude Sonnet 4.5 mit Function Calling</li>
            <li>• Alle Skill-Operationen werden direkt in der Datenbank ausgeführt</li>
            <li>• Die Konversation ist zustandslos - jeder Request ist unabhängig</li>
            <li>
              • Stelle sicher dass ANTHROPIC_API_KEY in .env.local gesetzt ist
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
