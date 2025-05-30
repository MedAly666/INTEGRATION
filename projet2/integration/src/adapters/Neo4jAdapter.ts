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
  private async executeCypherQuery(query: string, params: Record<string, any> = {}): Promise<Neo4jRecord[]> {
    if (!this.connected || !this.driver) {
      throw new Error('Not connected to Neo4j database');
    }
    
    const session = this.driver.session({
      database: this.database,
      defaultAccessMode: neo4j.session.READ
    });
    
    try {
      console.log(`Executing Cypher query: ${query}`);
      console.log('With parameters:', params);
      
      const result = await session.run(query, params);
      //console.log('Cypher query result:', result.records);
      
      return result.records;
    } finally {
      await session.close();
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
   * Convert filter conditions to Cypher WHERE clause
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
      // Direct implementation instead of calling executeFilteredQuery
      const query = `
        MATCH (c:Client)
        RETURN c.id_client as id, c.nom as nom, c.adresse as adresse, c.email as email, c.telephone as telephone
      `;
      
      const records = await this.executeCypherQuery(query);
      const clients = new ClientCollection();
      
      for (const record of records) {
        try {
          const client = new Client({
            idClient: `NEO_${record.get('id')}`,
            sourceSystem: this.sourceSystem,
            nomComplet: record.get('nom'),
            adresse: record.get('adresse'),
            emailContact: record.get('email'),
            numeroTelephone: record.get('telephone')
          });
          clients.addItem(client);
        } catch (itemError) {
          console.warn('Error creating client from record:', itemError);
        }
      }
      
      console.log(`Fetched result : `, clients.getItems());
      return clients;
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
      // Direct implementation instead of calling executeFilteredQuery
      const query = `
        MATCH (e:Employe)
        RETURN e.id_employe as id, e.nom as nom, e.email as email, e.poste as poste
      `;
      
      const records = await this.executeCypherQuery(query);
      const employees = new EmployeeCollection();
      
      for (const record of records) {
        try {
          const employee = new Employee({
            idEmploye: `NEO_${record.get('id')}`,
            sourceSystem: this.sourceSystem,
            nomComplet: record.get('nom'),
            email: record.get('email'),
            poste: record.get('poste')
          });
          employees.addItem(employee);
        } catch (itemError) {
          console.warn('Error creating employee from record:', itemError);
        }
      }
      
      return employees;
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
      const query = `
        MATCH (a:Agence)
        RETURN a.id_agence as id, a.ville as ville, a.adresse as adresse
      `;
      
      const records = await this.executeCypherQuery(query);
      const agences = new AgenceCollection();
      
      for (const record of records) {
        try {
          const agence = new Agence({
            idAgence: `NEO_${record.get('id')}`,
            sourceSystem: this.sourceSystem,
            ville: record.get('ville'),
            adresse: record.get('adresse')
          });
          agences.addItem(agence);
        } catch (itemError) {
          console.warn('Error creating agence from record:', itemError);
        }
      }
      
      return agences;
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
      const query = `
        MATCH (f:Fournisseur)
        RETURN f.id_fournisseur as id, f.nom as nom, f.adresse as adresse, f.telephone as telephone
      `;
      
      const records = await this.executeCypherQuery(query);
      const fournisseurs = new FournisseurCollection();
      
      for (const record of records) {
        try {
          const fournisseur = new Fournisseur({
            idFournisseur: `NEO_${record.get('id')}`,
            sourceSystem: this.sourceSystem,
            nomFournisseur: record.get('nom'),
            adresse: record.get('adresse'),
            numeroTelephone: record.get('telephone')
          });
          fournisseurs.addItem(fournisseur);
        } catch (itemError) {
          console.warn('Error creating fournisseur from record:', itemError);
        }
      }
      
      return fournisseurs;
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
      const query = `
        MATCH (p:Produit)
        RETURN p.id_produit as id, p.description as description, p.prix as prix, p.categorie as categorie
      `;
      
      const records = await this.executeCypherQuery(query);
      const produits = new ProduitCollection();
      
      for (const record of records) {
        try {
          const produit = new Produit({
            idProduit: `NEO_${record.get('id')}`,
            sourceSystem: this.sourceSystem,
            description: record.get('description'),
            prixCout: record.get('prix'),
            categorie: record.get('categorie')
          });
          produits.addItem(produit);
        } catch (itemError) {
          console.warn('Error creating produit from record:', itemError);
        }
      }
      
      return produits;
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
    return filter ? 
      this.executeFilteredQuery('commandes', filter) : 
      this.executeFilteredQuery('commandes', {});
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
    return filter ? 
      this.executeFilteredQuery('factures', filter) : 
      this.executeFilteredQuery('factures', {});
  }
  
  /**
   * Fetch deliveries data
   * @param filter Optional query filter
   */
  public async getLivraisons(filter?: QueryFilter): Promise<LivraisonCollection> {
    return filter ? 
      this.executeFilteredQuery('livraisons', filter) : 
      this.executeFilteredQuery('livraisons', {});
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

  private convertRecordsToCollection(entityType: string, records: any[]): any {
    // Normalize the entity type to handle plurals and casing
    const normalizedEntityType = entityType.toLowerCase().replace(/s$/, '');
    
    switch (normalizedEntityType) {
      case 'client':
        const clientCollection = new ClientCollection();
        for (const record of records) {
          const client = new Client({
            idClient: `NEO_${record.id}`,
            sourceSystem: this.sourceSystem,
            nomComplet: record.nom || '',
            adresse: record.adresse || '',
            emailContact: record.email || '',
            numeroTelephone: record.telephone || ''
          });
          clientCollection.addItem(client);
        }
        return clientCollection;
        
      case 'employe':
      case 'employee':
        const employeeCollection = new EmployeeCollection();
        for (const record of records) {
          const employee = new Employee({
            idEmploye: `NEO_${record.id}`,
            sourceSystem: this.sourceSystem,
            nomComplet: record.nom || '',
            email: record.email || '',
            poste: record.poste || '',
            agenceRef: `NEO_${record.agence_id}`
          });
          employeeCollection.addItem(employee);
        }
        return employeeCollection;
        
      case 'agence':
        const agenceCollection = new AgenceCollection();
        for (const record of records) {
          const agence = new Agence({
            idAgence: `NEO_${record.id}`,
            sourceSystem: this.sourceSystem,
            ville: record.ville || '',
            adresse: record.adresse || '',
            responsableRef: `NEO_${record.responsable_id}`
          });
          agenceCollection.addItem(agence);
        }
        return agenceCollection;
        
      case 'fournisseur':
        const fournisseurCollection = new FournisseurCollection();
        for (const record of records) {
          const fournisseur = new Fournisseur({
            idFournisseur: `NEO_${record.id}`,
            sourceSystem: this.sourceSystem,
            nomFournisseur: record.nom || '',
            adresse: record.adresse || '',
            numeroTelephone: record.telephone || ''
          });
          fournisseurCollection.addItem(fournisseur);
        }
        return fournisseurCollection;
        
      case 'produit':
        const produitCollection = new ProduitCollection();
        for (const record of records) {
          const produit = new Produit({
            idProduit: `NEO_${record.id}`,
            sourceSystem: this.sourceSystem,
            description: record.description || '',
            prixCout: record.prix || 0,
            categorie: record.categorie || ''
          });
          produitCollection.addItem(produit);
        }
        return produitCollection;
        
      case 'commande':
        const commandeCollection = new CommandeCollection();
        for (const record of records) {
          const commande = new Commande({
            idCommande: `NEO_${record.id}`,
            sourceSystem: this.sourceSystem,
            dateCommande: formatDate(record.date),
            montant: record.montant || 0,
            statut: record.statut || '',
            modePaiement: record.mode_paiement || '',
            clientRef: `NEO_${record.client_id}`,
            employeRef: `NEO_${record.employe_id}`
          });
          commandeCollection.addItem(commande);
        }
        return commandeCollection;
        
      case 'detail_commande':
      case 'details_commande':
      case 'detailscommande':
      case 'detailcommande':
        const detailCommandeCollection = new DetailCommandeCollection();
        for (const record of records) {
          const detailCommande = new DetailCommande({
            idCommande: `NEO_${record.commande_id}`,
            idProduit: `NEO_${record.produit_id}`,
            sourceSystem: this.sourceSystem,
            quantite: record.quantite || 0
          });
          detailCommandeCollection.addItem(detailCommande);
        }
        return detailCommandeCollection;
        
      case 'facture':
        const factureCollection = new FactureCollection();
        for (const record of records) {
          const facture = new Facture({
            idFacture: `NEO_${record.id}`,
            sourceSystem: this.sourceSystem,
            montantTotal: record.montant || 0,
            dateFacture: formatDate(record.date),
            commandeRef: `NEO_${record.commande_id}`
          });
          factureCollection.addItem(facture);
        }
        return factureCollection;
        
      case 'livraison':
        const livraisonCollection = new LivraisonCollection();
        for (const record of records) {
          const livraison = new Livraison({
            idLivraison: `NEO_${record.id}`,
            sourceSystem: this.sourceSystem,
            transporteur: record.transporteur || '',
            dateEstimee: formatDate(record.date_estimee),
            statut: record.statut || '',
            commandeRef: `NEO_${record.commande_id}`
          });
          livraisonCollection.addItem(livraison);
        }
        return livraisonCollection;
        
      case 'approvisionnements':
        const approvisionnementCollection = new ApprovisionnementCollection();
        for (const record of records) {
          const approvisionnement = new Approvisionnement({
            idProduit: `NEO_${record.produit_id}`,
            idFournisseur: `NEO_${record.fournisseur_id}`,
            sourceSystem: this.sourceSystem,
            quantite: record.quantite || 0
          });
          approvisionnementCollection.addItem(approvisionnement);
        }
        return approvisionnementCollection;
        
      default:
        console.warn(`Unknown entity type: ${entityType}, returning original records`);
        return records;
    }
  }

  /**
   * Get LAV view definitions for this Neo4j data source
   */
  public getLAVViews(): LAVViewDefinition[] {
    const sourceId = this.getSourceSystem();
    
    return [
      {
        sourceId,
        viewName: 'neo4j_clients',
        query: 'MATCH (c:Client) RETURN c',
        bucketId: 'clients',
        parameters: {
          mapping: {
            'global_id': 'c.id',
            'global_name': 'c.nom',
            'global_email': 'c.email',
            'global_phone': 'c.telephone',
            'global_address': 'c.adresse'
          }
        }
      },
      {
        sourceId,
        viewName: 'neo4j_produits',
        query: 'MATCH (p:Produit) RETURN p',
        bucketId: 'produits',
        parameters: {
          mapping: {
            'global_id': 'p.id',
            'global_name': 'p.nom',
            'global_desc': 'p.description',
            'global_price': 'p.prix',
            'global_category': 'p.categorie'
          }
        }
      },
      {
        sourceId,
        viewName: 'neo4j_commandes',
        query: 'MATCH (o:Commande) RETURN o',
        bucketId: 'commandes',
        parameters: {
          mapping: {
            'global_id': 'o.id',
            'global_date': 'o.date',
            'global_client_id': 'o.clientId',
            'global_status': 'o.statut',
            'global_total': 'o.total'
          }
        }
      },
      {
        sourceId,
        viewName: 'neo4j_client_orders',
        query: 'MATCH (c:Client)-[r:A_COMMANDE]->(o:Commande) RETURN c, o, r',
        bucketId: 'client_orders',
        parameters: {
          mapping: {
            'global_client_id': 'c.id',
            'global_client_name': 'c.nom',
            'global_order_id': 'o.id',
            'global_order_date': 'o.date',
            'global_order_total': 'o.total'
          }
        }
      },
      {
        sourceId,
        viewName: 'neo4j_order_products',
        query: 'MATCH (o:Commande)-[r:CONTIENT]->(p:Produit) RETURN o, r, p',
        bucketId: 'order_items',
        parameters: {
          mapping: {
            'global_order_id': 'o.id',
            'global_product_id': 'p.id',
            'global_quantity': 'r.quantite',
            'global_price': 'r.prix',
            'global_subtotal': 'r.sousTotal'
          }
        }
      },
      {
        sourceId,
        viewName: 'neo4j_complete_order_path',
        query: 'MATCH (c:Client)-[:A_COMMANDE]->(o:Commande)-[r:CONTIENT]->(p:Produit) RETURN c, o, r, p',
        bucketId: 'client_product_path',
        parameters: {
          mapping: {
            'global_client_id': 'c.id',
            'global_client_name': 'c.nom',
            'global_order_id': 'o.id',
            'global_order_date': 'o.date',
            'global_product_id': 'p.id',
            'global_product_name': 'p.nom',
            'global_quantity': 'r.quantite',
            'global_price': 'r.prix'
          }
        }
      }
    ];
  }

  /**
   * Execute a Cypher query that has been rewritten using the LAV bucket algorithm
   * 
   * @param query The Cypher query to execute
   * @param parameters Additional parameters for the query
   * @returns Query results
   */
  public async executeQuery(query: string, parameters: Record<string, any> = {}): Promise<any[]> {
    if (!this.session) {
      throw new Error('Cannot execute query: Not connected to Neo4j database');
    }
    
    try {
      console.log('Executing Neo4j query:', query, 'with parameters:', parameters);
      
      // Handle special combined queries from the bucket algorithm
      if (query.includes('/* Combined query: */')) {
        const queryParts = query.split(/\/\*.*?\*\//g).filter(part => part.trim().length > 0);
        let allResults: any[] = [];
        
        for (const part of queryParts) {
          const results = await this.executeCypherQuery(part.trim());
          allResults = [...allResults, ...results];
        }
        
        // Apply mapping to global schema if provided
        if (parameters.mapping) {
          return this.mapResultsToGlobalSchema(allResults, parameters.mapping);
        }
        
        return allResults;
      } else {
        // Standard Cypher query execution
        const results = await this.executeCypherQuery(query);
        
        // Apply mapping to global schema if provided
        if (parameters.mapping) {
          return this.mapResultsToGlobalSchema(results, parameters.mapping);
        }
        
        return results;
      }
    } catch (error) {
      console.error(`Error executing Neo4j query: ${query}`, error);
      throw error;
    }
  }

  /**
   * Execute a Cypher query directly
   * 
   * @param query Cypher query string
   * @returns Query results
   */
  private async executeCypherQuery(query: string): Promise<any[]> {
    try {
      const result = await this.session!.run(query);
      
      // Transform Neo4j records to plain objects
      return result.records.map(record => {
        const obj: Record<string, any> = {};
        
        // Extract keys and values from the record
        record.keys.forEach(key => {
          const value = record.get(key);
          
          if (value && typeof value === 'object' && value.constructor.name === 'Node') {
            // Extract Node properties
            obj[key] = { ...value.properties, id: value.identity.toString() };
          } else if (value && typeof value === 'object' && value.constructor.name === 'Relationship') {
            // Extract Relationship properties
            obj[key] = { ...value.properties, type: value.type };
          } else {
            obj[key] = value;
          }
        });
        
        // Add source system to each result
        obj.sourceSystem = this.getSourceSystem();
        
        return obj;
      });
    } catch (error) {
      console.error(`Error executing Neo4j query: ${query}`, error);
      throw error;
    }
  }

  /**
   * Map Neo4j query results to the global schema
   * 
   * @param results The Neo4j query results to map
   * @param mapping The mapping from source attributes to global attributes
   * @returns Mapped results
   */
  private mapResultsToGlobalSchema(results: any[], mapping: Record<string, string>): any[] {
    return results.map(row => {
      const globalRow: Record<string, any> = { ...row }; // Start with original data
      
      // Apply mappings
      for (const [globalAttr, neoAttr] of Object.entries(mapping)) {
        // Handle nested properties (e.g., "c.id")
        if (neoAttr.includes('.')) {
          const [objName, propName] = neoAttr.split('.');
          
          if (row[objName] && row[objName][propName] !== undefined) {
            globalRow[globalAttr] = row[objName][propName];
          }
        } else if (row[neoAttr] !== undefined) {
          // Direct property mapping
          globalRow[globalAttr] = row[neoAttr];
        }
      }
      
      return globalRow;
    });
  }

  /**
   * Check if this adapter can handle a specific query pattern
   * 
   * @param pattern The query pattern to check
   * @returns Whether this adapter can handle the pattern
   */
  public canHandleQueryPattern(pattern: string): boolean {
    try {
      // Check if pattern mentions nodes or relationships
      const hasNodes = /(Client|Produit|Commande|Fournisseur)/i.test(pattern);
      const hasRelationships = /(A_COMMANDE|CONTIENT|FOURNIT)/i.test(pattern);
      
      if (hasNodes || hasRelationships) {
        return true;
      }
      
      // Extract entity/relationship patterns from the query
      const bucketMatch = pattern.match(/FROM\s+(\w+)/i);
      if (bucketMatch) {
        const requestedBucket = bucketMatch[1].toLowerCase();
        
        // Check against our LAV views
        const views = this.getLAVViews();
        for (const view of views) {
          // Check if any view matches this bucket ID
          if (view.bucketId?.toLowerCase() === requestedBucket) {
            return true;
          }
        }
      }
      
      return false;
    } catch (error) {
      console.error(`Error in canHandleQueryPattern: ${error}`);
      return false;
  }
}

/**
 * Capitalize first letter of a string
 */
private capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
}