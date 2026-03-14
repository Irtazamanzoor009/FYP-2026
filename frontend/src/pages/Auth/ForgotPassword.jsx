import React, { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import Loader from '../../components/Loader';

const ForgotPassword = () => {
    const { forgotPassword, isLoading } = useAuthStore();
    const [emailSent, setEmailSent] = useState(false);

    const formik = useFormik({
        initialValues: { email: '' },
        validationSchema: Yup.object({ email: Yup.string().email('Invalid email').required('Required') }),
        onSubmit: async (values) => {
            const res = await forgotPassword(values.email);
            if (res.success) {
                toast.success(res.message);
                setEmailSent(true);
            } else {
                toast.error(res.message);
            }
        },
    });

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#F5F5F5]">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-lg p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-[#2c3e50] mb-2">Reset Password</h1>
                    <p className="text-gray-500 text-sm">Enter your email to receive a reset link.</p>
                </div>

                {!emailSent ? (
                    <form onSubmit={formik.handleSubmit} className="space-y-4">
                        <div className="text-left">
                            <label className="block text-sm font-semibold text-[#2c3e50] mb-1.5">Email Address</label>
                            <input type="email" {...formik.getFieldProps('email')} className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18bc9c]/20 focus:border-[#18bc9c] transition-all" />
                            {formik.touched.email && formik.errors.email && <span className="text-red-500 text-xs mt-1 block">{formik.errors.email}</span>}
                        </div>

                        <button type="submit" disabled={isLoading} className="cursor-pointer w-full bg-[#18bc9c] hover:bg-[#128f76] text-white font-semibold py-3 rounded-lg transition-all mt-4 disabled:opacity-70 disabled:cursor-not-allowed">
                            {isLoading ? (
                                <Loader size="sm" color="white" text="Sending..." textPosition='left' />
                            ) : (
                                'Send Reset Link'
                            )}
                        </button>
                    </form>
                ) : (
                    <div className="p-4 bg-[#e8f8f5] text-[#128f76] border border-[#18bc9c]/30 rounded-lg text-sm text-center">
                        <strong>Email Sent!</strong> Please check your inbox and click the link to reset your password.
                    </div>
                )}

                <p className="text-center text-sm text-gray-500 mt-6">
                    Back to <Link to="/login" className="text-[#18bc9c] font-semibold hover:underline">Login</Link>
                </p>
            </div>
        </div>
    );
};
export default ForgotPassword;