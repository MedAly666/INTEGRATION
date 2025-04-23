/**
 * SQLAdapter.ts
 * Adapter for SQL databases using mariadb package
 */

import mariadb, { Pool, PoolConnection } from 'mariadb';
import { IAdapter } from './IAdapter';
import {
  ClientCollection,
  Client,
  EmployeeCollection,
  Employee,
  AgenceCollection,
  Agence,
  FournisseurCollection,
  Fournisseur,
  ProduitCollection,
  Produit,
  CommandeCollection,
  Commande,
  DetailCommandeCollection,
  DetailCommande,
  FactureCollection,
  Facture,
  LivraisonCollection,
  Livraison,
  ApprovisionnementCollection,
  Approvisionnement
} from '../common/DataModel';
import * as fs from 'fs/promises';
import path from 'path';

export class SQLAdapter implements IAdapter {
  private pool: Pool | null = null;
  private connected: boolean = false;
  private sourceSystem: string = 'SQL';
  
  // Database connection settings
  private host: string;
  private user: string;
  private password: string;
  private database: string;
  private port: number;
  private connectionLimit: number;
  private connectTimeout: number;
  private acquireTimeout: number;
  
  /**
   * Constructor - Initialize with connection settings
   * 
   * @param sourceSystem Source system identifier
   * @param host Database host
   * @param user Database username
   * @param password Database password
   * @param database Database name
   * @param port Database port
   */
  constructor(
    sourceSystem: string,
    host: string = '127.0.0.1',
    user: string = 'root',
    password: string = 'root',
    database: string = 'MAGASIN_SQL',
    port: number = 3306
  ) {
    this.sourceSystem = sourceSystem;
    this.host = host;
    this.user = user;
    this.password = password;
    this.database = database;
    this.port = port;
    this.connectionLimit = 10;
    this.connectTimeout = 20000; // 20 seconds
    this.acquireTimeout = 20000; // 20 seconds
  }
  
