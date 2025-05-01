/**
 * Neo4jAdapter.ts
 * Adapter for Neo4j graph database using the Neo4j JavaScript driver
 */

import neo4j, { Driver, Session, Record as Neo4jRecord, QueryResult } from 'neo4j-driver';
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
import { existsSync, readFileSync } from 'fs';

export class Neo4jAdapter implements IAdapter {
  private driver: Driver | null = null;
  private connected: boolean = false;
  private sourceSystem: string = 'NEO4J';
  
  // Neo4j connection settings
  private uri: string;
  private username: string;
  private password: string;
  private database: string;

  /**
   * Constructor - Initialize with connection settings
   * 
   * @param sourceSystem Source system identifier
   * @param uri Neo4j connection URI (e.g., neo4j://localhost:7687)
   * @param username Neo4j username
   * @param password Neo4j password
   * @param database Neo4j database name
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
   * Connect to the Neo4j graph database
   * 
   * @returns Whether the connection was successful
   */
  public async connect(): Promise<boolean> {
    try {
      // Connect to Neo4j
      this.driver = neo4j.driver(
        this.uri,
        neo4j.auth.basic(this.username, this.password)
      );
      
      // Test connection
      const session = this.driver.session({ database: this.database });
      const result = await session.run('RETURN 1 as test');
      await session.close();
      
      if (!result || result.records.length === 0) {
        throw new Error('Could not connect to Neo4j database');
      }
      
      // Check if we need to load data from CQL file
      const countSession = this.driver.session({ database: this.database });
      const countResult = await countSession.run('MATCH (n) RETURN count(n) as count');
      await countSession.close();
      
      const count = countResult.records[0].get('count').toNumber();
      if (count <= 1) {
        // Database is empty or has very few nodes, load data from CQL file
        throw new Error('Database is empty or has very few nodes, loading data from CQL file');
      }
      
      this.connected = true;
      console.log(`Connected to Neo4j data source successfully.`);
      return true;
    } catch (error) {
      console.error('Neo4j Connection Error:', error);
      this.connected = false;
      if (error instanceof Error) {
        throw new Error(`Failed to connect to Neo4j database: ${error.message}`);
      } else {
        throw new Error(`Failed to connect to Neo4j database: ${String(error)}`);
      }
    }
  }

  

  /**
   * Split CQL content into individual statements based on semicolons
   * 
   * @param cqlContent The full content of the CQL file
   * @returns Array of individual CQL statements
   */
  private splitCqlStatements(cqlContent: string): string[] {
    // Remove comments and split by semicolons
    const lines = cqlContent.split('\n');
    let cleanedContent = '';
    
    for (const line of lines) {
      // Remove comments starting with //
      const cleanedLine = line.replace(/\/\/.*$/, '');
      cleanedContent += cleanedLine + '\n';
    }
    
    // Split by semicolon, but keep in mind that semicolons can appear within quotes
    const statements: string[] = [];
    let currentStatement = '';
    let inSingleQuote = false;
    let inDoubleQuote = false;
    
    for (let i = 0; i < cleanedContent.length; i++) {
      const char = cleanedContent[i];
      
      if (char === "'" && (i === 0 || cleanedContent[i-1] !== '\\')) {
        inSingleQuote = !inSingleQuote;
      } else if (char === '"' && (i === 0 || cleanedContent[i-1] !== '\\')) {
        inDoubleQuote = !inDoubleQuote;
      }
      
      if (char === ';' && !inSingleQuote && !inDoubleQuote) {
        // End of statement
        statements.push(currentStatement);
        currentStatement = '';
      } else {
        currentStatement += char;
      }
    }
    
    // Add the last statement if it doesn't end with semicolon
    if (currentStatement.trim()) {
      statements.push(currentStatement);
    }
    
    return statements;
  }

