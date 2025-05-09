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
} from '../common/DataModel';
import { ComplexQueryProcessor } from './ComplexQueryProcessor';

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
      console.log(`Adapter ${adapter.getSourceSystem()} mappings:`, adapterMappings);

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
      console.log('Adapter', adapter.getSourceDescription());

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
      console.log('Adapter', adapter.getSourceDescription());

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

  /**
   * Calculate Jaro similarity between two strings
   * Implementation based on the course description
   */
  public calculateJaroSimilarity(str1: string, str2: string): number {
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
   * Calculate similarity using gap affinity for abbreviations
   * Implements Smith-Waterman algorithm with gap affinity
   */
  private calculateGapAffinitySimilarity(str1: string, str2: string): number {
    const gapOpenPenalty = -2;
    const gapExtendPenalty = -1;
    const matchScore = 2;
    const mismatchScore = -1;

    // Initialize scoring matrix
    const matrix: number[][] = Array(str1.length + 1).fill(0)
      .map(() => Array(str2.length + 1).fill(0));

    // Fill the matrix using Smith-Waterman with gap affinity
    let maxScore = 0;
    
    for (let i = 1; i <= str1.length; i++) {
      for (let j = 1; i <= str2.length; j++) {
        const match = str1[i-1] === str2[j-1] ? matchScore : mismatchScore;
        
        matrix[i][j] = Math.max(
          0,
          matrix[i-1][j-1] + match, // Diagonal
          matrix[i-1][j] + (i > 1 && matrix[i-1][j] !== 0 ? gapExtendPenalty : gapOpenPenalty), // Gap in str2
          matrix[i][j-1] + (j > 1 && matrix[i][j-1] !== 0 ? gapExtendPenalty : gapOpenPenalty)  // Gap in str1
        );

        maxScore = Math.max(maxScore, matrix[i][j]);
      }
    }

    // Normalize score
    const maxPossibleScore = Math.min(str1.length, str2.length) * matchScore;
    return maxScore / maxPossibleScore;
  }

  /**
   * Calculate Jaccard similarity between two strings
   * Based on token comparison as described in the course
   */
  public calculateJaccardSimilarity(str1: string, str2: string): number {
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
   * Iterative reconciliation method that propagates similarity scores
   * through related entities until convergence
   */
  public async performIterativeReconciliation(
    entities: any[],
    relationshipMap: Map<string, string[]>,
    similarityThreshold: number = 0.9
  ): Promise<Map<string, string>> {
    const reconciliations = new Map<string, string>();
    let changed = true;
    let iterations = 0;
    const maxIterations = 10;

    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      for (let i = 0; i < entities.length; i++) {
        for (let j = i + 1; j < entities.length; j++) {
          const entity1 = entities[i];
          const entity2 = entities[j];
          
          // Skip if already reconciled
          const key = `${entity1.id}-${entity2.id}`;
          if (reconciliations.has(key)) continue;

          // Calculate direct similarity
          const directSimilarity = this.calculateEntitySimilarity(entity1, entity2);
          
          // Calculate relationship similarity
          const relatedSimilarity = this.calculateRelatedEntitiesSimilarity(
            entity1,
            entity2,
            relationshipMap,
            reconciliations
          );

          // Combine similarities (weighted average)
          const combinedSimilarity = (directSimilarity * 0.6) + (relatedSimilarity * 0.4);

          if (combinedSimilarity >= similarityThreshold) {
            reconciliations.set(key, 'reconciled');
            changed = true;
          }
        }
      }
    }

    return reconciliations;
  }

  /**
   * Calculate similarity between two entities using multiple measures
   */
  private calculateEntitySimilarity(entity1: any, entity2: any): number {
    // Combine different similarity measures
    const levenshteinScore = this.calculateStringSimilarity(
      this.normalizeString(entity1.name),
      this.normalizeString(entity2.name)
    );
    
    const jaroScore = this.calculateJaroSimilarity(
      this.normalizeString(entity1.name),
      this.normalizeString(entity2.name)
    );
    
    const jaccardScore = this.calculateJaccardSimilarity(
      this.normalizeString(entity1.name),
      this.normalizeString(entity2.name)
    );

    // Weighted combination of scores
    return (levenshteinScore * 0.4 + jaroScore * 0.4 + jaccardScore * 0.2);
  }

  /**
   * Calculate similarity between related entities
   */
  private calculateRelatedEntitiesSimilarity(
    entity1: any,
    entity2: any,
    relationshipMap: Map<string, string[]>,
    existingReconciliations: Map<string, string>
  ): number {
    const relatedIds1 = relationshipMap.get(entity1.id) || [];
    const relatedIds2 = relationshipMap.get(entity2.id) || [];
    
    if (relatedIds1.length === 0 || relatedIds2.length === 0) {
      return 0;
    }

    let matchingRelations = 0;
    
    // Check how many related entities are already reconciled
    for (const id1 of relatedIds1) {
      for (const id2 of relatedIds2) {
        const key = `${id1}-${id2}`;
        if (existingReconciliations.has(key)) {
          matchingRelations++;
        }
      }
    }

    return matchingRelations / Math.max(relatedIds1.length, relatedIds2.length);
  }

  // Other methods omitted for brevity - validateDataConsistency, getDataStatistics, etc.

  public async getDataStatistics(): Promise<{

    overall: Record<string, number>;

    bySource: Record<string, Record<string, number>>;

  }> {

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
   * 
   * @param collection The collection to count
   * @param entityName The name of the entity
   * @param stats The statistics object to update
   */

  private async countBySource(
    collection: any,
    entityName: string,
    stats: Record<string, Record<string, number>>
  ): Promise<void> {
    for (const item of collection.getItems()) {
      const sourceId = item.sourceSystem; // Assuming each item has a sourceId property
      if (stats[sourceId]) {
        stats[sourceId][entityName]++;
      } else {
        console.warn(`Source ID ${sourceId} not found in statistics.`);
      }
    }
  }
  /**
   * Validate data consistency across all adapters
   *
   * This method checks for duplicates and missing references
   * in the integrated data. It can be extended to include more
   * complex validation rules as needed.
   * 
   * @returns An object containing validation results
   * @throws Error if validation fails
   */
  public async validateDataConsistency(): Promise<{
    status: boolean;
    warnings: string[];
    errors: string[];
  }> {
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

  /**
   * Calculate string similarity using Levenshtein distance
   * as described in the course
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
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
    
    // Calculate similarity score using the formula from the course:
    // Sim(σ1,σ2) = 1 - distance(σ1,σ2)/Max(|σ1|,|σ2|)
    const distance = matrix[str1.length][str2.length];
    return 1 - (distance / Math.max(str1.length, str2.length));
  }

  /**
   * Normalize a string for comparison by removing accents,
   * converting to lowercase, and trimming whitespace
   */
  public normalizeString(str: string): string {
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
}