  /**
   * Connect to the SQL database with retry mechanism
   * 
   * @returns Whether the connection was successful
   */
  public async connect(maxRetries: number = 3, retryDelay: number = 5000): Promise<boolean> {
    console.log(`Connecting to MySQL/MariaDB at ${this.host}:${this.port}...`);
    console.log(`Database: ${this.database}, User: ${this.user}`);
    
    let retryCount = 0;
    
    while (retryCount <= maxRetries) {
      try {
        // If this isn't the first attempt, log that we're retrying
        if (retryCount > 0) {
          console.log(`Retrying connection (attempt ${retryCount} of ${maxRetries})...`);
        }
        
        console.log(this.host, this.port, this.user, this.password, this.database);
        
        // Create a connection pool with improved settings
        this.pool = mariadb.createPool({
          host: this.host,
          port: this.port,
          user: this.user,
          password: this.password,
          database: this.database,
          connectionLimit: this.connectionLimit,
          connectTimeout: this.connectTimeout,
          acquireTimeout: this.acquireTimeout,
          idleTimeout: 60000, // Close idle connections after 60 seconds
          multipleStatements: true,
          trace: true, // Enable tracing for debugging
          resetAfterUse: true // Reset connection state after each use
        });
        
        // Test connection by getting a connection from the pool
        console.log("Getting connection from pool to test connectivity...");
        const connection = await this.pool.getConnection();
        console.log("Connection successful! Testing query execution...");
        
        // Execute a simple query to test connectivity
        const testResult = await connection.query('SELECT 1 as test');
        console.log("Test query executed successfully:", testResult);
        connection.release();
        
        this.connected = true;
        console.log(`Connected to SQL database (${this.database}) successfully.`);
        return true;
      } catch (error: unknown) {
        console.error(`SQL Connection Error (attempt ${retryCount + 1}):`, error);
        
        // If we've reached max retries, throw the error
        if (retryCount >= maxRetries) {
          this.connected = false;
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to connect to SQL database after ${maxRetries + 1} attempts: ${errorMessage}`);
        }
        
        // Otherwise wait and retry
        console.log(`Waiting ${retryDelay/1000} seconds before retrying...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        retryCount++;
      }
    }
    
    // This should never happen due to the throw in the catch block
    return false;
  }
  
  /**
   * Split SQL content into individual statements based on semicolons
   * 
   * @param sqlContent The full content of the SQL file
   * @returns Array of individual SQL statements
   */
  private splitSqlStatements(sqlContent: string): string[] {
    // Remove comments and split by semicolons
    const lines = sqlContent.split('\n');
    let cleanedContent = '';
    let inMultilineComment = false;
    
    for (const line of lines) {
      let processedLine = line;
      
      // Handle multi-line comments
      if (inMultilineComment) {
        const endCommentPos = processedLine.indexOf('*/');
        if (endCommentPos !== -1) {
          processedLine = processedLine.substring(endCommentPos + 2);
          inMultilineComment = false;
        } else {
          continue;
        }
      }
      
      // Remove single line comments
      processedLine = processedLine.replace(/--.*$/, '');
      
      // Handle start of multi-line comments
      const startCommentPos = processedLine.indexOf('/*');
      if (startCommentPos !== -1) {
        const endCommentPos = processedLine.indexOf('*/', startCommentPos);
        if (endCommentPos !== -1) {
          // Comment starts and ends on the same line
          processedLine = processedLine.substring(0, startCommentPos) + processedLine.substring(endCommentPos + 2);
        } else {
          // Comment starts but doesn't end on this line
          processedLine = processedLine.substring(0, startCommentPos);
          inMultilineComment = true;
        }
      }
      
      cleanedContent += processedLine + '\n';
    }
    
    // Split the content by semicolons, considering delimiter changes
    const statements: string[] = [];
    let currentStatement = '';
    let inString = false;
    let stringChar = '';
    let customDelimiter = ';';
    
    for (let i = 0; i < cleanedContent.length; i++) {
      const char = cleanedContent[i];
      
      // Handle string literals to avoid splitting on semicolons inside strings
      if ((char === "'" || char === '"') && (i === 0 || cleanedContent[i-1] !== '\\')) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }
      
      // Check for DELIMITER command
      if (!inString && currentStatement.trim().toUpperCase().startsWith('DELIMITER ')) {
        const delimiterParts = currentStatement.trim().split(/\s+/);
        if (delimiterParts.length >= 2) {
          customDelimiter = delimiterParts[1];
          currentStatement = '';
          continue;
        }
      }
      
      // Check for end of statement
      if (char === customDelimiter && !inString) {
        statements.push(currentStatement);
        currentStatement = '';
      } else {
        currentStatement += char;
      }
    }
    
    // Add the last statement if it doesn't end with the delimiter
    if (currentStatement.trim()) {
      statements.push(currentStatement);
    }
    
    return statements;
  }
  
  /**
   * Disconnect from the data source
   */
  public disconnect(): void {
    if (this.pool) {
      this.pool.end();
      this.pool = null;
    }
    this.connected = false;
    console.log('Disconnected from SQL data source.');
  }
  
  /**
   * Check if connected to the data source
   */
  public isConnected(): boolean {
    return this.connected;
  }
  
  /**
   * Get the source system identifier
   */
  public getSourceSystem(): string {
    return this.sourceSystem;
  }
  
