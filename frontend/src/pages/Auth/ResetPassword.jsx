import React, { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import Loader from '../../components/Loader';

const ResetPassword = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const { resetPasswordWithToken, isLoading } = useAuthStore();

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const formik = useFormik({
        initialValues: { password: '', confirmPassword: '' },
        validationSchema: Yup.object({
            password: Yup.string().min(6, 'At least 6 characters').required('Required'),
            confirmPassword: Yup.string()
                .oneOf([Yup.ref('password'), null], 'Passwords must match')
                .required('Required'),
        }),
        onSubmit: async (values) => {
            const res = await resetPasswordWithToken(token, values.password);
            if (res.success) {
                toast.success("Password reset successfully! Please log in.");
                navigate('/login');
            } else {
                toast.error(res.message);
            }
        },
    });

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#F5F5F5]">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-lg p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-[#2c3e50] mb-2">New Password</h1>
                    <p className="text-gray-500 text-sm">Create a strong new password for your account.</p>
                </div>

                <form onSubmit={formik.handleSubmit} className="space-y-4">

                    {/* New Password Field */}
                    <div className="text-left relative">
                        <label className="block text-sm font-semibold text-[#2c3e50] mb-1.5">New Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                {...formik.getFieldProps('password')}
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18bc9c]/20 focus:border-[#18bc9c] transition-all pr-12"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                        {formik.touched.password && formik.errors.password && <span className="text-red-500 text-xs mt-1 block">{formik.errors.password}</span>}
                    </div>

                    {/* Confirm Password Field */}
                    <div className="text-left relative">
                        <label className="block text-sm font-semibold text-[#2c3e50] mb-1.5">Confirm Password</label>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                {...formik.getFieldProps('confirmPassword')}
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18bc9c]/20 focus:border-[#18bc9c] transition-all pr-12"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                            >
                                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                        {formik.touched.confirmPassword && formik.errors.confirmPassword && <span className="text-red-500 text-xs mt-1 block">{formik.errors.confirmPassword}</span>}
                    </div>

                    <button type="submit" disabled={isLoading} className="cursor-pointer w-full bg-[#18bc9c] hover:bg-[#128f76] text-white font-semibold py-3 rounded-lg transition-all mt-4 disabled:opacity-70 disabled:cursor-not-allowed">
                        {isLoading ? (
                            <Loader size="sm" color="white" text="Reseting..." textPosition='left' />
                        ) : (
                            'Update Password'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};
export default ResetPassword;