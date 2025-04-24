/**
 * Mediator.ts
 * Mediator component that coordinates the data source adapters
 * and provides a unified view of the data
 */

import { IAdapter } from '../adapters/IAdapter';
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
   * Add a data source adapter
   * 
   * @param adapter Adapter instance
   * @returns The mediator instance for method chaining
   */
  public addAdapter(adapter: IAdapter): Mediator {
    this.adapters.push(adapter);
    return this;
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
   * Execute a complex query
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
   * Get clients from all data sources
   * 
   * @returns Integrated client data
   */
  public async getClients(): Promise<ClientCollection> {
    const result = new ClientCollection();
    
    for (const adapter of this.adapters) {
      const clients = await adapter.getClients();
      result.merge(clients);      
    }
    
    return result;
  }
  
  /**
   * Get employees from all data sources
   * 
   * @returns Integrated employee data
   */
  public async getEmployees(): Promise<EmployeeCollection> {
    const result = new EmployeeCollection();
    
    for (const adapter of this.adapters) {
      const employees = await adapter.getEmployees();
      result.merge(employees);
    }
    
    return result;
  }
  
  /**
   * Get agencies from all data sources
   * 
   * @returns Integrated agency data
   */
  public async getAgences(): Promise<AgenceCollection> {
    const result = new AgenceCollection();
    
    for (const adapter of this.adapters) {
      const agences = await adapter.getAgences();
      result.merge(agences);
    }
    
    return result;
  }
  
  /**
   * Get suppliers from all data sources
   * 
   * @returns Integrated supplier data
   */
  public async getFournisseurs(): Promise<FournisseurCollection> {
    const result = new FournisseurCollection();
    
    for (const adapter of this.adapters) {
      const fournisseurs = await adapter.getFournisseurs();
      result.merge(fournisseurs);
    }
    
    return result;
  }
  
  /**
   * Get products from all data sources
   * 
   * @returns Integrated product data
   */
  public async getProduits(): Promise<ProduitCollection> {
    const result = new ProduitCollection();
    
    for (const adapter of this.adapters) {
      const produits = await adapter.getProduits();
      result.merge(produits);
    }    
    
    return result;
  }
  
  /**
   * Get orders from all data sources
   * 
   * @returns Integrated order data
   */
  public async getCommandes(): Promise<CommandeCollection> {
    const result = new CommandeCollection();
    
    for (const adapter of this.adapters) {
      const commandes = await adapter.getCommandes();
      result.merge(commandes);
    }
    
    return result;
  }
  
  /**
   * Get order details from all data sources
   * 
   * @returns Integrated order detail data
   */
  public async getDetailsCommande(): Promise<DetailCommandeCollection> {
    const result = new DetailCommandeCollection();
    
    for (const adapter of this.adapters) {
      const details = await adapter.getDetailsCommande();
      result.merge(details);
    }
    
    return result;
  }
  
  /**
   * Get invoices from all data sources
   * 
   * @returns Integrated invoice data
   */
  public async getFactures(): Promise<FactureCollection> {
    const result = new FactureCollection();
    
    for (const adapter of this.adapters) {
      const factures = await adapter.getFactures();
      result.merge(factures);
    }
    
    return result;
  }
  
  /**
   * Get deliveries from all data sources
   * 
   * @returns Integrated delivery data
   */
  public async getLivraisons(): Promise<LivraisonCollection> {
    const result = new LivraisonCollection();
    
    for (const adapter of this.adapters) {
      const livraisons = await adapter.getLivraisons();
      result.merge(livraisons);
    }
    
    return result;
  }
  
  /**
   * Get supply data from all data sources
   * 
   * @returns Integrated supply data
   */
  public async getApprovisionnements(): Promise<ApprovisionnementCollection> {
    const result = new ApprovisionnementCollection();
    
    for (const adapter of this.adapters) {
      const approvisionnements = await adapter.getApprovisionnements();
      result.merge(approvisionnements);
    }
    
    return result;
  }
  
  /**
   * Search for clients by name
   * 
   * @param query Search query
   * @returns Matching clients
   */
  public async searchClientsByName(query: string): Promise<ClientCollection> {
    const allClients = await this.getClients();
    const result = new ClientCollection();
    
    for (const client of allClients.getItems()) {
      if (client.nomComplet.toLowerCase().includes(query.toLowerCase())) {
        result.addItem(client);
      }
    }
    
    return result;
  }
  
  /**
   * Get orders for a specific client
   * 
   * @param clientId Client ID (with prefix)
   * @returns Client's orders
   */
  public async getOrdersByClient(clientId: string): Promise<CommandeCollection> {
    const allOrders = await this.getCommandes();
    const result = new CommandeCollection();
    
    for (const order of allOrders.getItems()) {
      if (order.clientRef === clientId) {
        result.addItem(order);
      }
    }
    
    return result;
  }
  
  /**
   * Get order details for a specific order
   * 
   * @param orderId Order ID (with prefix)
   * @returns Order details
   */
  public async getOrderDetails(orderId: string): Promise<DetailCommandeCollection> {
    const allDetails = await this.getDetailsCommande();
    const result = new DetailCommandeCollection();
    
    for (const detail of allDetails.getItems()) {
      if (detail.commandeId === orderId) {
        result.addItem(detail);
      }
    }
    
    return result;
  }
  
  /**
   * Get products supplied by a specific supplier
   * 
   * @param fournisseurId Supplier ID (with prefix)
   * @returns Products from this supplier
   */
  public async getProductsBySupplier(fournisseurId: string): Promise<ProduitCollection> {
    const allApprovisionnements = await this.getApprovisionnements();
    const allProduits = await this.getProduits();
    const result = new ProduitCollection();
    const productIds: string[] = [];
    
    // First get all product IDs supplied by this supplier
    for (const appro of allApprovisionnements.getItems()) {
      if (appro.fournisseurId === fournisseurId) {
        productIds.push(appro.produitId);
      }
    }
    
    // Then get the product details
    for (const produit of allProduits.getItems()) {
      if (productIds.includes(produit.id)) {
        result.addItem(produit);
      }
    }
    
    return result;
  }
  
  /**
   * Get employees working at a specific agency
   * 
   * @param agenceId Agency ID (with prefix)
   * @returns Employees at this agency
   */
  public async getEmployeesByAgency(agenceId: string): Promise<EmployeeCollection> {
    const allEmployees = await this.getEmployees();
    const result = new EmployeeCollection();
    
    for (const employee of allEmployees.getItems()) {
      if (employee.agenceRef === agenceId) {
        result.addItem(employee);
      }
    }
    
    return result;
  }

  /**
   * Validate data consistency across all sources
   * 
   * @returns Validation results with warnings and errors
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
    
    // Validate client references in orders
    await this.validateReferences(
      await this.getCommandes(),
      await this.getClients(),
      'clientRef',
      'id',
      'Order with ID %s references non-existent client %s',
      result
    );
    
    // Validate employee references in orders
    await this.validateReferences(
      await this.getCommandes(),
      await this.getEmployees(),
      'employeRef',
      'id',
      'Order with ID %s references non-existent employee %s',
      result,
      true  // Allow null references
    );
    
    // Validate order references in invoices
    await this.validateReferences(
      await this.getFactures(),
      await this.getCommandes(),
      'commandeRef',
      'id',
      'Invoice with ID %s references non-existent order %s',
      result
    );
    
    // Validate order references in deliveries
    await this.validateReferences(
      await this.getLivraisons(),
      await this.getCommandes(),
      'commandeRef',
      'id',
      'Delivery with ID %s references non-existent order %s',
      result
    );
    
    // Validate order references in order details
    await this.validateReferences(
      await this.getDetailsCommande(),
      await this.getCommandes(),
      'commandeId',
      'id',
      'Order detail references non-existent order %s',
      result
    );
    
    // Validate product references in order details
    await this.validateReferences(
      await this.getDetailsCommande(),
      await this.getProduits(),
      'produitId',
      'id',
      'Order detail for order %s references non-existent product %s',
      result
    );
    
    // Validate supplier references in supply records
    await this.validateReferences(
      await this.getApprovisionnements(),
      await this.getFournisseurs(),
      'fournisseurId',
      'id',
      'Supply record for product %s references non-existent supplier %s',
      result
    );
    
    // Validate product references in supply records
    await this.validateReferences(
      await this.getApprovisionnements(),
      await this.getProduits(),
      'produitId',
      'id',
      'Supply record references non-existent product %s',
      result
    );
    
    // Validate agency references in employees
    await this.validateReferences(
      await this.getEmployees(),
      await this.getAgences(),
      'agenceRef',
      'id',
      'Employee with ID %s references non-existent agency %s',
      result,
      true  // Allow null references
    );
    
    return result;
  }
  
  /**
   * Helper method to validate references between collections
   * 
   * @param sourceCollection Collection with references
   * @param targetCollection Collection being referenced
   * @param sourceField Field in source containing reference
   * @param targetField Field in target to match reference against
   * @param errorMsg Error message format (with %s placeholders)
   * @param result Results object to append errors/warnings to
   * @param allowNull Whether null references are allowed
   */
  private validateReferences<S, T>(
    sourceCollection: { getItems(): S[] },
    targetCollection: { getItems(): T[] },
    sourceField: keyof S,
    targetField: keyof T,
    errorMsg: string,
    result: { status: boolean; warnings: string[]; errors: string[] },
    allowNull: boolean = false
  ): void {
    // Build an array of all target IDs for faster lookups
    const targetIds: Record<string, boolean> = {};
    for (const target of targetCollection.getItems()) {
      const id = target[targetField] as unknown as string;
      targetIds[id] = true;
    }
    
    // Check each source item's reference
    for (const source of sourceCollection.getItems()) {
      const refValue = source[sourceField] as unknown as string | undefined;
      
      // Skip null references if they're allowed
      if (allowNull && refValue === undefined) {
        continue;
      }
      
      if (refValue !== undefined && !targetIds[refValue]) {
        // Reference not found in target collection
        if (
          sourceField === 'commandeId' || 
          sourceField === 'produitId' || 
          sourceField === 'fournisseurId'
        ) {
          // For these fields, we use a different error message format
          result.warnings.push(
            errorMsg.replace('%s', refValue)
          );
        } else {
          result.warnings.push(
            errorMsg.replace('%s', (source as any).id || 'unknown').replace('%s', refValue)
          );
        }
        result.status = false;
      }
    }
  }
  
  /**
   * Get data statistics for all sources
   * 
   * @returns Statistics about the integrated data
   */
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
   * Helper method to count items by source system
   * 
   * @param collection Data collection
   * @param key Stats key to update
   * @param stats Stats object to update
   */
  private countBySource(
    collection: { getItems(): { sourceSystem: string }[] },
    key: string,
    stats: Record<string, Record<string, number>>
  ): void {
    for (const item of collection.getItems()) {
      if (stats[item.sourceSystem] && stats[item.sourceSystem][key] !== undefined) {
        stats[item.sourceSystem][key]++;
      }
    }
  }
  
  /**
   * Find possible duplicate clients across data sources
   * 
   * @returns List of potential duplicate clients
   */
  public async findPotentialDuplicateClients(): Promise<Array<{
    client1: Client;
    client2: Client;
    nameSimilarity: number;
    emailMatch: boolean;
    phoneMatch: boolean;
    confidenceScore: number;
  }>> {
    const clients = (await this.getClients()).getItems();
    const potentialDuplicates = [];
    
    // Compare each client with every other client
    for (let i = 0; i < clients.length; i++) {
      for (let j = i + 1; j < clients.length; j++) {
        const client1 = clients[i];
        const client2 = clients[j];
        
        // Skip if from the same source system (internal duplicates should be handled by the source systems)
        if (client1.sourceSystem === client2.sourceSystem) {
          continue;
        }
        
        // Check for similarity in name
        const nameSimilarity = this.calculateStringSimilarity(
          this.normalizeString(client1.nomComplet),
          this.normalizeString(client2.nomComplet)
        );
        
        // Check for exact email match if available
        let emailMatch = false;
        if (client1.emailContact && client2.emailContact) {
          emailMatch = client1.emailContact.toLowerCase() === client2.emailContact.toLowerCase();
        }
        
        // Check for phone match if available
        let phoneMatch = false;
        if (client1.numeroTelephone && client2.numeroTelephone) {
          const phone1 = client1.numeroTelephone.replace(/[^0-9]/g, '');
          const phone2 = client2.numeroTelephone.replace(/[^0-9]/g, '');
          phoneMatch = phone1 === phone2 && phone1.length > 0;
        }
        
        // Consider as potential duplicate if name is very similar or email/phone matches
        if (nameSimilarity > 0.8 || emailMatch || phoneMatch) {
          potentialDuplicates.push({
            client1,
            client2,
            nameSimilarity,
            emailMatch,
            phoneMatch,
            confidenceScore: this.calculateConfidenceScore(nameSimilarity, emailMatch, phoneMatch)
          });
        }
      }
    }
    
    // Sort by confidence score (descending)
    potentialDuplicates.sort((a, b) => b.confidenceScore - a.confidenceScore);
    
    return potentialDuplicates;
  }
  
  /**
   * Calculate string similarity using Levenshtein distance
   * 
   * @param str1 First string
   * @param str2 Second string
   * @returns Similarity score (0-1)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (!str1 && !str2) {
      return 1.0; // Both empty means they're identical
    }
    
    if (!str1 || !str2) {
      return 0.0; // One empty and one not means completely different
    }
    
    const levDistance = this.levenshteinDistance(str1, str2);
    const maxLen = Math.max(str1.length, str2.length);
    
    // Convert to similarity score (0-1)
    return 1 - (levDistance / maxLen);
  }
  
  /**
   * Calculate Levenshtein distance between two strings
   * 
   * @param str1 First string
   * @param str2 Second string
   * @returns Edit distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    
    // Create a matrix of size (m+1) x (n+1)
    const dp: number[][] = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));
    
    // Fill the first row and column
    for (let i = 0; i <= m; i++) {
      dp[i][0] = i;
    }
    
    for (let j = 0; j <= n; j++) {
      dp[0][j] = j;
    }
    
    // Fill the rest of the matrix
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,      // Deletion
          dp[i][j - 1] + 1,      // Insertion
          dp[i - 1][j - 1] + cost // Substitution
        );
      }
    }
    
    return dp[m][n];
  }
  
  /**
   * Normalize a string for comparison
   * 
   * @param str Input string
   * @returns Normalized string
   */
  private normalizeString(str: string): string {
    if (!str) return '';
    
    // Convert to lowercase
    str = str.toLowerCase();
    // Remove extra whitespace
    str = str.replace(/\s+/g, ' ').trim();
    // Remove accents
    str = this.removeAccents(str);
    
    return str;
  }
  
  /**
   * Remove accents from a string
   * 
   * @param str Input string
   * @returns String without accents
   */
  private removeAccents(str: string): string {
    // Simple accent replacement for common Latin characters
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
  
  /**
   * Calculate confidence score for duplicate detection
   * 
   * @param nameSimilarity Name similarity score (0-1)
   * @param emailMatch True if emails match
   * @param phoneMatch True if phones match
   * @returns Confidence score (0-1)
   */
  private calculateConfidenceScore(
    nameSimilarity: number,
    emailMatch: boolean,
    phoneMatch: boolean
  ): number {
    // Email is stronger indicator than phone, which is stronger than name similarity
    let score = nameSimilarity * 0.5; // Name contributes 50% max
    
    if (emailMatch) {
      score += 0.3; // Email match adds 30%
    }
    
    if (phoneMatch) {
      score += 0.2; // Phone match adds 20%
    }
    
    return Math.min(1.0, score); // Ensure score doesn't exceed 1
  }
}