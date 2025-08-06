
import { redirect } from 'next/navigation';

export default function DeprecatedWorklogPage({ params }: { params: { projectId: string } }) {
  redirect(`/projects/${params.projectId}/resources/worklog`);
}
