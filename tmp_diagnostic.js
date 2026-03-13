
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://prmeppkidipenldrrpis.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBybWVwcGtpZGlwZW5sZHJycGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MTE2OTgsImV4cCI6MjA4ODM4NzY5OH0.BK5Bcnlv8jptcljzX8CfaQJkWyXcUV9BJY1r5QOc-MA'

const supabase = createClient(supabaseUrl, supabaseKey)

async function diagnostic() {
  console.log("Starting diagnostic...")
  
  try {
    console.log("Checking 'settings' table...")
    let start = Date.now()
    let { data: sData, error: sError } = await supabase.from('settings').select('*').limit(1)
    console.log(`'settings' check: ${Date.now() - start}ms, Error:`, sError ? sError.message : "None")

    console.log("Checking 'profiles' table...")
    start = Date.now()
    let { data: pData, error: pError } = await supabase.from('profiles').select('*').limit(1)
    console.log(`'profiles' check: ${Date.now() - start}ms, Error:`, pError ? pError.message : "None")

    console.log("Checking 'platform_settings' table...")
    start = Date.now()
    let { data: psData, error: psError } = await supabase.from('platform_settings').select('*').limit(1)
    console.log(`'platform_settings' check: ${Date.now() - start}ms, Error:`, psError ? psError.message : "None")

  } catch (err) {
    console.error("Diagnostic failed:", err.message)
  }
}

diagnostic()
