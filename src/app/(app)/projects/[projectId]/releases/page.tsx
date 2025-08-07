import { redirect } from 'next/navigation';

export default function ReleasesPage({ params }: { params: { projectId: string } }) {
  redirect(`/projects/${params.projectId}/releases/project-releases`);
}
