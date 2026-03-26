const url = "https://prmeppkidipenldrrpis.supabase.co/rest/v1/?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBybWVwcGtpZGlwZW5sZHJycGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MTE2OTgsImV4cCI6MjA4ODM4NzY5OH0.BK5Bcnlv8jptcljzX8CfaQJkWyXcUV9BJY1r5QOc-MA";
fetch(url).then(res=>res.json()).then(data => {
    console.log(JSON.stringify(data.definitions.verification_logs.properties, null, 2));
});
