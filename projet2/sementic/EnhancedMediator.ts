/**
 * EnhancedMediator.ts
 * Extended mediator with advanced capabilities from course material
 */

import { IAdapter, QueryFilter } from '../integration/src/adapters/IAdapter';
import { SourceDescription } from '../integration/src/common/SourceDescription';

// Import collections and models from DataModel
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
} from '../integration/src/common/DataModel';

// Import our new components
import { calculateJaccardSimilarity, calculateBestSimilarity } from './utils/SimilarityUtils';
import { OntologyMappingService, initializeECommerceOntology } from './ontology/OntologyMapping';
import { CostBasedQueryOptimizer, ExecutionPlan } from './optimization/CostBasedQueryOptimizer';

/**
 * Enhanced mediator integrates all three course recommendations:
 * 1. Entity Resolution
 * 2. Semantic Integration
 * 3. Cost-based Query Optimization
 * 
 * This class wraps the standard mediator to add these capabilities
 */
export class EnhancedMediator {
  // The existing mediator object to wrap
  private mediator: any;
  
  // New components from our recommendations
  private ontologyService: OntologyMappingService;
  private queryOptimizer: CostBasedQueryOptimizer;
  
  /**
   * Constructor
   * 
   * @param mediator The original mediator to enhance
   */
  constructor(mediator: any) {
    this.mediator = mediator;
    
    // Initialize the ontology service for semantic integration
    this.ontologyService = initializeECommerceOntology();
    
    // Initialize the query optimizer for cost-based optimization
    this.queryOptimizer = new CostBasedQueryOptimizer();
    this.queryOptimizer.initializeWithDefaults();
    
    // Add enhanced methods to the mediator
    this.enhanceMediator();
  }
  
  /**
   * Enhance the mediator with new capabilities
   */
  private enhanceMediator(): void {
    // Store original method references
    const originalGetClients = this.mediator.getClients.bind(this.mediator);
    const originalGetEmployees = this.mediator.getEmployees.bind(this.mediator);
    const originalGetFournisseurs = this.mediator.getFournisseurs.bind(this.mediator);
    const originalGetProduits = this.mediator.getProduits.bind(this.mediator);
    const originalGetCommandes = this.mediator.getCommandes.bind(this.mediator);
    
    // Override the methods with enhanced versions
    this.mediator.getClients = async (filter?: QueryFilter): Promise<ClientCollection> => {
      // Apply cost-based optimization
      const optimizedFilter = await this.optimizeQuery(filter, 'clients');
      
      // Get results using the original method
      const results = await originalGetClients(optimizedFilter);
      
      // Apply entity resolution and semantic integration
      return this.processResults('clients', results);
    };
    
    this.mediator.getEmployees = async (filter?: QueryFilter): Promise<EmployeeCollection> => {
      // Apply cost-based optimization
      const optimizedFilter = await this.optimizeQuery(filter, 'employees');
      
      // Get results using the original method
      const results = await originalGetEmployees(optimizedFilter);
      
      // Apply entity resolution and semantic integration
      return this.processResults('employees', results);
    };
    
    this.mediator.getFournisseurs = async (filter?: QueryFilter): Promise<FournisseurCollection> => {
      // Apply cost-based optimization
      const optimizedFilter = await this.optimizeQuery(filter, 'fournisseurs');
      
      // Get results using the original method
      const results = await originalGetFournisseurs(optimizedFilter);
      
      // Apply entity resolution and semantic integration
      return this.processResults('fournisseurs', results);
    };
    
    this.mediator.getProduits = async (filter?: QueryFilter): Promise<ProduitCollection> => {
      // Apply cost-based optimization
      const optimizedFilter = await this.optimizeQuery(filter, 'produits');
      
      // Get results using the original method
      const results = await originalGetProduits(optimizedFilter);
      
      // Apply entity resolution and semantic integration
      return this.processResults('produits', results);
    };
    
    this.mediator.getCommandes = async (filter?: QueryFilter): Promise<CommandeCollection> => {
      // Apply cost-based optimization
      const optimizedFilter = await this.optimizeQuery(filter, 'commandes');
      
      // Get results using the original method
      const results = await originalGetCommandes(optimizedFilter);
      
      // Apply entity resolution and semantic integration
      return this.processResults('commandes', results);
    };
  }
  
