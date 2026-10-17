async function testTestCaseCreation() {
  console.log('Testing test case generation prompt...');
  const res = await fetch('http://localhost:3000/api/wayfinder/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        {
          role: 'user',
          content: 'Generate 3 test cases for user profile picture upload with steps and expected results',
        },
      ],
      currentProjectId: 'P2600001',
      currentProjectName: 'WayFinder Mobile Banking',
    }),
  });

  const data = await res.json();
  console.log('Status:', res.status);
  console.log('Prompt Tokens:', data.tokenUsage?.promptTokens);
  console.log('Total Tokens:', data.tokenUsage?.totalTokens);
  console.log('Tools Used:', data.tokenUsage?.toolsUsed);
  console.log('Retrieved Tools:', data.tokenUsage?.retrievedTools);
  console.log('Reply:', data.reply?.slice(0, 250));
}

testTestCaseCreation().catch(console.error);
