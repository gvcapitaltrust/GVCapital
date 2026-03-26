const url = "https://prmeppkidipenldrrpis.supabase.co/rest/v1/";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBybWVwcGtpZGlwZW5sZHJycGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MTE2OTgsImV4cCI6MjA4ODM4NzY5OH0.BK5Bcnlv8jptcljzX8CfaQJkWyXcUV9BJY1r5QOc-MA";

fetch("https://prmeppkidipenldrrpis.supabase.co/rest/v1/rpc/get_transactions_enum", {
  method: "POST",
  headers: { "apikey": key, "Authorization": `Bearer ${key}` }
}).then(res => res.text()).then(t => {
   // if rpc doesn't exist, we can't easily check check_constraints via postgrest because it's usually not exposed.
   // instead, let's just test if 'System' or 'Adjustment' works
   console.log("RPC result:", t);
});

async function testValidType(type) {
    const res = await fetch(url + "transactions", {
      method: "POST",
      headers: { "apikey": key, "Authorization": `Bearer ${key}`, "Content-Type": "application/json", "Prefer": "return=representation" },
      body: JSON.stringify({ user_id: '00000000-0000-0000-0000-000000000000', type: type, amount: 0, status: 'Approved' })
    });
    const data = await res.json();
    console.log(`Type ${type}:`, data.message || data.code || 'Success');
}

testValidType('Deposit');
testValidType('Adjustment');
testValidType('System');
