import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import Loader from '../../components/Loader';

const otpVerificationSchema = Yup.object({
    otpCode: Yup.string()
        .matches(/^[0-9]+$/, "Code must be only digits")
        .length(6, "Code must be exactly 6 digits")
        .required("Verification code is required"),
});

const VerifyOTP = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { verifyOTP, resendOtp, isLoading } = useAuthStore();

    const [otp, setOtp] = useState(new Array(6).fill(""));
    const inputRefs = useRef([]);
    const [timer, setTimer] = useState(60);
    const [isResendDisabled, setIsResendDisabled] = useState(true);

    const userId = location.state?.userId;

    useEffect(() => {
        if (!userId) {
            // toast.error("User ID missing. Please sign up again.");
            navigate('/signup');
        }
    }, [userId, navigate]);

    const formik = useFormik({
        initialValues: { otpCode: "" },
        validationSchema: otpVerificationSchema,
        onSubmit: async (values) => {
            toast.loading("Verifying...");
            try {
                const result = await verifyOTP({ userId: userId, otpCode: values.otpCode });
                
                if (result?.success) {
                    toast.dismiss();
                    toast.success("Account verified successfully! Please log in.");
                    navigate("/login");
                } else {
                    toast.dismiss();
                    toast.error(result?.message || "Invalid or expired code");
                }
            } catch (err) {
                toast.dismiss();
                const error = useAuthStore.getState().error;
                toast.error(error || "Network or server error");
            }
        },
    });

    useEffect(() => {
        if (!isResendDisabled) return;
        if (timer <= 0) {
            setIsResendDisabled(false);
            return;
        }
        const interval = setTimeout(() => {
            setTimer((prevTimer) => prevTimer - 1);
        }, 1000);
        return () => clearTimeout(interval);
    }, [timer, isResendDisabled]);

    const handleResendOtp = async () => {
        if (!userId || isResendDisabled) return;
        toast.loading("Resending OTP...");
        try {
            const result = await resendOtp({ userId });
            if (result?.success) {
                toast.dismiss();
                toast.success("A new code has been sent to your email.");
                setOtp(new Array(6).fill(""));
                formik.resetForm();
                if (inputRefs.current[0]) inputRefs.current[0].focus();
                setIsResendDisabled(true);
                setTimer(60);
            } else {
                toast.dismiss();
                toast.error(result?.message || "Failed to resend code.");
            }
        } catch (err) {
            toast.dismiss();
            const error = useAuthStore.getState().error;
            toast.error(error || "A network or server error occurred.");
        }
    };

    const handleInputChange = (element, index) => {
        if (isNaN(element.value)) return false;
        const newOtp = [...otp];
        newOtp[index] = element.value;
        setOtp(newOtp);
        formik.setFieldValue("otpCode", newOtp.join(""));
        if (element.nextSibling && element.value) {
            element.nextSibling.focus();
        }
    };

    const handleKeyDown = (e, index) => {
        if (e.key === "Backspace" && !otp[index] && index > 0 && e.target.previousSibling) {
            e.target.previousSibling.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData("text");
        if (/^\d{6}$/.test(pastedData)) {
            const newOtp = pastedData.split("");
            setOtp(newOtp);
            formik.setFieldValue("otpCode", pastedData);
            if (inputRefs.current[5]) inputRefs.current[5].focus();
        }
    };

    return (
        <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-4 sm:p-6">
            <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-[#2c3e50]">Verify Email</h1>
                    <p className="text-gray-600 mt-2">Verify your email by entering the OTP that we have sent you</p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={formik.handleSubmit}>
                    <div className="flex justify-center gap-2 sm:gap-3">
                        {otp.map((data, index) => (
                            <input
                                key={index}
                                ref={(el) => (inputRefs.current[index] = el)}
                                type="text"
                                maxLength="1"
                                className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 text-center text-lg sm:text-xl md:text-2xl font-semibold border border-gray-300 rounded-md bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#18bc9c] transition"
                                inputMode="numeric"
                                value={data}
                                onChange={(e) => handleInputChange(e.target, index)}
                                onKeyDown={(e) => handleKeyDown(e, index)}
                                onFocus={(e) => e.target.select()}
                                onPaste={handlePaste}
                            />
                        ))}
                    </div>

                    {formik.touched.otpCode && formik.errors.otpCode && (
                        <div className="text-red-500 text-xs text-center">{formik.errors.otpCode}</div>
                    )}

                    <button type="submit" disabled={isLoading} className="cursor-pointer w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#18bc9c] hover:bg-[#128f76] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#18bc9c] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        {isLoading ? (
                            <Loader size="sm" color="white" text="Verifying..." textPosition='left' />
                        ) : (
                            'Verify'
                        )}
                    </button>

                    <div className="text-center">
                        <p className="text-sm text-gray-600">
                            Didn't receive the code?{' '}
                            <button type="button" disabled={isResendDisabled} onClick={handleResendOtp} className="font-medium text-[#18bc9c] hover:text-[#128f76] underline cursor-pointer disabled:text-gray-400 disabled:no-underline">
                                {isResendDisabled ? `Resend Code in (${timer}s)` : 'Resend Code'}
                            </button>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
};
export default VerifyOTP;