  /**
   * Apply cost-based query optimization
   * Implementation of recommendation #3
   * 
   * @param filter Original query filter
   * @param entityName Entity name being queried
   * @returns Optimized query filter
   */
  private async optimizeQuery(
    filter: QueryFilter | undefined, 
    entityName: string
  ): Promise<QueryFilter | undefined> {
    if (!filter) return filter;
    
    try {
      const adapters = this.mediator.getConnectedAdapters();
      
      if (!adapters || adapters.length === 0) {
        return filter;
      }
      
      // Use the query optimizer to find the best execution strategy
      const plan = this.queryOptimizer.optimizeQuery(filter, entityName, adapters);
      console.log(`Optimized query for ${entityName} with plan:`, 
        JSON.stringify(plan, (key, value) => key === 'sourceDistribution' ? 
          Array.from(value.entries()) : value, 2));
      
      // Modify the filter based on the plan
      // For example, we might add hints about which sources to prioritize
      // or optimize the order of operations
      const optimizedFilter: QueryFilter = { ...filter };
      
      // Add a parameter indicating the source distribution from the plan
      if (!optimizedFilter.parameters) {
        optimizedFilter.parameters = {};
      }
      optimizedFilter.parameters.sourceDistribution = 
        Array.from(plan.sourceDistribution.entries());
      
      // Potentially reorder operations for better performance
      if (plan.operations.length > 1) {
        const operationOrder = plan.operations.map(op => op.type);
        optimizedFilter.parameters.operationOrder = operationOrder;
      }
      
      return optimizedFilter;
    } catch (error) {
      console.error(`Error optimizing query for ${entityName}:`, error);
      // If optimization fails, return the original filter
      return filter;
    }
  }
  
  /**
   * Apply entity resolution and semantic integration to query results
   * Implementation of recommendations #1 and #2
   * 
   * @param entityType Type of entity
   * @param data Collection of entities to process
   * @returns Processed data with duplicates resolved and semantics integrated
   */
  public processResults(entityType: string, data: any): any {
    // Check if data has getItems() method (is a collection)
    if (data && typeof data.getItems === 'function') {
      // Get items from collection
      const items = data.getItems();
      
      // Apply entity resolution
      const resolvedItems = this.resolveEntities(entityType, items);
      
      // Apply semantic integration
      const semanticItems = this.applySemanticIntegration(entityType, resolvedItems);
      
      // If items were processed (merged or transformed), update the collection
      if (resolvedItems.length !== items.length || semanticItems !== resolvedItems) {
        // Create a new collection with the same type
        const newCollection = Object.create(Object.getPrototypeOf(data));
        
        // Initialize it (assuming constructor takes no arguments)
        Object.getPrototypeOf(data).constructor.call(newCollection);
        
        // Add resolved and semantically enhanced items to the new collection
        for (const item of semanticItems) {
          newCollection.addItem(item);
        }
        
        console.log(`Processed ${items.length} items into ${semanticItems.length} resolved items`);
        return newCollection;
      }
    }
    
    // If no resolution was needed or possible, return original data
    return data;
  }
  
