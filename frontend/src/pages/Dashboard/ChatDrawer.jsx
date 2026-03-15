import React from 'react';
import { X, Send, Bot, Sparkles, User } from 'lucide-react';

const ChatDrawer = ({ isOpen, onClose }) => {
    // MOCK API DATA
    const chatMessages = [
        { role: 'bot', text: 'Analyzing Sprint 4 health... I have found 2 critical risks and 5 potential reassignments. How can I assist you?' },
        { role: 'user', text: 'Give me a summary of the workload risk.' },
        { role: 'bot', text: 'Alex (Frontend) is assigned 4 critical tasks. Based on Module 4 analysis, he is at high risk of burnout. I suggest moving the "Footer Fix" to Mike.' },
    ];

    return (
        <>
            {/* Background Overlay */}
            {isOpen && <div className="fixed inset-0 bg-black/20 z-[50]" onClick={onClose} />}

            <div className={`fixed top-0 right-0 h-screen w-full max-w-md bg-white shadow-2xl z-[60] transform transition-transform duration-500 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>

                {/* Header */}
                <div className="bg-[#2c3e50] p-6 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Sparkles className="text-[#18bc9c]" />
                        <div>
                            <h3 className="font-bold text-sm">AI Co-Pilot Assistant</h3>
                            <p className="text-[10px] text-[#18bc9c] font-bold">EXPLAINABILITY MODE ACTIVE</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg"><X size={20} /></button>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50">
                    {chatMessages.map((msg, i) => (
                        <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-[#2c3e50]' : 'bg-[#18bc9c]'}`}>
                                {msg.role === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
                            </div>
                            <div className={`p-4 rounded-2xl text-xs leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-[#2c3e50] text-white' : 'bg-white text-gray-700'}`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Chat Input */}
                <div className="p-4 bg-white border-t border-gray-100 flex gap-2">
                    <input
                        type="text"
                        placeholder="Query about tasks, risks or reassignments..."
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-[#18bc9c] outline-none"
                    />
                    <button className="bg-[#2c3e50] text-white p-3 rounded-xl hover:bg-[#18bc9c] transition-all">
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </>
    );
};

export default ChatDrawer;