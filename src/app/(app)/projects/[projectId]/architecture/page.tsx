
import { redirect } from 'next/navigation';

export default function ArchitecturePage({ params }: { params: { projectId: string } }) {
  redirect(`/projects/${params.projectId}/architecture/initial-estimation`);
}
