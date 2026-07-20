import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to DB");

    // 1. Find the consumer profile by CPF
    const profileRes = await client.query(`SELECT id FROM consumer_profiles WHERE document = '70439493277'`);
    if (profileRes.rowCount === 0) {
      console.log("Profile not found for CPF 70439493277");
      return;
    }
    const profileId = profileRes.rows[0].id;

    // 2. Find the first customer record (and its tenant)
    const custRes = await client.query(`SELECT id, tenant_id FROM customers WHERE consumer_profile_id = $1 LIMIT 1`, [profileId]);
    if (custRes.rowCount === 0) {
      console.log("No customer link found for this profile.");
      return;
    }
    const customerId = custRes.rows[0].id;
    const tenantId = custRes.rows[0].tenant_id;
    
    console.log(`Found Customer ID: ${customerId}, Tenant ID: ${tenantId}`);

    // 3. Insert fresh test transactions
    // Transaction 1: Valid, future expiration
    const validDate = new Date();
    validDate.setDate(validDate.getDate() + 30);
    await client.query(`
      INSERT INTO transactions (customer_id, tenant_id, amount_spent, points_earned, remaining_points, expires_at, created_at, updated_at)
      VALUES ($1, $2, 50.00, 50, 50, $3, NOW(), NOW())
    `, [customerId, tenantId, validDate.toISOString()]);
    console.log("Inserted 1 valid transaction (50 points)");

    // Transaction 2: Expired yesterday
    const expiredDate1 = new Date();
    expiredDate1.setDate(expiredDate1.getDate() - 1);
    await client.query(`
      INSERT INTO transactions (customer_id, tenant_id, amount_spent, points_earned, remaining_points, expires_at, created_at, updated_at)
      VALUES ($1, $2, 30.00, 30, 30, $3, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days')
    `, [customerId, tenantId, expiredDate1.toISOString()]);
    console.log("Inserted 1 expired transaction (30 points)");

    // Transaction 3: Expired yesterday
    await client.query(`
      INSERT INTO transactions (customer_id, tenant_id, amount_spent, points_earned, remaining_points, expires_at, created_at, updated_at)
      VALUES ($1, $2, 20.00, 20, 20, $3, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days')
    `, [customerId, tenantId, expiredDate1.toISOString()]);
    console.log("Inserted 1 expired transaction (20 points)");

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
