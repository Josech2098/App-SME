import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://biiybglgprqijpkmzztn.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpaXliZ2xncHJxaWpwa216enRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5MDM3NTMsImV4cCI6MjEwMDQ3OTc1M30.uM4Y8rtI_yCGqmKyQRmknaz1j2zJ1EE2v9J4HqC3Ymw'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)