  /**
   * Execute a SQL query
   * 
   * @param sql The SQL query to execute
   * @param params Optional parameters for the query
   * @returns Query results
   */
  private async executeQuery<T>(
    sql: string, 
    params: any[] = []
  ): Promise<T> {
    if (!this.connected || !this.pool) {
      throw new Error('Not connected to SQL database');
    }
    
    try {
      const results = await this.pool.query(sql, params);
      return results as T;
    } catch (error: unknown) {
      console.error('SQL Query Error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`SQL query failed: ${errorMessage}`);
    }
  }
  
  /**
   * Fetch clients data
   * 
   * @returns Collection of clients
   */
  public async getClients(): Promise<ClientCollection> {
    if (!this.connected) {
      throw new Error('Not connected to SQL database');
    }
    
    const collection = new ClientCollection();
    
    try {
      const results = await this.executeQuery<any[]>(
        `SELECT id_client, nom_complet, adresse, email_contact, numero_telephone 
         FROM Clients`
      );
      
      for (const row of results) {
        const client: Client = {
          id: `SQL_${row.id_client}`,
          sourceSystem: this.sourceSystem,
          nomComplet: row.nom_complet,
          adresse: row.adresse,
          emailContact: row.email_contact,
          numeroTelephone: row.numero_telephone,
        };
        
        collection.addItem(client);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
    
    return collection;
  }
  
  /**
   * Fetch employees data
   * 
   * @returns Collection of employees
   */
  public async getEmployees(): Promise<EmployeeCollection> {
    if (!this.connected) {
      throw new Error('Not connected to SQL database');
    }
    
    const collection = new EmployeeCollection();
    
    try {
      const results = await this.executeQuery<any[]>(
        `SELECT id_employe, nom_complet, email, poste, agence_ref
         FROM Employees`
      );
      
      for (const row of results) {
        const employee: Employee = {
          id: `SQL_${row.id_employe}`,
          sourceSystem: this.sourceSystem,
          nomComplet: row.nom_complet,
          email: row.email,
          post: row.poste,
          agenceRef: row.agence_ref ? `SQL_${row.agence_ref}` : undefined
        };
        
        collection.addItem(employee);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
    
    return collection;
  }
  
  /**
   * Fetch agencies data
   * 
   * @returns Collection of agencies
   */
  public async getAgences(): Promise<AgenceCollection> {
    if (!this.connected) {
      throw new Error('Not connected to SQL database');
    }
    
    const collection = new AgenceCollection();
    
    try {
      const results = await this.executeQuery<any[]>(
        `SELECT id_agence, ville, adresse, responsable_ref
         FROM Agences`
      );
      
      for (const row of results) {
        const agence: Agence = {
          id: `SQL_${row.id_agence}`,
          sourceSystem: this.sourceSystem,
          ville: row.ville,
          adresse: row.adresse,
          responsableRef: row.responsable_ref ? `SQL_${row.responsable_ref}` : undefined
        };
        
        collection.addItem(agence);
      }
    } catch (error) {
      console.error('Error fetching agencies:', error);
    }
    
    return collection;
  }
  
  /**
   * Fetch suppliers data
   * 
   * @returns Collection of suppliers
   */
  public async getFournisseurs(): Promise<FournisseurCollection> {
    if (!this.connected) {
      throw new Error('Not connected to SQL database');
    }
    
    const collection = new FournisseurCollection();
    
    try {
      const results = await this.executeQuery<any[]>(
        `SELECT id_fournisseur, nom_fournisseur, adresse, numero_telephone
         FROM Fournisseurs`
      );
      
      for (const row of results) {
        const fournisseur: Fournisseur = {
          id: `SQL_${row.id_fournisseur}`,
          sourceSystem: this.sourceSystem,
          nomFournisseur: row.nom_fournisseur,
          adresse: row.adresse,
          numeroTelephone: row.numero_telephone
        };
        
        collection.addItem(fournisseur);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
    
    return collection;
  }
  
  /**
   * Fetch products data
   * 
   * @returns Collection of products
   */
  public async getProduits(): Promise<ProduitCollection> {
    if (!this.connected) {
      throw new Error('Not connected to SQL database');
    }
    
    const collection = new ProduitCollection();
    
    try {
      const results = await this.executeQuery<any[]>(
        `SELECT id_produit, description, categorie, prix_cout
         FROM Produits`
      );
      
      for (const row of results) {
        const produit: Produit = {
          id: `SQL_${row.id_produit}`,
          sourceSystem: this.sourceSystem,
          description: row.description,
          prixCout: row.prix_cout,
          categorie: row.categorie
        };
        
        collection.addItem(produit);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
    
    return collection;
  }
  
  /**
   * Fetch orders data
   * 
   * @returns Collection of orders
   */
  public async getCommandes(): Promise<CommandeCollection> {
    if (!this.connected) {
      throw new Error('Not connected to SQL database');
    }
    
    const collection = new CommandeCollection();
    
    try {
      const results = await this.executeQuery<any[]>(
        `SELECT id_commande, date_commande, montant, statut, mode_paiement, client_ref, employe_ref
         FROM Commandes`
      );
      
      for (const row of results) {
        const commande: Commande = {
          id: `SQL_${row.id_commande}`,
          sourceSystem: this.sourceSystem,
          dateCommande: new Date(row.date_commande).toISOString(),
          montant: row.montant,
          statut: row.statut,
          clientRef: `SQL_${row.client_ref}`,
          employeRef: row.employe_ref ? `SQL_${row.employe_ref}` : undefined
        };
        
        collection.addItem(commande);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
    
    return collection;
  }
  
  /**
   * Fetch order details data
   * 
   * @returns Collection of order details
   */
  public async getDetailsCommande(): Promise<DetailCommandeCollection> {
    if (!this.connected) {
      throw new Error('Not connected to SQL database');
    }
    
    const collection = new DetailCommandeCollection();
    
    try {
      const results = await this.executeQuery<any[]>(
        `SELECT id_commande, id_produit, quantite
         FROM Details_Commande`
      );
      
      for (const row of results) {
        const detail: DetailCommande = {
          id: `SQL_${row.id_commande}_${row.id_produit}`,
          sourceSystem: this.sourceSystem,
          commandeId: `SQL_${row.id_commande}`,
          produitId: `SQL_${row.id_produit}`,
          quantite: row.quantite
        };
        
        collection.addItem(detail);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
    }
    
    return collection;
  }
  
  /**
   * Fetch invoices data
   * 
   * @returns Collection of invoices
   */
  public async getFactures(): Promise<FactureCollection> {
    if (!this.connected) {
      throw new Error('Not connected to SQL database');
    }
    
    const collection = new FactureCollection();
    
    try {
      const results = await this.executeQuery<any[]>(
        `SELECT id_facture, montant_total, date_facture, commande_ref
         FROM Factures`
      );
      
      for (const row of results) {
        const facture: Facture = {
          id: `SQL_${row.id_facture}`,
          sourceSystem: this.sourceSystem,
          montantTotal: row.montant_total,
          dateFacture: (new Date(row.date_facture)).toISOString(),
          commandeRef: `SQL_${row.commande_ref}`
        };
        
        collection.addItem(facture);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
    
    return collection;
  }
  
  /**
   * Fetch deliveries data
   * 
   * @returns Collection of deliveries
   */
  public async getLivraisons(): Promise<LivraisonCollection> {
    if (!this.connected) {
      throw new Error('Not connected to SQL database');
    }
    
    const collection = new LivraisonCollection();
    
    try {
      const results = await this.executeQuery<any[]>(
        `SELECT id_livraison, transporteur, data_estimee, statut, commande_ref
         FROM Livraisons`
      );
      
      for (const row of results) {
        const livraison: Livraison = {
          id: `SQL_${row.id_livraison}`,
          sourceSystem: this.sourceSystem,
          dateEstimee: row.data_estimee ? (new Date(row.data_estimee)).toISOString() : undefined,
          statut: row.statut,
          commandeRef: `SQL_${row.commande_ref}`,
          transporteur: row.transporteur
        };
        
        collection.addItem(livraison);
      }
    } catch (error) {
      console.error('Error fetching deliveries:', error);
    }
    
    return collection;
  }
  
  /**
   * Fetch supply data
   * 
   * @returns Collection of supply records
   */
  public async getApprovisionnement(): Promise<ApprovisionnementCollection> {
    if (!this.connected) {
      throw new Error('Not connected to SQL database');
    }
    
    const collection = new ApprovisionnementCollection();
    
    try {
      const results = await this.executeQuery<any[]>(
        `SELECT id_produit, id_fournisseur, quantite
         FROM Approvisionnement`
      );
      
      for (const row of results) {
        const approvisionnement: Approvisionnement = {
          id: `SQL_${row.id_produit}_${row.id_fournisseur}`,
          sourceSystem: this.sourceSystem,
          produitId: `SQL_${row.id_produit}`,
          fournisseurId: `SQL_${row.id_fournisseur}`,
          quantite: row.quantite,
        };
        
        collection.addItem(approvisionnement);
      }
    } catch (error) {
      console.error('Error fetching supplies:', error);
    }
    
    return collection;
  }
}