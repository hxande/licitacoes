const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function run() {
    const file = path.resolve(__dirname, 'db-init.sql');
    const sqlText = fs.readFileSync(file, 'utf8');

    const connectionString =
        process.env.DATABASE_URL ||
        process.env.POSTGRES_URL ||
        process.env.LICITACOES__POSTGRES_URL;

    if (!connectionString) {
        console.error('No database connection string found');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString,
        connectionTimeoutMillis: 5000,
    });

    let client;

    try {
        console.log('Connecting to database...');
        client = await pool.connect();
        console.log('Connected.');

        // Opcional, mas útil
        await client.query('SET statement_timeout = 30000');

        console.log('Running migrations...');
        await client.query(sqlText);

        console.log('Migrations completed successfully ✅');
    } catch (err) {
        console.error('❌ Migration failed');
        console.error(err.message);
        if (err.stack) console.error(err.stack);
        process.exit(1);
    } finally {
        if (client) client.release();
        await pool.end();
    }
}

run();
