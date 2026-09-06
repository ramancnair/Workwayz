async function analyze() {
  const res = await fetch('http://localhost:3000/_next/static/chunks/app/layout.js');
  const text = await res.text();
  console.log('Size:', (text.length / 1024 / 1024).toFixed(2), 'MB');
  // Look for webpack sourceURL or eval
  const sourceUrls = [...text.matchAll(/sourceURL=webpack-internal:\/\/\/(.+?)\\n/g)].map(m => m[1]);
  console.log('Total source URLs:', sourceUrls.length);
  const pkgs = {};
  sourceUrls.forEach(url => {
    if (url.includes('node_modules/')) {
      const parts = url.split('node_modules/')[1].split('/');
      const pkg = parts[0].startsWith('@') ? parts[0] + '/' + parts[1] : parts[0];
      pkgs[pkg] = (pkgs[pkg] || 0) + 1;
    }
  });
  console.log('Top packages:', Object.entries(pkgs).sort((a, b) => b[1] - a[1]).slice(0, 20));
  const src = sourceUrls.filter(u => u.includes('/src/'));
  console.log('src count:', src.length);
  console.log('src files sample:', src.slice(0, 25));
}
analyze().catch(console.error);
