import { create } from 'zustand';
import API from '../API/API';

const useMonitoringStore = create((set, get) => ({
    monitoringData: null,
    isLoading: false,
    isChecking: false,
    lastFetchedAt: null,

    fetchMonitoringData: async (forceRefresh = false) => {
        const state = get();
        const twoMinutes = 2 * 60 * 1000;
        const isFresh = state.monitoringData &&
            state.lastFetchedAt &&
            (Date.now() - state.lastFetchedAt) < twoMinutes;

        if (isFresh && !forceRefresh) return;
        if (state.isLoading) return;
        set({ isLoading: true });
        try {
            const res = await API.get('/monitoring');
            set({
                monitoringData: res.data.data,
                lastFetchedAt: Date.now(),
                isLoading: false
            });
            return { success: true };
        } catch (error) {
            set({ isLoading: false });
            return { success: false };
        }
    },

    triggerManualCheck: async () => {
        set({ isChecking: true });
        try {
            await API.post('/monitoring/check');
            // Refresh data after check
            const res = await API.get('/monitoring');
            set({
                monitoringData: res.data.data,
                lastFetchedAt: Date.now(),
                isChecking: false
            });
            return { success: true };
        } catch (error) {
            set({ isChecking: false });
            return { success: false };
        }
    },

    resolveAlert: async (alertId) => {
        try {
            const res = await API.post(`/monitoring/alerts/${alertId}/resolve`);
            if (res.data.success) {
                set(state => ({
                    monitoringData: state.monitoringData
                        ? {
                            ...state.monitoringData,
                            alerts: state.monitoringData.alerts.filter(
                                a => a._id !== alertId
                            )
                        }
                        : state.monitoringData
                }));
            }
            return res.data;
        } catch (error) {
            return { success: false };
        }
    },

    snoozeAlert: async (alertId, minutes = 60) => {
        try {
            const res = await API.post(
                `/monitoring/alerts/${alertId}/snooze`,
                { minutes }
            );
            if (res.data.success) {
                set(state => ({
                    monitoringData: state.monitoringData
                        ? {
                            ...state.monitoringData,
                            alerts: state.monitoringData.alerts.filter(
                                a => a._id !== alertId
                            )
                        }
                        : state.monitoringData
                }));
            }
            return res.data;
        } catch (error) {
            return { success: false };
        }
    },

    clearResolvedAlerts: async () => {
        try {
            const res = await API.post('/monitoring/alerts/clear-resolved');
            return res.data;
        } catch (error) {
            return { success: false };
        }
    },

    // Add agent log from WebSocket
    addAgentLog: (logEntry) => {
        set(state => ({
            monitoringData: state.monitoringData
                ? {
                    ...state.monitoringData,
                    agentLogs: [
                        logEntry,
                        ...(state.monitoringData.agentLogs || [])
                    ].slice(0, 20)
                }
                : state.monitoringData
        }));
    },

    // Add alert from WebSocket
    addAlert: (alert) => {
        set(state => ({
            monitoringData: state.monitoringData
                ? {
                    ...state.monitoringData,
                    alerts: [
                        alert,
                        ...(state.monitoringData.alerts || [])
                    ]
                }
                : state.monitoringData
        }));
    },

    clearMonitoring: () => set({
        monitoringData: null,
        lastFetchedAt: null
    })
}));

export default useMonitoringStore;