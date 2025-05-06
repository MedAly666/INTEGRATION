/**
 * Mediator.ts
 * Mediator component that coordinates the data source adapters
 * and provides a unified view of the data
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
  Client
} from '../common/DataModel';
import { ComplexQueryProcessor } from './ComplexQueryProcessor';
import { SourceDescription, EntityAvailability } from '../common/SourceDescription';

/**
 * Represents a mapping between global and source schemas
 * Following the formal GAV integration framework: (G,S,M) where M is the mapping
 */
interface SchemaMapping {
  globalEntity: string;        // Global entity name
  sourceEntity: string;        // Source entity name
  attributeMappings: Map<string, string>; // Global attribute -> Source attribute
  conditions?: string[];       // Optional conditions for this mapping
  sourceId: string;            // Source identifier
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
   * Schema mappings for the GAV approach
   * Maps global schema elements to source schema elements
   */
  private schemaMappings: SchemaMapping[] = [];
  
  /**
   * Add a data source adapter
   * 
   * @param adapter Adapter instance
   * @returns The mediator instance for method chaining
   */
  public addAdapter(adapter: IAdapter): Mediator {
    this.adapters.push(adapter);
    
    // Extract and register schema mappings when adding a new adapter
    this.registerAdapterMappings(adapter);
    
    return this;
  }

