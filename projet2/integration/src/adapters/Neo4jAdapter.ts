/**
 * Neo4jAdapter.ts
 * Adapter for Neo4j graph database using the Neo4j JavaScript driver
 */

import neo4j, { Driver, Session, Record as Neo4jRecord, QueryResult } from 'neo4j-driver';
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
          post: record.get('fonction'),
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
                 OPTIONAL MATCH (e:Employé)-[:GERE]->(o)
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
                        d.quantité as quantite`;
    
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
                        f.quantité as quantite`;
    
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
}