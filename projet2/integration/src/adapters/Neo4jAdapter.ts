/**
 * Neo4jAdapter.ts
 * Adapter for Neo4j graph database
 */

import { Driver, Session, Record as Neo4jRecord } from 'neo4j-driver';
import neo4j from 'neo4j-driver';
import { IAdapter, QueryFilter } from './IAdapter';
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
import { formatDate, formatDateTime, parseDate } from '../common/DateUtils';
import { LAVViewDefinition } from '../common/LAVMapping';

export class Neo4jAdapter implements IAdapter {
  private driver: Driver | null = null;
  private session: Session | null = null;
  private connected: boolean = false;
  private sourceSystem: string = 'NEO4J';
  
  private uri: string;
  private username: string;
  private password: string;
  private database: string;

  /**
   * Constructor - Initialize with connection settings
   */
  constructor(
    sourceSystem: string,
    uri: string = 'neo4j://localhost:7687',
    username: string = 'neo4j',
    password: string = 'neo4j',
    database: string = 'neo4j'
  ) {
    this.sourceSystem = sourceSystem;
    this.uri = uri;
    this.username = username;
    this.password = password;
    this.database = database;
  }
  /**
   * Determines if this adapter can handle the given query
   * 
   * @param filter The query filter to evaluate
   * @param entityName The name of the entity being queried
   * @returns true if the adapter can handle this query
   */
  canHandleQuery(filter: QueryFilter, entityName: string): boolean {
    // Check if the entity is supported
    const supportedEntities = [
      'clients', 'client',
      'employees', 'employe',
      'agences', 'agence',
      'fournisseurs', 'fournisseur',
      'produits', 'produit',
      'commandes', 'commande',
      'details_commande', 'detail_commande',
      'factures', 'facture',
      'livraisons', 'livraison',
      'approvisionnements', 'approvisionnement'
    ];
    
    if (!supportedEntities.includes(entityName.toLowerCase())) {
      return false;
    }
    
    // Check for unsupported operations
    if (filter.joins && filter.joins.length > 0) {
      // We support some basic joins but not complex ones
      const maxJoins = 1;
      if (filter.joins.length > maxJoins) {
        return false;
      }
      
      // Check if all joined entities are supported
      for (const join of filter.joins) {
        if (!supportedEntities.includes(join.rightTable.toLowerCase())) {
          return false;
        }
      }
    }
    
    // We can handle most conditions with our Cypher translations
    return true;
  }

  /**
   * Translates a query filter to a Neo4j-specific query
   * 
   * @param filter The query filter to translate
   * @param entityName The name of the entity being queried
   * @returns An object containing the Cypher query and parameters
   */
  translateQuery(filter: QueryFilter, entityName: string) {
    const nodeAlias = entityName.charAt(0).toLowerCase();
    let query = '';
    let returnClause = '';
    const params: Record<string, any> = {};
    
    // Build the MATCH clause based on entity
    switch (entityName.toLowerCase()) {
      case 'clients':
      case 'client':
        query = `MATCH (${nodeAlias}:Client)`;
        returnClause = `RETURN ${nodeAlias}.id_client as id, ${nodeAlias}.nom as nom, ${nodeAlias}.adresse as adresse, ${nodeAlias}.email as email, ${nodeAlias}.telephone as telephone`;
        break;
      case 'employees':
      case 'employe':
        query = `MATCH (${nodeAlias}:Employe)`;
        returnClause = `RETURN ${nodeAlias}.id_employe as id, ${nodeAlias}.nom as nom, ${nodeAlias}.email as email, ${nodeAlias}.poste as poste`;
        break;
      case 'agences':
      case 'agence':
        query = `MATCH (${nodeAlias}:Agence)`;
        returnClause = `RETURN ${nodeAlias}.id_agence as id, ${nodeAlias}.ville as ville, ${nodeAlias}.adresse as adresse`;
        break;
      case 'fournisseurs':
      case 'fournisseur':
        query = `MATCH (${nodeAlias}:Fournisseur)`;
        returnClause = `RETURN ${nodeAlias}.id_fournisseur as id, ${nodeAlias}.nom as nom, ${nodeAlias}.adresse as adresse, ${nodeAlias}.telephone as telephone`;
        break;
      case 'produits':
      case 'produit':
        query = `MATCH (${nodeAlias}:Produit)`;
        returnClause = `RETURN ${nodeAlias}.id_produit as id, ${nodeAlias}.description as description, ${nodeAlias}.prix as prix, ${nodeAlias}.categorie as categorie`;
        break;
      case 'commandes':
      case 'commande':
        query = `MATCH (${nodeAlias}:Commande)
                OPTIONAL MATCH (c:Client)-[:PASSE]->(${nodeAlias})
                OPTIONAL MATCH (e:Employe)-[:GERE]->(${nodeAlias})`;
        returnClause = `RETURN ${nodeAlias}.id_commande as id, ${nodeAlias}.date as date, ${nodeAlias}.montant as montant, ${nodeAlias}.statut as statut, 
                ${nodeAlias}.mode_paiement as mode_paiement, c.id_client as client_id, e.id_employe as employe_id`;
        break;
      case 'details_commande':
      case 'detail_commande':
        query = `MATCH (c:Commande)-[d:DETAIL]->(p:Produit)`;
        returnClause = `RETURN c.id_commande as id_commande, p.id_produit as produit_id, d.quantite as quantite`;
        break;
      case 'factures':
      case 'facture':
        query = `MATCH (c:Commande)-[:FACTURE]->(${nodeAlias}:Facture)`;
        returnClause = `RETURN ${nodeAlias}.id_facture as id, ${nodeAlias}.montant_total as montant_total, ${nodeAlias}.date as date, c.id_commande as commande_ref`;
        break;
      case 'livraisons':
      case 'livraison':
        query = `MATCH (c:Commande)-[:LIVREE_PAR]->(${nodeAlias}:Livraison)`;
        returnClause = `RETURN ${nodeAlias}.id_livraison as id, ${nodeAlias}.transporteur as transporteur, 
                ${nodeAlias}.date_estimee as date_estimee, ${nodeAlias}.statut as statut, c.id_commande as commande_ref`;
        break;
      case 'approvisionnements':
      case 'approvisionnement':
        query = `MATCH (p:Produit)-[a:FOURNI_PAR]->(f:Fournisseur)`;
        returnClause = `RETURN p.id_produit as produit_id, f.id_fournisseur as fournisseur_id, a.quantite as quantite`;
        break;
      default:
        throw new Error(`Unknown entity type: ${entityName}`);
    }
    
    // Add WHERE clause if there are conditions
    if (filter.conditions && filter.conditions.length > 0) {
      const { whereClause, params: whereParams } = this.buildWhereClause(filter, nodeAlias);
      if (whereClause) {
        query += `\n${whereClause}`;
        Object.assign(params, whereParams);
      }
    }
    
    // Add ORDER BY clause if specified
    if (filter.orderBy && filter.orderBy.length > 0) {
      const orderTerms = filter.orderBy.map(order => {
        const prop = this.translateProperty(order.column);
        return `${nodeAlias}.${prop} ${order.type}`;
      });
      query += `\nORDER BY ${orderTerms.join(', ')}`;
    }
    
    // Add LIMIT clause if specified
    if (filter.limit) {
      query += `\nLIMIT ${filter.limit}`;
    }
    
    // Add SKIP clause for pagination
    if (filter.offset) {
      query += `\nSKIP ${filter.offset}`;
    }
    
    // Add the return clause
    query += `\n${returnClause}`;
    
    return { query, params };
  }

