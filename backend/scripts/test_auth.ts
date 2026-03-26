import db from '../src/infra/database/db';

async function testAuthUsers() {
  try {
    const res = await db.query('SELECT id, email FROM auth.users LIMIT 1');
    console.log(res.rows);
  } catch (e) {
    console.error(e.message);
  } finally {
    process.exit(0);
  }
}
testAuthUsers();