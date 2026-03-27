import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, Sparkles, User, Loader2, MessageCircle } from 'lucide-react';
import useChatStore from '../../store/chatStore';
import useAuthStore from '../../store/authStore';
import ReactMarkdown from 'react-markdown';

const ChatDrawer = ({ isOpen, onClose }) => {
    const {
        messages,
        suggestedQuestions,
        isTyping,
        fetchSuggestedQuestions,
        sendMessage
    } = useChatStore();

    const { user } = useAuthStore();
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen && user?.jiraDomain) {
            fetchSuggestedQuestions();
        }
    }, [isOpen, user?.jiraDomain]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    useEffect(() => {
        if (isOpen) inputRef.current?.focus();
    }, [isOpen]);

    const handleSend = async () => {
        const trimmed = input.trim();
        if (!trimmed || isTyping) return;
        setInput('');
        await sendMessage(trimmed);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleSuggestedQuestion = (question) => {
        setInput(question);
        inputRef.current?.focus();
    };

    return (
        <>
            {/* Background Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 z-[50]"
                    onClick={onClose}
                />
            )}

            <div className={`fixed top-0 right-0 h-screen w-full max-w-md bg-white shadow-2xl z-[60] transform transition-transform duration-500 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>

                {/* Header */}
                <div className="bg-[#2c3e50] p-6 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <Sparkles className="text-[#18bc9c]" />
                        <div>
                            <h3 className="font-bold text-sm">AI Co-Pilot Assistant</h3>
                            <p className="text-[10px] text-[#18bc9c] font-bold">
                                EXPLAINABILITY MODE ACTIVE
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">

                    {/* Welcome message */}
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full gap-6 py-8">
                            <div className="w-16 h-16 bg-[#18bc9c]/10 rounded-2xl flex items-center justify-center">
                                <Bot size={32} className="text-[#18bc9c]" />
                            </div>
                            <div className="text-center">
                                <h4 className="font-bold text-[#2c3e50] mb-2">
                                    ProManage AI Co-Pilot
                                </h4>
                                <p className="text-xs text-gray-500 leading-relaxed max-w-xs">
                                    Ask me anything about your current sprint — workload,
                                    risks, blocked tasks, or what to prioritize today.
                                </p>
                            </div>

                            {/* Suggested questions */}
                            {suggestedQuestions.length > 0 && (
                                <div className="w-full space-y-2">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">
                                        Suggested Questions
                                    </p>
                                    {suggestedQuestions.map((q, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSuggestedQuestion(q)}
                                            className="w-full text-left px-4 py-3 bg-white rounded-xl border border-gray-200 text-xs text-[#2c3e50] font-medium hover:border-[#18bc9c] hover:bg-[#18bc9c]/5 transition-all flex items-center gap-3"
                                        >
                                            <MessageCircle size={14} className="text-[#18bc9c] shrink-0" />
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Chat messages */}
                    {messages.map((msg, i) => (
                        <div
                            key={i}
                            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-[#2c3e50]' : 'bg-[#18bc9c]'
                                }`}>
                                {msg.role === 'user'
                                    ? <User size={14} className="text-white" />
                                    : <Bot size={14} className="text-white" />
                                }
                            </div>
                            {/* <div className={`p-4 rounded-2xl text-xs leading-relaxed shadow-sm max-w-[80%] ${msg.role === 'user'
                                    ? 'bg-[#2c3e50] text-white'
                                    : msg.isError
                                        ? 'bg-red-50 text-red-600 border border-red-100'
                                        : 'bg-white text-gray-700'
                                }`}>
                                {msg.text}
                            </div> */}

                            <div className={`p-4 rounded-2xl text-xs leading-relaxed shadow-sm max-w-[80%] ${msg.role === 'user'
                                    ? 'bg-[#2c3e50] text-white'
                                    : msg.isError
                                        ? 'bg-red-50 text-red-600 border border-red-100'
                                        : 'bg-white text-gray-700'
                                }`}>
                                {msg.role === 'user' ? (
                                    msg.text
                                ) : (
                                    <ReactMarkdown
                                        components={{
                                            p: ({ children }) => (
                                                <p className="mb-2 last:mb-0">{children}</p>
                                            ),
                                            strong: ({ children }) => (
                                                <strong className="font-bold text-[#2c3e50]">{children}</strong>
                                            ),
                                            ul: ({ children }) => (
                                                <ul className="list-disc pl-4 space-y-1 my-2">{children}</ul>
                                            ),
                                            ol: ({ children }) => (
                                                <ol className="list-decimal pl-4 space-y-1 my-2">{children}</ol>
                                            ),
                                            li: ({ children }) => (
                                                <li className="text-xs leading-relaxed">{children}</li>
                                            ),
                                            h1: ({ children }) => (
                                                <h1 className="font-bold text-sm text-[#2c3e50] mb-1">{children}</h1>
                                            ),
                                            h2: ({ children }) => (
                                                <h2 className="font-bold text-xs text-[#2c3e50] mb-1">{children}</h2>
                                            ),
                                            code: ({ children }) => (
                                                <code className="bg-gray-100 px-1 rounded text-[10px] font-mono">
                                                    {children}
                                                </code>
                                            )
                                        }}
                                    >
                                        {msg.text}
                                    </ReactMarkdown>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Typing indicator */}
                    {isTyping && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#18bc9c] flex items-center justify-center shrink-0">
                                <Bot size={14} className="text-white" />
                            </div>
                            <div className="bg-white p-4 rounded-2xl shadow-sm flex items-center gap-2">
                                <Loader2 size={14} className="animate-spin text-[#18bc9c]" />
                                <span className="text-xs text-gray-400">Analyzing sprint data...</span>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 bg-white border-t border-gray-100 flex gap-2 shrink-0">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about tasks, risks or workload..."
                        disabled={isTyping}
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-[#18bc9c] outline-none disabled:opacity-60"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isTyping}
                        className="bg-[#2c3e50] text-white p-3 rounded-xl hover:bg-[#18bc9c] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </>
    );
};

export default ChatDrawer;