  /**
   * Connect to the Neo4j database
   */
  public async connect(): Promise<boolean> {
    try {
      console.log(`Connecting to Neo4j at ${this.uri}...`);
      
      this.driver = neo4j.driver(
        this.uri, 
        neo4j.auth.basic(this.username, this.password),
        {
          maxConnectionLifetime: 60 * 60 * 1000,
          maxConnectionPoolSize: 50,
          connectionAcquisitionTimeout: 30 * 1000
        }
      );
      
      const session = this.driver.session({
        database: this.database,
        defaultAccessMode: neo4j.session.READ
      });
      
      try {
        const result = await session.run('RETURN 1 as test');
        console.log('Neo4j connection test successful:', result.records[0].get('test').toNumber());
      } finally {
        await session.close();
      }
      
      // Create a persistent session for future queries
      this.session = this.driver.session({
        database: this.database,
        defaultAccessMode: neo4j.session.READ
      });
      
      this.connected = true;
      console.log(`Connected to Neo4j database (${this.database}) successfully.`);
      return true;
    } catch (error) {
      console.error('Neo4j Connection Error:', error);
      this.connected = false;
      throw new Error(`Failed to connect to Neo4j: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Disconnect from Neo4j
   */
  public disconnect(): void {
    if (this.session) {
      this.session.close();
      this.session = null;
    }
    
    if (this.driver) {
      this.driver.close();
      this.driver = null;
    }
    this.connected = false;
    console.log('Disconnected from Neo4j.');
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public getSourceSystem(): string {
    return this.sourceSystem;
  }

  /**
   * Get source description for this adapter
   * This provides information about what data is available in this source
   * Following the formal framework (G,S,M) from the course material
   * 
   * @returns Source description
   */
  public getSourceDescription(): SourceDescription {
    // Define capabilities of Neo4j source
    const capabilities: SourceCapabilities = {
      canFilter: true,
      canProject: true,
      canSort: true,
      canJoin: true,    // Neo4j is good at traversing relationships
      canAggregate: true,
      maxComplexity: 7  // High complexity handling due to graph nature
    };
    
    // Define available entities and their attributes
    const entities: EntityAvailability[] = [
      {
        entityName: 'clients',
        isComplete: true,
        attributes: ['id_client', 'nom', 'adresse', 'email', 'telephone']
      },
      {
        entityName: 'employees',
        isComplete: true,
        attributes: ['id_employe', 'nom', 'email', 'poste']
      },
      {
        entityName: 'agences',
        isComplete: true,
        attributes: ['id_agence', 'ville', 'adresse']
      },
      {
        entityName: 'fournisseurs',
        isComplete: true,
        attributes: ['id_fournisseur', 'nom', 'adresse', 'telephone']
      },
      {
        entityName: 'produits',
        isComplete: true,
        attributes: ['id_produit', 'description', 'prix', 'categorie']
      },
      {
        entityName: 'commandes',
        isComplete: true,
        attributes: ['id_commande', 'date', 'montant', 'statut', 'mode_paiement', 'client_ref', 'employe_ref']
      },
      {
        entityName: 'details_commande',
        isComplete: true,
        attributes: ['commande_id', 'produit_id', 'quantite']
      },
      {
        entityName: 'factures',
        isComplete: true,
        attributes: ['id_facture', 'montant_total', 'date', 'commande_ref']
      },
      {
        entityName: 'livraisons',
        isComplete: true,
        attributes: ['id_livraison', 'transporteur', 'date_estimee', 'statut', 'commande_ref']
      },
      {
        entityName: 'approvisionnements',
        isComplete: true,
        attributes: ['produit_id', 'fournisseur_id', 'quantite']
      }
    ];
    
    return new SourceDescription(
      this.sourceSystem,
      'Neo4j Graph Database',
      entities,
      capabilities
    );
  }

  /**
   * Execute a Cypher query
   */
  private async executeCypherQuery(query: string, params: Record<string, any> = {}): Promise<any[]> {
    try {
      // Ensure we have a valid session
      if (!this.isConnected() || !this.session) {
        await this.connect();
      }
      
      if (!this.session) {
        throw new Error('Failed to create a Neo4j session');
      }
      
      console.log(`Executing Cypher query: ${query}`);
      if (Object.keys(params).length > 0) {
        console.log('With parameters:', params);
      }
      
      const result = await this.session.run(query, params);
      
      // Process records to make them easier to work with
      const processedRecords = result.records.map(record => {
        const processedRecord: Record<string, any> = {};
        
        // Convert Neo4j record to a simple object
        record.keys.forEach(key => {
          const value = record.get(key);
          // Handle Neo4j integer type
          if (neo4j.isInt(value)) {
            processedRecord[key] = neo4j.integer.toNumber(value);
          } else if (value && typeof value === 'object' && value.properties) {
            // Handle Neo4j node objects
            processedRecord[key] = value.properties;
          } else {
            processedRecord[key] = value;
          }
        });
        
        // Add a get method for compatibility
        processedRecord.get = function(field: string) {
          return this[field];
        };
        
        return processedRecord;
      });
      
      return processedRecords;
    } catch (error) {
      console.error('Error executing Neo4j query:', error);
      throw error;
    }
  }

  /**
   * Translate camelCase property to Neo4j property
   */
  private translateProperty(property: string): string {
    const propertyMap: Record<string, string> = {
      'nomComplet': 'nom',
      'emailContact': 'email',
      'numeroTelephone': 'telephone',
      'prixCout': 'prix',
      'dateCommande': 'date',
      'modePaiement': 'mode_paiement',
      'montantTotal': 'montant_total',
      'dateFacture': 'date',
      'dateEstimee': 'date_estimee'
    };
    return propertyMap[property] || property;
  }

  /**
   * Build where clause for Neo4j queries
   */
  private buildWhereClause(filter: QueryFilter, nodeAlias: string): { whereClause: string, params: Record<string, any> } {
    const params: Record<string, any> = {};
    const conditions: string[] = [];

    if (filter.conditions && filter.conditions.length > 0) {
      filter.conditions.forEach((condition, index) => {
        if (condition.type === 'binary_expr' && condition.left.type === 'column_ref') {
          const property = this.translateProperty(condition.left.column);
          const paramName = `param${index}`;
          params[paramName] = condition.right.value;
          
          switch (condition.operator.toUpperCase()) {
            case '=':
              conditions.push(`${nodeAlias}.${property} = $${paramName}`);
              break;
            case '!=':
              conditions.push(`${nodeAlias}.${property} <> $${paramName}`);
              break;
            case '>':
              conditions.push(`${nodeAlias}.${property} > $${paramName}`);
              break;
            case '<':
              conditions.push(`${nodeAlias}.${property} < $${paramName}`);
              break;
            case '>=':
              conditions.push(`${nodeAlias}.${property} >= $${paramName}`);
              break;
            case '<=':
              conditions.push(`${nodeAlias}.${property} <= $${paramName}`);
              break;
            case 'LIKE':
              if (typeof condition.right.value === 'string') {
                const value = condition.right.value;
                if (value.startsWith('%') && value.endsWith('%')) {
                  params[paramName] = `(?i).*${value.slice(1, -1)}.*`;
                  conditions.push(`${nodeAlias}.${property} =~ $${paramName}`);
                } else if (value.startsWith('%')) {
                  params[paramName] = `(?i).*${value.slice(1)}$`;
                  conditions.push(`${nodeAlias}.${property} =~ $${paramName}`);
                } else if (value.endsWith('%')) {
                  params[paramName] = `(?i)^${value.slice(0, -1)}.*`;
                  conditions.push(`${nodeAlias}.${property} =~ $${paramName}`);
                } else {
                  conditions.push(`${nodeAlias}.${property} = $${paramName}`);
                }
              }
              break;
            case 'IN':
              conditions.push(`${nodeAlias}.${property} IN $${paramName}`);
              break;
          }
        }
      });
    }
    
    return {
      whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
      params
    };
  }
  
  /**
   * Execute filtered query that translates mediator's filter to Neo4j Cypher
   */
  public async executeFilteredQuery(tableName: string, filter: QueryFilter): Promise<any> {
    const entityName = tableName.toLowerCase();
    
    // Special handling for JOIN operations
    if (filter && filter.joins && filter.joins.length > 0) {
      // For JOIN queries, only return the specific entity data needed for this adapter
      //return this.executeJoinAwareQuery(entityName, filter);
    }
    
    // Create a non-recursive implementation to prevent stack overflow
    if (!this.isConnected()) {
      await this.connect();
    }
    
    console.log(`Neo4jAdapter: executeFilteredQuery for ${entityName}`);
    
    try {
      let query = '';
      const params: Record<string, any> = {};
      
      switch(entityName) {
        case 'clients':
          query = `MATCH (c:Client) RETURN c.id_client as id, c.nom as nom, c.adresse as adresse, c.email as email, c.telephone as telephone`;
          break;
        case 'employees':
          query = `MATCH (e:Employe) RETURN e.id_employe as id, e.nom as nom, e.email as email, e.poste as poste`;
          break;
        case 'agences':
          query = `MATCH (a:Agence) RETURN a.id_agence as id, a.ville as ville, a.adresse as adresse`;
          break;
        case 'fournisseurs':
          query = `MATCH (f:Fournisseur) RETURN f.id_fournisseur as id, f.nom as nom, f.adresse as adresse, f.telephone as telephone`;
          break;
        case 'produits':
          query = `MATCH (p:Produit) RETURN p.id_produit as id, p.description as description, p.prix as prix, p.categorie as categorie`;
          break;
        case 'commandes':
          query = `MATCH (o:Commande)
              OPTIONAL MATCH (c:Client)-[:PASSE]->(o)
              OPTIONAL MATCH (e:Employe)-[:GERE]->(o) 
              RETURN o.id_commande as id, o.date as date, o.montant as montant, o.statut as statut, 
              o.mode_paiement as mode_paiement, c.id_client as client_id, e.id_employe as employe_id`;
          break;
        case 'details_commande':
          query = `MATCH (c:Commande)-[d:DETAIL]->(p:Produit) RETURN c.id_commande as id_commande, p.id_produit as produit_id, d.quantite as quantite`;
          break;
        case 'factures':
          query = `MATCH (c:Commande)-[:FACTURE]->(f:Facture) RETURN f.id_facture as id, f.montant_total as montant_total, f.date as date, c.id_commande as commande_ref`;
          break;
        case 'livraisons':
          query = `MATCH (c:Commande)-[:LIVREE_PAR]->(l:Livraison) RETURN l.id_livraison as id, l.transporteur as transporteur, 
              l.date_estimee as date_estimee, l.statut as statut, c.id_commande as commande_ref`;
          break;
        case 'approvisionnements':
          query = `MATCH (p:Produit)-[a:FOURNI_PAR]->(f:Fournisseur) RETURN p.id_produit as produit_id, f.id_fournisseur as fournisseur_id, a.quantite as quantite`;
          break;
        default:
          throw new Error(`Unknown entity type: ${entityName}`);
      }
      
      const records = await this.executeCypherQuery(query, params);
      return this.convertCypherResultToCollection(entityName, records);
    }
    catch (error) {
      console.error(`Error executing filtered query for ${entityName}:`, error);
      return this.getEmptyCollection(entityName);
    }
  }
  
  /**
   * Execute a query specifically optimized for JOIN operations
   * This returns only the entity data needed from this source
   * 
   * @param entityName The entity name to query
   * @param filter The query filter with JOIN information
   * @returns Entity data from this source
   */
  private async executeJoinAwareQuery(entityName: string, filter: QueryFilter): Promise<any> {
    if (!this.isConnected()) {
      await this.connect();
    }
    
    console.log(`Neo4jAdapter: executeFilteredQuery for ${entityName}`);

    try {
      // Determine which projections and properties are needed for this entity
      const entitySpecificFilter = this.extractEntitySpecificFilter(entityName, filter);
      
      // Create a Cypher query that only fetches this entity's data
      let query = '';
      let returnClause = '';
      
      switch (entityName) {
        case 'clients':
          query = `
            MATCH (c:Client) 
          `;
          returnClause = this.buildReturnClauseForClient();
          break;
        case 'commandes':
          query = `
            MATCH (o:Commande) 
          `;
          returnClause = this.buildReturnClauseForCommande();
          break;
        case 'factures':
          query = `
            MATCH (c:Commande)-[:FACTURE]->(f:Facture) 
          `;
          returnClause = this.buildReturnClauseForFacture();
          break;
        case 'produits':
          query = `
            MATCH (p:Produit)
          `;
          returnClause = this.buildReturnClauseForProduit();
          break;
        case 'livraisons':
          query = `
            MATCH (c:Commande)-[:LIVREE_PAR]->(l:Livraison)
          `;
          returnClause = this.buildReturnClauseForLivraison();
          break;
        // Add cases for other entities as needed
        default:
          throw new Error(`Neo4jAdapter: Unsupported entity for JOIN: ${entityName}`);
      }
      
      // Add WHERE clause if any conditions apply to this entity
      const conditions = this.buildWhereClauseForEntity(entityName, entitySpecificFilter.conditions);
      if (conditions) {
        query += `WHERE ${conditions} `;
      }
      
      // Complete the query with RETURN, ORDER BY, and LIMIT clauses
      query += `\n${returnClause} `;
      
      // Handle ORDER BY only if it applies to this entity
      if (entitySpecificFilter.orderBy && entitySpecificFilter.orderBy.length > 0) {
        const orderByTerms = entitySpecificFilter.orderBy.map(order => {
          const field = this.mapFieldToCypher(entityName, order.column);
          return `${field} ${order.type}`;
        }).join(', ');
        
        query += `\nORDER BY ${orderByTerms} `;
      }
      
      // Add LIMIT clause
      if (entitySpecificFilter.limit) {
        query += `\nLIMIT ${entitySpecificFilter.limit}`;
      }
      
      console.log('Executing Cypher query:', query);
      const result = await this.executeCypherQuery(query);
      return this.convertCypherResultToCollection(entityName, result);
    }
    catch (error) {
      console.error(`Error executing filtered query for ${entityName}:`, error);
      
      // Return an empty collection instead of failing
      return this.getEmptyCollection(entityName);
    }
  }
  
  /**
   * Build the appropriate RETURN clause for Client nodes
   */
  private buildReturnClauseForClient(): string {
    return `RETURN c.id_client as id, c.nom as nom, c.adresse as adresse, c.email as email, c.telephone as telephone`;
  }
  
  /**
   * Build the appropriate RETURN clause for Facture nodes
   */
  private buildReturnClauseForFacture(): string {
    return `RETURN f.id_facture as id, f.montant_total as montant_total, f.date as date, c.id_commande as commande_ref`
  }
  
  /**
   * Build the appropriate RETURN clause for Commande nodes
   */
  private buildReturnClauseForCommande(): string {
    return `OPTIONAL MATCH (c:Client)-[:PASSE]->(o)
              OPTIONAL MATCH (e:Employe)-[:GERE]->(o) 
              RETURN o.id_commande as id, o.date as date, o.montant as montant, o.statut as statut, 
              o.mode_paiement as mode_paiement, c.id_client as client_id, e.id_employe as employe_id`;
  }
  
  /**
   * Build the appropriate RETURN clause for Produit nodes
   */
  private buildReturnClauseForProduit(): string {
    return `RETURN p.id_produit as id, p.description as description, p.prix as prix, p.categorie as categorie`;
  }
  
  /**
   * Build the appropriate RETURN clause for Livraison nodes
   */
  private buildReturnClauseForLivraison(): string {
    return `RETURN
      l.id_livraison as id,
      l.transporteur as transporteur, 
      l.date_estimee as date_estimee,
      l.statut as statut,
      c.id_commande as commande_ref`;
  }
  
  /**
   * Extract a filter specific to just this entity from a JOIN filter
   * 
   * @param entityName The entity to extract filter for
   * @param filter The original filter with JOIN information
   * @returns Entity-specific filter
   */
  private extractEntitySpecificFilter(entityName: string, filter: QueryFilter): QueryFilter {
    const result: QueryFilter = {
      projections: [],
      conditions: [],
    };
    
    // Copy over projections that apply to this entity
    if (filter.projections && filter.projections.length > 0) {
      result.projections = filter.projections.filter(projection => 
        this.projectionBelongsToEntity(projection, entityName)
      );
    }
    
    // Copy limit clause
    result.limit = filter.limit;
    
    // Copy order by clauses that apply to this entity
    if (filter.orderBy && filter.orderBy.length > 0) {
      result.orderBy = filter.orderBy.filter(order => 
        this.projectionBelongsToEntity(order.column, entityName)
      );
    }
    
    // Add any required fields for joins
    if (entityName === 'clients') {
      if (!result.projections?.includes('idClient')) {
        result.projections?.push('idClient');
      }
    }
    
    if (entityName === 'commandes') {
      if (!result.projections?.includes('idCommande')) {
        result.projections?.push('idCommande');
      }
      if (!result.projections?.includes('clientRef')) {
        result.projections?.push('clientRef');
      }
    }
    
    return result;
  }
  
  /**
   * Check if a projection field belongs to an entity
   * 
   * @param projection The projection field name
   * @param entityName The entity name
   * @returns true if the projection belongs to the entity
   */
  /*private projectionBelongsToEntity(projection: string, entityName: string): boolean {
    const entityFields: Record<string, string[]> = {
      'clients': ['idClient', 'nomComplet', 'adresse', 'emailContact', 'numeroTelephone'],
      'commandes': ['idCommande', 'dateCommande', 'montant', 'statut', 'modePaiement', 'clientRef', 'employeRef'],
      'factures': ['idFacture', 'montantTotal', 'dateFacture', 'commandeRef'],
      'produits': ['idProduit', 'description', 'prixCout', 'categorie']
    };
    
    return entityFields[entityName]?.includes(projection) || false;
  }*/
  
  /**
   * Determine if a projection belongs to an entity
   * 
   * @param projection The projection/column name
   * @param entityName The entity name
   * @returns Whether this projection belongs to the entity
   */
  private projectionBelongsToEntity(projection: string, entityName: string): boolean {
    const clientFields = ['idClient', 'nomComplet', 'adresse', 'emailContact', 'numeroTelephone'];
    const commandeFields = ['idCommande', 'dateCommande', 'montant', 'statut', 'modePaiement', 'clientRef', 'employeRef'];
    const factureFields = ['idFacture', 'montantTotal', 'dateFacture', 'commandeRef'];
    const produitFields = ['idProduit', 'description', 'prixCout', 'categorie'];
    
    switch (entityName) {
      case 'clients':
        return clientFields.includes(projection);
      case 'commandes':
        return commandeFields.includes(projection);
      case 'factures':
        return factureFields.includes(projection);
      case 'produits':
        return produitFields.includes(projection);
      default:
        return false;
    }
  }
  
  /**
   * Map a field name from the data model to its Cypher equivalent
   * 
   * @param entityName The entity the field belongs to
   * @param field The field name
   * @returns The Cypher property reference
   */
  private mapFieldToCypher(entityName: string, field: string): string {
    const fieldMappings: Record<string, Record<string, string>> = {
      'clients': {
        'idClient': 'c.id_client',
        'nomComplet': 'c.nom',
        'adresse': 'c.adresse',
        'emailContact': 'c.email',
        'numeroTelephone': 'c.telephone'
      },
      'commandes': {
        'idCommande': 'o.id_commande',
        'dateCommande': 'o.date',
        'montant': 'o.montant',
        'statut': 'o.statut',
        'modePaiement': 'o.mode_paiement',
        'clientRef': 'o.client_ref',
        'employeRef': 'o.employe_ref'
      },
      'factures': {
        'idFacture': 'f.id_facture',
        'montantTotal': 'f.montant_total',
        'dateFacture': 'f.date',
        'commandeRef': 'f.commande_ref'
      },
      'produits': {
        'idProduit': 'p.id_produit',
        'description': 'p.description',
        'prixCout': 'p.prix',
        'categorie': 'p.categorie'
      }
    };
    
    if (fieldMappings[entityName] && fieldMappings[entityName][field]) {
      return fieldMappings[entityName][field];
    }
    
    // Default fallback - use the field directly
    return field;
  }
  
  /**
   * Get an empty collection for a given entity type
   * 
   * @param entityName The entity name
   * @returns Empty collection of the appropriate type
   */
  private getEmptyCollection(entityName: string): any {
    switch (entityName) {
      case 'clients':
        return new ClientCollection();
      case 'employees':
        return new EmployeeCollection();
      case 'agences':
        return new AgenceCollection();
      case 'fournisseurs':
        return new FournisseurCollection();
      case 'produits':
        return new ProduitCollection();
      case 'commandes':
        return new CommandeCollection();
      case 'details_commande':
        return new DetailCommandeCollection();
      case 'factures':
        return new FactureCollection();
      case 'livraisons':
        return new LivraisonCollection();
      case 'approvisionnements':
        return new ApprovisionnementCollection();
      default:
        throw new Error(`Unknown entity type: ${entityName}`);
    }
  }
  
  /**
   * Build WHERE clause for Cypher query based on entity type and conditions
   */
  private buildWhereClauseForEntity(entityName: string, conditions: any[] | undefined): string {
    if (!conditions || conditions.length === 0) {
      return '';
    }
    
    const cypherConditions: string[] = [];
    
    for (const condition of conditions) {
      if (condition.type === 'binary_expr' && condition.left && condition.right) {
        const field = this.mapFieldToCypher(entityName, condition.left.column);
        const operator = this.translateOperatorToCypher(condition.operator);
        let value = this.formatValueForCypher(condition.right.value);
        
        cypherConditions.push(`${field} ${operator} ${value}`);
      }
    }
    
    return cypherConditions.join(' AND ');
  }
  
  /**
   * Translate SQL operator to Cypher equivalent
   */
  private translateOperatorToCypher(operator: string): string {
    const operatorMap: Record<string, string> = {
      '=': '=',
      '!=': '<>',
      '<>': '<>',
      '>': '>',
      '<': '<',
      '>=': '>=',
      '<=': '<=',
      'LIKE': '=~',
      'IN': 'IN',
      'NOT IN': 'NOT IN'
    };
    
    return operatorMap[operator.toUpperCase()] || operator;
  }
  
  /**
   * Format a value for use in Cypher query
   */
  private formatValueForCypher(value: any): string {
    if (value === null) {
      return 'null';
    } else if (typeof value === 'string') {
      return `'${value.replace(/'/g, "\\'")}'`;
    } else if (typeof value === 'number') {
      return String(value);
    } else if (typeof value === 'boolean') {
      return String(value);
    } else if (Array.isArray(value)) {
      const items = value.map(v => this.formatValueForCypher(v));
      return `[${items.join(', ')}]`;
    }
    
