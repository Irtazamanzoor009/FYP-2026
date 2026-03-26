import { create } from 'zustand';
import API from '../API/API';
import axios from 'axios';

const useAuthStore = create((set) => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    pendingUserId: null, // Used to pass ID from signup to OTP
    isCheckingAuth: true,

    projects: [],
    selectedProject: null,
    isSyncing: false,

    checkAuth: async () => {
        try {
            const res = await API.get('/auth/check');
            set({ user: res.data.data, isAuthenticated: true, isCheckingAuth: false });
        } catch (error) {
            set({ user: null, isAuthenticated: false, isCheckingAuth: false });
        }
    },

    signup: async (values) => {
        set({ isLoading: true });
        try {
            const res = await API.post('/auth/signup', values);
            set({ pendingUserId: res.data.userId, isLoading: false });
            return { success: true, message: res.data.message, userId: res.data.userId };
        } catch (error) {
            set({ isLoading: false });
            return { success: false, message: error.response?.data?.message || 'Signup failed' };
        }
    },

    verifyOTP: async ({ userId, otpCode }) => {
        set({ isLoading: true });
        try {
            await API.post('/auth/verify-otp', { userId, otpCode });
            set({ isLoading: false });
            return { success: true };
        } catch (error) {
            set({ isLoading: false });
            return { success: false, message: error.response?.data?.message || 'Invalid OTP' };
        }
    },

    resendOtp: async ({ userId }) => {
        set({ isLoading: true });
        try {
            const res = await API.post('/auth/resend-otp', { userId });
            set({ isLoading: false });
            return { success: true, message: res.data.message };
        } catch (error) {
            set({ isLoading: false });
            return { success: false, message: error.response?.data?.message || 'Failed to resend' };
        }
    },

    login: async (values) => {
        set({ isLoading: true });
        try {
            const res = await API.post('/auth/login', values);
            set({ user: res.data.data, isAuthenticated: true, isLoading: false });
            return { success: true, user: res.data.data };
        } catch (error) {
            set({ isLoading: false });
            const errorData = error.response?.data;
            return {
                success: false,
                message: errorData?.message || 'Login failed',
                requiresOTP: errorData?.requiresOTP || false,
                userId: errorData?.userId || null
            };
        }
    },

    saveJiraCreds: async (values) => {
        set({ isLoading: true });
        try {
            const res = await API.post('/auth/jira-credentials', values);
            set({ user: res.data.data, isLoading: false });
            return { success: true };
        } catch (error) {
            set({ isLoading: false });
            return { success: false, message: error.response?.data?.message || 'Failed to connect Jira' };
        }
    },

    forgotPassword: async (email) => {
        set({ isLoading: true });
        try {
            const res = await API.post('/auth/forgot-password', { email });
            set({ isLoading: false });
            return { success: true, message: res.data.message };
        } catch (error) {
            set({ isLoading: false });
            return { success: false, message: error.response?.data?.message || 'Failed to send reset link' };
        }
    },

    resetPasswordWithToken: async (token, password) => {
        set({ loading: true, error: null });
        try {
            const res = await API.post(`/auth/forgot-password/${token}`, { password });
            set({ loading: false });
            return { success: true, message: res.data.message };
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Failed to reset password';
            set({ loading: false, error: errorMsg });
            return { success: false, message: errorMsg };
        }
    },

    googleSignIn: async (code) => {
        set({ loading: true });
        try {
            const res = await API.post("/auth/google", { code });

            const loggedInUser = res.data.data;

            set({ user: loggedInUser, isAuthenticated: true, loading: false });

            return { success: true, user: loggedInUser };

        } catch (error) {
            set({ isLoading: false });
            const errorMessage = error.response?.data?.message || 'Google login failed';
            return { success: false, message: errorMessage };
        }
    },

    logout: async () => {
        try {
            await API.post('/auth/logout');
            set({ user: null, isAuthenticated: false });
            return { success: true };
        } catch (error) {
            return { success: false };
        }
    },

    updateProfile: async (data) => {
        set({ isLoading: true });
        try {
            const res = await API.patch('/user/update-profile', data);
            set({ user: res.data.data, isLoading: false });
            return { success: true };
        } catch (error) {
            set({ isLoading: false });
            return { success: false, message: error.response?.data?.message };
        }
    },

    uploadAvatar: async (file) => {
        set({ isLoading: true });
        try {
            const formData = new FormData();
            formData.append('avatar', file);
            const res = await API.post('/user/upload-avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            set({ user: res.data.data, isLoading: false });
            return { success: true };
        } catch (error) {
            set({ isLoading: false });
            return { success: false };
        }
    },

    changePassword: async (values) => {
        set({ isLoading: true });
        try {
            await API.post('/user/change-password', values);
            set({ isLoading: false });
            return { success: true };
        } catch (error) {
            set({ isLoading: false });
            return { success: false, message: error.response?.data?.message };
        }
    },

    setPassword: async (password) => {
        set({ isLoading: true });
        try {
            await API.post('/user/set-password', { password });
            set((state) => ({
                user: { ...state.user, hasPassword: true },
                isLoading: false
            }));
            return { success: true };
        } catch (error) {
            set({ isLoading: false });
            return { success: false, message: error.response?.data?.message };
        }
    },


    fetchJiraProjects: async () => {
        set({ isLoading: true });
        try {
            const res = await API.get('/jira/projects');
            const { projects, selectedProject } = res.data.data;

            set({
                projects: projects || [],
                selectedProject: selectedProject
                    ? {
                        id: selectedProject.key,
                        key: selectedProject.key,
                        name: selectedProject.name,
                        boardId: selectedProject.boardId
                    }
                    : projects.length > 0
                        ? {
                            id: projects[0].key,
                            key: projects[0].key,
                            name: projects[0].name,
                            boardId: projects[0].boardId
                        }
                        : null,
                isLoading: false
            });
            return { success: true };
        } catch (error) {
            set({ isLoading: false });
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to fetch projects'
            };
        }
    },

    setSelectedProject: async (project) => {
        // Optimistically update UI immediately
        set({ selectedProject: project });

        // Then tell backend which project is now selected
        try {
            await API.post('/jira/switch-project', {
                projectKey: project.key
            });
            return { success: true };
        } catch (error) {
            return { success: false };
        }
    },

    syncJiraData: async () => {
        set({ isSyncing: true });
        try {
            // Refresh all data sources in parallel
            await Promise.all([
                API.post('/overview/refresh'),
                API.post('/risk/refresh'),
                API.post('/monitoring/check')
            ]);

            set({ isSyncing: false });
            return { success: true };
        } catch (error) {
            set({ isSyncing: false });
            return {
                success: false,
                message: error.response?.data?.message || 'Sync failed'
            };
        }
    },
}));

export default useAuthStore;