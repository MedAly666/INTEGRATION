/**
 * server.ts
 * Main entry point for the Bun-based TypeScript data integration server using Hono
 */

import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { renderFile } from 'pug';
import { join } from 'path';

import { Mediator } from './mediator/Mediator';
import { SQLAdapter } from './adapters/SQLAdapter';
import { XMLAdapter } from './adapters/XMLAdapter';
import { Neo4jAdapter } from './adapters/Neo4jAdapter';
import config from './config';

// Create Hono app
const app = new Hono();

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
async function renderPug(templatePath: string, options: any = {}): Promise<string> {
  try {
    const fullPath = join(import.meta.dir, 'views', `${templatePath}.pug`);
    return renderFile(fullPath, options);
  } catch (error) {
    console.error('Error rendering template:', error);
    throw error;
  }
}

// Health check endpoint
app.get('/health', async (c) => {
  return c.json({ 
    status: 'ok',
    connections: {
      sql: sqlAdapter.isConnected(),
      xml: xmlAdapter.isConnected(),
      neo4j: neo4jAdapter.isConnected()
    }
  });
});

// Static files middleware for public directory
app.use('/public/*', serveStatic({ root: './public' }));

// Main routes
app.get('/', async (c) => {
  const html = await renderPug('index', {
    title: 'Data Integration System'
  });
  return c.html(html);
});

app.get('/sql-interface', async (c) => {
  const html = await renderPug('sql-interface', {
    title: 'SQL Query Interface - Data Integration System'
  });
  return c.html(html);
});

app.get('/sql-chat', async (c) => {
  const html = await renderPug('sql-chat', {
    title: 'SQL Chat - Data Integration System'
  });
  return c.html(html);
});

app.get('/tables', async (c) => {
  const html = await renderPug('tables', {
    title: 'Database Tables - Data Integration System'
  });
  return c.html(html);
});

app.get('/reconciliation', async (c) => {
  const html = await renderPug('reconciliation', {
    title: 'Data Reconciliation',
    active: 'reconciliation'
  });
  return c.html(html);
});

// API Routes
const api = new Hono();

api.get('/clients', async (c) => {
  const clients = await mediator.getClients();
  return c.json(clients.getItems());
});

api.get('/employees', async (c) => {
  const employees = await mediator.getEmployees();
  return c.json(employees.getItems());
});

api.get('/agences', async (c) => {
  const agences = await mediator.getAgences();
  return c.json(agences.getItems());
});

api.get('/fournisseurs', async (c) => {
  const fournisseurs = await mediator.getFournisseurs();
  return c.json(fournisseurs.getItems());
});

api.get('/produits', async (c) => {
  const produits = await mediator.getProduits();
  return c.json(produits.getItems());
});

api.get('/commandes', async (c) => {
  const commandes = await mediator.getCommandes();
  return c.json(commandes.getItems());
});

api.get('/details-commande', async (c) => {
  const details = await mediator.getDetailsCommande();
  return c.json(details.getItems());
});

api.get('/factures', async (c) => {
  const factures = await mediator.getFactures();
  return c.json(factures.getItems());
});

api.get('/livraisons', async (c) => {
  const livraisons = await mediator.getLivraisons();
  return c.json(livraisons.getItems());
});

api.get('/approvisionnements', async (c) => {
  const approvisionnements = await mediator.getApprovisionnements();
  return c.json(approvisionnements.getItems());
});

api.get('/search/clients', async (c) => {
  const query = c.req.query('q') || '';
  const clients = await mediator.searchClientsByName(query);
  return c.json(clients.getItems());
});

api.get('/clients/:id/commandes', async (c) => {
  const clientId = c.req.param('id');
  const orders = await mediator.getOrdersByClient(clientId);
  return c.json(orders.getItems());
});

api.get('/commandes/:id/details', async (c) => {
  const orderId = c.req.param('id');
  const details = await mediator.getOrderDetails(orderId);
  return c.json(details.getItems());
});

api.get('/statistics', async (c) => {
  const stats = await mediator.getDataStatistics();
  return c.json(stats);
});

api.get('/validate', async (c) => {
  const result = await mediator.validateDataConsistency();
  return c.json(result);
});

api.get('/duplicates/clients', async (c) => {
  const duplicates = await mediator.findPotentialDuplicateClients();
  return c.json(duplicates);
});

api.post('/query', async (c) => {
  try {
    const body = await c.req.json();
    const { query, parameters = {} } = body;
    
    if (!query) {
      return c.json({ error: 'Query is required' }, 400);
    }
    
    const results = await mediator.executeQuery(query, parameters);
    return c.json(results);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 400);
  }
});

api.get('/reconciliation/stats', async (c) => {
  try {
    const dupeClients = await mediator.findPotentialDuplicateClients();
    const stats = {
      totalReconciliations: dupeClients.length,
      confidenceBreakdown: {
        high: dupeClients.filter(d => d.confidenceScore >= 0.9).length,
        medium: dupeClients.filter(d => d.confidenceScore >= 0.7 && d.confidenceScore < 0.9).length,
        low: dupeClients.filter(d => d.confidenceScore < 0.7).length
      },
      recentDuplicates: dupeClients
        .sort((a, b) => b.confidenceScore - a.confidenceScore)
        .slice(0, 10)
    };
    return c.json(stats);
  } catch (error) {
    return c.json({ error: 'Failed to fetch reconciliation stats' }, 500);
  }
});

// Mount API routes under /api
app.route('/api', api);

// Error handling middleware
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json({
    error: 'Internal server error',
    message: err.message
  }, 500);
});

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
    
    // Test basic queries
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
  const connectionsVerified = await verifyConnections();
  
  if (!connectionsVerified) {
    console.error('Connection verification failed. Server will not start.');
    process.exit(1);
  }
  
  // Start Hono server
  const port = config.port;
  console.log(`Server starting on http://localhost:${port}`);
  
  Bun.serve({
    port,
    fetch: app.fetch
  });
  
  console.log('All connections verified and ready to go!');
}

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

// Start the server
startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});