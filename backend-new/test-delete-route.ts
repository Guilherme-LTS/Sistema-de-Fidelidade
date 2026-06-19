import { SignJWT } from "jose";
import { app } from "./src/app.js";

async function run() {
  const secret = new TextEncoder().encode("a943c2ae-1f00-460f-bc23-6364a67475a5");
  const token = await new SignJWT({
    sub: "960467ea-9e16-4cdc-926b-1205945fca70", // Known tenantId from our DB
    email: "gui@example.com",
    role: "authenticated"
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(secret);

  await app.ready();

  const response = await app.inject({
    method: "DELETE",
    url: "/recompensas/183", // The ID the user tried to delete
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  console.log("STATUS:", response.statusCode);
  console.log("BODY:", response.body);
  process.exit(0);
}

run().catch(console.error);
