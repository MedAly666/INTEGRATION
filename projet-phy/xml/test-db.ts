import * as mariadb from 'mariadb';

async function testConnection() {
  try {
    console.log('Attempting to connect to database...');
    
    // Try connecting without a pool first
    const conn = await mariadb.createConnection({
      host: 'localhost',
      user: 'medaly',
      password: 'root',
      connectTimeout: 5000
    });
    
    console.log('Successfully connected to MariaDB!');
    console.log('Connection ID:', conn.threadId);
    
    // Check if database exists
    const rows = await conn.query(`SHOW DATABASES LIKE 'MAGASIN_XML'`);
    if (rows.length > 0) {
      console.log('Database MAGASIN_XML exists');
    } else {
      console.log('Database MAGASIN_XML does not exist');
      console.log('Creating database...');
      await conn.query('CREATE DATABASE IF NOT EXISTS MAGASIN_XML');
      console.log('Database created successfully');
    }
    
    await conn.end();
    return true;
  } catch (error) {
    console.error('Connection failed:', error);
    console.log('\nPossible solutions:');
    console.log('1. Make sure MariaDB/MySQL is running:');
    console.log('   $ sudo systemctl status mariadb');
    console.log('   $ sudo systemctl status mysql');
    console.log('2. Start the service if it\'s not running:');
    console.log('   $ sudo systemctl start mariadb');
    console.log('   $ sudo systemctl start mysql');
    console.log('3. Check user credentials:');
    console.log('   $ mysql -u medaly -proot');
    console.log('4. Create the user if needed:');
    console.log('   $ sudo mysql');
    console.log('   > CREATE USER IF NOT EXISTS \'medaly\'@\'localhost\' IDENTIFIED BY \'root\';');
    console.log('   > GRANT ALL PRIVILEGES ON *.* TO \'medaly\'@\'localhost\';');
    console.log('   > FLUSH PRIVILEGES;');
    return false;
  }
}

testConnection().then(success => {
  if (success) {
    console.log('Connection test successful!');
  } else {
    console.log('Connection test failed.');
  }
});