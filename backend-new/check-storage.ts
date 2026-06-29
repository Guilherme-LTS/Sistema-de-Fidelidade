import { createClient } from "@supabase/supabase-js";
import { env } from "./src/config/env.js";

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkStorage() {
  const { data, error } = await supabase.storage.getBucket('tenant-logos');
  if (error) {
    console.error("Bucket doesn't exist or error:", error.message);
    console.log("Attempting to create bucket...");
    const createRes = await supabase.storage.createBucket('tenant-logos', { public: true });
    if (createRes.error) {
      console.error("Failed to create bucket:", createRes.error.message);
    } else {
      console.log("Bucket created successfully.");
    }
  } else {
    console.log("Bucket exists:", data.name, "Public:", data.public);
  }
}

checkStorage();
