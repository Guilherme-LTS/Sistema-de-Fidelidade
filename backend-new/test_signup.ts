import { createClient } from "@supabase/supabase-js";

async function run() {
  const supabaseUrl = process.env.SUPABASE_URL || "https://hzzujdjgyqnlhtrsfagz.supabase.co";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "..."; 
  const anonKey = process.env.SUPABASE_ANON_KEY || "..."; // We need this for signIn

  const supabase = createClient(supabaseUrl, supabaseKey);
  const supabaseClient = createClient(supabaseUrl, anonKey);

  const email = "test_consumer_500@example.com";
  const password = "Password123";

  console.log("Testing user creation...");
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      isConsumer: 'true',
      name: "Test Consumer",
      document: "12345678900", // some CPF
    }
  });

  if (error) {
    console.error("Error creating user:");
    console.error(error);
  } else {
    console.log("User created:", data.user.id);
    
    console.log("Testing sign in...");
    const { data: sessionData, error: signInError } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      console.error("SignIn error:", signInError);
    } else {
      console.log("SignIn success!");
    }

    // cleanup
    await supabase.auth.admin.deleteUser(data.user.id);
    console.log("Cleanup done.");
  }
}

run();
