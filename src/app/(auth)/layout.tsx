import { WorkwayzBackground } from '@/components/WorkwayzBackground';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkwayzBackground>
      {children}
    </WorkwayzBackground>
  );
}
