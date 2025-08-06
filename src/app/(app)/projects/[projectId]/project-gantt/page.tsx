
import { redirect } from 'next/navigation';

export default function DeprecatedProjectGanttPage({ params }: { params: { projectId: string } }) {
  redirect(`/projects/${params.projectId}/resources/resource-gantt`);
}