    return String(value);
  }

  /**
   * Convert Cypher query results to the appropriate collection type
   * 
   * @param entityName The entity name
   * @param records Array of Neo4j records
   * @returns Collection of the appropriate type
   */
  private convertCypherResultToCollection(entityName: string, records: Neo4jRecord[]): any {

    
    // Normalize the entity name
    const normalizedEntityName = entityName.toLowerCase().replace(/s$/, '');
    
    // Convert Neo4j records to plain objects
    const results = records.map(record => {
      const obj: Record<string, any> = {};
      record.keys.forEach(key => {
        obj[String(key)] = record.get(key);
      });
      // Always add source system
      obj.sourceSystem = this.sourceSystem;
      return obj;
    });



    
    
    switch (normalizedEntityName) {
      case 'client':
        const clientCollection = new ClientCollection();
        for (const row of results) {
          const client = new Client({
            idClient: `NEO_${row.id}`,
            sourceSystem: this.sourceSystem,
            nomComplet: row.nom || '',
            adresse: row.adresse || '',
            emailContact: row.email || '',
            numeroTelephone: row.telephone || ''
          });
          clientCollection.addItem(client);
        }
        return clientCollection;
        
      case 'employe':
      case 'employee':
        const employeeCollection = new EmployeeCollection();
        for (const row of results) {
          const employee = new Employee({
            idEmploye: `NEO_${row.id}`,
            sourceSystem: this.sourceSystem,
            nomComplet: row.nom || '',
            email: row.email || '',
            poste: row.poste || ''
          });
          employeeCollection.addItem(employee);
        }
        return employeeCollection;
        
      case 'agence':
        const agenceCollection = new AgenceCollection();
        for (const row of results) {
          const agence = new Agence({
            idAgence: `NEO_${row.id}`,
            sourceSystem: this.sourceSystem,
            ville: row.ville || '',
            adresse: row.adresse || ''
          });
          agenceCollection.addItem(agence);
        }
        return agenceCollection;
        
      case 'fournisseur':
        const fournisseurCollection = new FournisseurCollection();
        for (const row of results) {
          const fournisseur = new Fournisseur({
            idFournisseur: `NEO_${row.id}`,
            sourceSystem: this.sourceSystem,
            nomFournisseur: row.nom || '',
            adresse: row.adresse || '',
            numeroTelephone: row.telephone || ''
          });
          fournisseurCollection.addItem(fournisseur);
        }
        return fournisseurCollection;
        
      case 'produit':
        const produitCollection = new ProduitCollection();
        for (const row of results) {
          const produit = new Produit({
            idProduit: `NEO_${row.id}`,
            sourceSystem: this.sourceSystem,
            description: row.description || '',
            prixCout: row.prix || 0,
            categorie: row.categorie || ''
          });
          produitCollection.addItem(produit);
        }
        return produitCollection;
        
      case 'commande':
        const commandeCollection = new CommandeCollection();
        for (const row of results) {         
          const commande = new Commande({
            idCommande: `NEO_${row.id}`,
            sourceSystem: this.sourceSystem,
            dateCommande: row.date ? formatDate(row.date) : '',
            montant: row.montant || 0,
            statut: row.statut || '',
            modePaiement: row.mode_paiement || '',
            clientRef: row.client_id ? `NEO_${row.client_id}` : '',
            employeRef: row.employe_id ? `NEO_${row.employe_id}` : ''
          });
          commandeCollection.addItem(commande);
        }
        return commandeCollection;
        
      case 'detail_commande':
      case 'details_commande':
        const detailCommandeCollection = new DetailCommandeCollection();
        for (const row of results) {
          const detailCommande = new DetailCommande({
            idCommande: `NEO_${ row.id_commande || row.commande_id || row.idCommande}`,
            idProduit: `NEO_${row.produit_id || row.idProduit}`,
            sourceSystem: this.sourceSystem,
            quantite: row.quantite.low || 0
          });
          detailCommandeCollection.addItem(detailCommande);
        }
        return detailCommandeCollection;
        
      case 'facture':
        const factureCollection = new FactureCollection();
        for (const row of results) {
          const facture = new Facture({
            idFacture: `NEO_${row.id}`,
            sourceSystem: this.sourceSystem,
            montantTotal: row.montant_total || 0,
            dateFacture: row.date ? formatDate(row.date) : '',
            commandeRef: row.commande_ref ? `NEO_${row.commande_ref}` : ''
          });
          factureCollection.addItem(facture);
        }
        return factureCollection;
        
      case 'livraison':
        const livraisonCollection = new LivraisonCollection();
        for (const row of results) {
          const livraison = new Livraison({
            idLivraison: `NEO_${row.id}`,
            sourceSystem: this.sourceSystem,
            transporteur: row.transporteur || '',
            dateEstimee: row.date_estimee ? formatDate(row.date_estimee) : '',
            statut: row.statut || '',
            commandeRef: row.commande_ref ? `NEO_${row.commande_ref}` : ''
          });
          livraisonCollection.addItem(livraison);
        }
        return livraisonCollection;
      
      case 'approvisionnement':
        const approvisionnementCollection = new ApprovisionnementCollection();
        for (const row of results) {
          const approvisionnement = new Approvisionnement({
            idProduit: `NEO_${row.produit_id}`,
            idFournisseur: `NEO_${row.fournisseur_id}`,
            sourceSystem: this.sourceSystem,
            quantite: row.quantite.low || 0
          });
          approvisionnementCollection.addItem(approvisionnement);
        }
        return approvisionnementCollection;
      
        
      default:
        console.warn(`Unknown entity type: ${entityName}, returning empty array`);
        return [];
    }
  }

  /**
   * Fetch clients data
   * @param filter Optional query filter
   */
  public async getClients(filter?: QueryFilter): Promise<ClientCollection> {
    if (!this.isConnected()) {
      await this.connect();
    }
    
    console.log('Neo4jAdapter: executing getClients with filter:', filter);
    
    try {
      // Use the generic queryEntityWithFilter method
      return this.queryEntityWithFilter<Client, ClientCollection>(
        'Client',
        filter,
        'id_client',
        (record) => new Client({
          idClient: `NEO_${record.id}`,
          sourceSystem: this.sourceSystem,
          nomComplet: record.nom,
          adresse: record.adresse,
          emailContact: record.email,
          numeroTelephone: record.telephone
        }),
        ClientCollection
      );
    } catch (error) {
      console.error('Error executing getClients:', error);
      return new ClientCollection();
    }
  }
  
  /**
   * Fetch employees data
   * @param filter Optional query filter
   */
  public async getEmployees(filter?: QueryFilter): Promise<EmployeeCollection> {
    if (!this.isConnected()) {
      await this.connect();
    }
    
    console.log('Neo4jAdapter: executing getEmployees with filter:', filter);
    
    try {
      // Use the generic queryEntityWithFilter method
      return this.queryEntityWithFilter<Employee, EmployeeCollection>(
        'Employe',
        filter,
        'id_employe',
        (record) => new Employee({
          idEmploye: `NEO_${record.id}`,
          sourceSystem: this.sourceSystem,
          nomComplet: record.nom || '',
          email: record.email || '',
          poste: record.poste || ''
        }),
        EmployeeCollection
      );
    } catch (error) {
      console.error('Error executing getEmployees:', error);
      return new EmployeeCollection();
    }
  }
  
  /**
   * Fetch agencies data
   * @param filter Optional query filter
   */
  public async getAgences(filter?: QueryFilter): Promise<AgenceCollection> {
    if (!this.isConnected()) {
      await this.connect();
    }
    
    console.log('Neo4jAdapter: executing getAgences with filter:', filter);
    
    try {
      // Use the generic queryEntityWithFilter method
      return this.queryEntityWithFilter<Agence, AgenceCollection>(
        'Agence',
        filter,
        'id_agence',
        (record) => new Agence({
          idAgence: `NEO_${record.id}`,
          sourceSystem: this.sourceSystem,
          ville: record.ville,
          adresse: record.adresse
        }),
        AgenceCollection
      );
    } catch (error) {
      console.error('Error executing getAgences:', error);
      return new AgenceCollection();
    }
  }
  
  /**
   * Fetch suppliers data
   * @param filter Optional query filter
   */
  public async getFournisseurs(filter?: QueryFilter): Promise<FournisseurCollection> {
    if (!this.isConnected()) {
      await this.connect();
    }
    
    console.log('Neo4jAdapter: executing getFournisseurs with filter:', filter);
    
    try {
      // Use the generic queryEntityWithFilter method
      return this.queryEntityWithFilter<Fournisseur, FournisseurCollection>(
        'Fournisseur',
        filter,
        'id_fournisseur',
        (record) => new Fournisseur({
          idFournisseur: `NEO_${record.id}`,
          sourceSystem: this.sourceSystem,
          nomFournisseur: record.nom,
          adresse: record.adresse,
          numeroTelephone: record.telephone
        }),
        FournisseurCollection
      );
    } catch (error) {
      console.error('Error executing getFournisseurs:', error);
      return new FournisseurCollection();
    }
  }
  
  /**
   * Fetch products data
   * @param filter Optional query filter
   */
  public async getProduits(filter?: QueryFilter): Promise<ProduitCollection> {
    if (!this.isConnected()) {
      await this.connect();
    }
    
    console.log('Neo4jAdapter: executing getProduits with filter:', filter);
    
    try {
      // Use the generic queryEntityWithFilter method
      return this.queryEntityWithFilter<Produit, ProduitCollection>(
        'Produit',
        filter,
        'id_produit',
        (record) => new Produit({
          idProduit: `NEO_${record.id}`,
          sourceSystem: this.sourceSystem,
          description: record.description,
          prixCout: record.prix,
          categorie: record.categorie
        }),
        ProduitCollection
      );
    } catch (error) {
      console.error('Error executing getProduits:', error);
      return new ProduitCollection();
    }
  }
  
  /**
   * Fetch orders data
   * @param filter Optional query filter
   */
  public async getCommandes(filter?: QueryFilter): Promise<CommandeCollection> {
    if (!this.isConnected()) {
      await this.connect();
    }
    
    console.log('Neo4jAdapter: executing getCommandes with filter:', filter);
    
    try {
      // Use the generic queryEntityWithFilter method
      return this.queryEntityWithFilter<Commande, CommandeCollection>(
        'Commande',
        filter,
        'id_commande',
        (record) => new Commande({
          idCommande: `NEO_${record.id}`,
          sourceSystem: this.sourceSystem,
          dateCommande: record.date ? formatDate(record.date) : '',
          montant: record.montant || 0,
          statut: record.statut || '',
          modePaiement: record.mode_paiement || '',
          clientRef: record.client_id ? `NEO_${record.client_id}` : '',
          employeRef: record.employe_id ? `NEO_${record.employe_id}` : ''
        }),
        CommandeCollection
      );
    } catch (error) {
      console.error('Error executing getCommandes:', error);
      return new CommandeCollection();
    }
  }
  
  /**
   * Fetch order details data
   * @param filter Optional query filter
   */
  public async getDetailsCommande(filter?: QueryFilter): Promise<DetailCommandeCollection> {
    return filter ? 
      this.executeFilteredQuery('details_commande', filter) : 
      this.executeFilteredQuery('details_commande', {});
  }
  
  /**
   * Fetch invoices data
   * @param filter Optional query filter
   */
  public async getFactures(filter?: QueryFilter): Promise<FactureCollection> {
    if (!this.isConnected()) {
      await this.connect();
    }
    
    console.log('Neo4jAdapter: executing getFactures with filter:', filter);
    
    try {
      // Use the generic queryEntityWithFilter method
      return this.queryEntityWithFilter<Facture, FactureCollection>(
        'Facture',
        filter,
        'id_facture',
        (record) => new Facture({
          idFacture: `NEO_${record.id}`,
          sourceSystem: this.sourceSystem,
          montantTotal: record.montant_total || 0,
          dateFacture: record.date ? formatDate(record.date) : '',
          commandeRef: record.commande_ref ? `NEO_${record.commande_ref}` : ''
        }),
        FactureCollection
      );
    } catch (error) {
      console.error('Error executing getFactures:', error);
      return new FactureCollection();
    }
  }
  
  /**
   * Fetch deliveries data
   * @param filter Optional query filter
   */
  public async getLivraisons(filter?: QueryFilter): Promise<LivraisonCollection> {
    if (!this.isConnected()) {
      await this.connect();
    }
    
    console.log('Neo4jAdapter: executing getLivraisons with filter:', filter);
    
    try {
      // Use the generic queryEntityWithFilter method
      return this.queryEntityWithFilter<Livraison, LivraisonCollection>(
        'Livraison',
        filter,
        'id_livraison',
        (record) => new Livraison({
          idLivraison: `NEO_${record.id}`,
          sourceSystem: this.sourceSystem,
          transporteur: record.transporteur || '',
          dateEstimee: record.date_estimee ? formatDate(record.date_estimee) : '',
          statut: record.statut || '',
          commandeRef: record.commande_ref ? `NEO_${record.commande_ref}` : ''
        }),
        LivraisonCollection
      );
    } catch (error) {
      console.error('Error executing getLivraisons:', error);
      return new LivraisonCollection();
    }
  }
  
  /**
   * Fetch supply data
   * @param filter Optional query filter
   */
  public async getApprovisionnements(filter?: QueryFilter): Promise<ApprovisionnementCollection> {
    return filter ? 
      this.executeFilteredQuery('approvisionnements', filter) : 
      this.executeFilteredQuery('approvisionnements', {});
  }

  /**
   * Generic method to query any entity type from Neo4j
   * This reduces code duplication across the get* methods
   * 
   * @param entityType The entity type (node label) in Neo4j
   * @param filter Optional query filter
   * @param idField The ID field name in Neo4j
   * @param mapping Function to map Neo4j record to entity object
   * @param collectionConstructor Constructor for collection
   * @returns Collection of entities
   */
  private async queryEntityWithFilter<T, C>(
    entityType: string,
    filter: QueryFilter | undefined,
    idField: string,
    mapping: (record: Record<string, any>) => T,
    collectionConstructor: new () => C & { addItem(item: T): void }
  ): Promise<C> {
    if (!this.isConnected()) {
      await this.connect();
    }
    
    console.log(`Neo4jAdapter: executing query for ${entityType} with filter:`, filter);
    
    try {
      // Build query based on entity type
      const nodeAlias = entityType.charAt(0).toLowerCase();
      let query = `MATCH (${nodeAlias}:${entityType})`;
      
      // Add return clause based on entity type
      let returnClause = '';
      switch (entityType) {
        case 'Client':
          returnClause = `RETURN ${nodeAlias}.id_client as id, ${nodeAlias}.nom as nom, ${nodeAlias}.adresse as adresse, ${nodeAlias}.email as email, ${nodeAlias}.telephone as telephone`;
          break;
        case 'Employe':
          returnClause = `RETURN ${nodeAlias}.id_employe as id, ${nodeAlias}.nom as nom, ${nodeAlias}.email as email, ${nodeAlias}.poste as poste`;
          break;
        case 'Agence':
          returnClause = `RETURN ${nodeAlias}.id_agence as id, ${nodeAlias}.ville as ville, ${nodeAlias}.adresse as adresse`;
          break;
        case 'Fournisseur':
          returnClause = `RETURN ${nodeAlias}.id_fournisseur as id, ${nodeAlias}.nom as nom, ${nodeAlias}.adresse as adresse, ${nodeAlias}.telephone as telephone`;
          break;
        case 'Produit':
          returnClause = `RETURN ${nodeAlias}.id_produit as id, ${nodeAlias}.description as description, ${nodeAlias}.prix as prix, ${nodeAlias}.categorie as categorie`;
          break;
        case 'Commande':
          query = `MATCH (${nodeAlias}:${entityType})
                  OPTIONAL MATCH (c:Client)-[:PASSE]->(${nodeAlias})
                  OPTIONAL MATCH (e:Employe)-[:GERE]->(${nodeAlias})`;
          returnClause = `RETURN ${nodeAlias}.id_commande as id, ${nodeAlias}.date as date, ${nodeAlias}.montant as montant, ${nodeAlias}.statut as statut, 
                  ${nodeAlias}.mode_paiement as mode_paiement, c.id_client as client_id, e.id_employe as employe_id`;
          break;
        case 'Facture':
          query = `MATCH (c:Commande)-[:FACTURE]->(${nodeAlias}:${entityType})`;
          returnClause = `RETURN ${nodeAlias}.id_facture as id, ${nodeAlias}.montant_total as montant_total, ${nodeAlias}.date as date, c.id_commande as commande_ref`;
          break;
        case 'Livraison':
          query = `MATCH (c:Commande)-[:LIVREE_PAR]->(${nodeAlias}:${entityType})`;
          returnClause = `RETURN ${nodeAlias}.id_livraison as id, ${nodeAlias}.transporteur as transporteur, 
                  ${nodeAlias}.date_estimee as date_estimee, ${nodeAlias}.statut as statut, c.id_commande as commande_ref`;
          break;
        default:
          throw new Error(`Unknown entity type: ${entityType}`);
      }
      
      // Add filter conditions if provided
      let params: Record<string, any> = {};
      if (filter && filter.conditions && filter.conditions.length > 0) {
        const { whereClause, params: whereParams } = this.buildWhereClause(filter, nodeAlias);
        if (whereClause) {
          query += `\n${whereClause}`;
          params = whereParams;
        }
      }
      
      // Complete query with return clause
      query += `\n${returnClause}`;
      
      // Execute query
      const records = await this.executeCypherQuery(query, params);
      const collection = new collectionConstructor();
      
      // Map results to entities
      for (const record of records) {
        try {
          const entity = mapping(record);
          collection.addItem(entity);
        } catch (itemError) {
          console.warn(`Error creating ${entityType} from record:`, itemError, record);
        }
      }
      
      return collection;
    } catch (error) {
      console.error(`Error executing query for ${entityType}:`, error);
      return new collectionConstructor();
    }
  }
  
  /**
   * Execute a LAV view definition to get mapped data
   * 
   * @param viewDef The LAV view definition to execute
   * @param filter Query filter to apply to the view
   * @returns Results from executing the view with the filter applied
   */
  public async executeLAVView(viewDef: any, filter: QueryFilter = {}): Promise<any[]> {
    if (!this.isConnected()) {
      await this.connect();
    }
    
    if (!viewDef) {
      console.error('No view definition provided to executeLAVView');
      return [];
    }
    
    // Extract the actual view definition from the parameters if necessary
    const viewDefinition = viewDef.parameters?.mapping?.viewDefinition || viewDef;
    
    console.log(`Executing LAV view: ${viewDefinition.name || 'unnamed'}`);
    
    try {
      // Extract entity information from view definition
      const entityType = viewDefinition.entityType || 'Client';
      const nodeAlias = viewDefinition.entityAlias || entityType.charAt(0).toLowerCase();
      
      // Build the Cypher query based on entity type
      let query = `MATCH (${nodeAlias}:${entityType})`;
      
      // Add joins if defined in the view
      if (viewDefinition.joins && viewDefinition.joins.length > 0) {
        for (const join of viewDefinition.joins) {
          const joinAlias = join.entityAlias || join.entityType.charAt(0).toLowerCase();
          
          // Handle different relationship types based on the entities being joined
          let relationshipType = '';
          
          if (entityType === 'Commande' && join.entityType === 'Client') {
            // Client to Order relationship
            query += `\nOPTIONAL MATCH (${joinAlias}:${join.entityType})-[:PASSE]->(${nodeAlias})`;
          } else if (entityType === 'Commande' && join.entityType === 'Employe') {
            // Employee to Order relationship
            query += `\nOPTIONAL MATCH (${joinAlias}:${join.entityType})-[:GERE]->(${nodeAlias})`;
          } else if (entityType === 'Facture' && join.entityType === 'Commande') {
            // Order to Invoice relationship
            query += `\nOPTIONAL MATCH (${joinAlias}:${join.entityType})-[:FACTURE]->(${nodeAlias})`;
          } else if (entityType === 'Livraison' && join.entityType === 'Commande') {
            // Order to Delivery relationship
            query += `\nOPTIONAL MATCH (${joinAlias}:${join.entityType})-[:LIVREE_PAR]->(${nodeAlias})`;
          } else {
            // Generic relationship with explicit join fields
            query += `\nOPTIONAL MATCH (${joinAlias}:${join.entityType})`;
            if (join.leftField && join.rightField) {
              query += `\n  WHERE ${nodeAlias}.${join.leftField} = ${joinAlias}.${join.rightField}`;
            }
          }
        }
      }
      
      // Add WHERE clause if there are conditions in the filter
      const params: Record<string, any> = {};
      if (filter.conditions && filter.conditions.length > 0) {
        const { whereClause, params: whereParams } = this.buildWhereClause(filter, nodeAlias);
        if (whereClause) {
          query += `\n${whereClause}`;
          Object.assign(params, whereParams);
        }
      }
      
      // Build the appropriate RETURN clause based on entity type
      let returnClause = '';
      switch (entityType) {
        case 'Client':
          returnClause = `RETURN ${nodeAlias}.id_client as id, ${nodeAlias}.nom as nom, ${nodeAlias}.adresse as adresse, 
                          ${nodeAlias}.email as email, ${nodeAlias}.telephone as telephone`;
          break;
        case 'Employe':
          returnClause = `RETURN ${nodeAlias}.id_employe as id, ${nodeAlias}.nom as nom, ${nodeAlias}.email as email, 
                          ${nodeAlias}.poste as poste`;
          break;
        case 'Agence':
          returnClause = `RETURN ${nodeAlias}.id_agence as id, ${nodeAlias}.ville as ville, ${nodeAlias}.adresse as adresse`;
          break;
        case 'Fournisseur':
          returnClause = `RETURN ${nodeAlias}.id_fournisseur as id, ${nodeAlias}.nom as nom, ${nodeAlias}.adresse as adresse, 
                          ${nodeAlias}.telephone as telephone`;
          break;
        case 'Produit':
          returnClause = `RETURN ${nodeAlias}.id_produit as id, ${nodeAlias}.description as description, 
                          ${nodeAlias}.prix as prix, ${nodeAlias}.categorie as categorie`;
          break;
        case 'Commande':
          returnClause = `RETURN ${nodeAlias}.id_commande as id, ${nodeAlias}.date as date, ${nodeAlias}.montant as montant, 
                          ${nodeAlias}.statut as statut, ${nodeAlias}.mode_paiement as mode_paiement, 
                          c.id_client as client_id, e.id_employe as employe_id`;
          break;
        case 'Facture':
          returnClause = `RETURN ${nodeAlias}.id_facture as id, ${nodeAlias}.montant_total as montant_total, 
                          ${nodeAlias}.date as date, c.id_commande as commande_ref`;
          break;
        case 'Livraison':
          returnClause = `RETURN ${nodeAlias}.id_livraison as id, ${nodeAlias}.transporteur as transporteur, 
                          ${nodeAlias}.date_estimee as date_estimee, ${nodeAlias}.statut as statut, 
                          c.id_commande as commande_ref`;
          break;
        default:
          // Generic return clause for unknown entity types
          returnClause = `RETURN ${nodeAlias}`;
          break;
      }
      
      // Complete the query with RETURN, ORDER BY, and LIMIT clauses
      query += `\n${returnClause}`;
      
      // Add ORDER BY clause if specified in the filter
      if (filter.orderBy && filter.orderBy.length > 0) {
        const orderTerms = filter.orderBy.map(order => {
          const prop = this.translateProperty(order.column);
          return `${nodeAlias}.${prop} ${order.type}`;
        });
        query += `\nORDER BY ${orderTerms.join(', ')}`;
      }
      
      // Add LIMIT and SKIP (for pagination) if specified in the filter
      if (filter.limit) {
        query += `\nLIMIT ${filter.limit}`;
      }
      
      if (filter.offset) {
        query += `\nSKIP ${filter.offset}`;
      }
      
      console.log('Executing Cypher query for LAV view:', query);
      console.log('With parameters:', params);
      
      // Execute the Cypher query
      const result = await this.executeCypherQuery(query, params);
      return result;
    } catch (error) {
      console.error('Error executing LAV view:', error);
      return [];
    }
  }
  
  /**
   * Execute a query that has been rewritten using the LAV bucket algorithm
   * 
   * @param query The rewritten query specific to this source
   * @param parameters Additional parameters for the query
   * @returns Query results
   */
  public async executeQuery(query: string, parameters: Record<string, any> = {}): Promise<any[]> {
    if (!this.isConnected()) {
      await this.connect();
    }
    
    console.log('Executing Neo4j query:', query);
    console.log('Parameters:', JSON.stringify(parameters, null, 2));
    
    try {
      // Extract view definition and attribute mappings from parameters
      let viewDefinition = null;
      let attributeMappings: Record<string, string> = {};
      
      // Case 1: viewDefinition is directly in parameters
      if (parameters.viewDefinition) {
        viewDefinition = parameters.viewDefinition;
        attributeMappings = parameters.attributeMappings || {};
      } 
      // Case 2: viewDefinition is in parameters.mapping
      else if (parameters.mapping && parameters.mapping.viewDefinition) {
        viewDefinition = parameters.mapping.viewDefinition;
        attributeMappings = parameters.mapping.attributeMappings || {};
      } 
      // Case 3: No explicit mapping, look for a matching LAV view
      else {
        console.log('No explicit mapping provided for Neo4j query. Looking for matching LAV view...');
        
        // Try to find a matching LAV view from our defined views
        const views = this.getLAVViews();
        console.log(`Found ${views.length} LAV views to check for a match`);
        
        const matchingView = views.find(view => {
          // Check if the query matches this view's query or view name
          return view.query.toLowerCase().includes(query.toLowerCase()) || 
                 query.toLowerCase().includes(view.viewName.toLowerCase());
        });
        
        if (matchingView) {
          console.log('Found matching LAV view:', matchingView.viewName);
          viewDefinition = matchingView.parameters?.mapping?.viewDefinition;
          attributeMappings = matchingView.parameters?.mapping?.attributeMappings || {};
        } else {
          console.warn('No mapping provided for Neo4j query. Returning empty result set.');
          return [];
        }
      }
      
      // Validate view definition
      if (!viewDefinition) {
        console.error('No view definition found for query execution');
        return [];
      }
      
      console.log('Using view definition:', JSON.stringify(viewDefinition, null, 2));
      
      // Create a filter for the executeLAVView method
      const filter: QueryFilter = {
        conditions: []
      };
      
      // Add any query-specific filters from parameters
      if (parameters.filter) {
        Object.assign(filter, parameters.filter);
      }
      
      // Execute the LAV view with the filter
      const results = await this.executeLAVView(viewDefinition, filter);
      console.log(`Neo4j query returned ${results.length} results`);
      
      // Transform results according to the attribute mapping
      return results.map((record: Record<string, any>) => {
        const mappedRecord: Record<string, any> = {};
        
        // Map each attribute according to the defined mappings
        for (const [globalAttribute, sourceAttribute] of Object.entries(attributeMappings)) {
          if (record[sourceAttribute] !== undefined) {
            mappedRecord[globalAttribute] = record[sourceAttribute];
          }
        }
        
        // Always include source system information
        mappedRecord.sourceSystem = this.sourceSystem;
        
        // For Neo4j IDs, prefix them to avoid conflicts with other sources
        if (mappedRecord.idClient && !mappedRecord.idClient.toString().startsWith('NEO_')) {
          mappedRecord.idClient = `NEO_${mappedRecord.idClient}`;
        }
        
        return mappedRecord;
      });
    } catch (error) {
      console.error('Error executing Neo4j query:', error);
      return [];
    }
  }
  
  /**
   * Parse a SQL-like query string into entity name and filter
   * This is a simplified parser for demonstration purposes
   */
  private parseQuery(query: string): { entityName: string, filter: QueryFilter } | null {
    try {
      // Basic parsing of SELECT queries
      if (query.toUpperCase().startsWith('SELECT')) {
        const fromMatch = query.match(/FROM\s+(\w+)/i);
        if (!fromMatch) {
          return null;
        }
        
        const entityName = fromMatch[1];
        const filter: QueryFilter = {};
        
        // Extract WHERE conditions
        const whereMatch = query.match(/WHERE\s+(.*?)(?:ORDER BY|LIMIT|$)/i);
        if (whereMatch) {
          // Very basic condition parsing - in a real implementation,
          // you would use a proper SQL parser here
          const conditions = whereMatch[1].split('AND').map(condition => {
            const parts = condition.trim().match(/([\w.]+)\s*([=<>]+)\s*(.+)/);
            if (parts) {
              return {
                type: 'binary_expr',
                left: { type: 'column_ref', column: parts[1].trim() },
                operator: parts[2].trim(),
                right: { 
                  type: 'value', 
                  value: parts[3].trim().replace(/^'|'$/g, '') // Strip quotes if present
                }
              };
            }
            return null;
          }).filter(Boolean);
          
          if (conditions.length > 0) {
            filter.conditions = conditions;
          }
        }
        
        return { entityName, filter };
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing query:', error);
      return null;
    }
  }

  /**
   * Get LAV view definitions for this adapter
   * This defines how local Neo4j data maps to the global schema
   * 
   * @returns Array of LAV view definitions
   */
  public getLAVViews(): LAVViewDefinition[] {
    const sourceId = this.getSourceSystem();
    
    return [
      // Client mapping
      {
        sourceId,
        viewName: 'neo4j_clients',
        query: 'SELECT * FROM Clients',
        bucketId: 'clients',
        queryLanguage: 'cypher',
        parameters: {
          mapping: {
            viewDefinition: {
              name: 'clients',
              entityType: 'Client',
              entityAlias: 'c',
              joins: []
            },
            attributeMappings: {
              'idClient': 'id',
              'nomComplet': 'nom',
              'adresse': 'adresse',
              'emailContact': 'email',
              'numeroTelephone': 'telephone'
            }
          }
        }
      },
      
      // Employee mapping
      {
        sourceId,
        viewName: 'neo4j_employees',
        query: 'SELECT * FROM Employees',
        bucketId: 'employees',
        queryLanguage: 'cypher',
        parameters: {
          mapping: {
            viewDefinition: {
              name: 'employees',
              entityType: 'Employe',
              entityAlias: 'e',
              joins: []
            },
            attributeMappings: {
              'idEmploye': 'id',
              'nomComplet': 'nom',
              'email': 'email',
              'poste': 'poste'
            }
          }
        }
      },
      
      // Agency mapping
      {
        sourceId,
        viewName: 'neo4j_agences',
        query: 'SELECT * FROM Agences',
        bucketId: 'agences',
        queryLanguage: 'cypher',
        parameters: {
          mapping: {
            viewDefinition: {
              name: 'agences',
              entityType: 'Agence',
              entityAlias: 'a',
              joins: []
            },
            attributeMappings: {
              'idAgence': 'id',
              'ville': 'ville',
              'adresse': 'adresse'
            }
          }
        }
      },
      
      // Supplier mapping
      {
        sourceId,
        viewName: 'neo4j_fournisseurs',
        query: 'SELECT * FROM Fournisseurs',
        bucketId: 'fournisseurs',
        queryLanguage: 'cypher',
        parameters: {
          mapping: {
            viewDefinition: {
              name: 'fournisseurs',
              entityType: 'Fournisseur',
              entityAlias: 'f',
              joins: []
            },
            attributeMappings: {
              'idFournisseur': 'id',
              'nomFournisseur': 'nom',
              'adresse': 'adresse',
              'numeroTelephone': 'telephone'
            }
          }
        }
      },
      
      // Product mapping
      {
        sourceId,
        viewName: 'neo4j_produits',
        query: 'SELECT * FROM Produits',
        bucketId: 'produits',
        queryLanguage: 'cypher',
        parameters: {
          mapping: {
            viewDefinition: {
              name: 'produits',
              entityType: 'Produit',
              entityAlias: 'p',
              joins: []
            },
            attributeMappings: {
              'idProduit': 'id',
              'description': 'description',
              'prixCout': 'prix',
              'categorie': 'categorie'
            }
          }
        }
      },
      
      // Order mapping
      {
        sourceId,
        viewName: 'neo4j_commandes',
        query: 'SELECT * FROM Commandes',
        bucketId: 'commandes',
        queryLanguage: 'cypher',
        parameters: {
          mapping: {
            viewDefinition: {
              name: 'commandes',
              entityType: 'Commande',
              entityAlias: 'o',
              joins: [
                {
                  entityType: 'Client',
                  entityAlias: 'c',
                  leftField: 'client_id',
                  rightField: 'id_client'
                },
                {
                  entityType: 'Employe',
                  entityAlias: 'e',
                  leftField: 'employe_id',
                  rightField: 'id_employe'
                }
              ]
            },
            attributeMappings: {
              'idCommande': 'id',
              'dateCommande': 'date',
              'montant': 'montant',
              'statut': 'statut',
              'modePaiement': 'mode_paiement',
              'clientRef': 'client_id',
              'employeRef': 'employe_id'
            }
          }
        }
      },
      
      // Invoice mapping
      {
        sourceId,
        viewName: 'neo4j_factures',
        query: 'SELECT * FROM Factures',
        bucketId: 'factures',
        queryLanguage: 'cypher',
        parameters: {
          mapping: {
            viewDefinition: {
              name: 'factures',
              entityType: 'Facture',
              entityAlias: 'f',
              joins: [
                {
                  entityType: 'Commande',
                  entityAlias: 'c',
                  leftField: 'commande_ref',
                  rightField: 'id_commande'
                }
              ]
            },
            attributeMappings: {
              'idFacture': 'id',
              'montantTotal': 'montant_total',
              'dateFacture': 'date',
              'commandeRef': 'commande_ref'
            }
          }
        }
      },
      
      // Delivery mapping
      {
        sourceId,
        viewName: 'neo4j_livraisons',
        query: 'SELECT * FROM Livraisons',
        bucketId: 'livraisons',
        queryLanguage: 'cypher',
        parameters: {
          mapping: {
            viewDefinition: {
              name: 'livraisons',
              entityType: 'Livraison',
              entityAlias: 'l',
              joins: [
                {
                  entityType: 'Commande',
                  entityAlias: 'c',
                  leftField: 'commande_ref',
                  rightField: 'id_commande'
                }
              ]
            },
            attributeMappings: {
              'idLivraison': 'id',
              'transporteur': 'transporteur',
              'dateEstimee': 'date_estimee',
              'statut': 'statut',
              'commandeRef': 'commande_ref'
            }
          }
        }
      }
    ];
  }
}