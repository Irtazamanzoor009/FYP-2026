import { create } from 'zustand';
import API from '../API/API';

const useMLStore = create((set, get) => ({
    prediction: null,
    isLoading: false,
    lastFetchedAt: null,

    fetchPrediction: async (forceRefresh = false) => {
        const state = get();
        const thirtyMinutes = 30 * 60 * 1000;
        const isFresh = state.prediction &&
            state.lastFetchedAt &&
            (Date.now() - state.lastFetchedAt) < thirtyMinutes;

        if (isFresh && !forceRefresh) return;
        if (state.isLoading) return;

        set({ isLoading: true });
        try {
            const res = await API.post('/ml/predict');
            set({
                prediction: res.data.data,
                isLoading: false,
                lastFetchedAt: Date.now()
            });
            return { success: true };
        } catch (error) {
            set({ isLoading: false });
            return { success: false };
        }
    },

    clearPrediction: () => set({
        prediction: null,
        lastFetchedAt: null
    })
}));

export default useMLStore;