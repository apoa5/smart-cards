import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://wryvahtsqmejklygnywt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndyeXZhaHRzcW1lamtseWdueXd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NjU0NjYsImV4cCI6MjA3MDU0MTQ2Nn0.6lOPOe3-biS3MhnzXkAkQUylfd8AczFXvwMzO92YkS8";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
