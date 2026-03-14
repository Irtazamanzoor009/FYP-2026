import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F5F5] p-4 text-center">
      <h1 className="text-9xl font-bold text-[#2c3e50]">404</h1>
      <h2 className="text-2xl font-semibold text-gray-600 mt-4 mb-2">Page Not Found</h2>
      <p className="text-gray-500 mb-8 max-w-md">
        Oops! The page you are looking for doesn't exist, has been removed, or is temporarily unavailable.
      </p>
      <Link 
        to="/" 
        className="px-6 py-3 bg-[#18bc9c] hover:bg-[#128f76] text-white font-semibold rounded-lg transition-all"
      >
        Go Back Home
      </Link>
    </div>
  );
};
export default NotFound;