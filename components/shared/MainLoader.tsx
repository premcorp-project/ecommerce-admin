export default function MainLoader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-white via-[#fafafa] to-[#f3f4f6]">
      {/* Animated background circles */}
      <div className="absolute inset-0 overflow-hidden opacity-100">
        <div className="floating-circle-1 absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-black opacity-5" />
        <div className="floating-circle-2 absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-black opacity-5" />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-12">
        {/* Logo container with advanced animations */}
        <div className="relative">
          {/* Outer glow ring */}
          <div className="spinner-ring-1 absolute inset-0 -m-4">
            <div className="h-32 w-32 rounded-full border-2 border-transparent border-t-black border-r-black opacity-30 blur-sm"></div>
          </div>

          {/* Second rotating ring */}
          <div className="spinner-ring-2 absolute inset-0 -m-2">
            <div className="h-28 w-28 rounded-full border-[3px] border-transparent border-l-black border-b-black"></div>
          </div>

          {/* Center icon with scale animation */}
          <div className="pulse-scale relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#111111] to-[#4b5563] shadow-2xl shadow-black/40">
            {/* Inner pulsing glow */}
            <div className="pulse-glow absolute inset-0 rounded-full bg-white opacity-20" />

            {/* Lightning icon */}
             <svg
               className="icon-appear relative z-10 h-10 w-10 text-[#f3f4f6]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
        </div>

        {/* Brand name with advanced text animation */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-1">
             <span className="letter-bounce letter-1 text-5xl font-bold text-black">C</span>
             <span className="letter-bounce letter-2 text-5xl font-bold text-black">h</span>
             <span className="letter-bounce letter-3 text-5xl font-bold text-black">e</span>
             <span className="letter-bounce letter-4 text-5xl font-bold text-black">m</span>
             <span className="letter-bounce letter-5 text-5xl font-bold text-black">i</span>
             <span className="letter-bounce letter-6 text-5xl font-bold text-black">B</span>
             <span className="letter-bounce letter-7 text-5xl font-bold text-black">u</span>
             <span className="letter-bounce letter-8 text-5xl font-bold text-black">i</span>
             <span className="letter-bounce letter-9 text-5xl font-bold text-black">l</span>
             <span className="letter-bounce letter-10 text-5xl font-bold text-black">d</span>
          </div>

          {/* Admin badge */}
          <div className="badge-appear rounded-full bg-black/10 px-4 py-1.5">
            <span className="text-sm font-semibold text-black">Admin Panel</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="progress-container w-64">
          <div className="h-1 w-full overflow-hidden rounded-full bg-black/15">
            <div className="progress-bar h-full w-1/2 rounded-full bg-gradient-to-r from-black to-[#6b7280]" />
          </div>

          {/* Loading text */}
          <p className="loading-text mt-3 text-center text-sm font-medium text-[#4b5563]">
            Initializing your workspace
            <span className="loading-dots">...</span>
          </p>
        </div>
      </div>
    </div>
  );
}
