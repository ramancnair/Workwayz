import { redirect } from 'next/navigation';

export default function ProjectSettingsPage({ params }: { params: { projectId: string } }) {
  redirect(`/projects/${params.projectId}/settings/board`);
  return null;
}
