const url = "https://prmeppkidipenldrrpis.supabase.co/rest/v1/transactions";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBybWVwcGtpZGlwZW5sZHJycGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MTE2OTgsImV4cCI6MjA4ODM4NzY5OH0.BK5Bcnlv8jptcljzX8CfaQJkWyXcUV9BJY1r5QOc-MA";
const uid = "00000000-0000-0000-0000-000000000000";

fetch(url, {
  method: "POST",
  headers: {
    "apikey": key,
    "Authorization": `Bearer ${key}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation"
  },
  body: JSON.stringify({
    user_id: uid,
    type: 'Audit',
    amount: 0,
    status: 'Approved',
    ref_id: 'TESTING',
    metadata: { is_audit: true, action: 'KYC Verified' }
  })
}).then(res => res.json()).then(console.log).catch(console.error);
