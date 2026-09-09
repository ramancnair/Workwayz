async function testChat() {
  console.log('Sending chat request to /api/flowpilot/chat...');
  const res = await fetch('http://localhost:3000/api/flowpilot/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        {
          role: 'user',
          content: 'What is the health and status of the active project?',
        },
      ],
      currentProjectId: 'P2600001',
      currentProjectName: 'FlowPilot Mobile Banking',
    }),
  });

  console.log('Status:', res.status);
  const headers = {};
  for (const [k, v] of res.headers.entries()) {
    if (k.startsWith('x-rate-')) headers[k] = v;
  }
  console.log('Rate & Token Headers:', headers);

  const data = await res.json();
  console.log('\nResponse Reply Preview:', data.reply?.slice(0, 180));
  console.log('\nToken Usage:', data.tokenUsage);
  console.log('\nRetrieved Candidate Tools:', data.tokenUsage?.retrievedTools);
}

testChat().catch(console.error);
