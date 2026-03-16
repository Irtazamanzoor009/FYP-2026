import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import Loader from '../../components/Loader';

const GoogleCallback = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { googleSignIn } = useAuthStore();

    const hasCalledAuth = useRef(false);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const code = params.get('code');

        if (code && !hasCalledAuth.current) {

            const handleAuth = async () => {
                hasCalledAuth.current = true;

                const toastId = toast.loading("Verifying Google account...");
                try {
                    const result = await googleSignIn(code);
                    if (result.success) {
                        toast.success("Welcome back!", { id: toastId });
                        const user = result.user;
                        if (user?.jiraDomain && user?.jiraApiToken) {
                            navigate('/dashboard');
                        } else {
                            navigate('/jira-connect');
                        }
                    } else {
                        toast.error(result.message || "Google auth failed.", { id: toastId });
                        navigate('/login');
                    }
                } catch (error) {
                    toast.error("A network error occurred. Please try again.", { id: toastId });
                    navigate('/login');
                }
            };

            handleAuth();
        }
    }, [location, navigate, googleSignIn]);

    return (
        <Loader
            size="lg"
            color="secondary"
            fullScreen={true}
            text="Verifying Google account..."
        />
    );
};

export default GoogleCallback;