/**
 * Mediator.ts
 * Mediator component that coordinates the data source adapters
 * and provides a unified view of the data using LAV approach
 */

import { IAdapter, QueryFilter } from '../adapters/IAdapter';
import {
  ClientCollection,
  EmployeeCollection,
  AgenceCollection,
  FournisseurCollection,
  ProduitCollection,
  CommandeCollection,
  DetailCommandeCollection,
  FactureCollection,
  LivraisonCollection,
  ApprovisionnementCollection,
} from '../common/DataModel';
import { ComplexQueryProcessor } from './ComplexQueryProcessor';
import { LAVMappingManager, LAVViewDefinition, LAVStats } from '../common/LAVMapping';

export interface DuplicateRecord {
  client1: {
    id: string;
    nomComplet: string;
    sourceSystem: string;
  };
  client2: {
    id: string;
    nomComplet: string;
    sourceSystem: string;
  };
  confidenceScore: number;
  nameSimilarity: number;
  emailMatch: boolean;
  phoneMatch: boolean;
}

export class Mediator {
  /**
   * Array of adapter instances
   */
  private adapters: IAdapter[] = [];

  /**
   * Complex query processor instance
   */
  private queryProcessor: ComplexQueryProcessor | null = null;

  /**
   * LAV mapping manager
   */
  private lavMapping: LAVMappingManager = new LAVMappingManager();

  /**
   * Add a data source adapter
   * 
   * @param adapter Adapter instance
   * @returns The mediator instance for method chaining
   */
  public addAdapter(adapter: IAdapter): Mediator {
    this.adapters.push(adapter);

    // Register LAV view definitions from this adapter
    this.registerLAVViews(adapter);

    return this;
  }

  /**
   * Register LAV view definitions from an adapter
   * 
   * @param adapter The adapter to register views for
   */
  private registerLAVViews(adapter: IAdapter): void {
    const sourceId = adapter.getSourceSystem();
    console.log(`Registering LAV views for source: ${sourceId}`);

    try {
      // Get LAV view definitions from the adapter
      const views = adapter.getLAVViews();
      
      if (!views || views.length === 0) {
        console.warn(`No LAV view definitions found for source: ${sourceId}`);
        return;
      }

      // Register each view with the LAV mapping manager
      for (const view of views) {
        this.lavMapping.addViewDefinition(view);
        console.log(`Registered LAV view: ${view.viewName} from source: ${sourceId}`);
      }
    } catch (error) {
      console.error(`Error registering LAV views for source ${sourceId}:`, error);
    }
  }

  /**
   * Helper to normalize entity names between source and global schemas
   */
  private normalizeEntityName(name: string): string {
    // Simple implementation - in a real system, this would use a proper mapping table
    // Here, we assume global names are plural and lowercase
    return name.toLowerCase();
  }

  /**
   * Helper to normalize attribute names between source and global schemas
   */
  private normalizeAttributeName(name: string): string {
    // Convert from snake_case to camelCase
    return name.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
  }

  /**
   * Get all registered adapters
   * 
   * @returns Array of adapter instances
   */
  public getAdapters(): IAdapter[] {
    return this.adapters;
  }

  /**
   * Initialize the complex query processor
   * 
   * @returns The mediator instance for method chaining
   */
  public initQueryProcessor(): Mediator {
    if (this.queryProcessor === null) {
      this.queryProcessor = new ComplexQueryProcessor(this);
    }
    return this;
  }

  /**
   * Get the complex query processor instance
   * 
   * @returns The query processor instance or null if not initialized
   */
  public getQueryProcessor(): ComplexQueryProcessor | null {
    return this.queryProcessor;
  }

  /**
   * Execute a complex query using the LAV approach with bucket algorithm
   * 
   * @param query The complex query string
   * @param parameters Optional parameters for the query
   * @returns The query results
   * @throws Error If query processor is not initialized
   */
  public async executeQuery(query: string, parameters: Record<string, any> = {}): Promise<any[]> {
    console.log(`Executing query using LAV approach: ${query}`);
    
    // Use the LAV mapping manager to rewrite the query
    const { rewritings, stats } = this.lavMapping.rewriteQuery(query);
    console.log(`Query rewriting stats:`, stats);
    
    if (rewritings.length === 0) {
      console.warn(`No rewritings found for query: ${query}`);
      return [];
    }
    
    // Execute each rewriting on the appropriate adapter
    const allResults: any[] = [];
    
    for (const rewriting of rewritings) {
      const sourceId = rewriting.sourceId;
      const adapter = this.findAdapterBySourceId(sourceId);
      
      if (adapter) {
        try {
          const results = await adapter.executeQuery(rewriting.query, {
            ...parameters,
            ...rewriting.mapping
          });
          
          allResults.push(...results);
        } catch (error) {
          console.error(`Error executing rewritten query on source ${sourceId}:`, error);
        }
      }
    }
    
    return allResults;
  }

