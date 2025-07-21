
import { redirect } from 'next/navigation';

export default function SettingsPage({ params }: { params: { projectId: string } }) {
  redirect(`/projects/${params.projectId}/settings/board`);
  return null;
}
