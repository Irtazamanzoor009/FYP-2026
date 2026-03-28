import { create } from 'zustand';
import API from '../API/API';

const useOverviewStore = create((set, get) => ({
    // State
    overviewData: null,
    sprintHistory: null,
    isLoading: false,
    isRefreshing: false,
    lastFetchedAt: null,
    error: null,
    isLoadingHistory: false,
    forceRefreshTrigger: 0,

    // Fetch overview data (smart — uses cache if fresh)
    fetchOverview: async (forceRefresh = false) => {
        const state = get();
        const fiveMinutes = 5 * 60 * 1000;
        const isFresh = state.overviewData &&
            state.lastFetchedAt &&
            (Date.now() - state.lastFetchedAt) < fiveMinutes;

        // Use cached Zustand data if fresh and not forced
        if (isFresh && !forceRefresh) return;

        set({ isLoading: true, error: null });
        try {
            const res = await API.get('/overview');
            set({
                overviewData: res.data.data,
                lastFetchedAt: Date.now(),
                isLoading: false
            });
            return { success: true };
        } catch (error) {
            set({
                isLoading: false,
                error: error.response?.data?.message || 'Failed to fetch overview'
            });
            return { success: false };
        }
    },

    // Force refresh from Jira (Refresh button)
    refreshOverview: async () => {
        set({ isRefreshing: true, error: null });
        try {
            const res = await API.post('/overview/refresh');
            set({
                overviewData: res.data.data,
                lastFetchedAt: Date.now(),
                isRefreshing: false
            });
            return { success: true };
        } catch (error) {
            set({ isRefreshing: false });
            return { success: false };
        }
    },

    // Fetch sprint history for Sprint Analytics page
    fetchSprintHistory: async () => {
        const state = get();

        // Use cached if available
        if (state.sprintHistory || state.isLoadingHistory) return;

        set({ isLoadingHistory: true });

        try {
            const [overviewRes, closedSprintsRes] = await Promise.all([
                API.get('/overview'),
                API.get('/jira/closed-sprints')
            ]);

            const overviewData = overviewRes.data.data;
            const closedSprints = closedSprintsRes.data.data || [];

            set({
                sprintHistory: {
                    currentSprint: overviewData.sprintInfo,
                    historicalVelocity: overviewData.historicalVelocity,
                    averageVelocity: overviewData.averageVelocity,
                    closedSprints: closedSprints.map((s, i) => ({
                        sprintNumber: i + 1,
                        name: s.name,
                        velocity: s.velocity,
                        totalPoints: s.totalPoints,
                        completedPoints: s.completedPoints,
                        completionRate: s.totalPoints > 0
                            ? Math.round((s.completedPoints / s.totalPoints) * 100)
                            : 0,
                        startDate: s.startDate,
                        endDate: s.endDate
                    })),
                    velocityTrend: closedSprints.length >= 2
                        ? closedSprints[closedSprints.length - 1].velocity >
                            closedSprints[closedSprints.length - 2].velocity
                            ? 'improving'
                            : 'declining'
                        : 'insufficient_data'
                },
                isLoadingHistory: false
            });
            return { success: true };
        } catch (error) {
            set({ isLoadingHistory: false });
            return { success: false };
        }
    },

    // Clear store (on logout or project switch)
    clearOverview: () => set({
        overviewData: null,
        sprintHistory: null,
        lastFetchedAt: null,
        error: null
    }),

    triggerRefresh: () => set(state => ({
        overviewData: null,
        lastFetchedAt: null,
        forceRefreshTrigger: state.forceRefreshTrigger + 1
    })),
}));

export default useOverviewStore;