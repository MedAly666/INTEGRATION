/**
 * config.ts
 * Configuration management for the application
 */

interface Config {
  port: number;
  sql: {
    host: string;
    user: string;
    password: string;
    database: string;
    port: number;
    connectionLimit: number;
    connectTimeout: number;
    acquireTimeout: number;
  };
  xml: {
    filePath: string;
  };
  neo4j: {
    url: string;
    username: string;
    password: string;
    database: string;
  };
  debug: boolean;
}

// Load and parse environment variables
const config: Config = {
  port: parseInt(process.env.PORT || '3000'),
  sql: {
    host: process.env.SQL_HOST || 'localhost',
    user: process.env.SQL_USER || 'root',
    password: process.env.SQL_PASSWORD || 'root',
    database: process.env.SQL_DATABASE || 'MAGASIN_SQL',
    port: parseInt(process.env.SQL_PORT || '3306'),
    connectionLimit: parseInt(process.env.SQL_CONNECTION_LIMIT || '10'),
    connectTimeout: parseInt(process.env.SQL_CONNECT_TIMEOUT || '20000'), // Increased from default 10000ms
    acquireTimeout: parseInt(process.env.SQL_ACQUIRE_TIMEOUT || '20000')  // Increased from default 10000ms
  },
  xml: {
    filePath: process.env.XML_FILE || '/media/medaly/A4B4A33BB4A30F3C/TP/INTEGRATION/projet2/xml/data-03.xml',
  },
  neo4j: {
    url: `neo4j://${process.env.NEO4J_HOST || 'localhost'}:${process.env.NEO4J_PORT || '7687'}`,
    username: process.env.NEO4J_USERNAME || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'neo4j',
    database: process.env.NEO4J_DATABASE || 'neo4j',
  },
  debug: process.env.DEBUG === 'true',
};

export default config;