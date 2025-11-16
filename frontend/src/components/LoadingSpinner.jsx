function LoadingSpinner({ size = 'lg', message = 'Loading...' }) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <div className={`relative ${sizeClasses[size]}`}>
        <div className="absolute inset-0 rounded-full border-4 border-gold-400/20"></div>
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-gold-400 animate-spin"></div>
      </div>
      {message && (
        <p className="text-gold-400 font-medium animate-pulse">{message}</p>
      )}
    </div>
  );
}

export default LoadingSpinner;