  /**
   * Find an adapter by its source ID
   * 
   * @param sourceId The source ID to look for
   * @returns The matching adapter or undefined if not found
   */
  private findAdapterBySourceId(sourceId: string): IAdapter | undefined {
    return this.adapters.find(adapter => adapter.getSourceSystem() === sourceId);
  }

  /** 
   * Connect to all data sources
   * 
   * @returns True if all connections successful, false otherwise
   */
  public async connect(): Promise<boolean> {
    let allConnected = true;

    for (const adapter of this.adapters) {
      const connected = await adapter.connect();
      allConnected = allConnected && connected;
      
      // Register LAV views after successful connection
      if (connected) {
        this.registerLAVViews(adapter);
      }
    }

    return allConnected;
  }

  /**
   * Disconnect from all data sources
   */
  public disconnect(): void {
    for (const adapter of this.adapters) {
      adapter.disconnect();
    }
  }

  /**
   * Find adapters that can provide data for a specific entity using the LAV approach
   * 
   * @param entityName The name of the entity to query
   * @param filter Optional query filter
   * @returns Array of adapters that can provide this entity data
   */
  private findCapableAdapters(entityName: string, filter?: QueryFilter): IAdapter[] {
    const capableAdapters: IAdapter[] = [];
    
    // In LAV, we look for views that can answer queries about this entity
    for (const adapter of this.adapters) {
      // Get view definitions for this source
      const views = this.lavMapping.getSourceViewDefinitions(adapter.getSourceSystem());
      
      // Check if any view can provide data for this entity
      const hasRelevantView = views.some(view => 
        view.viewName === entityName ||
        view.query.toLowerCase().includes(entityName.toLowerCase())
      );
      
      if (hasRelevantView) {
        // If there's a filter, check if adapter can handle it
        if (filter && !adapter.canHandleQuery(filter, entityName)) {
          console.log(`Adapter ${adapter.getSourceSystem()} cannot handle the filter for ${entityName}`);
          continue;
        }
        
        capableAdapters.push(adapter);
      }
    }
    
    return capableAdapters;
  }

  /**
   * Get clients from all data sources with LAV approach
   * 
   * @param filter Optional query filter
   * @returns Integrated client data
   */
  public async getClients(filter?: QueryFilter): Promise<ClientCollection> {
    const result = new ClientCollection();
    
    // Build a simple query for the entity
    const query = this.buildSimpleQueryForEntity('clients', filter);
    
    // Use LAV to rewrite the query
    const { rewritings } = this.lavMapping.rewriteQuery(query);
    
    // Execute each rewriting
    for (const rewriting of rewritings) {
      const adapter = this.findAdapterBySourceId(rewriting.sourceId);
      
      if (adapter) {
        try {
          const clients = await adapter.getClients(filter);
          result.merge(clients);
        } catch (error) {
          console.error(`Error getting clients from source ${rewriting.sourceId}:`, error);
        }
      }
    }
    
    // If no rewritings were found, fall back to finding capable adapters directly
    if (rewritings.length === 0) {
      const capableAdapters = this.findCapableAdapters('clients', filter);
      
      for (const adapter of capableAdapters) {
        try {
          const clients = await adapter.getClients(filter);
          result.merge(clients);
        } catch (error) {
          console.error(`Error getting clients from adapter ${adapter.getSourceSystem()}:`, error);
        }
      }
    }
    
    return result;
  }

  /**
   * Build a simple SQL query for an entity
   * Used as input to the LAV query rewriting
   * 
   * @param entityName The entity name
   * @param filter Optional filter to include
   * @returns A SQL query string
   */
  private buildSimpleQueryForEntity(entityName: string, filter?: QueryFilter): string {
    let query = `SELECT * FROM ${entityName}`;
    
    if (filter && filter.conditions && filter.conditions.length > 0) {
      query += ' WHERE ';
      
      // Simple implementation for demonstration
      const conditions: string[] = [];
      
      for (const condition of filter.conditions) {
        if (condition.type === 'binary_expr') {
          const leftCol = condition.left.column;
          const op = condition.operator;
          const rightVal = typeof condition.right.value === 'string' 
            ? `'${condition.right.value}'` 
            : condition.right.value;
            
          conditions.push(`${leftCol} ${op} ${rightVal}`);
        }
      }
      
      query += conditions.join(' AND ');
    }
    
    return query;
  }

  /**
   * Get employees from all data sources with LAV approach
   * 
   * @param filter Optional query filter
   * @returns Integrated employee data
   */
  public async getEmployees(filter?: QueryFilter): Promise<EmployeeCollection> {
    const result = new EmployeeCollection();
    
    // Build a simple query for the entity
    const query = this.buildSimpleQueryForEntity('employees', filter);
    
    // Use LAV to rewrite the query
    const { rewritings } = this.lavMapping.rewriteQuery(query);
    
    // Execute each rewriting
    for (const rewriting of rewritings) {
      const adapter = this.findAdapterBySourceId(rewriting.sourceId);
      
      if (adapter) {
        try {
          const employees = await adapter.getEmployees(filter);
          result.merge(employees);
        } catch (error) {
          console.error(`Error getting employees from source ${rewriting.sourceId}:`, error);
        }
      }
    }
    
    // If no rewritings were found, fall back to finding capable adapters directly
    if (rewritings.length === 0) {
      const capableAdapters = this.findCapableAdapters('employees', filter);
      
      for (const adapter of capableAdapters) {
        try {
          const employees = await adapter.getEmployees(filter);
          result.merge(employees);
        } catch (error) {
          console.error(`Error getting employees from adapter ${adapter.getSourceSystem()}:`, error);
        }
      }
    }
    
    return result;
  }

