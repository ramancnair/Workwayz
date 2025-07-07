import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/dashboard/development');
  return null;
}
