import { create } from 'zustand';
import API from '../API/API';

const useSuggestionsStore = create((set, get) => ({
    suggestions: [],
    pendingCount: 0,
    totalCount: 0,
    statusFilter: 'ALL',
    isLoading: false,
    isGenerating: false,
    lastFetchedAt: null,

    fetchSuggestions: async (forceRefresh = false) => {
        const state = get();
        const twoMinutes = 2 * 60 * 1000;
        const isFresh = state.suggestions.length > 0 &&
            state.lastFetchedAt &&
            (Date.now() - state.lastFetchedAt) < twoMinutes;

        if (isFresh && !forceRefresh) return;
        if (state.isLoading) return;
        set({ isLoading: true });
        try {
            const res = await API.get(
                `/suggestions?status=${state.statusFilter}`
            );
            set({
                suggestions: res.data.data.suggestions || [],
                pendingCount: res.data.data.pendingCount || 0,
                totalCount: res.data.data.totalCount || 0,
                isLoading: false,
                lastFetchedAt: Date.now()
            });
            return { success: true };
        } catch (error) {
            set({ isLoading: false });
            return { success: false };
        }
    },

    setStatusFilter: async (status) => {
        set({ statusFilter: status, lastFetchedAt: null });
        const res = await API.get(`/suggestions?status=${status}`);
        if (res.data.success) {
            set({
                suggestions: res.data.data.suggestions || [],
                pendingCount: res.data.data.pendingCount || 0,
                totalCount: res.data.data.totalCount || 0,
                lastFetchedAt: Date.now()
            });
        }
    },

    generateSuggestions: async () => {
        set({ isGenerating: true });
        try {
            const res = await API.post('/suggestions/generate');
            if (res.data.success) {
                // Refresh list after generation
                const listRes = await API.get('/suggestions?status=PENDING');
                set({
                    suggestions: listRes.data.data.suggestions || [],
                    pendingCount: listRes.data.data.pendingCount || 0,
                    totalCount: listRes.data.data.totalCount || 0,
                    statusFilter: 'PENDING',
                    isGenerating: false,
                    lastFetchedAt: Date.now()
                });
            } else {
                set({ isGenerating: false });
            }
            return res.data;
        } catch (error) {
            set({ isGenerating: false });
            return {
                success: false,
                message: error.response?.data?.message || 'Generation failed'
            };
        }
    },

    forceRegenerate: async () => {
        set({ isGenerating: true });
        try {
            const res = await API.post('/suggestions/force-regenerate');
            if (res.data.success) {
                const listRes = await API.get('/suggestions?status=PENDING');
                set({
                    suggestions: listRes.data.data.suggestions || [],
                    pendingCount: listRes.data.data.pendingCount || 0,
                    totalCount: listRes.data.data.totalCount || 0,
                    statusFilter: 'PENDING',
                    isGenerating: false,
                    lastFetchedAt: Date.now()
                });
            } else {
                set({ isGenerating: false });
            }
            return res.data;
        } catch (error) {
            set({ isGenerating: false });
            return { success: false };
        }
    },

    approveSuggestion: async (id) => {
        try {
            const res = await API.post(`/suggestions/${id}/approve`);
            if (res.data.success) {
                set(state => ({
                    suggestions: state.suggestions.map(s =>
                        s._id === id ? { ...s, status: 'APPROVED' } : s
                    ),
                    pendingCount: Math.max(state.pendingCount - 1, 0)
                }));
            }
            return res.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Approval failed'
            };
        }
    },

    ignoreSuggestion: async (id) => {
        try {
            const res = await API.post(`/suggestions/${id}/ignore`);
            if (res.data.success) {
                set(state => ({
                    suggestions: state.suggestions.map(s =>
                        s._id === id ? { ...s, status: 'IGNORED' } : s
                    ),
                    pendingCount: Math.max(state.pendingCount - 1, 0)
                }));
            }
            return res.data;
        } catch (error) {
            return { success: false };
        }
    },

    explainSuggestion: async (id) => {
        try {
            const res = await API.get(`/suggestions/${id}/explain`);
            return res.data.data;
        } catch (error) {
            return {
                explanation: 'Unable to generate explanation at this time.'
            };
        }
    },

    clearSuggestions: () => set({
        suggestions: [],
        lastFetchedAt: null,
        statusFilter: 'ALL'
    })
}));

export default useSuggestionsStore;