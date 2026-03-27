import { create } from 'zustand';
import API from '../API/API';

const useChatStore = create((set, get) => ({
    messages: [],
    suggestedQuestions: [],
    isTyping: false,
    suggestionsLoaded: false,

    fetchSuggestedQuestions: async () => {
        if (get().suggestionsLoaded) return;
        try {
            const res = await API.get('/chat/suggestions');
            set({
                suggestedQuestions: res.data.data.suggestions || [],
                suggestionsLoaded: true
            });
        } catch (error) {
            // Silent fail — not critical
        }
    },

    sendMessage: async (message) => {
        const state = get();

        // Add user message immediately
        const userMsg = {
            role: 'user',
            text: message,
            timestamp: new Date()
        };
        set(s => ({ messages: [...s.messages, userMsg] }));
        set({ isTyping: true });

        try {
            // Build conversation history from last 6 messages
            const history = state.messages.slice(-6).map(m => ({
                role: m.role === 'user' ? 'user' : 'assistant',
                content: m.text
            }));

            const res = await API.post('/chat/message', {
                message,
                conversationHistory: history
            });

            const botMsg = {
                role: 'bot',
                text: res.data.data.aiResponse,
                timestamp: new Date()
            };
            set(s => ({
                messages: [...s.messages, botMsg],
                isTyping: false
            }));
            return { success: true };
        } catch (error) {
            const errorMsg = {
                role: 'bot',
                text: 'I am having trouble connecting right now. Please try again in a moment.',
                timestamp: new Date(),
                isError: true
            };
            set(s => ({
                messages: [...s.messages, errorMsg],
                isTyping: false
            }));
            return { success: false };
        }
    },

    clearChat: () => set({
        messages: [],
        suggestionsLoaded: false,
        suggestedQuestions: []
    })
}));

export default useChatStore;