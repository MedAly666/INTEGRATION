/**
 * server.ts
 * Main entry point for the Bun-based TypeScript data integration server
 */

import { Mediator } from './mediator/Mediator';
import { SQLAdapter } from './adapters/SQLAdapter';
import { XMLAdapter } from './adapters/XMLAdapter';
import { Neo4jAdapter } from './adapters/Neo4jAdapter';
import config from './config';
import { renderFile } from 'pug';
import { join } from 'path';

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

// Add adapters to the mediator
mediator.addAdapter(sqlAdapter);
mediator.addAdapter(xmlAdapter);
mediator.addAdapter(neo4jAdapter);

// Initialize the query processor
mediator.initQueryProcessor();

// Helper function to render Pug templates
async function renderPug(templatePath: string, options: any = {}): Promise<Response> {
  try {
    const fullPath = join(import.meta.dir, 'views', `${templatePath}.pug`);
    const html = renderFile(fullPath, options);
    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    });
  } catch (error) {
    console.error('Error rendering template:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(`Error rendering template: ${errorMessage}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Function to verify all connections before starting the server
async function verifyConnections(): Promise<boolean> {
  console.log('Verifying connections to all data sources...');
  
  try {
    console.log('Connecting to data sources...');
    const connected = await mediator.connect();
    
    if (!connected) {
      console.error('Failed to connect to one or more data sources.');
      return false;
    }
    
    console.log('Successfully connected to all data sources.');
    
    // Test basic queries to verify the connections are working properly
    console.log('Testing SQL connection...');
    try {
      const clients = await sqlAdapter.getClients();
      console.log(`SQL connection verified: Retrieved ${clients.getItems().length} clients.`);
    } catch (error) {
      console.error('SQL connection test failed:', error);
      return false;
    }
    
    console.log('Testing XML connection...');
    try {
      const xmlClients = await xmlAdapter.getClients();
      console.log(`XML connection verified: Retrieved ${xmlClients.getItems().length} clients.`);
    } catch (error) {
      console.error('XML connection test failed:', error);
      return false;
    }
    
    console.log('Testing Neo4j connection...');
    try {
      const neo4jClients = await neo4jAdapter.getClients();
      console.log(`Neo4j connection verified: Retrieved ${neo4jClients.getItems().length} clients.`);
    } catch (error) {
      console.error('Neo4j connection test failed:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error verifying connections:', error);
    return false;
  }
}

// Start server after verifying connections
async function startServer() {
  // Verify connections first
  const connectionsVerified = await verifyConnections();
  
  if (!connectionsVerified) {
    console.error('Connection verification failed. Server will not start.');
    process.exit(1);
  }
  
  // Create a simple HTTP server using Bun
  const server = Bun.serve({
    port: config.port,
    async fetch(req) {
      const url = new URL(req.url);
      const path = url.pathname;
      
      // Handle different routes
      try {
        // Health check endpoint
        if (path === '/health') {
          return new Response(JSON.stringify({ 
            status: 'ok',
            connections: {
              sql: sqlAdapter.isConnected(),
              xml: xmlAdapter.isConnected(),
              neo4j: neo4jAdapter.isConnected()
            }
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // Serve SQL interface with Pug
        if (path === '/sql' || path === '/sql-interface') {
          return await renderPug('sql-interface', {
            title: 'SQL Query Interface - Data Integration System'
          });
        }
        
        // API routes
        if (path.startsWith('/api/')) {
          const apiPath = path.substring(5); // Remove '/api/' from the path
          
          // Get clients
          if (apiPath === 'clients') {
            const clients = await mediator.getClients();
            return new Response(JSON.stringify(clients.getItems()), {
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          // Get employees
          if (apiPath === 'employees') {
            const employees = await mediator.getEmployees();
            return new Response(JSON.stringify(employees.getItems()), {
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          // Get agencies
          if (apiPath === 'agences') {
            const agences = await mediator.getAgences();
            return new Response(JSON.stringify(agences.getItems()), {
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          // Get suppliers
          if (apiPath === 'fournisseurs') {
            const fournisseurs = await mediator.getFournisseurs();
            return new Response(JSON.stringify(fournisseurs.getItems()), {
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          // Get products
          if (apiPath === 'produits') {
            const produits = await mediator.getProduits();
            return new Response(JSON.stringify(produits.getItems()), {
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          // Get orders
          if (apiPath === 'commandes') {
            const commandes = await mediator.getCommandes();
            return new Response(JSON.stringify(commandes.getItems()), {
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          // Get order details
          if (apiPath === 'details-commande') {
            const details = await mediator.getDetailsCommande();
            return new Response(JSON.stringify(details.getItems()), {
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          // Search clients by name
          if (apiPath === 'search/clients') {
            const params = url.searchParams;
            const query = params.get('q') || '';
            const clients = await mediator.searchClientsByName(query);
            return new Response(JSON.stringify(clients.getItems()), {
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          // Get orders for a specific client
          if (apiPath.startsWith('clients/') && apiPath.includes('/commandes')) {
            const clientId = apiPath.split('/')[1];
            const orders = await mediator.getOrdersByClient(clientId);
            return new Response(JSON.stringify(orders.getItems()), {
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          // Get order details for a specific order
          if (apiPath.startsWith('commandes/') && apiPath.includes('/details')) {
            const orderId = apiPath.split('/')[1];
            const details = await mediator.getOrderDetails(orderId);
            return new Response(JSON.stringify(details.getItems()), {
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          // Get data statistics
          if (apiPath === 'statistics') {
            const stats = await mediator.getDataStatistics();
            return new Response(JSON.stringify(stats), {
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          // Validate data consistency
          if (apiPath === 'validate') {
            const result = await mediator.validateDataConsistency();
            return new Response(JSON.stringify(result), {
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          // Find potential duplicate clients
          if (apiPath === 'duplicates/clients') {
            const duplicates = await mediator.findPotentialDuplicateClients();
            return new Response(JSON.stringify(duplicates), {
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          // Execute a custom query
          if (apiPath === 'query') {
            if (req.method !== 'POST') {
              return new Response(JSON.stringify({ error: 'Method not allowed' }), {
                status: 405,
                headers: { 'Content-Type': 'application/json' }
              });
            }
            
            try {
              const body = await req.json();
              const { query, parameters } = body;
              
              if (!query) {
                return new Response(JSON.stringify({ error: 'Query is required' }), {
                  status: 400,
                  headers: { 'Content-Type': 'application/json' }
                });
              }
              
              const results = await mediator.executeQuery(query, parameters || {});
              
              
              return new Response(JSON.stringify(results), {
                headers: { 'Content-Type': 'application/json' }
              });
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              return new Response(JSON.stringify({ error: errorMessage }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
              });
            }
          }
          
          // API endpoint not found
          return new Response(JSON.stringify({ error: 'API endpoint not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // Serve the home page with Pug
        if (path === '/') {
          return await renderPug('index', {
            title: 'Data Integration System'
          });
        }
        
        // Not found for other routes
        return new Response('Not found', { status: 404 });
        
      } catch (error) {
        console.error('Error handling request:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  });

  console.log(`Server running at http://localhost:${server.port}`);
  console.log('All connections verified and ready to go!');
}

// Start the server
startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  try {
    await mediator.disconnect();
    console.log('All connections closed.');
  } catch (error) {
    console.error('Error during shutdown:', error);
  }
  process.exit(0);
});