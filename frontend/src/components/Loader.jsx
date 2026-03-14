import React from 'react';

const Loader = ({
    size = 'md',
    color = 'primary',
    fullScreen = false,
    text = null,
    textPosition = 'bottom'
}) => {
    const sizeClasses = {
        sm: 'w-5 h-5 border-2',
        md: 'w-10 h-10 border-4',
        lg: 'w-16 h-16 border-4',
        xl: 'w-24 h-24 border-[6px]'
    };

    const colorClasses = {
        primary: 'border-[#18bc9c] border-t-transparent',
        secondary: 'border-[#2c3e50] border-t-transparent',
        white: 'border-white border-t-transparent',
    };

    const SpinnerElement = (
        <div className={`animate-spin rounded-full ${sizeClasses[size]} ${colorClasses[color]}`}></div>
    );

    const TextElement = text ? (
        <span className={`font-semibold ${size === 'sm' ? 'text-sm' : 'text-base'} ${color === 'white' ? 'text-white' : 'text-[#2c3e50]'}`}>
            {text}
        </span>
    ) : null;

    let Content;
    if (textPosition === 'left') {
        Content = (
            <div className="flex flex-row items-center justify-center gap-2.5">
                {TextElement}
                {SpinnerElement}
            </div>
        );
    } else if (textPosition === 'right') {
        Content = (
            <div className="flex flex-row items-center justify-center gap-2.5">
                {SpinnerElement}
                {TextElement}
            </div>
        );
    } else {
        Content = (
            <div className="flex flex-col items-center justify-center gap-3">
                {SpinnerElement}
                {TextElement}
            </div>
        );
    }

    if (fullScreen) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5] z-50">
                {Content}
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center w-full h-full">
            {Content}
        </div>
    );
};

export default Loader;