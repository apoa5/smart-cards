import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://fqsdiegeymnfctiiuplw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxc2RpZWdleW1uZmN0aWl1cGx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MjgxMzAsImV4cCI6MjA5NDEwNDEzMH0.G4XZjiIqepgjrdZyA4LuTk-41scKhlOBCqjlb0rnzEk";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