  /**
   * Get agencies from all data sources with LAV approach
   * 
   * @param filter Optional query filter
   * @returns Integrated agency data
   */
  public async getAgences(filter?: QueryFilter): Promise<AgenceCollection> {
    const result = new AgenceCollection();
    
    // Build a simple query for the entity
    const query = this.buildSimpleQueryForEntity('agences', filter);
    
    // Use LAV to rewrite the query
    const { rewritings } = this.lavMapping.rewriteQuery(query);
    
    // Execute each rewriting
    for (const rewriting of rewritings) {
      const adapter = this.findAdapterBySourceId(rewriting.sourceId);
      
      if (adapter) {
        try {
          const agences = await adapter.getAgences(filter);
          result.merge(agences);
        } catch (error) {
          console.error(`Error getting agences from source ${rewriting.sourceId}:`, error);
        }
      }
    }
    
    // If no rewritings were found, fall back to finding capable adapters directly
    if (rewritings.length === 0) {
      const capableAdapters = this.findCapableAdapters('agences', filter);
      
      for (const adapter of capableAdapters) {
        try {
          const agences = await adapter.getAgences(filter);
          result.merge(agences);
        } catch (error) {
          console.error(`Error getting agences from adapter ${adapter.getSourceSystem()}:`, error);
        }
      }
    }
    
    return result;
  }

  /**
   * Get suppliers from all data sources with LAV approach
   * 
   * @param filter Optional query filter
   * @returns Integrated supplier data
   */
  public async getFournisseurs(filter?: QueryFilter): Promise<FournisseurCollection> {
    const result = new FournisseurCollection();
    
    // Build a simple query for the entity
    const query = this.buildSimpleQueryForEntity('fournisseurs', filter);
    
    // Use LAV to rewrite the query
    const { rewritings } = this.lavMapping.rewriteQuery(query);
    
    // Execute each rewriting
    for (const rewriting of rewritings) {
      const adapter = this.findAdapterBySourceId(rewriting.sourceId);
      
      if (adapter) {
        try {
          const fournisseurs = await adapter.getFournisseurs(filter);
          result.merge(fournisseurs);
        } catch (error) {
          console.error(`Error getting fournisseurs from source ${rewriting.sourceId}:`, error);
        }
      }
    }
    
    // If no rewritings were found, fall back to finding capable adapters directly
    if (rewritings.length === 0) {
      const capableAdapters = this.findCapableAdapters('fournisseurs', filter);
      
      for (const adapter of capableAdapters) {
        try {
          const fournisseurs = await adapter.getFournisseurs(filter);
          result.merge(fournisseurs);
        } catch (error) {
          console.error(`Error getting fournisseurs from adapter ${adapter.getSourceSystem()}:`, error);
        }
      }
    }
    
    return result;
  }

  /**
   * Get products from all data sources with LAV approach
   * 
   * @param filter Optional query filter
   * @returns Integrated product data
   */
  public async getProduits(filter?: QueryFilter): Promise<ProduitCollection> {
    const result = new ProduitCollection();
    
    // Build a simple query for the entity
    const query = this.buildSimpleQueryForEntity('produits', filter);
    
    // Use LAV to rewrite the query
    const { rewritings } = this.lavMapping.rewriteQuery(query);
    
    // Execute each rewriting
    for (const rewriting of rewritings) {
      const adapter = this.findAdapterBySourceId(rewriting.sourceId);
      
      if (adapter) {
        try {
          const produits = await adapter.getProduits(filter);
          result.merge(produits);
        } catch (error) {
          console.error(`Error getting produits from source ${rewriting.sourceId}:`, error);
        }
      }
    }
    
    // If no rewritings were found, fall back to finding capable adapters directly
    if (rewritings.length === 0) {
      const capableAdapters = this.findCapableAdapters('produits', filter);
      
      for (const adapter of capableAdapters) {
        try {
          const produits = await adapter.getProduits(filter);
          result.merge(produits);
        } catch (error) {
          console.error(`Error getting produits from adapter ${adapter.getSourceSystem()}:`, error);
        }
      }
    }
    
    return result;
  }

