import { create } from 'zustand';
import API from '../API/API';

const useDecisionStore = create((set, get) => ({
    logs: [],
    pagination: null,
    statusCounts: { ALL: 0, APPROVED: 0, REJECTED: 0, AUTO_EXECUTED: 0 },
    statusFilter: 'ALL',
    searchQuery: '',
    isLoading: false,
    lastFetchedAt: null,

    fetchDecisions: async (forceRefresh = false) => {
        const state = get();
        const twoMinutes = 2 * 60 * 1000;
        const isFresh = state.logs.length > 0 &&
            state.lastFetchedAt &&
            (Date.now() - state.lastFetchedAt) < twoMinutes &&
            !forceRefresh;

        if (isFresh) return;
        if (state.isLoading) return;
        set({ isLoading: true });
        try {
            const params = new URLSearchParams({
                status: state.statusFilter,
                ...(state.searchQuery && { search: state.searchQuery }),
                page: 1,
                limit: 20
            });
            const res = await API.get(`/decisions?${params}`);
            set({
                logs: res.data.data.logs || [],
                pagination: res.data.data.pagination,
                statusCounts: res.data.data.statusCounts || {},
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
        const state = get();
        const params = new URLSearchParams({
            status,
            ...(state.searchQuery && { search: state.searchQuery }),
            page: 1,
            limit: 20
        });
        set({ isLoading: true });
        try {
            const res = await API.get(`/decisions?${params}`);
            set({
                logs: res.data.data.logs || [],
                pagination: res.data.data.pagination,
                statusCounts: res.data.data.statusCounts || {},
                isLoading: false,
                lastFetchedAt: Date.now()
            });
        } catch (error) {
            set({ isLoading: false });
        }
    },

    setSearchQuery: async (query) => {
        set({ searchQuery: query, lastFetchedAt: null });
        const state = get();
        const params = new URLSearchParams({
            status: state.statusFilter,
            ...(query && { search: query }),
            page: 1,
            limit: 20
        });
        set({ isLoading: true });
        try {
            const res = await API.get(`/decisions?${params}`);
            set({
                logs: res.data.data.logs || [],
                pagination: res.data.data.pagination,
                isLoading: false,
                lastFetchedAt: Date.now()
            });
        } catch (error) {
            set({ isLoading: false });
        }
    },

    undoDecision: async (logId) => {
        try {
            const res = await API.post(`/decisions/${logId}/undo`);
            if (res.data.success) {
                set(state => ({
                    logs: state.logs.map(log =>
                        log._id === logId
                            ? { ...log, undone: true, canUndo: false, canUndoNow: false }
                            : log
                    )
                }));
            }
            return res.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Undo failed'
            };
        }
    },

    clearDecisions: () => set({
        logs: [],
        lastFetchedAt: null,
        statusFilter: 'ALL',
        searchQuery: ''
    })
}));

export default useDecisionStore;