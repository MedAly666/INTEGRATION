/**
 * SQLAdapter.ts
 * Adapter for SQL data sources
 */

import { IAdapter, QueryFilter } from './IAdapter';
import { MariaDBPool, PoolConnection } from 'mariadb';
import {
  ClientCollection, Client,
  EmployeeCollection, Employee,
  AgenceCollection, Agence,
  FournisseurCollection, Fournisseur,
  ProduitCollection, Produit,
  CommandeCollection, Commande,
  DetailCommandeCollection, DetailCommande,
  FactureCollection, Facture,
  LivraisonCollection, Livraison,
  ApprovisionnementCollection, Approvisionnement
} from '../common/DataModel';
import { SourceDescription, EntityAvailability, SourceCapabilities } from '../common/SourceDescription';
import { formatDate } from '../common/DateUtils';

export class SQLAdapter implements IAdapter {
  private pool: MariaDBPool | null = null;
  private client: PoolConnection | null = null;
  private connected: boolean = false;
  private sourceSystem: string = 'SQL';
  private connectionConfig: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    schema?: string;
  };
  
  // Table name mappings according to source schema
  private tableNameMappings: Record<string, Record<string, string>> = {
    'MAGASIN_SQL': {
      'clients': 'Clients',
      'employees': 'Employees',
      'agences': 'Agences',
      'fournisseurs': 'Fournisseurs',
      'produits': 'Produits',
      'commandes': 'Commandes',
      'details_commande': 'Details_Commande',
      'factures': 'Factures',
      'livraisons': 'Livraisons',
      'approvisionnements': 'Approvisionnements'
    }
    // Additional source schemas can be added here
  };
  
  /**
   * Source description cache
   * This describes the capabilities and available data in this source
   * Following the formal framework (G,S,M) from the course
   */
  private sourceDescription: SourceDescription | null = null;
  
  /**
   * Constructor 
   * 
   * @param sourceSystem Source system identifier
   * @param connectionConfig Database connection configuration
   */
  constructor(
    sourceSystem: string,
    host: string,
    user: string,
    password: string,
    database: string,
    port: number
    
  ) {
    this.sourceSystem = sourceSystem;
    this.connectionConfig = {
      host,
      port,
      database,
      user,
      password,
      schema : 'MAGASIN_SQL'
    };
    this.connected = false;
  }
  
  /**
   * Connect to the database
   */
  public async connect(): Promise<boolean> {
    try {
      const mariadb = await import('mariadb');
      this.pool = mariadb.createPool(this.connectionConfig);
      
      // Test connection by getting a client from the pool
      this.client = await this.pool.getConnection();
      this.client.release();
      this.client = null;
      this.connected = true;
      
      // Initialize source description after successful connection
      await this.initializeSourceDescription();
      
      console.log(`Connected to SQL database ${this.connectionConfig.database}`);
      return true;
    } catch (error) {
      console.error(`Error connecting to SQL database:`, error);
      this.connected = false;
      return false;
    }
  }
  
  /**
   * Initialize the source description by querying database metadata
   * This follows the formal framework for source descriptions from the course material
   */
  private async initializeSourceDescription(): Promise<void> {
    try {
      // Define capabilities of this SQL source
      const capabilities: SourceCapabilities = {
        canFilter: true,
        canProject: true,
        canSort: true,
        canJoin: true,
        canAggregate: true,
        maxComplexity: 8  // High complexity handling
      };
      
      // Get available tables and their structures from database metadata
      const entities: EntityAvailability[] = [];
      
      const schema = this.connectionConfig.schema || 'MAGASIN_SQL';
      const tables = await this.executeQuery(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = ?
      `, [schema]);
      
      // For each table, get column information
      for (const table of tables) {
        const tableName = table.table_name;
        
        // Get columns for this table
        const columns = await this.executeQuery(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = ? AND table_name = ?
          ORDER BY ordinal_position
        `, [schema, tableName]);
        
        // Extract column names
        const columnNames = columns.map((col: any) => col.column_name);
        
        // Add table to entities list
        entities.push({
          entityName: tableName,
          isComplete: true, // Assume SQL tables are complete for their domain
          attributes: columnNames,
        });
      }
      
      // Create the source description
      this.sourceDescription = new SourceDescription(
        this.sourceSystem,
        `SQL Database (${this.connectionConfig.database})`,
        entities,
        capabilities
      );
      
      console.log(`Initialized source description for ${this.sourceSystem} with ${entities.length} entities`);
    } catch (error) {
      console.error('Error initializing source description:', error);
      
      // Create a minimal source description if we couldn't query metadata
      this.sourceDescription = new SourceDescription(
        this.sourceSystem,
        `SQL Database (${this.connectionConfig.database})`,
        this.getDefaultEntities(),
        {
          canFilter: true,
          canProject: true,
          canSort: true,
          canJoin: true,
          canAggregate: true
        }
      );
    }
  }
  
  /**
   * Get default entity descriptions as fallback
   */
  private getDefaultEntities(): EntityAvailability[] {
    return [
      {
        entityName: 'Clients',
        isComplete: true,
        attributes: ['id_client', 'nom_complet', 'adresse', 'email_contact', 'numero_telephone']
      },
      {
        entityName: 'Employees',
        isComplete: true,
        attributes: ['id_employe', 'nom_complet', 'email', 'poste', 'agence_ref']
      },
      {
        entityName: 'Agences',
        isComplete: true,
        attributes: ['id_agence', 'ville', 'adresse', 'responsable_ref']
      },
      {
        entityName: 'Fournisseurs',
        isComplete: true,
        attributes: ['id_fournisseur', 'nom_fournisseur', 'adresse', 'numero_telephone']
      },
      {
        entityName: 'Produits',
        isComplete: true,
        attributes: ['id_produit', 'description', 'prix_cout', 'categorie']
      },
      {
        entityName: 'Commandes',
        isComplete: true,
        attributes: ['id_commande', 'date_commande', 'montant', 'statut', 'mode_paiement', 'client_ref', 'employe_ref']
      },
      {
        entityName: 'Details_Commande',
        isComplete: true,
        attributes: ['id_commande', 'id_produit', 'quantite']
      },
      {
        entityName: 'Factures',
        isComplete: true,
        attributes: ['id_facture', 'montant_total', 'date_facture', 'commande_ref']
      },
      {
        entityName: 'Livraisons',
        isComplete: true,
        attributes: ['id_livraison', 'transporteur', 'date_estimee', 'statut', 'commande_ref']
      },
      {
        entityName: 'Approvisionnements',
        isComplete: true,
        attributes: ['id_produit', 'id_fournisseur', 'quantite']
      }
    ];
  }
  
  /**
   * Get source description for this adapter
   */
  public getSourceDescription(): SourceDescription {
    if (!this.sourceDescription) {
      // Create a default source description if not initialized
      this.sourceDescription = new SourceDescription(
        this.sourceSystem,
        `SQL Database (${this.connectionConfig.database})`,
        this.getDefaultEntities(),
        {
          canFilter: true,
          canProject: true,
          canSort: true,
          canJoin: true,
          canAggregate: true
        }
      );
    }
    
    return this.sourceDescription;
  }
  
  /**
   * Check if this adapter can handle a specific query
   */
  public canHandleQuery(filter: QueryFilter, entityName: string): boolean {
    // Check if this entity exists in our source
    const sourceDesc = this.getSourceDescription();
    if (!sourceDesc.hasEntity(entityName)) {
      return false;
    }
    
    // SQL can handle most standard query operations
    // Check for unsupported features in the filter
    
    // Check for complex joins that might not be supported
    if (filter.joins && filter.joins.length > 3) {
      console.warn('SQL adapter: Too many joins might affect performance');
      // Still return true as SQL can technically handle it
    }
    
    return true;
  }
  
  /**
   * Translate a global query filter into a SQL-specific query object
   */
  public translateQuery(filter: QueryFilter, entityName: string): any {
    // For SQL, we can mostly use the filter directly since our global schema 
    // is largely based on SQL conventions
    // This would need to be more complex for adapters with different query models
    
    return {
      sqlFilter: filter,
      tableName: this.getMappedTableName(entityName),
      schema: this.connectionConfig.schema || 'MAGASIN_SQL'
    };
  }
  
  /**
   * Disconnect from the database
   */
  public disconnect(): void {
    if (this.pool) {
      this.pool.end();
      this.pool = null;
    }
    this.connected = false;
  }
  
  /**
   * Check if connected to database
   */
  public isConnected(): boolean {
    return this.connected && this.pool !== null;
  }
  
  /**
   * Get the source system identifier
   */
  public getSourceSystem(): string {
    return this.sourceSystem;
  }
  
  /**
   * Convert snake_case keys to camelCase for data model compatibility
   * 
   * @param row SQL result row with snake_case keys
   * @returns Object with camelCase keys
   */
  private convertKeysToCamelCase(row: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    
    // Define key mapping from SQL snake_case to data model camelCase
    const keyMapping: Record<string, string> = {
      'id_client': 'idClient',
      'nom_complet': 'nomComplet',
      'email_contact': 'emailContact',
      'numero_telephone': 'numeroTelephone',
      'id_employe': 'idEmploye',
      'agence_ref': 'agenceRef',
      'id_agence': 'idAgence',
      'responsable_ref': 'responsableRef',
      'id_fournisseur': 'idFournisseur',
      'nom_fournisseur': 'nomFournisseur',
      'id_produit': 'idProduit',
      'prix_cout': 'prixCout',
      'id_commande': 'idCommande',
      'date_commande': 'dateCommande',
      'mode_paiement': 'modePaiement',
      'client_ref': 'clientRef',
      'employe_ref': 'employeRef',
      'id_detail': 'idDetail',
      'id_facture': 'idFacture',
      'montant_total': 'montantTotal',
      'date_facture': 'dateFacture',
      'commande_ref': 'commandeRef',
      'id_livraison': 'idLivraison',
      'date_estimee': 'dateEstimee'
    };
    
    // Convert snake_case to camelCase for each key in the row
    for (const key in row) {
      if (keyMapping[key]) {
        result[keyMapping[key]] = row[key];
      } else {
        // For unrecognized keys, convert from snake_case to camelCase
        result[key.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase())] = row[key];
      }
    }
    
    // Always add source system
    result.sourceSystem = this.sourceSystem;
    
    return result;
  }
  
  /**
   * Execute SQL query
   * 
   * @param sql SQL query string
   * @param params Query parameters
   * @returns Query results
   */
  private async executeQuery(sql: string, params: any[] = []): Promise<any[]> {
    if (!this.pool) {
      throw new Error('Not connected to the database');
    }
    
    console.log('Executing SQL:', sql, 'with params:', params);
    
    try {
      const result = await this.pool.query(sql, params);
      console.log(`Query returned ${result.length} rows`);
      //console.log('Query result:', result);
      return result;
    } catch (error) {
      console.error('SQL query error:', error);
      throw error;
    }
  }

  /**
   * Translate the mediator's QueryFilter to SQL WHERE clause and parameters
   * 
   * @param filter Query filter
   * @param tableAlias Optional table alias
   * @returns SQL WHERE clause and parameters
   */
  private buildSqlWhereClause(filter?: QueryFilter, tableAlias?: string): { 
    whereClause: string; 
    params: any[];
    orderByClause: string;
    limitClause: string;
  } {
    let whereClause = '';
    const params: any[] = [];
    let orderByClause = '';
    let limitClause = '';
    
    if (!filter) {
      return { whereClause: '', params: [], orderByClause: '', limitClause: '' };
    }
    
    const prefix = tableAlias ? `${tableAlias}.` : '';
    const conditions: string[] = [];
    
    // Build WHERE conditions
    if (filter.conditions && filter.conditions.length > 0) {
      for (const condition of filter.conditions) {
        try {
          if (condition.type === 'binary_expr') {
            const leftField = this.translateFieldToSql(condition.left.column, prefix);
            const operator = condition.operator;
            
            if (operator.toUpperCase() === 'IN' && Array.isArray(condition.right.value)) {
              const placeholders = condition.right.value.map(() => '?').join(', ');
              conditions.push(`${leftField} IN (${placeholders})`);
              params.push(...condition.right.value);
            } else if (operator.toUpperCase() === 'BETWEEN' && Array.isArray(condition.right.value)) {
              conditions.push(`${leftField} BETWEEN ? AND ?`);
              params.push(condition.right.value[0], condition.right.value[1]);
            } else {
              conditions.push(`${leftField} ${operator} ?`);
              params.push(condition.right.value);
            }
          } else {
            console.warn(`Unsupported filter condition type: ${condition.type}`);
          }
        } catch (evalError) {
          console.error("Error evaluating filter condition:", evalError, "Condition:", condition);
        }
      }
    }
    
    if (conditions.length > 0) {
      whereClause = ` WHERE ${conditions.join(' AND ')}`;
    }
    
    // Build ORDER BY clause
    if (filter.orderBy && filter.orderBy.length > 0) {
      const orderTerms = filter.orderBy.map(order => {
        const field = this.translateFieldToSql(order.column, prefix);
        return `${field} ${order.type.toUpperCase()}`;
      });
      orderByClause = ` ORDER BY ${orderTerms.join(', ')}`;
    }
    
    // Build LIMIT clause
    if (filter.limit !== null && filter.limit !== undefined) {
      limitClause = ` LIMIT ${filter.limit}`;
    }
    
    return { whereClause, params, orderByClause, limitClause };
  }

  /**
   * Map between mediator model properties and SQL column names
   * 
   * @param property Mediator model property name
   * @param prefix Table alias prefix
   * @returns SQL column name
   */
  private translateFieldToSql(property: string, prefix: string = ''): string {
    const propertyMap: Record<string, string> = {
      'idClient': 'id_client',
      'nomComplet': 'nom_complet',
      'emailContact': 'email_contact',
      'numeroTelephone': 'numero_telephone',
      'idEmploye': 'id_employe',
      'poste': 'poste',
      'agenceRef': 'agence_ref',
      'idAgence': 'id_agence',
      'responsableRef': 'responsable_ref',
      'idFournisseur': 'id_fournisseur',
      'nomFournisseur': 'nom_fournisseur',
      'idProduit': 'id_produit',
      'prixCout': 'prix_cout',
      'idCommande': 'id_commande',
      'dateCommande': 'date_commande',
      'modePaiement': 'mode_paiement',
      'clientRef': 'client_ref',
      'employeRef': 'employe_ref',
      'idDetail': 'id_detail',
      'idFacture': 'id_facture',
      'montantTotal': 'montant_total',
      'dateFacture': 'date_facture',
      'commandeRef': 'commande_ref',
      'idLivraison': 'id_livraison',
      'dateEstimee': 'date_estimee'
    };
    
    const columnName = propertyMap[property] || property;
    return prefix + columnName;
  }
  
  /**
   * Get the mapped table name for the current source schema
   * 
   * @param tableName The original table name
   * @returns The mapped table name for the current schema
   */
  private getMappedTableName(tableName: string): string {
    const schema = this.connectionConfig.schema || 'MAGASIN_SQL';
    
    // Check if we have mappings for this schema
    if (this.tableNameMappings[schema] && this.tableNameMappings[schema][tableName]) {
      return this.tableNameMappings[schema][tableName];
    }
    
    // Return original name if no mapping exists
    return tableName;
  }
  
  /**
   * Set table name mappings for a specific schema
   * 
   * @param schema Schema name
   * @param mappings Table name mappings object
   */
  public setTableNameMappings(schema: string, mappings: Record<string, string>): void {
    this.tableNameMappings[schema] = mappings;
  }

  /**
   * Build SQL SELECT query with projections from filter
   * 
   * @param tableName Table name
   * @param filter Query filter
   * @param defaultProjection Default columns to select
   * @returns SQL SELECT query
   */
  private buildSelectQuery(
    tableName: string, 
    filter?: QueryFilter, 
    defaultProjection: string = '*'
  ): { sql: string; params: any[] } {
    // Map the table name according to source schema first
    const mappedTableName = this.getMappedTableName(tableName);
    
    // Handle projections
    let projection = defaultProjection;
    if (filter?.projections && filter.projections.length > 0 && !filter.projections.includes('*')) {
      // Map the field names from model to SQL columns
      const projectedColumns = filter.projections.map(field => this.translateFieldToSql(field));
      projection = projectedColumns.join(', ');
    }
    
    const { whereClause, params, orderByClause, limitClause } = this.buildSqlWhereClause(filter);
    
    // Use schema prefix for all table names to ensure correct schema is used
    const schema = this.connectionConfig.schema || 'MAGASIN_SQL';
    const formattedTableName = `${schema}.${mappedTableName}`;
    
    const sql = `
      SELECT ${projection}
      FROM ${formattedTableName}
      ${whereClause}
      ${orderByClause}
      ${limitClause}
    `.trim();
    
    return { sql, params };
  }
  
  /**
   * Get ID column name for a table
   */
  private getIdColumnForTable(tableName: string): string {
    const tableMap: Record<string, string> = {
      'Clients': 'id_client',
      'Employees': 'id_employe',
      'Agences': 'id_agence',
      'Fournisseurs': 'id_fournisseur',
      'Produits': 'id_produit',
      'Commandes': 'id_commande',
      'Details_Commande': 'id_commande, id_produit',      'Factures': 'id_facture',
      'Livraisons': 'id_livraison',
      'Approvisionnements': 'id_produit, id_fournisseur'    };
    
    return tableMap[tableName] || 'id';
  }

  /**
   * Execute a filtered query directly on the adapter
   * This method improves query delegation per the course recommendations
   * 
   * @param tableName The table to query
   * @param filter Query filter specification
   * @returns Query results
   */
  public async executeFilteredQuery(tableName: string, filter: QueryFilter): Promise<any> {
    if (!this.isConnected()) {
      await this.connect();
    }
    
    // Special handling for JOIN operations
    if (filter.joins && filter.joins.length > 0) {
      // In a JOIN query, we should only fetch our own table columns
      const results = await this.executeTableSpecificQuery(tableName, filter);
      
      // Return the appropriate collection type
      return this.convertToCollection(tableName, results);
    }
    
    // Translate the query to SQL-specific format
    const translatedQuery = this.translateQuery(filter, tableName);
    
    // Build and execute SQL query
    const { sql, params } = this.buildSelectQuery(tableName, filter);
    
    try {
      const results = await this.executeQuery(sql, params);
      
      // Convert snake_case keys to camelCase for data model compatibility
      const convertedResults = results.map(row => this.convertKeysToCamelCase(row));
      
      // Return the appropriate collection type with proper objects
      return this.convertToCollection(tableName, convertedResults);
    } catch (error) {
      console.error(`Error executing filtered query for ${tableName}:`, error);
      // Return empty result on error rather than failing completely
      return this.getEmptyCollection(tableName);
    }
  }
  
  /**
   * Execute a query for a specific table that is part of a JOIN operation
   * This fetches only the columns needed for this specific table
   * 
   * @param tableName The table to query
   * @param filter Query filter specification
   * @returns Query results
   */
  private async executeTableSpecificQuery(tableName: string, filter: QueryFilter): Promise<any[]> {
    try {
      // Determine which projections belong to this table
      const tableSpecificProjections = this.getTableSpecificProjections(tableName, filter);
      
      // Create a simplified filter without JOIN conditions
      const simplifiedFilter: QueryFilter = {
        projections: tableSpecificProjections,
        // Retain ORDER BY only if it applies to this table
        orderBy: filter.orderBy?.filter(order => 
          this.columnBelongsToTable(order.column, tableName)
        ),
        limit: filter.limit
      };
      
      // Build and execute SQL query for just this table
      const { sql, params } = this.buildSelectQuery(tableName, simplifiedFilter);
      const results = await this.executeQuery(sql, params);
      
      // Convert snake_case keys to camelCase for data model compatibility
      return results.map(row => this.convertKeysToCamelCase(row));
    } catch (error) {
      console.error(`Error executing table-specific query for ${tableName}:`, error);
      return [];
    }
  }
  
  /**
   * Determine if a column name belongs to a specific table
   * 
   * @param columnName The column name to check
   * @param tableName The table name to check against
   */
  private columnBelongsToTable(columnName: string, tableName: string): boolean {
    // This is a simplified implementation
    // In a real system, you would check against actual table schema
    
    const clientColumns = ['id_client', 'nom_complet', 'adresse', 'email_contact', 'numero_telephone'];
    const employeeColumns = ['id_employe', 'nom_complet', 'email', 'poste', 'agence_ref'];
    const agenceColumns = ['id_agence', 'ville', 'adresse', 'responsable_ref'];
    const fournisseurColumns = ['id_fournisseur', 'nom_fournisseur', 'adresse', 'numero_telephone'];
    const produitColumns = ['id_produit', 'description', 'prix_cout', 'categorie'];
    const commandeColumns = ['id_commande', 'date_commande', 'montant', 'statut', 'mode_paiement', 'client_ref', 'employe_ref'];
    const detailCommandeColumns = ['id_commande', 'id_produit', 'quantite'];
    const factureColumns = ['id_facture', 'montant_total', 'date_facture', 'commande_ref'];
    const livraisonColumns = ['id_livraison', 'transporteur', 'date_estimee', 'statut', 'commande_ref'];
    const approvisionnementColumns = ['id_produit', 'id_fournisseur', 'quantite'];
    
    const tableColumnMap: Record<string, string[]> = {
      'clients': clientColumns,
      'employees': employeeColumns,
      'agences': agenceColumns,
      'fournisseurs': fournisseurColumns,
      'produits': produitColumns,
      'commandes': commandeColumns,
      'details_commande': detailCommandeColumns,
      'factures': factureColumns,
      'livraisons': livraisonColumns,
      'approvisionnements': approvisionnementColumns
    };
    
    // Check if the column belongs to the specified table
    if (tableColumnMap[tableName.toLowerCase()]) {
      return tableColumnMap[tableName.toLowerCase()].includes(this.translateFieldToSql(columnName));
    }
    
    // By default, assume it might belong to the table
    return true;
  }
  
  /**
   * Get projections that are specific to a given table in a JOIN query
   * 
   * @param tableName The table name to filter projections for
   * @param filter The query filter with projections
   * @returns Array of projections specific to this table
   */
  private getTableSpecificProjections(tableName: string, filter: QueryFilter): string[] {
    // If there are no projections or * is included, return ['*']
    if (!filter.projections || filter.projections.length === 0 || filter.projections.includes('*')) {
      return ['*'];
    }
    
    // Filter projections to only include those that belong to this table
    const tableSpecificProjections = filter.projections.filter(projection => 
      this.columnBelongsToTable(projection, tableName)
    );
    
    // Always include ID columns for JOIN operations
    if (tableName.toLowerCase() === 'clients' && !tableSpecificProjections.includes('id_client')) {
      tableSpecificProjections.push('id_client');
    }
    if (tableName.toLowerCase() === 'commandes' && !tableSpecificProjections.includes('client_ref')) {
      tableSpecificProjections.push('client_ref');
    }
    
    // Similar for other tables with foreign keys
    
    return tableSpecificProjections.length > 0 ? tableSpecificProjections : ['*'];
  }
  
  /**
   * Fetch clients data with optional filtering
   * 
   * @param filter Optional query filter
   * @returns Collection of clients
   */
  public async getClients(filter?: QueryFilter): Promise<ClientCollection> {
    if (!this.isConnected()) {
      await this.connect();
    }
    
    // Use "Clients" with capital C to match the actual table name in database
    const { sql, params } = this.buildSelectQuery('Clients', filter);
    const rows = await this.executeQuery(sql, params);
    
    const clients = new ClientCollection();
    
    for (const row of rows) {
      // Convert snake_case keys to camelCase for data model compatibility
      const clientData = this.convertKeysToCamelCase(row);
      
      // Add SQL_ prefix to IDs to identify the source
      clientData.idClient = `SQL_${row.id_client}`;
      
      // Create a Client object and add to collection
      const client = new Client(clientData);
      clients.addItem(client);
    }
    
    return clients;
  }

  /**
   * Get an empty collection for a given entity type
   * 
   * @param tableName The table name
   * @returns Empty collection of the appropriate type
   */
  private getEmptyCollection(tableName: string): any {
    const normalizedTableName = tableName.toLowerCase().replace(/s$/, '');
    
    switch (normalizedTableName) {
      case 'client':
        return new ClientCollection();
      case 'employee':
      case 'employe':
        return new EmployeeCollection();
      case 'agence':
        return new AgenceCollection();
      case 'fournisseur':
        return new FournisseurCollection();
      case 'produit':
        return new ProduitCollection();
      case 'commande':
        return new CommandeCollection();
      case 'detail_commande':
      case 'details_commande':
      case 'detailscommande':
      case 'detailcommande':
        return new DetailCommandeCollection();
      case 'facture':
        return new FactureCollection();
      case 'livraison':
        return new LivraisonCollection();
      case 'approvisionnements':
        return new ApprovisionnementCollection();
      default:
        console.warn(`Unknown table type: ${tableName}, returning empty array`);
        return [];
    }
  }

  /**
   * Convert query results to the appropriate collection type
   * 
   * @param tableName The table name
   * @param results Array of result items
   * @returns Collection of the appropriate type
   */
  private convertToCollection(tableName: string, results: any[]): any {
    // Normalize the table name to handle plurals and casing
    const normalizedTableName = tableName.toLowerCase().replace(/s$/, '');
    
    switch (normalizedTableName) {
      case 'client':
        const clientCollection = new ClientCollection();
        for (const row of results) {
          const client = new Client({
            idClient: row.idClient || `SQL_${row.id_client || row.id}`,
            sourceSystem: this.sourceSystem,
            nomComplet: row.nomComplet || row.nom_complet || row.nom,
            adresse: row.adresse || '',
            emailContact: row.emailContact || row.email_contact || row.email,
            numeroTelephone: row.numeroTelephone || row.numero_telephone || row.telephone
          });
          clientCollection.addItem(client);
        }
        return clientCollection;
        
      case 'employe':
      case 'employee':
        const employeeCollection = new EmployeeCollection();
        for (const row of results) {
          const employee = new Employee({
            idEmploye: row.idEmploye || `SQL_${row.id_employe || row.id}`,
            sourceSystem: this.sourceSystem,
            nomComplet: row.nomComplet || row.nom_complet || row.nom,
            email: row.email || '',
            poste: row.poste || '',
            agenceRef: row.agenceRef || (row.agence_ref ? `SQL_${row.agence_ref}` : null)
          });
          employeeCollection.addItem(employee);
        }
        return employeeCollection;
        
      case 'agence':
        const agenceCollection = new AgenceCollection();
        for (const row of results) {
          const agence = new Agence({
            idAgence: row.idAgence || `SQL_${row.id_agence || row.id}`,
            sourceSystem: this.sourceSystem,
            ville: row.ville || '',
            adresse: row.adresse || '',
            responsableRef: row.responsableRef || (row.responsable_ref ? `SQL_${row.responsable_ref}` : null)
          });
          agenceCollection.addItem(agence);
        }
        return agenceCollection;
        
      case 'fournisseur':
        const fournisseurCollection = new FournisseurCollection();
        for (const row of results) {
          const fournisseur = new Fournisseur({
            idFournisseur: row.idFournisseur || `SQL_${row.id_fournisseur || row.id}`,
            sourceSystem: this.sourceSystem,
            nomFournisseur: row.nomFournisseur || row.nom_fournisseur || row.nom,
            adresse: row.adresse || '',
            numeroTelephone: row.numeroTelephone || row.numero_telephone || row.telephone
          });
          fournisseurCollection.addItem(fournisseur);
        }
        return fournisseurCollection;
        
      case 'produit':
        const produitCollection = new ProduitCollection();
        for (const row of results) {
          const produit = new Produit({
            idProduit: row.idProduit || `SQL_${row.id_produit || row.id}`,
            sourceSystem: this.sourceSystem,
            description: row.description || '',
            prixCout: row.prixCout || row.prix_cout || row.prix || 0,
            categorie: row.categorie || ''
          });
          produitCollection.addItem(produit);
        }
        return produitCollection;
        
      case 'commande':
        const commandeCollection = new CommandeCollection();
        for (const row of results) {
          const commande = new Commande({
            idCommande: row.idCommande || `SQL_${row.id_commande || row.id}`,
            sourceSystem: this.sourceSystem,
            dateCommande: (row.dateCommande || row.date_commande || row.date)?formatDate(row.dateCommande || row.date_commande || row.date):(row.dateCommande || row.date_commande || row.date),
            montant: row.montant || 0,
            statut: row.statut || '',
            modePaiement: row.modePaiement || row.mode_paiement || row.mode_paiment,
            clientRef: row.clientRef || (row.client_ref ? `SQL_${row.client_ref}` : null),
            employeRef: row.employeRef || (row.employe_ref ? `SQL_${row.employe_ref}` : null)
          });
          commandeCollection.addItem(commande);
        }
        return commandeCollection;
        
      case 'detail_commande':
      case 'details_commande':
      case 'detailscommande':
      case 'detailcommande':
        const detailCommandeCollection = new DetailCommandeCollection();
        for (const row of results) {
          const detailCommande = new DetailCommande({
            idCommande: row.idCommande || (row.id_commande ? `SQL_${row.id_commande}` : `SQL_${row.commande_id}`),
            idProduit: row.idProduit || (row.id_produit ? `SQL_${row.id_produit}` : `SQL_${row.produit_id}`),
            sourceSystem: this.sourceSystem,
            quantite: row.quantite || 0
          });
          detailCommandeCollection.addItem(detailCommande);
        }
        return detailCommandeCollection;
        
      case 'facture':
        const factureCollection = new FactureCollection();
        for (const row of results) {
          const facture = new Facture({
            idFacture: row.idFacture || `SQL_${row.id_facture || row.id}`,
            sourceSystem: this.sourceSystem,
            montantTotal: row.montantTotal || row.montant_total || row.montant || 0,
            dateFacture: formatDate(row.dateFacture || row.date_facture || row.date),
            commandeRef: row.commandeRef || (row.commande_ref ? `SQL_${row.commande_ref}` : null)
          });
          factureCollection.addItem(facture);
        }
        return factureCollection;
        
      case 'livraison':
        const livraisonCollection = new LivraisonCollection();
        for (const row of results) {
          const livraison = new Livraison({
            idLivraison: row.idLivraison || `SQL_${row.id_livraison || row.id}`,
            sourceSystem: this.sourceSystem,
            transporteur: row.transporteur || '',
            dateEstimee: formatDate(row.dateEstimee || row.date_estimee || row.date),
            statut: row.statut || '',
            commandeRef: row.commandeRef || (row.commande_ref ? `SQL_${row.commande_ref}` : null)
          });
          livraisonCollection.addItem(livraison);
        }
        return livraisonCollection;
        
      case 'approvisionnements':
        const approvisionnementCollection = new ApprovisionnementCollection();
        for (const row of results) {
          const approvisionnement = new Approvisionnement({
            idProduit: row.idProduit || (row.id_produit ? `SQL_${row.id_produit}` : `SQL_${row.produit_id}`),
            idFournisseur: row.idFournisseur || (row.id_fournisseur ? `SQL_${row.id_fournisseur}` : `SQL_${row.fournisseur_id}`),
            sourceSystem: this.sourceSystem,
            quantite: row.quantite || 0
          });
          approvisionnementCollection.addItem(approvisionnement);
        }
        return approvisionnementCollection;
        
      default:
        console.warn(`Unknown table type: ${tableName}, returning original results`);
        return results;
    }
  }

  /**
   * Convert SQL query results to the appropriate collection type
   * This method is a shorthand for convertToCollection that takes the entity name and results
   * 
   * @param entityName The entity/table name
   * @param results Array of SQL query results
   * @returns Collection of the appropriate type
   */
  private convertSqlResultToCollection(entityName: string, results: any[]): any {
    return this.convertToCollection(entityName, results);
  }

  // ...remaining adapter methods
}