  /**
   * Disconnect from the data source
   */
  public disconnect(): void {
    if (this.driver) {
      this.driver.close();
      this.driver = null;
    }
    this.connected = false;
    console.log('Disconnected from Neo4j data source.');
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
   * Execute a Cypher query on the Neo4j database
   * 
   * @param query The Cypher query to execute
   * @param parameters Optional parameters for the query
   * @returns Query results or null if not connected
   */
  private async executeCypherQuery(query: string, parameters: Record<string, any> = {}): Promise<Neo4jRecord[] | null> {
    if (!this.connected || !this.driver) {
      throw new Error('Not connected to Neo4j database');
    }
    
    try {
      const session = this.driver.session({ database: this.database });
      try {
        const result = await session.run(query, parameters);
        return result.records;
      } catch (error) {
        console.error('Cypher Query Error:', error);
        if (error instanceof Error) {
          throw new Error(`Cypher query failed: ${error.message}`);
        } else {
          throw new Error(`Cypher query failed: ${String(error)}`);
        }
      } finally {
        await session.close();
      }
    } catch (error) {
      console.error('Session Error:', error);
      if (error instanceof Error) {
        throw new Error(`Session error: ${error.message}`);
      } else {
        throw new Error(`Session error: ${String(error)}`);
      }
    }
  }

  /**
   * Fetch clients data
   * 
   * @returns Collection of clients
   */
  public async getClients(): Promise<ClientCollection> {
    if (!this.connected) {
      throw new Error('Not connected to Neo4j database');
    }
    
    const collection = new ClientCollection();
    
    // Use Neo4j connection to get clients
    const query = `MATCH (c:Client) RETURN 
                 c.id_client as id, 
                 c.nom as nom, 
                 c.adresse as adresse, 
                 c.email as email, 
                 c.telephone as telephone`;
    
    const result = await this.executeCypherQuery(query);
    
    if (result) {
      for (const record of result) {
        const client: Client = {
          id: `NEO_${record.get('id')}`,
          sourceSystem: this.sourceSystem,
          nomComplet: record.get('nom'),
          adresse: record.get('adresse'),
          emailContact: record.get('email'),
          numeroTelephone: record.get('telephone')
        };
        
        collection.addItem(client);
      }
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
      throw new Error('Not connected to Neo4j database');
    }
    
    const collection = new EmployeeCollection();
    
    // Use Neo4j connection to get employees
    const query = `MATCH (e:Employe)
                 OPTIONAL MATCH (e)-[:TRAVAILLE_DANS]->(a:Agence)
                 RETURN e.id_employe as id,
                        e.nom as nom,
                        e.email as email,
                        e.poste as poste,
                        e.salaire as salaire,
                        a.id_agence as agence_id`;
    
    const result = await this.executeCypherQuery(query);
    
    if (result) {
      for (const record of result) {
        const employee: Employee = {
          id: `NEO_${record.get('id')}`,
          sourceSystem: this.sourceSystem,
          nomComplet: record.get('nom') || record.get('nom').split(' ')[0],
          email: record.get('email'),
          post: record.get('poste'),
          salaire: record.get('salaire') ? parseFloat(record.get('salaire')) : undefined,
          agenceRef: record.get('agence_id') ? `NEO_${record.get('agence_id')}` : undefined,
        };
        
        collection.addItem(employee);
      }
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
      throw new Error('Not connected to Neo4j database');
    }
    
    const collection = new AgenceCollection();
    
    // Use Neo4j connection to get agencies
    const query = `MATCH (a:Agence)
                 RETURN a.id_agence as id,
                        a.nom as nom,
                        a.ville as ville,
                        a.adresse as adresse`;
    
    const result = await this.executeCypherQuery(query);
    
    if (result) {
      for (const record of result) {
        const agence: Agence = {
          id: `NEO_${record.get('id')}`,
          sourceSystem: this.sourceSystem,
          adresse: record.get('adresse'),
          ville: record.get('ville'),
        };
        
        collection.addItem(agence);
      }
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
      throw new Error('Not connected to Neo4j database');
    }
    
    const collection = new FournisseurCollection();
    
    // Use Neo4j connection to get suppliers
    const query = `MATCH (f:Fournisseur)
                 RETURN f.id_fournisseur as id,
                        f.nom as nom,
                        f.telephone as telephone,
                        f.adresse as adresse`;
    
    const result = await this.executeCypherQuery(query);
    
    if (result) {
      for (const record of result) {
        const fournisseur: Fournisseur = {
          id: `NEO_${record.get('id')}`,
          sourceSystem: this.sourceSystem,
          nomFournisseur: record.get('nom'),
          adresse: record.get('adresse'),
          numeroTelephone: record.get('telephone')
        };
        
        collection.addItem(fournisseur);
      }
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
      throw new Error('Not connected to Neo4j database');
    }
    
    const collection = new ProduitCollection();
    
    // Use Neo4j connection to get products
    const query = `MATCH (p:Produit)
                 RETURN p.id_produit as id,
                        p.description as description,
                        p.prix as prix,
                        p.categorie as categorie`;
    
    const result = await this.executeCypherQuery(query);
    
    if (result) {
      for (const record of result) {
        const produit: Produit = {
          id: `NEO_${record.get('id')}`,
          sourceSystem: this.sourceSystem,
          description: record.get('description'),
          prixCout: parseFloat(record.get('prix')),
          categorie: record.get('categorie')
        };
        
        collection.addItem(produit);
      }
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
      throw new Error('Not connected to Neo4j database');
    }
    
    const collection = new CommandeCollection();
    
    // Use Neo4j connection to get orders
    const query = `MATCH (c:Client)-[:PASSE]->(o:Commande)
                 OPTIONAL MATCH (e:Employe)-[:GERE]->(o)
                 RETURN o.id_commande as id,
                        o.date as date,
                        o.montant as montant,
                        o.statut as statut,
                        o.mode_paiement as mode_paiement,
                        c.id_client as client_id,
                        e.id_employe as employe_id`;
    
    const result = await this.executeCypherQuery(query);
    
    if (result) {
      for (const record of result) {
        const commande: Commande = {
          id: `NEO_${record.get('id')}`,
          sourceSystem: this.sourceSystem,
          dateCommande: record.get('date'),
          statut: record.get('statut'),
          montant: record.get('montant') ? parseFloat(record.get('montant')) : undefined,
          modePaiement: record.get('mode_paiement'),
          clientRef: `NEO_${record.get('client_id')}`,
          employeRef: record.get('employe_id') ? `NEO_${record.get('employe_id')}` : undefined,
        };
        
        collection.addItem(commande);
      }
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
      throw new Error('Not connected to Neo4j database');
    }
    
    const collection = new DetailCommandeCollection();
    
    // Use Neo4j connection to get order details
    const query = `MATCH (o:Commande)-[d:DETAIL]->(p:Produit)
                 RETURN o.id_commande as commande_id,
                        p.id_produit as produit_id,
                        d.quantite as quantite`;
    
    const result = await this.executeCypherQuery(query);
    
    if (result) {
      for (const record of result) {
        const detail: DetailCommande = {
          id: `NEO_${record.get('commande_id')}_${record.get('produit_id')}`,
          sourceSystem: this.sourceSystem,
          commandeId: `NEO_${record.get('commande_id')}`,
          produitId: `NEO_${record.get('produit_id')}`,
          quantite: record.get('quantite').toNumber(),
        };
        
        collection.addItem(detail);
      }
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
      throw new Error('Not connected to Neo4j database');
    }
    
    const collection = new FactureCollection();
    
    // Use Neo4j connection to get invoices
    const query = `MATCH (o:Commande)-[:FACTURE]->(f:Facture)
                 RETURN f.id_facture as id,
                        f.montant_total as montant_total,
                        f.date as date,
                        o.id_commande as commande_id`;
    
    const result = await this.executeCypherQuery(query);
    
    if (result) {
      for (const record of result) {
        const facture: Facture = {
          id: `NEO_${record.get('id')}`,
          sourceSystem: this.sourceSystem,
          dateFacture: record.get('date'),
          commandeRef: `NEO_${record.get('commande_id')}`,
          montantTotal: parseFloat(record.get('montant_total')),
        };
        
        collection.addItem(facture);
      }
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
      throw new Error('Not connected to Neo4j database');
    }
    
    const collection = new LivraisonCollection();
    
    // Use Neo4j connection to get deliveries
    const query = `MATCH (o:Commande)-[:LIVREE_PAR]->(l:Livraison)
                 RETURN l.id_livraison as id,
                        l.transporteur as transporteur,
                        l.date_estimee as date_estimee,
                        l.statut as statut,
                        o.id_commande as commande_id`;
    
    const result = await this.executeCypherQuery(query);
    
    if (result) {
      for (const record of result) {
        const livraison: Livraison = {
          id: `NEO_${record.get('id')}`,
          sourceSystem: this.sourceSystem,
          dateEstimee: record.get('date_estimee'),
          transporteur: record.get('transporteur'),
          commandeRef: `NEO_${record.get('commande_id')}`,
          statut: record.get('statut')
        };
        
        collection.addItem(livraison);
      }
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
      throw new Error('Not connected to Neo4j database');
    }
    
    const collection = new ApprovisionnementCollection();
    
    // Use Neo4j connection to get supplies
    const query = `MATCH (p:Produit)-[f:FOURNI_PAR]->(s:Fournisseur)
                 RETURN p.id_produit as produit_id,
                        s.id_fournisseur as fournisseur_id,
                        f.quantite as quantite`;
    
    const result = await this.executeCypherQuery(query);
    
    if (result) {
      for (const record of result) {
        const approvisionnement: Approvisionnement = {
          id: `NEO_${record.get('produit_id')}_${record.get('fournisseur_id')}`,
          sourceSystem: this.sourceSystem,
          produitId: `NEO_${record.get('produit_id')}`,
          fournisseurId: `NEO_${record.get('fournisseur_id')}`,
          quantite: record.get('quantite').toNumber(),

        };
        
        collection.addItem(approvisionnement);
      }
    }
    
    return collection;
  }

  /**
   * Execute a filtered query directly on the adapter
   * @param tableName The table/entity to query
   * @param filter Query filter specification
   * @returns The appropriate data collection with filtered results
   */
  public async executeFilteredQuery(tableName: string, filter: QueryFilter): Promise<any> {
    if (!this.connected) {
      throw new Error('Not connected to Neo4j database');
    }
    
    console.log(`Neo4jAdapter: Executing filtered query for ${tableName}`);
    console.log('Filter:', JSON.stringify(filter));
    
    // Map the common table names to Neo4j node types and relationship patterns
    const nodeMap: Record<string, string> = {
      'clients': 'Client',
      'employees': 'Employe',
      'agences': 'Agence',
      'fournisseurs': 'Fournisseur',
      'produits': 'Produit',
      'commandes': 'Commande',
      'factures': 'Facture',
      'livraisons': 'Livraison'
    };
    
    // Special relationship patterns for "tables" that are modeled as relationships in Neo4j
    const relationshipMap: Record<string, { pattern: string; fields: string[] }> = {
      'details_commande': {
        pattern: '(o:Commande)-[d:DETAIL]->(p:Produit)',
        fields: ['o.id_commande', 'p.id_produit', 'd.quantité']
      },
      'approvisionnements': {
        pattern: '(p:Produit)-[f:FOURNI_PAR]->(s:Fournisseur)',
        fields: ['p.id_produit', 's.id_fournisseur', 'f.quantité']
      }
    };
    
    // Additional relationship patterns for joined queries
    const joinPatterns: Record<string, Record<string, string>> = {
      'commandes': {
        'clients': '(c:Client)-[:PASSE]->(o:Commande)',
        'employees': '(e:Employe)-[:GERE]->(o:Commande)'
      },
      'factures': {
        'commandes': '(o:Commande)-[:FACTURE]->(f:Facture)'
      },
      'livraisons': {
        'commandes': '(o:Commande)-[:LIVREE_PAR]->(l:Livraison)'
      },
      'employees': {
        'agences': '(e:Employe)-[:TRAVAILLE_DANS]->(a:Agence)'
      }
    };
    
    // Map collection creation methods to table names
    const methodMap: Record<string, keyof Neo4jAdapter & string> = {
      'clients': 'getClients',
      'employees': 'getEmployees',
      'agences': 'getAgences',
      'fournisseurs': 'getFournisseurs',
      'produits': 'getProduits',
      'commandes': 'getCommandes',
      'details_commande': 'getDetailsCommande',
      'factures': 'getFactures',
      'livraisons': 'getLivraisons',
      'approvisionnements': 'getApprovisionnements'
    };
    
    // Field mapping from common model to Neo4j schema
    const fieldMaps: Record<string, Record<string, string>> = {
      'clients': {
        'id': 'c.id_client',
        'nom_complet': 'c.nom',
        'adresse': 'c.adresse',
        'email_contact': 'c.email',
        'numero_telephone': 'c.telephone'
      },
      'employees': {
        'id': 'e.id_employe',
        'nom_complet': 'e.nom',
        'email': 'e.email',
        'poste': 'e.poste',
        'agence_ref': 'a.id_agence'
      },
      'agences': {
        'id': 'a.id_agence',
        'ville': 'a.ville',
        'adresse': 'a.adresse'
      },
      'fournisseurs': {
        'id': 'f.id_fournisseur',
        'nom_fournisseur': 'f.nom',
        'adresse': 'f.adresse',
        'numero_telephone': 'f.telephone'
      },
      'produits': {
        'id': 'p.id_produit',
        'description': 'p.description',
        'prix_cout': 'p.prix',
        'categorie': 'p.categorie'
      },
      'commandes': {
        'id': 'o.id_commande', // Use 'o' consistently as the alias for Commande
        'date_commande': 'o.date',
        'montant': 'o.montant',
        'statut': 'o.statut',
        'mode_paiement': 'o.mode_paiement',
        'client_ref': 'c.id_client', // Alias 'c' for Client
        'employe_ref': 'e.id_employe' // Alias 'e' for Employe
      },
      'details_commande': {
        'commande_id': 'o.id_commande',
        'produit_id': 'p.id_produit',
        'quantite': 'd.quantité'
      },
      'factures': {
        'id': 'f.id_facture',
        'montant_total': 'f.montant_total',
        'date_facture': 'f.date',
        'commande_ref': 'o.id_commande'
      },
      'livraisons': {
        'id': 'l.id_livraison',
        'transporteur': 'l.transporteur',
        'date_estimee': 'l.date_estimee',
        'statut': 'l.statut',
        'commande_ref': 'o.id_commande'
      },
      'approvisionnements': {
        'produit_id': 'p.id_produit',
        'fournisseur_id': 's.id_fournisseur',
        'quantite': 'f.quantité'
      }
    };
    
    // Helper to resolve generic field names to Neo4j properties with correct aliases
    const resolveField = (genericTable: string, genericField: string): string | null => {
      const map = fieldMaps[genericTable];
      if (map && map[genericField]) {
        return map[genericField]; // Returns alias.property, e.g., o.id_commande
      }
      // If not found, maybe it's a direct property name (less ideal but fallback)
      // Or handle aggregate functions etc.
      if (genericField.includes('(') || genericField.includes('*')) return genericField;
      console.warn(`Could not resolve field '${genericField}' for table '${genericTable}'`);
      return null;
    };

    // Helper to get the alias for a table
    const getAlias = (genericTable: string): string | null => {
        // Extract alias from the first field mapping for that table
        const map = fieldMaps[genericTable];
        if (map) {
            const firstField = Object.values(map)[0]; // e.g., 'o.id_commande'
            if (firstField && firstField.includes('.')) {
                return firstField.split('.')[0]; // e.g., 'o'
            }
        }
        // Fallback for relationship-based or simple node patterns
        if (relationshipMap[genericTable]) return 'rel'; // Placeholder, adjust if needed
        if (nodeMap[genericTable]) return genericTable.charAt(0); // Default: 'c' for clients
        return null;
    };

    try {
      // Build the Cypher query
      let cypher = '';
      const params: Record<string, any> = {};
      let matchClauses: string[] = [];
      let whereConditions: string[] = [];
      let returnItems: string[] = [];
      const involvedAliases: Set<string> = new Set(); // Keep track of defined aliases

      // Determine the base pattern and alias
      let baseAlias = getAlias(tableName);
      let basePattern = '';

      if (relationshipMap[tableName]) {
        // Handle relationship-based tables (e.g., details_commande)
        basePattern = relationshipMap[tableName].pattern;
        // Extract aliases used in the pattern (e.g., 'o', 'd', 'p')
        const relAliases = basePattern.match(/\((\w+):/g)?.map(m => m.substring(1, m.indexOf(':'))) || [];
        relAliases.forEach(a => involvedAliases.add(a));
        matchClauses.push(`MATCH ${basePattern}`);
        baseAlias = 'rel'; // Use a generic alias for return mapping
      } else if (nodeMap[tableName] && baseAlias) {
        // Handle node-based tables (e.g., commandes)
        basePattern = `(${baseAlias}:${nodeMap[tableName]})`;
        involvedAliases.add(baseAlias);
        matchClauses.push(`MATCH ${basePattern}`);
      } else {
        throw new Error(`Unknown table or missing alias configuration: ${tableName}`);
      }

      // Add joins if present - Ensure related nodes are MATCHed
      const requiredJoinAliases: Record<string, string> = {}; // Map generic table name to required alias
      if (filter.joins && filter.joins.length > 0) {
        for (const join of filter.joins) {
          if (join.on && join.on.table) {
            const joinTable = join.on.table;
            const joinAlias = getAlias(joinTable);
            const joinNodeType = nodeMap[joinTable];

            if (joinAlias && joinNodeType && !involvedAliases.has(joinAlias)) {
              // Find appropriate relationship pattern
              let joinMatch = '';
              if (joinPatterns[tableName] && joinPatterns[tableName][joinTable]) {
                  joinMatch = joinPatterns[tableName][joinTable]; // e.g., (c:Client)-[:PASSE]->(o:Commande)
              } else if (joinPatterns[joinTable] && joinPatterns[joinTable][tableName]) {
                  // Try reverse pattern
                  joinMatch = joinPatterns[joinTable][tableName];
              } else {
                  // Generic pattern (less reliable)
                  console.warn(`No specific join pattern found between ${tableName} and ${joinTable}. Using generic pattern.`);
                  joinMatch = `(${baseAlias})-[]-(${joinAlias}:${joinNodeType})`;
              }

              // Use OPTIONAL MATCH for flexibility if join type isn't INNER
              const matchType = (join.type || 'INNER').toUpperCase() === 'INNER' ? 'MATCH' : 'OPTIONAL MATCH';
              matchClauses.push(`${matchType} ${joinMatch}`);
              involvedAliases.add(joinAlias);
            }
            if(joinAlias) requiredJoinAliases[joinTable] = joinAlias;
          }
        }
      }

      // Add conditions - Resolve fields using correct aliases
      if (filter.conditions && filter.conditions.length > 0) {
        for (let i = 0; i < filter.conditions.length; i++) {
          const condition = filter.conditions[i];
          if (condition.type === 'binary_expr') {
            let resolvedField = null;
            let conditionTable = tableName; // Assume condition applies to the base table

            // Determine which table the condition's column belongs to
            if (condition.left.table) {
                conditionTable = condition.left.table;
            } else {
                // Attempt to infer table if not specified (check base table first)
                if (!fieldMaps[tableName]?.[condition.left.column]) {
                    // Check joined tables
                    for (const joinedTable of Object.keys(requiredJoinAliases)) {
                        if (fieldMaps[joinedTable]?.[condition.left.column]) {
                            conditionTable = joinedTable;
                            break;
                        }
                    }
                }
            }

            resolvedField = resolveField(conditionTable, condition.left.column);

            if (resolvedField) {
              const paramName = `param${i}`;
              // Ensure the alias used in resolvedField is actually defined
              const fieldAlias = resolvedField.split('.')[0];
              if (involvedAliases.has(fieldAlias)) {
                  whereConditions.push(`${resolvedField} ${condition.operator} $${paramName}`);
                  params[paramName] = condition.right.value;
              } else {
                  console.warn(`Alias '${fieldAlias}' for condition field '${resolvedField}' not defined in MATCH clauses. Skipping condition.`);
              }
            } else {
              console.warn(`Could not resolve field '${condition.left.column}' for WHERE clause.`);
            }
          } else {
            console.warn(`Unsupported condition type: ${condition.type}`);
          }
        }
      }

      // Build RETURN clause - Resolve fields using correct aliases
      if (filter.projections && filter.projections.length > 0 && !filter.projections.includes('*')) {
        returnItems = filter.projections.map(projField => {
            let resolvedField = null;
            let fieldTable = tableName; // Assume base table

            // Check base table first
            if (!fieldMaps[tableName]?.[projField]) {
                 // Check joined tables
                 for (const joinedTable of Object.keys(requiredJoinAliases)) {
                     if (fieldMaps[joinedTable]?.[projField]) {
                         fieldTable = joinedTable;
                         break;
                     }
                 }
            }

            resolvedField = resolveField(fieldTable, projField);

            if (resolvedField) {
                // Ensure the alias used is defined
                const fieldAlias = resolvedField.split('.')[0];
                if (involvedAliases.has(fieldAlias)) {
                    return `${resolvedField} AS ${projField}`; // Use original field name as alias
                } else {
                    console.warn(`Alias '${fieldAlias}' for projection field '${resolvedField}' not defined in MATCH clauses. Returning null.`);
                    return `null AS ${projField}`; // Return null if alias is missing
                }
            } else {
                // Handle aggregates or direct fields
                if (projField.includes('(') || projField.includes('*')) {
                    return projField; // e.g., COUNT(*)
                }
                console.warn(`Could not resolve projection field '${projField}'. Returning null.`);
                return `null AS ${projField}`; // Return null if unresolved
            }
        });
      } else {
        // Default: Return all mapped fields from the base table/relationship
        if (relationshipMap[tableName]) {
            // For relationships, use the predefined fields
            returnItems = relationshipMap[tableName].fields.map((field, index) => {
                 const alias = ['commande_id', 'produit_id', 'quantite', 'fournisseur_id'][index] || `field${index}`;
                 return `${field} AS ${alias}`;
            });
        } else if (fieldMaps[tableName]) {
            // For nodes, return all fields defined in the map
            returnItems = Object.entries(fieldMaps[tableName]).map(([alias, field]) => {
                // Ensure the alias used is defined
                const fieldAlias = field.split('.')[0];
                if (involvedAliases.has(fieldAlias)) {
                    return `${field} AS ${alias}`; // e.g., o.id_commande AS id
                } else {
                    console.warn(`Alias '${fieldAlias}' for default projection field '${field}' not defined. Returning null.`);
                    return `null AS ${alias}`; // Return null if alias is missing
                }
            });
        } else {
            returnItems.push(`${baseAlias}.*`); // Fallback, might not work well
        }
      }

      // Construct the final query
      cypher = matchClauses.join('\n');
      if (whereConditions.length > 0) {
        cypher += `\nWHERE ${whereConditions.join(' AND ')}`;
      }
      cypher += `\nRETURN ${returnItems.join(', ')}`;

      // Add ORDER BY - Resolve fields using correct aliases
      if (filter.orderBy && filter.orderBy.length > 0) {
        const orderClauses = filter.orderBy.map(order => {
            let resolvedField = null;
            let fieldTable = tableName; // Assume base table

            // Check base table first
            if (!fieldMaps[tableName]?.[order.column]) {
                 // Check joined tables
                 for (const joinedTable of Object.keys(requiredJoinAliases)) {
                     if (fieldMaps[joinedTable]?.[order.column]) {
                         fieldTable = joinedTable;
                         break;
                     }
                 }
            }

            resolvedField = resolveField(fieldTable, order.column);

            if (resolvedField) {
                 // Ensure the alias used is defined
                 const fieldAlias = resolvedField.split('.')[0];
                 if (involvedAliases.has(fieldAlias)) {
                    return `${resolvedField} ${order.type}`; // e.g., o.date DESC
                 } else {
                     console.warn(`Alias '${fieldAlias}' for ORDER BY field '${resolvedField}' not defined. Skipping order clause.`);
                     return null;
                 }
            } else {
                 // Allow ordering by aggregated fields or direct names if not resolved
                 if (order.column.includes('(') || order.column.includes('*')) {
                     return `${order.column} ${order.type}`;
                 }
                 console.warn(`Could not resolve ORDER BY field '${order.column}'. Skipping.`);
                 return null;
            }
        }).filter(clause => clause !== null);

        if (orderClauses.length > 0) {
          cypher += `\nORDER BY ${orderClauses.join(', ')}`;
        }
      }

      // Add LIMIT
      if (filter.limit !== undefined && filter.limit !== null) {
        cypher += `\nLIMIT ${filter.limit}`;
      }

      console.log(`Neo4jAdapter: Generated Cypher: ${cypher}`);
      console.log('Parameters:', params);

      // Execute the query
      const result = await this.executeCypherQuery(cypher, params);

      // ... rest of the result processing logic ...
      // Ensure the result processing switch statement uses the correct aliases
      // defined in the RETURN clause (which should match the DataModel field names)

      // Create and populate the appropriate collection
      const methodName = methodMap[tableName];
      if (!methodName) {
        throw new Error(`No method mapping found for table: ${tableName}`);
      }

      // Create an empty collection directly
      let collection;
      // ... (switch statement for creating collection remains the same)
        switch (tableName) {
            case 'clients': collection = new ClientCollection(); break;
            case 'employees': collection = new EmployeeCollection(); break;
            case 'agences': collection = new AgenceCollection(); break;
            case 'fournisseurs': collection = new FournisseurCollection(); break;
            case 'produits': collection = new ProduitCollection(); break;
            case 'commandes': collection = new CommandeCollection(); break;
            case 'details_commande': collection = new DetailCommandeCollection(); break;
            case 'factures': collection = new FactureCollection(); break;
            case 'livraisons': collection = new LivraisonCollection(); break;
            case 'approvisionnements': collection = new ApprovisionnementCollection(); break;
            default: throw new Error(`No collection type found for table: ${tableName}`);
        }

      // Process the query results into model objects
      if (result) {
        for (const record of result) {
          let item: any;

          // The switch statement should now work correctly as RETURN uses DataModel field names as aliases
          switch (tableName) {
            case 'clients':
              item = {
                id: `NEO_${record.get('id')}`,
                sourceSystem: this.sourceSystem,
                nomComplet: record.get('nom_complet'),
                adresse: record.get('adresse'),
                emailContact: record.get('email_contact'),
                numeroTelephone: record.get('numero_telephone')
              };
              break;
            case 'employees':
              item = {
                id: `NEO_${record.get('id')}`,
                sourceSystem: this.sourceSystem,
                nomComplet: record.get('nom_complet'),
                email: record.get('email'),
                post: record.get('poste'),
                agenceRef: record.get('agence_ref') ? `NEO_${record.get('agence_ref')}` : undefined
              };
              break;
            // ... other cases remain the same, relying on aliases matching DataModel fields ...
             case 'agences':
              item = {
                id: `NEO_${record.get('id')}`,
                sourceSystem: this.sourceSystem,
                ville: record.get('ville'),
                adresse: record.get('adresse'),
              };
              break;
            case 'fournisseurs':
              item = {
                id: `NEO_${record.get('id')}`,
                sourceSystem: this.sourceSystem,
                nomFournisseur: record.get('nom_fournisseur'),
                adresse: record.get('adresse'),
                numeroTelephone: record.get('numero_telephone')
              };
              break;
            case 'produits':
              item = {
                id: `NEO_${record.get('id')}`,
                sourceSystem: this.sourceSystem,
                description: record.get('description'),
                categorie: record.get('categorie'),
                prixCout: record.get('prix_cout') ? parseFloat(record.get('prix_cout')) : undefined
              };
              break;
            case 'commandes':
              item = {
                id: `NEO_${record.get('id')}`,
                sourceSystem: this.sourceSystem,
                dateCommande: record.get('date_commande'),
                montant: record.get('montant') ? parseFloat(record.get('montant')) : undefined,
                statut: record.get('statut'),
                modePaiement: record.get('mode_paiement'),
                clientRef: record.get('client_ref') ? `NEO_${record.get('client_ref')}`: undefined, // Handle potential null if OPTIONAL MATCH was used
                employeRef: record.get('employe_ref') ? `NEO_${record.get('employe_ref')}` : undefined // Handle potential null
              };
              break;
            case 'details_commande':
              item = {
                id: `NEO_${record.get('commande_id')}_${record.get('produit_id')}`,
                sourceSystem: this.sourceSystem,
                commandeId: `NEO_${record.get('commande_id')}`,
                produitId: `NEO_${record.get('produit_id')}`,
                quantite: record.get('quantite')?.toNumber() || 0
              };
              break;
            case 'factures':
              item = {
                id: `NEO_${record.get('id')}`,
                sourceSystem: this.sourceSystem,
                montantTotal: record.get('montant_total') ? parseFloat(record.get('montant_total')) : undefined,
                dateFacture: record.get('date_facture'),
                commandeRef: record.get('commande_ref') ? `NEO_${record.get('commande_ref')}` : undefined
              };
              break;
            case 'livraisons':
              item = {
                id: `NEO_${record.get('id')}`,
                sourceSystem: this.sourceSystem,
                transporteur: record.get('transporteur'),
                dateEstimee: record.get('date_estimee'),
                statut: record.get('statut'),
                commandeRef: record.get('commande_ref') ? `NEO_${record.get('commande_ref')}` : undefined
              };
              break;
            case 'approvisionnements':
              item = {
                id: `NEO_${record.get('produit_id')}_${record.get('fournisseur_id')}`,
                sourceSystem: this.sourceSystem,
                produitId: `NEO_${record.get('produit_id')}`,
                fournisseurId: `NEO_${record.get('fournisseur_id')}`,
                quantite: record.get('quantite')?.toNumber() || 0
              };
              break;
            default:
              continue;
          }

          collection.addItem(item);
        }
      }

      return collection;
    } catch (error) {
      console.error(`Error executing filtered query for ${tableName}:`, error);
      throw error;
    }
  }
}