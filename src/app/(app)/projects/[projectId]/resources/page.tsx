
import { redirect } from 'next/navigation';

export default function ProjectResourcesPage({ params }: { params: { projectId: string } }) {
  redirect(`/projects/${params.projectId}/resources/project-resources`);
}
