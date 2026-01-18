const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function run() {
    try {
        const file = path.resolve(__dirname, 'db-init.sql');
        const sqlText = fs.readFileSync(file, 'utf8');

        const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
        if (!connectionString) {
            console.error('DATABASE_URL or POSTGRES_URL is not set');
            process.exit(1);
        }

        // Use a short connection timeout so the script fails fast in blocked networks
        const pool = new Pool({ connectionString, connectionTimeoutMillis: 5000, idleTimeoutMillis: 5000 });
        let client;
        try {
            console.log('Attempting to connect to DB (timeout 5s)...');
            client = await pool.connect();
            console.log('Connected — running migrations...');
            // run migration with a statement timeout guard
            await client.query('SET statement_timeout = 5000');
            await client.query(sqlText);
            console.log('Migrations executed');
        } catch (err) {
            console.error('Migration failed:', err && err.message ? err.message : err);
            if (err && err.stack) console.error(err.stack);
            process.exit(1);
        } finally {
            try { if (client) client.release(); } catch (e) { }
            try { await pool.end(); } catch (e) { }
        }
    } catch (err) {
        console.error('Migration failed', err);
        process.exit(1);
    }
}

run();
