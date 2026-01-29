'use client';

// ============================================
// AI Chatbot UI Component
// ============================================

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Anthropic } from '@anthropic-ai/sdk';
import { TrialExpiredModal } from '@/components/ai/TrialExpiredModal';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function AIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTrialExpired, setShowTrialExpired] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            {
              role: 'user',
              content: userMessage.content,
            },
          ],
        }),
      });

      const data = await response.json();

      // Handle trial expired error
      if (response.status === 403 && data.error === 'trial_expired') {
        setShowTrialExpired(true);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Deine kostenlose Testphase ist abgelaufen. Bitte hinterlege deinen eigenen API-Key, um den KI-Assistenten weiter zu nutzen.',
          },
        ]);
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get response');
      }

      // Extract text content from Claude response
      const assistantContent = extractTextContent(data.response);

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: assistantContent,
        },
      ]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '❌ Fehler bei der Kommunikation mit dem AI-Assistenten.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
    <div className="flex flex-col h-[600px] border border-gray-700 rounded-lg bg-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          🤖 AI Skill-Assistent
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Verwalte deine Skills mit natürlicher Sprache
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-8">
            <p className="text-lg mb-4">👋 Hallo! Ich helfe dir bei deinen Skills.</p>
            <div className="text-sm space-y-2">
              <p>Versuche zum Beispiel:</p>
              <ul className="space-y-1">
                <li>&quot;Zeige mir alle meine Skills&quot;</li>
                <li>&quot;Erstelle einen Python Skill&quot;</li>
                <li>&quot;Füge 50 XP zu meinem Laufen Skill hinzu&quot;</li>
                <li>&quot;Welche Skills fehlen mir noch?&quot;</li>
              </ul>
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-100'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🤖</span>
                  <span className="text-xs text-gray-400">AI-Assistent</span>
                </div>
              )}
              <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 text-gray-100 rounded-lg px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="animate-pulse">🤖</div>
                <span className="text-sm">Denkt nach...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Frage mich etwas über deine Skills..."
            className="flex-1 px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Senden
          </button>
        </div>
      </div>
    </div>

    {/* Trial Expired Modal */}
    <TrialExpiredModal
      isOpen={showTrialExpired}
      onClose={() => setShowTrialExpired(false)}
    />
    </>
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function extractTextContent(response: Anthropic.Message): string {
  const textBlocks = response.content.filter(
    (block): block is Anthropic.TextBlock => block.type === 'text'
  );

  return textBlocks.map((block) => block.text).join('\n\n');
}
