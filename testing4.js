const url = "https://prmeppkidipenldrrpis.supabase.co/rest/v1/verification_logs";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBybWVwcGtpZGlwZW5sZHJycGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MTE2OTgsImV4cCI6MjA4ODM4NzY5OH0.BK5Bcnlv8jptcljzX8CfaQJkWyXcUV9BJY1r5QOc-MA";

fetch(url, {
  method: "OPTIONS",
  headers: { "apikey": key, "Authorization": `Bearer ${key}` }
}).then(res => {
  for (let [k,v] of res.headers.entries()) {
      if (k.toLowerCase() === 'access-control-allow-methods') console.log(k,v);
  }
});
// Alternatively, let's just intentionally fail an insert
fetch(url, {
  method: "POST",
  headers: { "apikey": key, "Authorization": `Bearer ${key}`, "Content-Type": "application/json", "Prefer": "return=representation" },
  body: JSON.stringify({ a_field_that_does_not_exist: 1 })
}).then(res => res.json()).then(console.log);
