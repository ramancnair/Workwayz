
import { redirect } from 'next/navigation';

export default function DeprecatedLeaveTrackerPage({ params }: { params: { projectId: string } }) {
  redirect(`/projects/${params.projectId}/resources/leave-tracker`);
}
