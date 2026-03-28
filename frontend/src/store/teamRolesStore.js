import { create } from 'zustand';
import API from '../API/API';

const useTeamRolesStore = create((set, get) => ({
    teamMembers: [],
    rolesConfigured: false,
    isLoading: false,
    isSaving: false,

    fetchTeamRoles: async () => {
        const state = get();
        if (state.isLoading || state.teamMembers.length > 0) return;
        set({ isLoading: true });
        try {
            const res = await API.get('/jira/team-roles');
            set({
                teamMembers: res.data.data.teamMembers || [],
                rolesConfigured: res.data.data.rolesConfigured || false,
                isLoading: false
            });
            return { success: true };
        } catch (error) {
            set({ isLoading: false });
            return { success: false };
        }
    },

    updateMemberRole: (accountId, role) => {
        set(state => ({
            teamMembers: state.teamMembers.map(m =>
                m.accountId === accountId ? { ...m, role } : m
            )
        }));
    },

    saveTeamRoles: async () => {
        set({ isSaving: true });
        try {
            const { teamMembers } = get();
            const res = await API.post('/jira/team-roles', { teamMembers });
            if (res.data.success) {
                set({
                    teamMembers: res.data.data.teamMembers || teamMembers,
                    rolesConfigured: true,
                    isSaving: false
                });
            } else {
                set({ isSaving: false });
            }
            return res.data;
        } catch (error) {
            set({ isSaving: false });
            return { success: false };
        }
    }
}));

export default useTeamRolesStore;