  /**
   * Resolve entities from different sources by detecting and merging duplicates
   * Implementation of recommendation #1 - Entity Resolution
   * 
   * @param entityType Type of entity to resolve
   * @param entities Array of entities from different sources
   * @returns Array of resolved entities with duplicates merged
   */
  private resolveEntities<T extends { sourceSystem: string }>(entityType: string, entities: T[]): T[] {
    if (!entities || entities.length <= 1) {
      return entities;
    }
    
    console.log(`Resolving ${entities.length} ${entityType} entities...`);
    
    // Group entities by source system
    const entitiesBySource: Record<string, T[]> = {};
    for (const entity of entities) {
      if (!entitiesBySource[entity.sourceSystem]) {
        entitiesBySource[entity.sourceSystem] = [];
      }
      entitiesBySource[entity.sourceSystem].push(entity);
    }
    
    // If only one source system, no resolution needed
    if (Object.keys(entitiesBySource).length <= 1) {
      return entities;
    }
    
    // Configure similarity threshold based on entity type
    const similarityThresholds: Record<string, number> = {
      'clients': 0.8,
      'fournisseurs': 0.8,
      'produits': 0.75,
      'employees': 0.85,
      'default': 0.8
    };
    
    const similarityThreshold = similarityThresholds[entityType] || similarityThresholds['default'];
    const resolvedEntities: T[] = [...entities]; // Start with all entities
    const mergedEntityIndices: Set<number> = new Set(); // Track indices of merged entities
    
    // Select fields for comparison based on entity type
    const comparisonFields: Record<string, string[]> = {
      'clients': ['nomComplet', 'emailContact', 'numeroTelephone'],
      'fournisseurs': ['nomFournisseur', 'adresse', 'numeroTelephone'],
      'produits': ['description', 'categorie'],
      'employees': ['nomComplet', 'email', 'poste'],
      'default': []
    };
    
    const fieldsToCompare = comparisonFields[entityType] || comparisonFields['default'];
    if (fieldsToCompare.length === 0) {
      // If no specific fields defined for this entity type, don't attempt resolution
      return entities;
    }
    
    // Compare each pair of entities from different sources
    for (let i = 0; i < resolvedEntities.length; i++) {
      // Skip if this entity has been merged already
      if (mergedEntityIndices.has(i)) continue;
      
      const entityA = resolvedEntities[i];
      
      for (let j = i + 1; j < resolvedEntities.length; j++) {
        // Skip if this entity has been merged already
        if (mergedEntityIndices.has(j)) continue;
        
        const entityB = resolvedEntities[j];
        
        // Only compare entities from different sources
        if (entityA.sourceSystem === entityB.sourceSystem) continue;
        
        // Calculate similarity score based on specified fields
        let totalSimilarity = 0;
        let fieldsCompared = 0;
        
        for (const field of fieldsToCompare) {
          const valueA = (entityA as any)[field];
          const valueB = (entityB as any)[field];
          
          // Skip undefined or null values
          if (!valueA || !valueB) continue;
          
          // Use best similarity measure for string comparisons
          // This implements the formula from the course: | σ1 inter σ2|/ |σ union σ2|
          const similarity = calculateBestSimilarity(valueA.toString(), valueB.toString());
          totalSimilarity += similarity;
          fieldsCompared++;
        }
        
        // Calculate average similarity if we compared any fields
        const avgSimilarity = fieldsCompared > 0 ? totalSimilarity / fieldsCompared : 0;
        
        // If similarity is above threshold, merge the entities
        if (avgSimilarity >= similarityThreshold) {
          console.log(`Found similar entities with score ${avgSimilarity.toFixed(2)}: `, 
            entityA, entityB);
          
          // Merge entityB into entityA (keep entityA)
          for (const field of fieldsToCompare) {
            // If entityA is missing a value that entityB has, copy it
            if (!(entityA as any)[field] && (entityB as any)[field]) {
              (entityA as any)[field] = (entityB as any)[field];
            }
          }
          
          // Mark entityB as merged so we don't include it in final results
          mergedEntityIndices.add(j);
        }
      }
    }
    
    // Filter out merged entities
    const result = resolvedEntities.filter((_, index) => !mergedEntityIndices.has(index));
    console.log(`Entity resolution complete. Merged ${entities.length - result.length} entities.`);
    
    return result;
  }
  
  /**
   * Apply semantic integration to processed entities
   * Implementation of recommendation #2 - Semantic Integration
   * 
   * @param entityType Type of entity
   * @param entities Array of entities to process
   * @returns Semantically enhanced entities
   */
  private applySemanticIntegration(entityType: string, entities: any[]): any[] {
    if (!entities || entities.length === 0) {
      return entities;
    }
    
    console.log(`Applying semantic integration to ${entities.length} ${entityType} entities...`);
    
    // Map entity types to global ontology concepts
    const entityToConceptMap: Record<string, string> = {
      'clients': 'Client',
      'fournisseurs': 'Supplier',
      'produits': 'Product',
      'commandes': 'Order',
      'employees': 'Employee'
    };
    
    const globalConcept = entityToConceptMap[entityType] || entityType;
    
    // Apply context rules from ontology
    const semanticEntities = entities.map(entity => {
      // Apply context rules based on global concept
      return this.ontologyService.applyContextRules(entity, globalConcept);
    });
    
    return semanticEntities;
  }
  
  /**
   * Get the underlying mediator
   * 
   * @returns Original mediator instance
   */
  public getMediator(): any {
    return this.mediator;
  }
}

/**
 * Factory method to create an enhanced mediator
 * 
 * @param mediator Original mediator to enhance
 * @returns Enhanced mediator with additional capabilities
 */
export function enhanceMediator(mediator: any): EnhancedMediator {
  return new EnhancedMediator(mediator);
}