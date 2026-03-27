import { create } from 'zustand';
import API from '../API/API';

const useRiskStore = create((set, get) => ({
    riskData: null,
    whatIfResult: null,
    mitigationPlan: null,
    isLoading: false,
    isRefreshing: false,
    isSimulating: false,
    isGeneratingPlan: false,
    lastFetchedAt: null,

    fetchRiskData: async (forceRefresh = false) => {
        const state = get();
        const tenMinutes = 10 * 60 * 1000;
        const isFresh = state.riskData &&
            state.lastFetchedAt &&
            (Date.now() - state.lastFetchedAt) < tenMinutes;

        if (isFresh && !forceRefresh) return;

        set({ isLoading: true });
        try {
            const res = await API.get('/risk');
            set({
                riskData: res.data.data,
                lastFetchedAt: Date.now(),
                isLoading: false
            });
            return { success: true };
        } catch (error) {
            set({ isLoading: false });
            return { success: false };
        }
    },

    refreshRiskData: async () => {
        set({ isRefreshing: true });
        try {
            const res = await API.post('/risk/refresh');
            set({
                riskData: res.data.data,
                lastFetchedAt: Date.now(),
                isRefreshing: false
            });
            return { success: true };
        } catch (error) {
            set({ isRefreshing: false });
            return { success: false };
        }
    },

    runWhatIf: async (scenario) => {
        set({ isSimulating: true });
        try {
            const res = await API.get(`/risk/whatif/${scenario}`);
            set({
                whatIfResult: res.data.data,
                isSimulating: false
            });
            return res.data.data;
        } catch (error) {
            set({ isSimulating: false });
            return null;
        }
    },

    generateMitigationPlan: async () => {
        set({ isGeneratingPlan: true });
        try {
            const res = await API.post('/risk/mitigation-plan');
            set({
                mitigationPlan: res.data.data,
                isGeneratingPlan: false
            });
            return res.data.data;
        } catch (error) {
            set({ isGeneratingPlan: false });
            return null;
        }
    },

    clearRisk: () => set({
        riskData: null,
        whatIfResult: null,
        mitigationPlan: null,
        lastFetchedAt: null
    })
}));

export default useRiskStore;