  /**
   * Get orders from all data sources with LAV approach
   * 
   * @param filter Optional query filter
   * @returns Integrated order data
   */
  public async getCommandes(filter?: QueryFilter): Promise<CommandeCollection> {
    const result = new CommandeCollection();
    
    // Build a simple query for the entity
    const query = this.buildSimpleQueryForEntity('commandes', filter);
    
    // Use LAV to rewrite the query
    const { rewritings } = this.lavMapping.rewriteQuery(query);
    
    // Execute each rewriting
    for (const rewriting of rewritings) {
      const adapter = this.findAdapterBySourceId(rewriting.sourceId);
      
      if (adapter) {
        try {
          const commandes = await adapter.getCommandes(filter);
          result.merge(commandes);
        } catch (error) {
          console.error(`Error getting commandes from source ${rewriting.sourceId}:`, error);
        }
      }
    }
    
    // If no rewritings were found, fall back to finding capable adapters directly
    if (rewritings.length === 0) {
      const capableAdapters = this.findCapableAdapters('commandes', filter);
      
      for (const adapter of capableAdapters) {
        try {
          const commandes = await adapter.getCommandes(filter);
          result.merge(commandes);
        } catch (error) {
          console.error(`Error getting commandes from adapter ${adapter.getSourceSystem()}:`, error);
        }
      }
    }
    
    return result;
  }

  /**
   * Get order details from all data sources with LAV approach
   * 
   * @param filter Optional query filter
   * @returns Integrated order detail data
   */
  public async getDetailsCommande(filter?: QueryFilter): Promise<DetailCommandeCollection> {
    const result = new DetailCommandeCollection();
    
    // Build a simple query for the entity
    const query = this.buildSimpleQueryForEntity('details_commande', filter);
    
    // Use LAV to rewrite the query
    const { rewritings } = this.lavMapping.rewriteQuery(query);
    
    // Execute each rewriting
    for (const rewriting of rewritings) {
      const adapter = this.findAdapterBySourceId(rewriting.sourceId);
      
      if (adapter) {
        try {
          const details = await adapter.getDetailsCommande(filter);
          result.merge(details);
        } catch (error) {
          console.error(`Error getting details_commande from source ${rewriting.sourceId}:`, error);
        }
      }
    }
    
    // If no rewritings were found, fall back to finding capable adapters directly
    if (rewritings.length === 0) {
      const capableAdapters = this.findCapableAdapters('details_commande', filter);
      
      for (const adapter of capableAdapters) {
        try {
          const details = await adapter.getDetailsCommande(filter);
          result.merge(details);
        } catch (error) {
          console.error(`Error getting details_commande from adapter ${adapter.getSourceSystem()}:`, error);
        }
      }
    }
    
    return result;
  }

  /**
   * Get invoices from all data sources with LAV approach
   * 
   * @param filter Optional query filter
   * @returns Integrated invoice data
   */
  public async getFactures(filter?: QueryFilter): Promise<FactureCollection> {
    const result = new FactureCollection();
    
    // Build a simple query for the entity
    const query = this.buildSimpleQueryForEntity('factures', filter);
    
    // Use LAV to rewrite the query
    const { rewritings } = this.lavMapping.rewriteQuery(query);
    
    // Execute each rewriting
    for (const rewriting of rewritings) {
      const adapter = this.findAdapterBySourceId(rewriting.sourceId);
      
      if (adapter) {
        try {
          const factures = await adapter.getFactures(filter);
          result.merge(factures);
        } catch (error) {
          console.error(`Error getting factures from source ${rewriting.sourceId}:`, error);
        }
      }
    }
    
    // If no rewritings were found, fall back to finding capable adapters directly
    if (rewritings.length === 0) {
      const capableAdapters = this.findCapableAdapters('factures', filter);
      
      for (const adapter of capableAdapters) {
        try {
          const factures = await adapter.getFactures(filter);
          result.merge(factures);
        } catch (error) {
          console.error(`Error getting factures from adapter ${adapter.getSourceSystem()}:`, error);
        }
      }
    }
    
    return result;
  }

  /**
   * Get deliveries from all data sources with LAV approach
   * 
   * @param filter Optional query filter
   * @returns Integrated delivery data
   */
  public async getLivraisons(filter?: QueryFilter): Promise<LivraisonCollection> {
    const result = new LivraisonCollection();
    
    // Build a simple query for the entity
    const query = this.buildSimpleQueryForEntity('livraisons', filter);
    
    // Use LAV to rewrite the query
    const { rewritings } = this.lavMapping.rewriteQuery(query);
    
    // Execute each rewriting
    for (const rewriting of rewritings) {
      const adapter = this.findAdapterBySourceId(rewriting.sourceId);
      
      if (adapter) {
        try {
          const livraisons = await adapter.getLivraisons(filter);
          result.merge(livraisons);
        } catch (error) {
          console.error(`Error getting livraisons from source ${rewriting.sourceId}:`, error);
        }
      }
    }
    
    // If no rewritings were found, fall back to finding capable adapters directly
    if (rewritings.length === 0) {
      const capableAdapters = this.findCapableAdapters('livraisons', filter);
      
      for (const adapter of capableAdapters) {
        try {
          const livraisons = await adapter.getLivraisons(filter);
          result.merge(livraisons);
        } catch (error) {
          console.error(`Error getting livraisons from adapter ${adapter.getSourceSystem()}:`, error);
        }
      }
    }
    
    return result;
  }

  /**
   * Get supply data from all data sources with LAV approach
   * 
   * @param filter Optional query filter
   * @returns Integrated supply data
   */
  public async getApprovisionnements(filter?: QueryFilter): Promise<ApprovisionnementCollection> {
    const result = new ApprovisionnementCollection();
    
    // Build a simple query for the entity
    const query = this.buildSimpleQueryForEntity('approvisionnements', filter);
    
    // Use LAV to rewrite the query
    const { rewritings } = this.lavMapping.rewriteQuery(query);
    
    // Execute each rewriting
    for (const rewriting of rewritings) {
      const adapter = this.findAdapterBySourceId(rewriting.sourceId);
      
      if (adapter) {
        try {
          const approvisionnements = await adapter.getApprovisionnements(filter);
          result.merge(approvisionnements);
        } catch (error) {
          console.error(`Error getting approvisionnements from source ${rewriting.sourceId}:`, error);
        }
      }
    }
    
    // If no rewritings were found, fall back to finding capable adapters directly
    if (rewritings.length === 0) {
      const capableAdapters = this.findCapableAdapters('approvisionnements', filter);
      
      for (const adapter of capableAdapters) {
        try {
          const approvisionnements = await adapter.getApprovisionnements(filter);
          result.merge(approvisionnements);
        } catch (error) {
          console.error(`Error getting approvisionnements from adapter ${adapter.getSourceSystem()}:`, error);
        }
      }
    }
    
    return result;
  }

  /**
   * Search for clients by name using LAV approach
   * 
   * @param query Search query
   * @returns Matching clients
   */
  public async searchClientsByName(query: string): Promise<ClientCollection> {
    // Create a filter for name search
    const filter: QueryFilter = {
      conditions: [{
        type: 'binary_expr',
        operator: 'LIKE',
        left: { type: 'column_ref', column: 'nom_complet' },
        right: { type: 'string', value: `%${query}%` }
      }]
    };

    // Build a simple query for the entity with the filter
    const sqlQuery = `SELECT * FROM clients WHERE nom_complet LIKE '%${query}%'`;
    
    // Use LAV to rewrite the query
    const { rewritings } = this.lavMapping.rewriteQuery(sqlQuery);
    
    const result = new ClientCollection();
    
    // Execute each rewriting
    for (const rewriting of rewritings) {
      const adapter = this.findAdapterBySourceId(rewriting.sourceId);
      
      if (adapter) {
        try {
          const clients = await adapter.getClients(filter);
          result.merge(clients);
        } catch (error) {
          console.error(`Error searching clients from source ${rewriting.sourceId}:`, error);
        }
      }
    }
    
    // If no rewritings were found, use the existing getClients method with filter
    if (rewritings.length === 0) {
      return this.getClients(filter);
    }
    
    return result;
  }

  /**
   * Get orders for a specific client using LAV approach
   * 
   * @param clientId Client ID (with prefix)
   * @returns Client's orders
   */
  public async getOrdersByClient(clientId: string): Promise<CommandeCollection> {
    // Create a filter for client ID
    const filter: QueryFilter = {
      conditions: [{
        type: 'binary_expr',
        operator: '=',
        left: { type: 'column_ref', column: 'client_ref' },
        right: { type: 'string', value: clientId }
      }]
    };

    // Build a simple query for the entity with the filter
    const sqlQuery = `SELECT * FROM commandes WHERE client_ref = '${clientId}'`;
    
    // Use LAV to rewrite the query
    const { rewritings } = this.lavMapping.rewriteQuery(sqlQuery);
    
    const result = new CommandeCollection();
    
    // Execute each rewriting
    for (const rewriting of rewritings) {
      const adapter = this.findAdapterBySourceId(rewriting.sourceId);
      
      if (adapter) {
        try {
          const commandes = await adapter.getCommandes(filter);
          result.merge(commandes);
        } catch (error) {
          console.error(`Error getting orders by client from source ${rewriting.sourceId}:`, error);
        }
      }
    }
    
    // If no rewritings were found, use the existing getCommandes method with filter
    if (rewritings.length === 0) {
      return this.getCommandes(filter);
    }
    
    return result;
  }

  /**
   * Get order details for a specific order using LAV approach
   * 
   * @param orderId Order ID (with prefix)
   * @returns Order details
   */
  public async getOrderDetails(orderId: string): Promise<DetailCommandeCollection> {
    // Create a filter for order ID
    const filter: QueryFilter = {
      conditions: [{
        type: 'binary_expr',
        operator: '=',
        left: { type: 'column_ref', column: 'id_commande' },
        right: { type: 'string', value: orderId }
      }]
    };

    // Build a simple query for the entity with the filter
    const sqlQuery = `SELECT * FROM details_commande WHERE id_commande = '${orderId}'`;
    
    // Use LAV to rewrite the query
    const { rewritings } = this.lavMapping.rewriteQuery(sqlQuery);
    
    const result = new DetailCommandeCollection();
    
    // Execute each rewriting
    for (const rewriting of rewritings) {
      const adapter = this.findAdapterBySourceId(rewriting.sourceId);
      
      if (adapter) {
        try {
          const details = await adapter.getDetailsCommande(filter);
          result.merge(details);
        } catch (error) {
          console.error(`Error getting order details from source ${rewriting.sourceId}:`, error);
        }
      }
    }
    
    // If no rewritings were found, use the existing getDetailsCommande method with filter
    if (rewritings.length === 0) {
      return this.getDetailsCommande(filter);
    }
    
    return result;
  }

  /**
   * Get products supplied by a specific supplier using LAV approach
   * 
   * @param fournisseurId Supplier ID (with prefix)
   * @returns Products from this supplier
   */
  public async getProductsBySupplier(fournisseurId: string): Promise<ProduitCollection> {
    // This is a more complex query involving approvisionnements and produits
    // First, find approvisionnements for this supplier
    const approFilter: QueryFilter = {
      conditions: [{
        type: 'binary_expr',
        operator: '=',
        left: { type: 'column_ref', column: 'id_fournisseur' },
        right: { type: 'string', value: fournisseurId }
      }]
    };

    // Build a SQL query for LAV rewriting
    const sqlQuery = `
      SELECT p.* 
      FROM produits p
      JOIN approvisionnements a ON p.id_produit = a.id_produit
      WHERE a.id_fournisseur = '${fournisseurId}'
    `;
    
    // Use LAV to rewrite the query
    const { rewritings } = this.lavMapping.rewriteQuery(sqlQuery);
    
    const result = new ProduitCollection();
    
    // If we have direct rewritings for the join query, use them
    if (rewritings.length > 0) {
      for (const rewriting of rewritings) {
        const adapter = this.findAdapterBySourceId(rewriting.sourceId);
        
        if (adapter) {
          try {
            // Execute the custom query - adapters need to support this
            const queryResults = await adapter.executeQuery(rewriting.query, rewriting.mapping);
            
            // Convert to product objects and add to collection
            for (const rowData of queryResults) {
              const produit = this.createProduitFromRow(rowData);
              result.addItem(produit);
            }
          } catch (error) {
            console.error(`Error executing join query on source ${rewriting.sourceId}:`, error);
          }
        }
      }
    } 
    // Otherwise, fall back to the two-step process
    else {
      // Get all approvisionnements for this supplier
      const allApprovisionnements = await this.getApprovisionnements(approFilter);
      const productIds = allApprovisionnements.getItems().map(appro => appro.idProduit);
      
      if (productIds.length === 0) {
        return result;
      }
      
      // Get products with these IDs
      const prodFilter: QueryFilter = {
        conditions: [{
          type: 'binary_expr',
          operator: 'IN',
          left: { type: 'column_ref', column: 'id_produit' },
          right: { type: 'expr_list', value: productIds }
        }]
      };
      
      // Get the products using the LAV approach
      const products = await this.getProduits(prodFilter);
      result.merge(products);
    }
    
    return result;
  }

  /**
   * Helper method to create a Produit object from a row of data
   */
  private createProduitFromRow(rowData: any) {
    const { Produit } = require('../common/DataModel');
    
    // Extract fields and make sure IDs have the correct prefix
    const idProduit = rowData.id_produit?.startsWith('SQL_') 
      ? rowData.id_produit 
      : `SQL_${rowData.id_produit}`;
      
    return new Produit({
      idProduit,
      sourceSystem: rowData.source_system || 'Unknown',
      description: rowData.description || '',
      prixCout: rowData.prix_cout || rowData.prix || 0,
      categorie: rowData.categorie || ''
    });
  }

  /**
   * Merges multiple collections into one based on the method name
   * 
   * @param collections Array of collections from different adapters
   * @param methodName Name of the method used to get these collections
   * @returns Merged collection
   */
  public mergeCollections(collections: any[], methodName: string): any {
    // Create the appropriate collection type based on the method name
    let result: any;

    switch (methodName) {
      case 'getClients':
        result = new ClientCollection();
        break;
      case 'getEmployees':
        result = new EmployeeCollection();
        break;
      case 'getAgences':
        result = new AgenceCollection();
        break;
      case 'getFournisseurs':
        result = new FournisseurCollection();
        break;
      case 'getProduits':
        result = new ProduitCollection();
        break;
      case 'getCommandes':
        result = new CommandeCollection();
        break;
      case 'getDetailsCommande':
        result = new DetailCommandeCollection();
        break;
      case 'getFactures':
        result = new FactureCollection();
        break;
      case 'getLivraisons':
        result = new LivraisonCollection();
        break;
      case 'getApprovisionnements':
        result = new ApprovisionnementCollection();
        break;
      default:
        throw new Error(`Unknown method name: ${methodName}`);
    }

    // Merge all collections into the result, with validation for each collection
    for (const collection of collections) {
      if (!collection) continue;

      try {
        // Check if collection has the getItems method
        if (typeof collection.getItems === 'function') {
          result.merge(collection);
        }
        // Handle arrays and other collection-like objects
        else if (Array.isArray(collection)) {
          // If collection is an array, add each item directly
          for (const item of collection) {
            result.addItem(item);
          }
        }
        // Handle collections with an items property
        else if (collection.items && Array.isArray(collection.items)) {
          for (const item of collection.items) {
            result.addItem(item);
          }
        }
        // Log warning for unrecognized collection format
        else {
          console.warn(`Unrecognized collection format in mergeCollections for ${methodName}: `, collection);
        }
      } catch (error) {
        console.error(`Error merging collection in ${methodName}:`, error);
        console.warn('Problematic collection:', collection);
        // Continue with the next collection rather than failing completely
      }
    }

    return result;
  }
  
  // Keep existing similarity calculation methods and data reconciliation methods
  // As they are still useful regardless of the mapping approach
  
  /**
   * Calculate Jaro similarity between two strings
   */
  public calculateJaroSimilarity(str1: string, str2: string): number {
    // Keep existing implementation
    if (!str1 || !str2) return 0;
    
    // Calculate matching characters
    const matchDistance = Math.floor(Math.max(str1.length, str2.length) / 2) - 1;
    const str1Matches: boolean[] = new Array(str1.length).fill(false);
    const str2Matches: boolean[] = new Array(str2.length).fill(false);
    let matches = 0;
    
    // Find matching characters within the distance
    for (let i = 0; i < str1.length; i++) {
      const start = Math.max(0, i - matchDistance);
      const end = Math.min(i + matchDistance + 1, str2.length);
      
      for (let j = start; j < end; j++) {
        if (!str2Matches[j] && str1[i] === str2[j]) {
          str1Matches[i] = true;
          str2Matches[j] = true;
          matches++;
          break;
        }
      }
    }

    if (matches === 0) return 0;

    // Count transpositions
    let transpositions = 0;
    let k = 0;
    
    for (let i = 0; i < str1.length; i++) {
      if (!str1Matches[i]) continue;
      
      while (!str2Matches[k]) k++;
      
      if (str1[i] !== str2[k]) transpositions++;
      k++;
    }

    // Calculate Jaro similarity
    return (
      (matches / str1.length + 
        matches / str2.length + 
        (matches - transpositions / 2) / matches) / 3
    );
  }

  /**
   * Calculate Jaccard similarity between two strings
   */
  public calculateJaccardSimilarity(str1: string, str2: string): number {
    // Keep existing implementation
    if (!str1 || !str2) return 0;

    // Tokenize strings (split by whitespace and punctuation)
    const tokens1 = str1.toLowerCase().split(/[\s\p{P}]+/u).filter(t => t.length > 0);
    const tokens2 = str2.toLowerCase().split(/[\s\p{P}]+/u).filter(t => t.length > 0);

    // Calculate intersection
    const intersection = tokens1.filter(token => tokens2.includes(token));
    
    // Calculate union
    const union = new Set([...tokens1, ...tokens2]);

    return intersection.length / union.size;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    // Keep existing implementation
    if (!str1 || !str2) return 0;
    
    const matrix: number[][] = [];
    
    // Initialize matrix
    for (let i = 0; i <= str1.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= str2.length; j++) {
        matrix[0][j] = j;
    }
    
    // Fill matrix
    for (let i = 1; i <= str1.length; i++) {
        for (let j = 1; j <= str2.length; j++) {
            if (str1[i-1] === str2[j-1]) {
                matrix[i][j] = matrix[i-1][j-1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i-1][j] + 1,   // deletion
                    matrix[i][j-1] + 1,   // insertion
                    matrix[i-1][j-1] + 1  // substitution
                );
            }
        }
    }
    
    // Calculate similarity score
    const distance = matrix[str1.length][str2.length];
    return 1 - (distance / Math.max(str1.length, str2.length));
  }

  /**
   * Normalize a string for comparison
   */
  public normalizeString(str: string): string {
    // Keep existing implementation
    if (!str) return '';
    
    // Convert to lowercase and trim
    str = str.toLowerCase().trim();
    
    // Remove accents/diacritics
    return str.normalize('NFD')
             .replace(/[\u0300-\u036f]/g, '');
  }

  /**
   * Find potential duplicate clients across all data sources
   */
  public async findPotentialDuplicateClients(): Promise<DuplicateRecord[]> {
    // Keep existing implementation
    const clients = await this.getClients();
    const allClients = clients.getItems();
    const potentialDuplicates: DuplicateRecord[] = [];

    for (let i = 0; i < allClients.length; i++) {
      for (let j = i + 1; j < allClients.length; j++) {
        const client1 = allClients[i];
        const client2 = allClients[j];

        // Skip if from the same source system
        if (client1.sourceSystem === client2.sourceSystem) {
          continue;
        }

        // Calculate name similarity
        const nameSimilarity = this.calculateStringSimilarity(
          this.normalizeString(client1.nomComplet),
          this.normalizeString(client2.nomComplet)
        );

        // Check for exact email match if available
        const emailMatch = client1.emailContact && client2.emailContact && 
          client1.emailContact.toLowerCase() === client2.emailContact.toLowerCase();

        // Check for phone match if available
        const phoneMatch = client1.numeroTelephone && client2.numeroTelephone &&
          this.normalizePhoneNumber(client1.numeroTelephone) === this.normalizePhoneNumber(client2.numeroTelephone);

        // Calculate confidence score
        const confidenceScore = this.calculateConfidenceScore(nameSimilarity, emailMatch, phoneMatch);

        // Consider as potential duplicate if similarity is high enough
        if (nameSimilarity > 0.8 || emailMatch || phoneMatch) {
          potentialDuplicates.push({
            client1: {
              id: client1.idClient,
              nomComplet: client1.nomComplet,
              sourceSystem: client1.sourceSystem
            },
            client2: {
              id: client2.idClient,
              nomComplet: client2.nomComplet,
              sourceSystem: client2.sourceSystem
            },
            confidenceScore,
            nameSimilarity,
            emailMatch,
            phoneMatch
          });
        }
      }
    }

    // Sort by confidence score (descending)
    return potentialDuplicates.sort((a, b) => b.confidenceScore - a.confidenceScore);
  }

  private calculateConfidenceScore(
    nameSimilarity: number,
    emailMatch: boolean,
    phoneMatch: boolean
  ): number {
    // Email is stronger indicator than phone, which is stronger than name similarity
    let score = nameSimilarity * 0.5; // Name contributes 50% max
    if (emailMatch) score += 0.3;      // Email match adds 30%
    if (phoneMatch) score += 0.2;      // Phone match adds 20%
    return Math.min(1.0, score);       // Ensure score doesn't exceed 1
  }

  private normalizePhoneNumber(phone: string): string {
    return phone.replace(/[^0-9]/g, '');
  }
  
  /**
   * Get statistics about the data in all sources
   */
  public async getDataStatistics(): Promise<{
    overall: Record<string, number>;
    bySource: Record<string, Record<string, number>>;
  }> {
    // Keep existing implementation
    // Get counts by source system
    const stats = {
      overall: {
        clients: (await this.getClients()).count(),
        employees: (await this.getEmployees()).count(),
        agencies: (await this.getAgences()).count(),
        suppliers: (await this.getFournisseurs()).count(),
        products: (await this.getProduits()).count(),
        orders: (await this.getCommandes()).count(),
        orderDetails: (await this.getDetailsCommande()).count(),
        invoices: (await this.getFactures()).count(),
        deliveries: (await this.getLivraisons()).count(),
        supplyRecords: (await this.getApprovisionnements()).count()
      },
      bySource: {} as Record<string, Record<string, number>>
    };

    // Get the unique source systems
    const sources: Record<string, boolean> = {};
    for (const adapter of this.adapters) {
      sources[adapter.getSourceSystem()] = true;
    }

    // Initialize counters for each source
    for (const source of Object.keys(sources)) {
      stats.bySource[source] = Object.fromEntries(
        Object.entries(stats.overall).map(([key]) => [key, 0])
      );
    }

    // Count items by source system
    await this.countBySource(await this.getClients(), 'clients', stats.bySource);
    await this.countBySource(await this.getEmployees(), 'employees', stats.bySource);
    await this.countBySource(await this.getAgences(), 'agencies', stats.bySource);
    await this.countBySource(await this.getFournisseurs(), 'suppliers', stats.bySource);
    await this.countBySource(await this.getProduits(), 'products', stats.bySource);
    await this.countBySource(await this.getCommandes(), 'orders', stats.bySource);
    await this.countBySource(await this.getDetailsCommande(), 'orderDetails', stats.bySource);
    await this.countBySource(await this.getFactures(), 'invoices', stats.bySource);
    await this.countBySource(await this.getLivraisons(), 'deliveries', stats.bySource);
    await this.countBySource(await this.getApprovisionnements(), 'supplyRecords', stats.bySource);

    return stats;
  }

  /**
   * Count items by source system and update the statistics
   */
  private async countBySource(
    collection: any,
    entityName: string,
    stats: Record<string, Record<string, number>>
  ): Promise<void> {
    for (const item of collection.getItems()) {
      const sourceId = item.sourceSystem;
      if (stats[sourceId]) {
        stats[sourceId][entityName]++;
      } else {
        console.warn(`Source ID ${sourceId} not found in statistics.`);
      }
    }
  }

  /**
   * Validate data consistency across all adapters
   */
  public async validateDataConsistency(): Promise<{
    status: boolean;
    warnings: string[];
    errors: string[];
  }> {
    // Keep existing implementation
    const result = {
      status: true,
      warnings: [] as string[],
      errors: [] as string[]
    };

    // Example validation: Check for duplicate clients
    const clients = await this.getClients();
    const clientIds = new Set<string>();

    for (const client of clients.getItems()) {
      if (clientIds.has(client.idClient)) {
        result.errors.push(`Duplicate client found: ${client.idClient}`);
        result.status = false;
      } else {
        clientIds.add(client.idClient);
      }
    }

    // Add more validation checks as needed

    return result;
  }
}