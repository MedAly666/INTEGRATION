import * as neo4j from 'neo4j-driver';
import * as mariadb from 'mariadb';
import * as fs from 'fs';

// Helper function to convert Neo4j integers to JavaScript numbers
function convertNeo4jTypes(value: any): any {
  if (neo4j.isInt(value)) {
    return value.toNumber();
  } else if (Array.isArray(value)) {
    return value.map(item => convertNeo4jTypes(item));
  } else if (value && typeof value === 'object') {
    const result: Record<string, any> = {};
    for (const key in value) {
      result[key] = convertNeo4jTypes(value[key]);
    }
    return result;
  }
  return value;
}

async function migrateDataFromNeo4jToMySQL() {
  // Neo4j connection
  const neo4jDriver = neo4j.driver(
    'neo4j://localhost:7687', 
    neo4j.auth.basic('neo4j', 'neo4j') // Replace with your Neo4j credentials
  );
  
  let connection;
  try {
    // MariaDB connection using socket
    console.log('Connecting to MariaDB...');
    const pool = mariadb.createPool({
      socketPath: '/var/run/mysqld/mysqld.sock',  // Unix socket connection
      user: 'root',
      password: 'root',
      multipleStatements: true // Enable multiple statements for batch operations
    });
    
    // Get connection from pool
    connection = await pool.getConnection();
    
    // Create database if not exists
    await connection.query('CREATE DATABASE IF NOT EXISTS MAGASIN_NEO4J');
    await connection.query('USE MAGASIN_NEO4J');
    
    console.log('Connected to both Neo4j and MariaDB databases');
    
    // Create MySQL schema
    const schemaPath = '/media/medaly/A4B4A33BB4A30F3C/TP/INTEGRATION/projet/neo4j/schema_neo4j.sql';
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    await connection.query(schemaSQL);
    console.log('MariaDB schema created successfully');
    
    const neo4jSession = neo4jDriver.session();
    
    // 1. Migrate Clients
    console.log('Migrating Clients...');
    const clientsResult = await neo4jSession.run('MATCH (c:Client) RETURN c');
    console.log(clientsResult);
    
    for (const record of clientsResult.records) {
      const client = record.get('c').properties;
      await connection.query(
        'INSERT INTO client (id_client, nom, adresse, email, telephone) VALUES (?, ?, ?, ?, ?)',
        [
          client.id_client?.toString(),
          client.nom,
          client.adresse,
          client.email,
          client.téléphone
        ]
      );
    }
    
    // 2. Migrate Agencies
    console.log('Migrating Agencies...');
    const agenciesResult = await neo4jSession.run('MATCH (a:Agence) RETURN a');
    for (const record of agenciesResult.records) {
      const agency = record.get('a').properties;
      await connection.query(
        'INSERT INTO agence (id_agence, ville, adresse) VALUES (?, ?, ?)',
        [
          agency.id_agence?.toString(),
          agency.ville,
          agency.adresse
        ]
      );
    }
    
    // 3. Migrate Employees
    console.log('Migrating Employees...');
    const employeesResult = await neo4jSession.run('MATCH (e:Employé) RETURN e');
    for (const record of employeesResult.records) {
      const employee = record.get('e').properties;
      
      // Convert the salaire from Neo4j Integer to JavaScript number
      const salaire = neo4j.isInt(employee.salaire) 
        ? employee.salaire.toNumber() 
        : employee.salaire;
      
      const id = neo4j.isInt(employee.id_employe) 
        ? employee.id_employe.toNumber().toString() 
        : employee.id_employe.toString();
      
      await connection.query(
        'INSERT INTO employe (id_employe, nom, email, poste, salaire) VALUES (?, ?, ?, ?, ?)',
        [
          id,
          employee.nom,
          employee.email,
          employee.poste,
          salaire
        ]
      );
    }
    
    // 4. Migrate Suppliers
    console.log('Migrating Suppliers...');
    const suppliersResult = await neo4jSession.run('MATCH (f:Fournisseur) RETURN f');
    for (const record of suppliersResult.records) {
      const supplier = record.get('f').properties;
      
      const id = neo4j.isInt(supplier.id_fournisseur) 
        ? supplier.id_fournisseur.toNumber().toString() 
        : supplier.id_fournisseur.toString();
      
      await connection.query(
        'INSERT INTO fournisseur (id_fournisseur, nom, telephone, adresse) VALUES (?, ?, ?, ?)',
        [
          id,
          supplier.nom,
          supplier.téléphone,
          supplier.adresse
        ]
      );
    }
    
    // 5. Migrate Products
    console.log('Migrating Products...');
    const productsResult = await neo4jSession.run('MATCH (p:Produit) RETURN p');
    for (const record of productsResult.records) {
      const product = record.get('p').properties;
      await connection.query(
        'INSERT INTO produit (id_produit, description, prix, categorie) VALUES (?, ?, ?, ?)',
        [
          product.id_produit?.toString(),
          product.description,
          product.prix,
          product.catégorie
        ]
      );
    }
    
    // 6. Migrate Orders (with client relationship)
    console.log('Migrating Orders...');
    const ordersResult = await neo4jSession.run(`
      MATCH (c:Client)-[:PASSE]->(o:Commande)
      RETURN o, c.id_client as clientId
    `);
    
    for (const record of ordersResult.records) {
      const order = record.get('o')?.properties;
      const clientId = record.get('clientId')?.toString();
      if (order && clientId) {
        await connection.query(
          'INSERT INTO commande (id_commande, date, montant, statut, mode_paiement, id_client) VALUES (?, ?, ?, ?, ?, ?)',
          [
            order.id_commande?.toString(),
            order.date,
            order.montant,
            order.statut,
            order.mode_paiement,
            clientId
          ]
        );
      }
    }
    
    // 7. Migrate Invoices
    console.log('Migrating Invoices...');
    const invoicesResult = await neo4jSession.run(`
      MATCH (o:Commande)-[:FACTURE]->(f:Facture)
      RETURN f, o.id_commande as commandeId
    `);
    
    for (const record of invoicesResult.records) {
      const invoice = record.get('f')?.properties;
      const orderId = record.get('commandeId')?.toString();
      if (invoice && orderId) {
        await connection.query(
          'INSERT INTO facture (id_facture, montant_total, date, id_commande) VALUES (?, ?, ?, ?)',
          [
            invoice.id_facture?.toString(),
            invoice.montant_total,
            invoice.date,
            orderId
          ]
        );
      }
    }
    
    // 8. Migrate Deliveries
    console.log('Migrating Deliveries...');
    const deliveriesResult = await neo4jSession.run(`
      MATCH (o:Commande)-[:LIVREE_PAR]->(l:Livraison)
      RETURN l, o.id_commande as commandeId
    `);
    
    for (const record of deliveriesResult.records) {
      const delivery = record.get('l')?.properties;
      const orderId = record.get('commandeId')?.toString();
      if (delivery && orderId) {
        await connection.query(
          'INSERT INTO livraison (id_livraison, transporteur, date_estimee, statut, id_commande) VALUES (?, ?, ?, ?, ?)',
          [
            delivery.id_livraison?.toString(),
            delivery.transporteur,
            delivery.date_estimee,
            delivery.statut,
            orderId
          ]
        );
      }
    }
    
    // 9. Migrate Product-Supplier relationships
    console.log('Migrating Product-Supplier relationships...');
    const productSupplierResult = await neo4jSession.run(`
      MATCH (p:Produit)-[r:FOURNI_PAR]->(f:Fournisseur)
      RETURN p.id_produit as produitId, f.id_fournisseur as fournisseurId, r.quantité as quantite
    `);
    
    for (const record of productSupplierResult.records) {
      const produitId = record.get('produitId')?.toString();
      const fournisseurId = record.get('fournisseurId')?.toString();
      const quantite = record.get('quantite')?.toNumber() || 0;
      
      if (produitId && fournisseurId) {
        await connection.query(
          'INSERT INTO produit_fournisseur (id_produit, id_fournisseur, quantite) VALUES (?, ?, ?)',
          [produitId, fournisseurId, quantite]
        );
      }
    }
    
    // 10. Migrate Order-Product relationships
    console.log('Migrating Order-Product relationships...');
    const orderProductResult = await neo4jSession.run(`
      MATCH (o:Commande)-[r:DETAIL]->(p:Produit)
      RETURN o.id_commande as commandeId, p.id_produit as produitId, r.quantité as quantite
    `);
    
    for (const record of orderProductResult.records) {
      const commandeId = record.get('commandeId')?.toString();
      const produitId = record.get('produitId')?.toString();
      const quantite = record.get('quantite')?.toNumber() || 0;
      
      if (commandeId && produitId) {
        await connection.query(
          'INSERT INTO commande_produit (id_commande, id_produit, quantite) VALUES (?, ?, ?)',
          [commandeId, produitId, quantite]
        );
      }
    }
    
    // 11. Migrate Employee-Order relationships
    console.log('Migrating Employee-Order relationships...');
    const employeeOrderResult = await neo4jSession.run(`
      MATCH (e:Employé)-[:GERE]->(o:Commande)
      RETURN e.id_employe as employeId, o.id_commande as commandeId
    `);
    
    for (const record of employeeOrderResult.records) {
      const employeId = record.get('employeId')?.toString();
      const commandeId = record.get('commandeId')?.toString();
      
      if (employeId && commandeId) {
        await connection.query(
          'INSERT INTO employe_commande (id_employe, id_commande) VALUES (?, ?)',
          [employeId, commandeId]
        );
      }
    }
    
    // 12. Migrate Employee-Agency relationships
    console.log('Migrating Employee-Agency relationships...');
    const employeeAgencyResult = await neo4jSession.run(`
      MATCH (e:Employé)-[:TRAVAILLE_DANS]->(a:Agence)
      RETURN e.id_employe as employeId, a.id_agence as agenceId
    `);
    
    for (const record of employeeAgencyResult.records) {
      const employeId = record.get('employeId')?.toString();
      const agenceId = record.get('agenceId')?.toString();
      
      if (employeId && agenceId) {
        await connection.query(
          'INSERT INTO employe_agence (id_employe, id_agence) VALUES (?, ?)',
          [employeId, agenceId]
        );
      }
    }
    
    // 13. Migrate Agency-Director relationships
    console.log('Migrating Agency-Director relationships...');
    const agencyDirectorResult = await neo4jSession.run(`
      MATCH (a:Agence)-[:DIRIGEE_PAR]->(e:Employé)
      RETURN a.id_agence as agenceId, e.id_employe as employeId
    `);
    
    for (const record of agencyDirectorResult.records) {
      const agenceId = record.get('agenceId')?.toString();
      const employeId = record.get('employeId')?.toString();
      
      if (agenceId && employeId) {
        await connection.query(
          'INSERT INTO agence_directeur (id_agence, id_employe) VALUES (?, ?)',
          [agenceId, employeId]
        );
      }
    }
    
    console.log('Data migration from Neo4j to MariaDB completed successfully!');
    
  } catch (error) {
    console.error('Error during data migration:', error);
    console.error('SQL Error:', error.text);
    console.error('SQL Parameters:', error.parameters);
  } finally {
    // Close connections
    if (connection) await connection.release();
    await neo4jDriver.close();
    console.log('Database connections closed');
  }
}

// Run the migration
migrateDataFromNeo4jToMySQL().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});