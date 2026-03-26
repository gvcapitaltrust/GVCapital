const url = "https://prmeppkidipenldrrpis.supabase.co/rest/v1/verification_logs?select=*&limit=1";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBybWVwcGtpZGlwZW5sZHJycGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MTE2OTgsImV4cCI6MjA4ODM4NzY5OH0.BK5Bcnlv8jptcljzX8CfaQJkWyXcUV9BJY1r5QOc-MA";

fetch(url, {
  method: "GET",
  headers: { "apikey": key, "Authorization": `Bearer ${key}` }
}).then(res => res.json()).then(console.log).catch(console.error);
