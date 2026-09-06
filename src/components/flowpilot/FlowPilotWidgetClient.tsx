'use client';

import dynamic from 'next/dynamic';

const FlowPilotChatWidget = dynamic(
  () => import('./FlowPilotChatWidget').then((mod) => mod.FlowPilotChatWidget),
  { ssr: false }
);

export function FlowPilotWidgetClient() {
  return <FlowPilotChatWidget />;
}
