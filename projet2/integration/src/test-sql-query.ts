/**
 * test-sql-query.ts
 * A simple test script to verify SQL query functionality
 */

import { Mediator } from './mediator/Mediator';
import { SQLAdapter } from './adapters/SQLAdapter';
import { XMLAdapter } from './adapters/XMLAdapter';
import { Neo4jAdapter } from './adapters/Neo4jAdapter';
import config from './config';

// Function to verify connection to SQL database
async function verifyConnectionToSQL(adapter: SQLAdapter): Promise<boolean> {
  console.log("Verifying connection to SQL database...");
  
  try {
    if (!adapter.isConnected()) {
      console.log("SQL adapter not connected. Attempting to connect...");
      await adapter.connect();
    }
    
    if (!adapter.isConnected()) {
      console.error("Failed to connect to SQL database even after connection attempt.");
      return false;
    }
    
    // Test a simple query to verify the connection is working
    console.log("Testing SQL connection with a simple query...");
    const clients = await adapter.getClients();
    console.log(`SQL connection verified: Retrieved ${clients.getItems().length} clients.`);
    
    return true;
  } catch (error) {
    console.error("SQL Connection verification failed:", error);
    return false;
  }
}

async function runTest() {
  console.log("Starting SQL Query Test");
  
  // Create and configure the mediator
  const mediator = new Mediator();
  
  // Add adapters with configuration from environment variables
  const sqlAdapter = new SQLAdapter(
    'SQL_SOURCE',
    config.sql.host,
    config.sql.user,
    config.sql.password,
    config.sql.database,
    config.sql.port
  );
  
  const xmlAdapter = new XMLAdapter(
    'XML_SOURCE',
    config.xml.filePath
  );
  
  const neo4jAdapter = new Neo4jAdapter(
    'NEO4J_SOURCE',
    config.neo4j.url,
    config.neo4j.username,
    config.neo4j.password,
    config.neo4j.database
  );
  
  mediator.addAdapter(sqlAdapter);
  mediator.addAdapter(xmlAdapter);
  mediator.addAdapter(neo4jAdapter);
  
  // Initialize the query processor
  mediator.initQueryProcessor();
  
  try {
    // Verify SQL connection specifically
    const sqlConnectionVerified = await verifyConnectionToSQL(sqlAdapter);
    if (!sqlConnectionVerified) {
      throw new Error("SQL connection verification failed. Cannot proceed with tests.");
    }
    
    // Connect to all data sources
    console.log("Connecting to all data sources...");
    await mediator.connect();
    console.log("Connected successfully");
    
    // Test queries
    const testQueries = [
      {
        name: "Simple Select",
        query: "SELECT * FROM clients LIMIT 5"
      },
      {
        name: "Filter Query",
        query: "SELECT * FROM employees WHERE poste = 'Manager' LIMIT 5"
      },
      {
        name: "Join Query",
        query: "SELECT c.nom_complet, c.email_contact, o.date_commande, o.statut FROM commandes o JOIN clients c ON o.client_ref = c.id LIMIT 5"
      },
      {
        name: "Aggregation Query",
        query: "SELECT categorie, COUNT(*) as product_count FROM produits GROUP BY categorie ORDER BY product_count DESC"
      }
    ];
    
    // Execute test queries
    for (const test of testQueries) {
      console.log(`\n==== Test: ${test.name} ====`);
      console.log(`Query: ${test.query}`);
      
      try {
        const startTime = Date.now();
        const results = await mediator.executeQuery(test.query);
        const endTime = Date.now();
        
        console.log(`Execution time: ${endTime - startTime}ms`);
        console.log(`Result count: ${results.length}`);
        
        // Print sample results (first 2 records)
        if (results.length > 0) {
          console.log("Sample results:");
          console.log(JSON.stringify(results.slice(0, 2), null, 2));
        } else {
          console.log("No results returned");
        }
        
        console.log("Test PASSED");
      } catch (error) {
        if (error instanceof Error) {
          console.error(`Test FAILED: ${error.message}`);
        } else {
          console.error(`Test FAILED: ${String(error)}`);
        }
      }
    }
    
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    // Disconnect from data sources
    mediator.disconnect();
    console.log("\nDisconnected from data sources");
  }
}

// Run the test
runTest().catch(console.error);