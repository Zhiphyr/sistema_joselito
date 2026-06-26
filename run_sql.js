const db = require('./config/db');
const fs = require('fs');
const path = require('path');

async function run() {
    try {
        const sqlFilePath = path.join(__dirname, 'database', 'liquidaciones.sql');
        const sqlString = fs.readFileSync(sqlFilePath, 'utf8');
        
        // MySQL driver doesn't support multiple statements by default in execute,
        // but we can split by semicolon.
        const queries = sqlString.split(';').filter(q => q.trim() !== '');
        
        for (const query of queries) {
            await db.query(query);
            console.log('Query executed successfully');
        }
        
        console.log('Todas las tablas creadas correctamente.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}
run();
