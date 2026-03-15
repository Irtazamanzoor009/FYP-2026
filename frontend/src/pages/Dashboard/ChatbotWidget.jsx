import React, { useState } from 'react';
import { MessageSquare, X, Send, Bot, Sparkles } from 'lucide-react';

const ChatbotWidget = () => {
    const [isOpen, setIsOpen] = useState(false);

    // Mock API Data Structure
    const mockChatHistory = [
        { role: 'bot', text: 'Hello! I am your AI Co-Pilot. I have analyzed Sprint 4. Ask me anything about risks or delays.' },
        { role: 'user', text: 'Why is the Login API task at risk?' },
        { role: 'bot', text: 'Task PROJ-22 is at risk because its dependency (Database Setup) is 2 days overdue. Also, the assignee Alex has 3 other high-priority tasks.' },
    ];

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {!isOpen ? (
                <button
                    onClick={() => setIsOpen(true)}
                    className="w-14 h-14 bg-[#2c3e50] text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-[#18bc9c] transition-all group"
                >
                    <Sparkles className="group-hover:animate-pulse" />
                </button>
            ) : (
                <div className="w-80 lg:w-96 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 animate-in slide-in-from-bottom-5">
                    {/* Header */}
                    <div className="bg-[#2c3e50] p-4 text-white flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Bot size={20} className="text-[#18bc9c]" />
                            <span className="font-bold text-sm">AI Co-Pilot</span>
                        </div>
                        <button onClick={() => setIsOpen(false)}><X size={18} /></button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                        {mockChatHistory.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed ${msg.role === 'user' ? 'bg-[#18bc9c] text-white' : 'bg-white text-[#2c3e50] shadow-sm'
                                    }`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Input */}
                    <div className="p-3 border-t bg-white flex gap-2">
                        <input
                            type="text"
                            placeholder="Ask me: What should I fix first?"
                            className="flex-1 bg-gray-100 border-none rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[#18bc9c]"
                        />
                        <button className="p-2 bg-[#2c3e50] text-white rounded-lg hover:bg-[#18bc9c] transition-all">
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatbotWidget;