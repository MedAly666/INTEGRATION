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
    password: string = 'password',
    database: string = 'neo4j'
  ) {
    this.sourceSystem = sourceSystem;
    this.uri = uri;
    this.username = username;
    this.password = password;
    this.database = database;
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
        entityName: 'Client',
        isComplete: true,
        attributes: ['id_client', 'nom', 'adresse', 'email', 'telephone']
      },
      {
        entityName: 'Employe',
        isComplete: true,
        attributes: ['id_employe', 'nom', 'email', 'poste']
      },
      {
        entityName: 'Agence',
        isComplete: true,
        attributes: ['id_agence', 'ville', 'adresse']
      },
      {
        entityName: 'Fournisseur',
        isComplete: true,
        attributes: ['id_fournisseur', 'nom', 'adresse', 'telephone']
      },
      {
        entityName: 'Produit',
        isComplete: true,
        attributes: ['id_produit', 'description', 'prix', 'categorie']
      },
      {
        entityName: 'Commande',
        isComplete: true,
        attributes: ['id_commande', 'date', 'montant', 'statut', 'mode_paiement']
      },
      {
        entityName: 'Facture',
        isComplete: true,
        attributes: ['id_facture', 'montant_total', 'date']
      },
      {
        entityName: 'Livraison',
        isComplete: true,
        attributes: ['id_livraison', 'transporteur', 'date_estimee', 'statut']
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
      console.log('Cypher query result:', result.records);
      
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
      return this.executeJoinAwareQuery(entityName, filter);
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
          query = `MATCH (o:Commande) OPTIONAL MATCH (c:Client)-[:PASSE]->(o) OPTIONAL MATCH (e:Employe)-[:GERE]->(o) 
              RETURN o.id_commande as id, o.date as date, o.montant as montant, o.statut as statut, 
              o.mode_paiement as mode_paiement, c.id_client as client_ref, e.id_employe as employe_ref`;
          break;
        case 'details_commande':
          query = `MATCH (c:Commande)-[d:CONTIENT]->(p:Produit) RETURN c.id_commande as commande_id, p.id_produit as produit_id, d.quantite as quantite`;
          break;
        case 'factures':
          query = `MATCH (f:Facture)-[:POUR]->(c:Commande) RETURN f.id_facture as id, f.montant_total as montant_total, f.date as date, c.id_commande as commande_ref`;
          break;
        case 'livraisons':
          query = `MATCH (l:Livraison)-[:POUR]->(c:Commande) RETURN l.id_livraison as id, l.transporteur as transporteur, 
              l.date_estimee as date_estimee, l.statut as statut, c.id_commande as commande_ref`;
          break;
        case 'approvisionnements':
          query = `MATCH (f:Fournisseur)-[a:FOURNIT]->(p:Produit) RETURN p.id_produit as produit_id, f.id_fournisseur as fournisseur_id, a.quantite as quantite`;
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
            MATCH (f:Facture) 
          `;
          returnClause = this.buildReturnClauseForFacture();
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
    return `RETURN f.id_facture as id, f.montant_total as montant_total, f.date as date, f.commande_ref as commande_ref`;
  }
  
  /**
   * Build the appropriate RETURN clause for Commande nodes
   */
  private buildReturnClauseForCommande(): string {
    return `RETURN o.id_commande as id, o.date as date, o.montant as montant, o.statut as statut, o.mode_paiement as mode_paiement, o.client_ref as client_ref, o.employe_ref as employe_ref`;
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
  private projectionBelongsToEntity(projection: string, entityName: string): boolean {
    const entityFields: Record<string, string[]> = {
      'clients': ['idClient', 'nomComplet', 'adresse', 'emailContact', 'numeroTelephone'],
      'commandes': ['idCommande', 'dateCommande', 'montant', 'statut', 'modePaiement', 'clientRef', 'employeRef'],
      'factures': ['idFacture', 'montantTotal', 'dateFacture', 'commandeRef']
    };
    
    return entityFields[entityName]?.includes(projection) || false;
  }
  
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
    
    switch (entityName) {
      case 'clients':
        return clientFields.includes(projection);
      case 'commandes':
        return commandeFields.includes(projection);
      case 'factures':
        return factureFields.includes(projection);
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
        obj[key] = record.get(key);
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
            dateCommande: row.date,
            montant: row.montant || 0,
            statut: row.statut || '',
            modePaiement: row.mode_paiement || ''
          });
          commandeCollection.addItem(commande);
        }
        return commandeCollection;
        
      case 'detail_commande':
      case 'detailcommande':
        const detailCommandeCollection = new DetailCommandeCollection();
        for (const row of results) {
          const detailCommande = new DetailCommande({
            idCommande: `NEO_${row.commande_id || row.idCommande}`,
            idProduit: `NEO_${row.produit_id || row.idProduit}`,
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
            idFacture: `NEO_${row.id}`,
            sourceSystem: this.sourceSystem,
            montantTotal: row.montant_total || 0,
            dateFacture: row.date
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
            dateEstimee: row.date_estimee,
            statut: row.statut || ''
          });
          livraisonCollection.addItem(livraison);
        }
        return livraisonCollection;
        
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
}