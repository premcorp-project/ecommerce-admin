
const AppLoader = () => {
  return (
    <div className="w-full h-28 rounded-md border flex items-center justify-center">
      <div className="flex items-center space-x-2">
        <p className="text-sm text-muted-foreground font-medium">Loading</p>
        <div className="flex space-x-1.5 items-center">
          <span 
            className="w-2 h-2 bg-primary rounded-full"
            style={{
              animation: 'bounce 1s ease-in-out infinite',
              animationDelay: '0s'
            }}
          ></span>
          <span 
            className="w-2 h-2 bg-primary rounded-full"
            style={{
              animation: 'bounce 1s ease-in-out infinite',
              animationDelay: '0.2s'
            }}
          ></span>
          <span 
            className="w-2 h-2 bg-primary rounded-full"
            style={{
              animation: 'bounce 1s ease-in-out infinite',
              animationDelay: '0.4s'
            }}
          ></span>
        </div>
      </div>
      
      <style>{`
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
            opacity: 1;
          }
          50% {
            transform: translateY(-4px);
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
};

export default AppLoader;