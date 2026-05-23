async function main() {
  console.log("Triggering fetch to localhost:3000...");
  try {
    const res = await fetch("http://localhost:3000/projects/P2600001/pmo/fb-billing");
    console.log("Response status:", res.status);
    const text = await res.text();
    console.log("Response length:", text.length);
    console.log("HTML snippet:\n", text.slice(0, 1500));
  } catch (err) {
    console.error("Fetch failed:", err.message);
  }
}
main();