  /**
   * Register schema mappings from an adapter's source description
   * This implements the formal mapping (M) in the GAV framework (G,S,M)
   * 
   * @param adapter The adapter to register mappings for
   */
  private registerAdapterMappings(adapter: IAdapter): void {
    const description = adapter.getSourceDescription();
    const sourceId = description.getSourceId();
    
    // For each available entity in the source
    for (const entityAvailability of description.getAllEntities()) {
      const globalEntityName = this.normalizeEntityName(entityAvailability.entityName);
      const sourceEntityName = entityAvailability.entityName;
      
      // Create attribute mappings (e.g., nom_complet → nomComplet)
      const attributeMappings = new Map<string, string>();
      for (const attr of entityAvailability.attributes) {
        // Convert from source attribute format to global format
        // This is simplified and would need proper attribute mapping in a real system
        attributeMappings.set(
          this.normalizeAttributeName(attr), 
          attr
        );
      }
      
      // Add the mapping to our collection
      this.schemaMappings.push({
        globalEntity: globalEntityName,
        sourceEntity: sourceEntityName,
        attributeMappings,
        conditions: entityAvailability.constraints,
        sourceId
      });
      
      console.log(`Registered mapping: ${sourceId}.${sourceEntityName} → ${globalEntityName}`);
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
   * Get schema mappings for a specific global entity
   * 
   * @param globalEntity Name of the global entity
   * @returns Array of mappings for this entity
   */
  public getMappingsForEntity(globalEntity: string): SchemaMapping[] {
    return this.schemaMappings.filter(
      mapping => mapping.globalEntity === globalEntity.toLowerCase()
    );
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
   * Execute a complex query with improved query delegation to sources
   * 
   * @param query The complex query string
   * @param parameters Optional parameters for the query
   * @returns The query results
   * @throws Error If query processor is not initialized
   */
  public async executeQuery(query: string, parameters: Record<string, any> = {}): Promise<any[]> {
    if (this.queryProcessor === null) {
      throw new Error("Query processor not initialized. Call initQueryProcessor() first.");
    }
    return await this.queryProcessor.executeQuery(query, parameters);
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
   * Find adapters that can provide data for a specific entity and apply filtering
   * 
   * @param entityName The name of the entity to query
   * @param filter Optional query filter
   * @returns Array of adapters that can provide this entity data
   */
  private findCapableAdapters(entityName: string, filter?: QueryFilter): IAdapter[] {
    const mappings = this.getMappingsForEntity(entityName);
    const capableAdapters: IAdapter[] = [];
    
    for (const adapter of this.adapters) {
      // Check if this adapter has a mapping for this entity
      const adapterMappings = mappings.filter(m => m.sourceId === adapter.getSourceDescription().getSourceId());
      
      if (adapterMappings.length > 0) {
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
   * Get clients from all data sources with improved filtering delegation
   * 
   * @param filter Optional query filter
   * @returns Integrated client data
   */
  public async getClients(filter?: QueryFilter): Promise<ClientCollection> {
    const result = new ClientCollection();
    const capableAdapters = this.findCapableAdapters('clients', filter);
    
    for (const adapter of capableAdapters) {
      const clients = await adapter.getClients(filter);
      result.merge(clients);      
    }
    
    return result;
  }
  
  /**
   * Get employees from all data sources with improved filtering delegation
   * 
   * @param filter Optional query filter
   * @returns Integrated employee data
   */
  public async getEmployees(filter?: QueryFilter): Promise<EmployeeCollection> {
    const result = new EmployeeCollection();
    const capableAdapters = this.findCapableAdapters('employees', filter);
    
    for (const adapter of capableAdapters) {
      const employees = await adapter.getEmployees(filter);
      result.merge(employees);
    }
    
    return result;
  }
  
  /**
   * Get agencies from all data sources with improved filtering delegation
   * 
   * @param filter Optional query filter
   * @returns Integrated agency data
   */
  public async getAgences(filter?: QueryFilter): Promise<AgenceCollection> {
    const result = new AgenceCollection();
    const capableAdapters = this.findCapableAdapters('agences', filter);
    
    for (const adapter of capableAdapters) {
      const agences = await adapter.getAgences(filter);
      result.merge(agences);
    }
    
    return result;
  }
  
  /**
   * Get suppliers from all data sources with improved filtering delegation
   * 
   * @param filter Optional query filter
   * @returns Integrated supplier data
   */
  public async getFournisseurs(filter?: QueryFilter): Promise<FournisseurCollection> {
    const result = new FournisseurCollection();
    const capableAdapters = this.findCapableAdapters('fournisseurs', filter);
    
    for (const adapter of capableAdapters) {
      const fournisseurs = await adapter.getFournisseurs(filter);
      result.merge(fournisseurs);
    }
    
    return result;
  }
  
  /**
   * Get products from all data sources with improved filtering delegation
   * 
   * @param filter Optional query filter
   * @returns Integrated product data
   */
  public async getProduits(filter?: QueryFilter): Promise<ProduitCollection> {
    const result = new ProduitCollection();
    const capableAdapters = this.findCapableAdapters('produits', filter);
    
    for (const adapter of capableAdapters) {
      const produits = await adapter.getProduits(filter);
      result.merge(produits);
    }    
    
    return result;
  }
  
  /**
   * Get orders from all data sources with improved filtering delegation
   * 
   * @param filter Optional query filter
   * @returns Integrated order data
   */
  public async getCommandes(filter?: QueryFilter): Promise<CommandeCollection> {
    const result = new CommandeCollection();
    const capableAdapters = this.findCapableAdapters('commandes', filter);
    
    for (const adapter of capableAdapters) {
      const commandes = await adapter.getCommandes(filter);
      result.merge(commandes);
    }
    
    return result;
  }
  
  /**
   * Get order details from all data sources with improved filtering delegation
   * 
   * @param filter Optional query filter
   * @returns Integrated order detail data
   */
  public async getDetailsCommande(filter?: QueryFilter): Promise<DetailCommandeCollection> {
    const result = new DetailCommandeCollection();
    const capableAdapters = this.findCapableAdapters('details_commande', filter);
    
    for (const adapter of capableAdapters) {
      const details = await adapter.getDetailsCommande(filter);
      result.merge(details);
    }
    
    return result;
  }
  
  /**
   * Get invoices from all data sources with improved filtering delegation
   * 
   * @param filter Optional query filter
   * @returns Integrated invoice data
   */
  public async getFactures(filter?: QueryFilter): Promise<FactureCollection> {
    const result = new FactureCollection();
    const capableAdapters = this.findCapableAdapters('factures', filter);
    
    for (const adapter of capableAdapters) {
      const factures = await adapter.getFactures(filter);
      result.merge(factures);
    }
    
    return result;
  }
  
  /**
   * Get deliveries from all data sources with improved filtering delegation
   * 
   * @param filter Optional query filter
   * @returns Integrated delivery data
   */
  public async getLivraisons(filter?: QueryFilter): Promise<LivraisonCollection> {
    const result = new LivraisonCollection();
    const capableAdapters = this.findCapableAdapters('livraisons', filter);
    
    for (const adapter of capableAdapters) {
      const livraisons = await adapter.getLivraisons(filter);
      result.merge(livraisons);
    }
    
    return result;
  }
  
  /**
   * Get supply data from all data sources with improved filtering delegation
   * 
   * @param filter Optional query filter
   * @returns Integrated supply data
   */
  public async getApprovisionnements(filter?: QueryFilter): Promise<ApprovisionnementCollection> {
    const result = new ApprovisionnementCollection();
    const capableAdapters = this.findCapableAdapters('approvisionnements', filter);
    
    for (const adapter of capableAdapters) {
      const approvisionnements = await adapter.getApprovisionnements(filter);
      result.merge(approvisionnements);
    }
    
    return result;
  }
  
  /**
   * Search for clients by name using delegated filtering
   * Instead of collecting all data and filtering in mediator,
   * this now sends the filter to the adapters that can handle it
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
    
    // Use the existing getClients method which now delegates filtering
    return this.getClients(filter);
  }
  
  /**
   * Get orders for a specific client using delegated filtering
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
    
    // Use the existing getCommandes method which now delegates filtering
    return this.getCommandes(filter);
  }
  
  /**
   * Get order details for a specific order using delegated filtering
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
    
    // Use the existing getDetailsCommande method which now delegates filtering
    return this.getDetailsCommande(filter);
  }
  
  /**
   * Get products supplied by a specific supplier
   * 
   * @param fournisseurId Supplier ID (with prefix)
   * @returns Products from this supplier
   */
  public async getProductsBySupplier(fournisseurId: string): Promise<ProduitCollection> {
    // First get all product IDs supplied by this supplier using delegated filtering
    const approFilter: QueryFilter = {
      conditions: [{
        type: 'binary_expr',
        operator: '=',
        left: { type: 'column_ref', column: 'id_fournisseur' },
        right: { type: 'string', value: fournisseurId }
      }]
    };
    
    const allApprovisionnements = await this.getApprovisionnements(approFilter);
    const productIds: string[] = allApprovisionnements.getItems().map(appro => appro.idProduit);
    
    if (productIds.length === 0) {
      return new ProduitCollection();
    }
    
    // Then get the product details using the collected IDs
    // This uses an IN condition which may or may not be supported by all sources
    // In a real system, we would need to check if sources support this
    const prodFilter: QueryFilter = {
      conditions: [{
        type: 'binary_expr',
        operator: 'IN',
        left: { type: 'column_ref', column: 'id_produit' },
        right: { type: 'expr_list', value: productIds }
      }]
    };
    
    return this.getProduits(prodFilter);
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
    
    switch(methodName) {
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
  
  // Other methods omitted for brevity - validateDataConsistency, getDataStatistics, etc.
}