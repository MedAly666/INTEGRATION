import * as fs from 'fs';
import * as xml2js from 'xml2js';
import * as mariadb from 'mariadb';

async function importXMLDataToMySQL() {
  // Parse XML file
  const xmlFile = fs.readFileSync('/media/medaly/A4B4A33BB4A30F3C/TP/INTEGRATION/projet/xml/data-03.xml', 'utf8');
  const parser = new xml2js.Parser({ explicitArray: false });
  const parsedData = await parser.parseStringPromise(xmlFile);
  
  let connection;
  try {
    // Create connection pool using mariadb
    const pool = mariadb.createPool({
      socketPath: '/var/run/mysqld/mysqld.sock',  // Use socket path instead of host
      // Only include one of these connection methods:
      // socketPath: '/var/run/mysqld/mysqld.sock',  
      // OR
      // host: 'localhost', 
      user: 'root',
      password: 'root',
      database: 'MAGASIN_XML',
      connectionLimit: 5
    });

    // Get connection from pool
    connection = await pool.getConnection();
    console.log('Connected to MySQL database');

    // Start transaction
    await connection.beginTransaction();

    // Process and insert clients
    console.log('Inserting clients...');
    const clients = parsedData.Vente.clients.client;
    for (const client of Array.isArray(clients) ? clients : [clients]) {
      await connection.query(
        'INSERT INTO clients (id, nom, courriel, telephone) VALUES (?, ?, ?, ?)',
        [client.id, client.nom, client.courriel, client.telephone]
      );
    }

    // Process and insert employes
    console.log('Inserting employes...');
    const employes = parsedData.Vente.employes?.employe;
    if (employes) {
      for (const employe of Array.isArray(employes) ? employes : [employes]) {
        await connection.query(
          'INSERT INTO employes (id, nom, email) VALUES (?, ?, ?)',
          [employe.id, employe.nom, employe.email]
        );
      }
    }

    // Process and insert fournisseurs
    console.log('Inserting fournisseurs...');
    const fournisseurs = parsedData.Vente.fournisseurs?.fournisseur;
    if (fournisseurs) {
      for (const fournisseur of Array.isArray(fournisseurs) ? fournisseurs : [fournisseurs]) {
        await connection.query(
          'INSERT INTO fournisseurs (id, nom, telephone, adresse) VALUES (?, ?, ?, ?)',
          [fournisseur.id, fournisseur.nom, fournisseur.telephone, fournisseur.adresse]
        );
      }
    }

    // Process and insert produits
    console.log('Inserting produits...');
    const produits = parsedData.Vente.produits?.produit;
    if (produits) {
      for (const produit of Array.isArray(produits) ? produits : [produits]) {
        await connection.query(
          'INSERT INTO produits (id, description, prix, categorie, quantite_totale, id_fournisseur) VALUES (?, ?, ?, ?, ?, ?)',
          [
            produit.id,
            produit.description,
            produit.prix,
            produit.categorie,
            produit.quantite_totale,
            produit.id_fournisseur
          ]
        );
      }
    }

    // Process and insert commandes
    console.log('Inserting commandes...');
    const commandes = parsedData.Vente.commandes?.commande;
    if (commandes) {
      for (const commande of Array.isArray(commandes) ? commandes : [commandes]) {
        await connection.query(
          'INSERT INTO commandes (id, date, montant, statut, mode_paiement, clientID, employeID) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            commande.id,
            commande.date,
            commande.montant,
            commande.statut,
            commande.mode_paiement,
            commande.clientID,
            commande.employeID
          ]
        );
      }
    }
    
    // ADD MISSING DATA TYPES: PANIERS, FACTURES, LIVRAISONS
    
    // Process and insert paniers
    console.log('Inserting paniers...');
    const paniers = parsedData.Vente.paniers?.panier;
    if (paniers) {
      for (const panier of Array.isArray(paniers) ? paniers : [paniers]) {
        await connection.query(
          'INSERT INTO paniers (id_commande, id_produit, nombre) VALUES (?, ?, ?)',
          [
            panier.id_commande,
            panier.id_produit,
            panier.nombre
          ]
        );
      }
    }
    
    // Process and insert factures
    console.log('Inserting factures...');
    const factures = parsedData.Vente.factures?.facture;
    if (factures) {
      for (const facture of Array.isArray(factures) ? factures : [factures]) {
        await connection.query(
          'INSERT INTO factures (id, montant, date, commandeID) VALUES (?, ?, ?, ?)',
          [
            facture.id,
            facture.montant,
            facture.date,
            facture.commandeID
          ]
        );
      }
    }
    
    // Process and insert livraisons
    console.log('Inserting livraisons...');
    const livraisons = parsedData.Vente.livraisons?.livraison;
    if (livraisons) {
      for (const livraison of Array.isArray(livraisons) ? livraisons : [livraisons]) {
        await connection.query(
          'INSERT INTO livraisons (id, transporteur, statut, commandeID) VALUES (?, ?, ?, ?)',
          [
            livraison.id,
            livraison.transporteur,
            livraison.statut,
            livraison.commandeID
          ]
        );
      }
    }

    // Commit transaction
    await connection.commit();
    console.log('All data successfully imported!');
    
  } catch (error) {
    console.error('Error:', error);
    // Rollback on error
    if (connection) await connection.rollback();
  } finally {
    // Release connection
    if (connection) await connection.release();
    console.log('Database connection closed');
  }
}

// Run the import function
importXMLDataToMySQL().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});