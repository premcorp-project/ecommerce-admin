'use client';

interface Props {
  title: string;
  description: string;
}

const AuthCardHeader = ({ title, description }: Props) => {
  return (
    <div>
      <div className="w-full flex items-center justify-center mb-4">
        <div className="h-[56px] w-full max-w-[420px] relative mx-auto flex items-center justify-center">
          <span className="text-2xl font-bold text-primary">OttimoDirect</span>
        </div>
      </div>

      <h1 className="text-2xl font-semibold text-center">{title}</h1>
      <p className="text-center text-sm text-mute mt-1">{description}</p>
    </div>
  );
};

export default AuthCardHeader;
