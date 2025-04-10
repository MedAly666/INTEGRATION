import * as mysql from 'mysql2/promise';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function setupDatabase() {
  // First try to connect without specifying a database to check MySQL server status
  try {
    console.log('Checking MySQL connection...');
    const rootConnection = await mysql.createConnection({
      host: 'localhost',
      user: 'medaly',
      password: 'root'
    });
    
    console.log('MySQL server is running!');
    
    // Check if the database exists, if not create it
    const [rows] = await rootConnection.query('SHOW DATABASES LIKE ?', ['MAGASIN_XML']);
    
    if (Array.isArray(rows) && rows.length === 0) {
      console.log('Database MAGASIN_XML does not exist, creating it...');
      await rootConnection.query('CREATE DATABASE MAGASIN_XML');
      console.log('Database created successfully!');
    } else {
      console.log('Database MAGASIN_XML already exists');
    }
    
    await rootConnection.end();
    
    // Import the SQL schema
    console.log('Importing schema...');
    const schemaPath = path.resolve(__dirname, 'schema_xml.sql');
    if (fs.existsSync(schemaPath)) {
      await execAsync(`mysql -u medaly -proot MAGASIN_XML < ${schemaPath}`);
      console.log('Schema imported successfully!');
    } else {
      console.error(`Schema file not found: ${schemaPath}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('MySQL connection error:', error.message);
    console.log('\nSuggested fixes:');
    console.log('1. Make sure MySQL server is running:');
    console.log('   $ sudo systemctl status mysql');
    console.log('   $ sudo systemctl start mysql');
    console.log('2. Check your username and password are correct');
    console.log('3. Try running this command to verify credentials:');
    console.log('   $ mysql -u medaly -proot');
    console.log('4. If needed, create or reset the user:');
    console.log('   $ sudo mysql');
    console.log('   mysql> CREATE USER IF NOT EXISTS \'medaly\'@\'localhost\' IDENTIFIED BY \'root\';');
    console.log('   mysql> GRANT ALL PRIVILEGES ON *.* TO \'medaly\'@\'localhost\';');
    console.log('   mysql> FLUSH PRIVILEGES;');
    return false;
  }
}

// Run the database setup function
setupDatabase().then(success => {
  if (success) {
    console.log('Database setup complete. Running the import script...');
    // Import the app module directly after successful setup
    import('./app.js');
  } else {
    console.log('Database setup failed. Please fix the issues and try again.');
    process.exit(1);
  }
});