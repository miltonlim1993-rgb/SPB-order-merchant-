import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2, MapPin, Info } from 'lucide-react';
import { askMenuAssistant } from '../services/geminiService';
import { ChatMessage } from '../types';

interface ExtendedChatMessage extends ChatMessage {
  sources?: any[];
}

const MenuAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ExtendedChatMessage[]>([
    { role: 'model', text: 'Hey! Questions about our burgers? 🍔' }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    const { text, sources } = await askMenuAssistant(userMessage);

    setMessages(prev => [...prev, { role: 'model', text, sources }]);
    setIsLoading(false);
  };

  return (
    <>
      {/* Small Floating Icon */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 right-4 z-30 bg-white text-brand-black p-3 rounded-full shadow-float border border-gray-100 hover:bg-gray-50 transition-transform hover:scale-105"
        >
          <Info size={24} className="text-brand-black" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-24 sm:right-4 z-50 w-full sm:w-[320px] sm:h-[450px] bg-white sm:rounded-2xl shadow-2xl flex flex-col font-sans animate-in slide-in-from-bottom-10 border border-gray-100">
          
          {/* Header */}
          <div className="bg-brand-black p-3 flex justify-between items-center sm:rounded-t-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xl">🤖</span>
              <h3 className="font-bold text-white text-sm">Stupiak Helper</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
              <X size={18} />
            </button>
          </div>
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[85%] p-2.5 text-xs font-medium rounded-xl ${
                    msg.role === 'user'
                      ? 'bg-brand-yellow text-black'
                      : 'bg-white text-gray-700 border border-gray-200 shadow-sm'
                  }`}
                >
                  {msg.text}
                </div>
                {msg.sources && (
                  <div className="mt-1 ml-1 flex gap-1">
                     <div className="text-[9px] font-bold text-gray-400 bg-white border border-gray-200 px-1 rounded flex items-center">
                        <MapPin size={8} className="mr-0.5"/> Web Source
                     </div>
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-gray-400 text-[10px] ml-2 font-bold">
                <Loader2 className="animate-spin" size={10} /> PROCESSING...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-2 bg-white border-t border-gray-100 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask anything..."
              className="flex-1 text-xs bg-gray-100 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            />
            <button 
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="bg-black text-white p-2 rounded-md hover:bg-gray-800 disabled:opacity-50"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default MenuAssistant;