/**
 * SQLAdapter.ts
 * Adapter for SQL databases using mariadb package
 */

import mariadb, { Pool, PoolConnection } from 'mariadb';
import { IAdapter, QueryFilter } from './IAdapter';
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
    this.connected = false; // Explicitly set connected to false initially
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
    // Check connection and try to connect if not connected    
    if (!this.connected) {
      console.log('SQLAdapter: Not connected, attempting to connect before getClients');
      try {
        await this.connect();
      } catch (error) {
        console.error('SQLAdapter: Failed to establish connection:', error);
        throw new Error('SQLAdapter: Cannot fetch clients - not connected to database');
      }
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
  public async getApprovisionnements(): Promise<ApprovisionnementCollection> {
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

  /**
   * Execute a filtered query directly on the adapter
   * @param tableName The table/entity to query (generic name like 'clients')
   * @param filter Query filter specification
   * @returns The appropriate data collection with filtered results
   */
  public async executeFilteredQuery(tableName: string, filter: QueryFilter): Promise<any> {
    // Ensure we're connected first - don't check this.connected directly
    try {
      // Try to connect - this will be a no-op if already connected
      await this.connect();
    } catch (error) {
      console.error('Failed to connect to SQL database:', error);
      throw new Error('Cannot execute filtered query - unable to connect to database');
    }
    
    console.log(`SQLAdapter: Executing filtered query for ${tableName}`);
    console.log('Filter:', JSON.stringify(filter));
    
    // Map the common table names to SQL table names
    const tableMap: Record<string, string> = {
      'clients': 'Clients',
      'employees': 'Employees',
      'agences': 'Agences',
      'fournisseurs': 'Fournisseurs', 
      'produits': 'Produits',
      'commandes': 'Commandes',
      'details_commande': 'Details_Commande',
      'factures': 'Factures',
      'livraisons': 'Livraisons',
      'approvisionnements': 'Approvisionnement'
    };

    // Map generic field names to actual SQL column names per table
    const fieldMaps: Record<string, Record<string, string>> = {
        'clients': {
            'id': 'id_client',
            'nom_complet': 'nom_complet',
            'adresse': 'adresse',
            'email_contact': 'email_contact',
            'numero_telephone': 'numero_telephone'
        },
        'employees': {
            'id': 'id_employe',
            'nom_complet': 'nom_complet',
            'email': 'email',
            'poste': 'poste',
            'agence_ref': 'agence_ref' // SQL foreign key
        },
        'agences': {
            'id': 'id_agence',
            'ville': 'ville',
            'adresse': 'adresse',
            'responsable_ref': 'responsable_ref' // SQL foreign key
        },
        'fournisseurs': {
            'id': 'id_fournisseur',
            'nom_fournisseur': 'nom_fournisseur',
            'adresse': 'adresse',
            'numero_telephone': 'numero_telephone'
        },
        'produits': {
            'id': 'id_produit',
            'description': 'description',
            'categorie': 'categorie',
            'prix_cout': 'prix_cout'
        },
        'commandes': {
            'id': 'id_commande',
            'date_commande': 'date_commande',
            'montant': 'montant',
            'statut': 'statut',
            'mode_paiement': 'mode_paiement',
            'client_ref': 'client_ref', // SQL foreign key
            'employe_ref': 'employe_ref' // SQL foreign key
        },
        'details_commande': {
            // Assuming composite key in SQL or separate ID
            'commande_id': 'id_commande', // SQL foreign key
            'produit_id': 'id_produit',   // SQL foreign key
            'quantite': 'quantite'
        },
        'factures': {
            'id': 'id_facture',
            'montant_total': 'montant_total',
            'date_facture': 'date_facture',
            'commande_ref': 'commande_ref' // SQL foreign key
        },
        'livraisons': {
            'id': 'id_livraison',
            'transporteur': 'transporteur',
            'date_estimee': 'data_estimee', // Corrected column name based on previous context
            'statut': 'statut',
            'commande_ref': 'commande_ref' // SQL foreign key
        },
        'approvisionnements': {
            // Assuming composite key in SQL or separate ID
            'produit_id': 'id_produit',     // SQL foreign key
            'fournisseur_id': 'id_fournisseur', // SQL foreign key
            'quantite': 'quantite'
        }
    };


    // Get the SQL table name for the primary table
    const sqlTableName = tableMap[tableName];
    if (!sqlTableName) {
      throw new Error(`Unknown table: ${tableName}`);
    }

    try {
      let sql = 'SELECT ';
      const mainTableAlias = sqlTableName.charAt(0).toLowerCase(); // e.g., 'c' for Clients
      const involvedAliases: Record<string, string> = { [tableName]: mainTableAlias }; // Map generic name to alias, e.g., { 'clients': 'c' }

      // --- 1. Build JOIN clause first to identify all aliases ---
      let joinClause = '';
      if (filter.joins && filter.joins.length > 0) {
        for (const join of filter.joins) {
          const joinGenericTable = join.on.table; // e.g., 'commandes'
          const joinSqlTable = tableMap[joinGenericTable]; // e.g., 'Commandes'

          if (joinSqlTable && join.on.left && join.on.right) {
            // Create a unique alias for the joined table, e.g., 'c1'
            const joinAlias = joinSqlTable.charAt(0).toLowerCase() + Object.keys(involvedAliases).length;
            involvedAliases[joinGenericTable] = joinAlias; // Add to map, e.g., { 'clients': 'c', 'commandes': 'c1' }

            // Get actual SQL column names from fieldMaps for the join condition
            const leftSqlField = fieldMaps[tableName]?.[join.on.left.field] || join.on.left.field;
            const rightSqlField = fieldMaps[joinGenericTable]?.[join.on.right.field] || join.on.right.field;

            joinClause += ` ${join.type || 'INNER'} JOIN ${joinSqlTable} AS ${joinAlias} ON ${mainTableAlias}.${leftSqlField} = ${joinAlias}.${rightSqlField}`;
          } else {
             console.warn(`Skipping invalid join definition:`, join);
          }
        }
      }

      // --- 2. Helper to resolve generic column names to aliased SQL columns ---
      const resolveColumn = (genericColumn: string): string | null => {
        const trimmedColumn = genericColumn.trim();
        // Handle aggregate functions or literals first
        if (trimmedColumn.includes('(') || trimmedColumn.includes('*') || !isNaN(parseFloat(trimmedColumn))) {
             return trimmedColumn; // Return as is (e.g., COUNT(*), 'literal', 123)
        }

        // Check main table
        if (fieldMaps[tableName]?.[trimmedColumn]) {
            return `${mainTableAlias}.${fieldMaps[tableName][trimmedColumn]}`; // e.g., c.nom_complet
        }
        // Check joined tables
        for (const [genericTable, alias] of Object.entries(involvedAliases)) {
            if (genericTable !== tableName && fieldMaps[genericTable]?.[trimmedColumn]) {
                return `${alias}.${fieldMaps[genericTable][trimmedColumn]}`; // e.g., c1.date_commande
            }
        }
        console.warn(`Column '${trimmedColumn}' could not be resolved to any known table/field.`);
        return null; // Column not found in any involved table's map
      };

      // --- 3. Build SELECT clause ---
      let columnsToSelect = '*';
      if (filter.projections && filter.projections.length > 0 && !filter.projections.includes('*')) {
        const projectedColumns = filter.projections
            .map(p => resolveColumn(p)) // Resolve each projection
            .filter(c => c !== null)    // Filter out unresolved columns
            .join(', ');

        if (projectedColumns.length > 0) {
            columnsToSelect = projectedColumns;
        } else {
             console.warn("No valid columns found for projection, defaulting to '*'. Filter:", filter.projections);
             columnsToSelect = `${mainTableAlias}.*`; // Fallback to selecting all from main table if resolution fails
        }
      } else {
          // Default to selecting all columns from the main table if '*' or no projections
          columnsToSelect = `${mainTableAlias}.*`;
          // Optionally, select all from joined tables too if needed:
          // columnsToSelect = Object.values(involvedAliases).map(alias => `${alias}.*`).join(', ');
      }

      sql += columnsToSelect + ' ';
      sql += ` FROM ${sqlTableName} AS ${mainTableAlias}`;
      sql += joinClause; // Add the joins

      // --- 4. Build WHERE clause ---
      const params: any[] = [];
      if (filter.conditions && filter.conditions.length > 0) {
        const whereClauses = filter.conditions.map((condition, index) => {
            if (condition.type === 'binary_expr') {
                const columnName = condition.left.column || (typeof condition.left === 'string' ? condition.left : '');
                const resolvedCol = resolveColumn(columnName); // Resolve column with alias
                if (resolvedCol) {
                    params.push(condition.right.value);
                    return `${resolvedCol} ${condition.operator} ?`; // Use resolved column (e.g., c1.status = ?)
                } else {
                     console.warn(`Could not resolve column '${columnName}' for WHERE clause.`);
                     return null; // Skip condition if column is unknown
                }
            }
            return null; // Skip unsupported condition types
        }).filter(c => c !== null); // Filter out null/skipped conditions

        if (whereClauses.length > 0) {
             sql += ` WHERE ${whereClauses.join(' AND ')}`;
        }
      }

      // --- 5. Build ORDER BY clause ---
      if (filter.orderBy && filter.orderBy.length > 0) {
        const orderClauses = filter.orderBy
            .map(order => {
                const resolvedCol = resolveColumn(order.column); // Resolve column with alias
                return resolvedCol ? `${resolvedCol} ${order.type}` : null; // e.g., c1.date_commande DESC
            })
            .filter(c => c !== null) // Filter out unresolved columns
            .join(', ');

        if (orderClauses.length > 0) {
             sql += ` ORDER BY ${orderClauses}`;
        }
      }

      // --- 6. Build LIMIT clause ---
      if (filter.limit !== null && filter.limit !== undefined) {
        sql += ` LIMIT ${filter.limit}`;
      }

      console.log(`SQLAdapter: Generated SQL: ${sql}`);
      console.log('Parameters:', params);

      // Execute the query
      const results = await this.executeQuery<any[]>(sql, params);

      // --- 7. Process results ---
      // (Keep existing result processing logic, ensuring it uses the correct SQL column names from 'results')
      let collection;
      switch(tableName) {
        case 'clients':
          collection = new ClientCollection();
          for (const row of results) {
            // Access row data using actual SQL column names
            const client: Client = {
              id: `SQL_${row.id_client}`,
              sourceSystem: this.sourceSystem,
              nomComplet: row.nom_complet,
              adresse: row.adresse,
              emailContact: row.email_contact,
              numeroTelephone: row.numero_telephone,
              // Add fields from joined tables if selected and needed
            };
            collection.addItem(client);
          }
          break;
        // ... other cases for employees, agences, etc. ...
        // Ensure each case correctly maps the SQL column names from the 'row' object
        // to the corresponding DataModel properties. If joins were used,
        // columns from joined tables might also be present in 'row'.
        case 'employees':
          collection = new EmployeeCollection();
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
          break;
        case 'agences':
          collection = new AgenceCollection();
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
          break;
        case 'fournisseurs':
          collection = new FournisseurCollection();
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
          break;
        case 'produits':
          collection = new ProduitCollection();
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
          break;
        case 'commandes':
          collection = new CommandeCollection();
          for (const row of results) {
            const commande: Commande = {
              id: `SQL_${row.id_commande}`,
              sourceSystem: this.sourceSystem,
              dateCommande: new Date(row.date_commande).toISOString(),
              montant: row.montant,
              statut: row.statut,
              // modePaiement might be missing from SQL schema, add if exists
              modePaiement: row.mode_paiement,
              clientRef: `SQL_${row.client_ref}`,
              employeRef: row.employe_ref ? `SQL_${row.employe_ref}` : undefined
            };
            collection.addItem(commande);
          }
          break;
        case 'details_commande':
          collection = new DetailCommandeCollection();
          for (const row of results) {
            const detail: DetailCommande = {
              // Use actual SQL column names for composite ID generation
              id: `SQL_${row.id_commande}_${row.id_produit}`,
              sourceSystem: this.sourceSystem,
              commandeId: `SQL_${row.id_commande}`,
              produitId: `SQL_${row.id_produit}`,
              quantite: row.quantite
            };
            collection.addItem(detail);
          }
          break;
        case 'factures':
          collection = new FactureCollection();
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
          break;
        case 'livraisons':
          collection = new LivraisonCollection();
          for (const row of results) {
            const livraison: Livraison = {
              id: `SQL_${row.id_livraison}`,
              sourceSystem: this.sourceSystem,
              // Use correct SQL column name 'data_estimee'
              dateEstimee: row.data_estimee ? (new Date(row.data_estimee)).toISOString() : undefined,
              statut: row.statut,
              commandeRef: `SQL_${row.commande_ref}`,
              transporteur: row.transporteur
            };
            collection.addItem(livraison);
          }
          break;
        case 'approvisionnements':
          collection = new ApprovisionnementCollection();
          for (const row of results) {
            const approvisionnement: Approvisionnement = {
              // Use actual SQL column names for composite ID generation
              id: `SQL_${row.id_produit}_${row.id_fournisseur}`,
              sourceSystem: this.sourceSystem,
              produitId: `SQL_${row.id_produit}`,
              fournisseurId: `SQL_${row.id_fournisseur}`,
              quantite: row.quantite,
            };
            collection.addItem(approvisionnement);
          }
          break;
        default:
          // Return raw results if no specific collection mapping exists
          console.warn(`No specific collection mapping for ${tableName}, returning raw results.`);
          return results;
          // throw new Error(`Unsupported table for collection mapping: ${tableName}`);
      }

      return collection;

    } catch (error) {
      console.error(`Error executing filtered query for ${tableName}:`, error);
      throw error; // Re-throw the error after logging
    }
  }
}