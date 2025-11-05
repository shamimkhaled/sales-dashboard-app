// KTL Logo Component
import React from 'react';

const KTLLogo = ({ className = '', size = 'default' }) => {
  const sizeClasses = {
    small: 'w-8 h-8',
    default: 'w-12 h-12',
    large: 'w-16 h-16'
  };

  return (
    <div className={`flex items-center justify-center ${sizeClasses[size]} ${className}`}>
      <div className="relative">
        {/* Outer circle */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full shadow-lg"></div>

        {/* Inner circle */}
        <div className="absolute inset-1 bg-white rounded-full flex items-center justify-center">
          <span className="text-blue-600 font-bold text-lg leading-none">KTL</span>
        </div>

        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-blue-400 rounded-full opacity-20 animate-pulse"></div>
      </div>
    </div>
  );
};

export default KTLLogo;