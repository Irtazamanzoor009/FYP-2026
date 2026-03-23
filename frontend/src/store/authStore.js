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
            // This will call your future backend API that talks to Jira
            // const res = await API.get('/jira/projects');
            // For now, dummy data:
            const dummyProjects = [
                { id: '101', name: 'Website Redesign', key: 'WEB' },
                { id: '102', name: 'Mobile App Dev', key: 'MOB' },
                { id: '103', name: 'Marketing Portal', key: 'MKT' },
            ];
            set({ projects: dummyProjects, selectedProject: dummyProjects[0], isLoading: false });
        } catch (error) {
            set({ isLoading: false });
        }
    },

    setSelectedProject: (project) => {
        set({ selectedProject: project });
    },

    syncJiraData: async () => {
        set({ isSyncing: true });
        try {
            const currentProject = get().selectedProject;
            // API call to trigger backend agentic analysis for the selected project
            // await API.post(`/jira/sync/${currentProject.id}`);

            // Artificial delay to show the animation
            await new Promise(resolve => setTimeout(resolve, 2000));

            set({ isSyncing: false });
            return { success: true };
        } catch (error) {
            set({ isSyncing: false });
            return { success: false };
        }
    },
}));

export default useAuthStore;