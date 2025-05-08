/**
 * OntologyMapping.ts
 * Implements semantic integration through ontology mapping
 * as described in the course material
 */

/**
 * Types of semantic relationships between concepts
 * As defined in the course in "Types of relations sémantiques"
 */
export enum SemanticRelationshipType {
  IDENTICAL = 'identical',       // Same constructor, same concept
  EQUIVALENT = 'equivalent',     // Different constructors, same concept
  COMPATIBLE = 'compatible',     // Neither identical nor equivalent, but compatible
  INCOMPATIBLE = 'incompatible'  // Contradictory concepts
}

/**
 * Core ontology concept interface
 * Represents a concept in the domain ontology
 */
export interface OntologyConcept {
  id: string;
  name: string;
  description?: string;
  properties?: string[];
}

/**
 * Semantic mapping between source and global concepts
 * Implements the mapping function M in the formal framework (G,S,M)
 */
export interface OntologyMapping {
  sourceConcept: string;
  globalConcept: string;
  sourceSystem: string;
  relationship: SemanticRelationshipType;
  confidence: number; // 0 to 1
  mappedProperties?: PropertyMapping[];
}

/**
 * Property mapping between source and global concept properties
 */
export interface PropertyMapping {
  sourceProperty: string;
  globalProperty: string;
  transformation?: string; // Optional transformation expression
}

/**
 * Context information for a concept
 * Addresses the "Conflits de contexte" mentioned in the course
 */
export interface ConceptContext {
  conceptId: string;
  constraints: string[];
  scope: string;
  applicabilityCondition?: string;
}

/**
 * Manages ontology mappings for semantic integration
 */
export class OntologyMappingService {
  private concepts: Map<string, OntologyConcept> = new Map();
  private mappings: OntologyMapping[] = [];
  private contexts: Map<string, ConceptContext> = new Map();
  
  /**
   * Register a concept in the ontology
   * 
   * @param concept The concept to register
   */
  public registerConcept(concept: OntologyConcept): void {
    this.concepts.set(concept.id, concept);
  }
  
  /**
   * Register a mapping between source and global concepts
   * 
   * @param mapping The mapping to register
   */
  public registerMapping(mapping: OntologyMapping): void {
    this.mappings.push(mapping);
  }
  
  /**
   * Register context information for a concept
   * 
   * @param context The context information
   */
  public registerContext(context: ConceptContext): void {
    this.contexts.set(context.conceptId, context);
  }
  
  /**
   * Get the global concept for a source concept
   * 
   * @param sourceConceptId Source concept ID
   * @param sourceSystem Source system identifier
   * @returns The mapped global concept or undefined if not found
   */
  public getGlobalConcept(sourceConceptId: string, sourceSystem: string): OntologyConcept | undefined {
    const mapping = this.mappings.find(m => 
      m.sourceConcept === sourceConceptId && 
      m.sourceSystem === sourceSystem
    );
    
    if (!mapping) return undefined;
    
    return this.concepts.get(mapping.globalConcept);
  }
  
  /**
   * Get all source concepts mapped to a global concept
   * 
   * @param globalConceptId Global concept ID
   * @returns Array of mappings to the global concept
   */
  public getSourceMappings(globalConceptId: string): OntologyMapping[] {
    return this.mappings.filter(m => m.globalConcept === globalConceptId);
  }
  
  /**
   * Check if two concepts are semantically compatible
   * 
   * @param concept1Id First concept ID
   * @param concept2Id Second concept ID
   * @returns Whether the concepts are compatible
   */
  public areConceptsCompatible(concept1Id: string, concept2Id: string): boolean {
    const mapping = this.mappings.find(m => 
      m.sourceConcept === concept1Id && 
      m.globalConcept === concept2Id
    );
    
    if (!mapping) return false;
    
    return mapping.relationship === SemanticRelationshipType.IDENTICAL ||
           mapping.relationship === SemanticRelationshipType.EQUIVALENT ||
           mapping.relationship === SemanticRelationshipType.COMPATIBLE;
  }
  
  /**
   * Translate a source property to a global property
   * 
   * @param sourceConceptId Source concept ID
   * @param sourceProperty Source property name
   * @param sourceSystem Source system identifier
   * @returns The mapped global property name or the original if not found
   */
  public translateProperty(
    sourceConceptId: string, 
    sourceProperty: string,
    sourceSystem: string
  ): string {
    const mapping = this.mappings.find(m => 
      m.sourceConcept === sourceConceptId && 
      m.sourceSystem === sourceSystem
    );
    
    if (!mapping || !mapping.mappedProperties) return sourceProperty;
    
    const propertyMapping = mapping.mappedProperties.find(p => 
      p.sourceProperty === sourceProperty
    );
    
    if (!propertyMapping) return sourceProperty;
    
    return propertyMapping.globalProperty;
  }
  
  /**
   * Apply semantic context rules to an entity
   * Handles the context conflicts described in the course
   * 
   * @param entity The entity to process
   * @param conceptId The concept ID for the entity
   * @returns Processed entity with context rules applied
   */
  public applyContextRules(entity: any, conceptId: string): any {
    const context = this.contexts.get(conceptId);
    if (!context) return entity;
    
    // Here we would implement context-specific rules
    // For example, unit conversions, regional formatting, etc.
    
    // Simple example: if price is only valid for new products in a context
    if (context.conceptId === 'Product' && 
        context.applicabilityCondition === 'newProductsOnly') {
      if (entity.condition !== 'new') {
        entity.price = undefined; // Remove price for non-new products
      }
    }
    
    return entity;
  }
}

/**
 * Initialize ontology with common e-commerce concepts for our data sources
 */
export function initializeECommerceOntology(): OntologyMappingService {
  const service = new OntologyMappingService();
  
  // Register global concepts
  service.registerConcept({
    id: 'Client',
    name: 'Client',
    description: 'A customer who makes purchases',
    properties: ['id', 'name', 'email', 'address', 'phoneNumber']
  });
  
  service.registerConcept({
    id: 'Product',
    name: 'Product',
    description: 'An item available for purchase',
    properties: ['id', 'name', 'description', 'price', 'category']
  });
  
  service.registerConcept({
    id: 'Order',
    name: 'Order',
    description: 'A purchase transaction',
    properties: ['id', 'date', 'client', 'products', 'totalAmount', 'status']
  });
  
  // Register mappings for SQL source
  service.registerMapping({
    sourceConcept: 'Clients',
    globalConcept: 'Client',
    sourceSystem: 'SQL',
    relationship: SemanticRelationshipType.EQUIVALENT,
    confidence: 1.0,
    mappedProperties: [
      { sourceProperty: 'id_client', globalProperty: 'id' },
      { sourceProperty: 'nom_complet', globalProperty: 'name' },
      { sourceProperty: 'email_contact', globalProperty: 'email' },
      { sourceProperty: 'adresse', globalProperty: 'address' },
      { sourceProperty: 'numero_telephone', globalProperty: 'phoneNumber' }
    ]
  });
  
  // Register mappings for Neo4J source
  service.registerMapping({
    sourceConcept: 'Client',
    globalConcept: 'Client',
    sourceSystem: 'NEO4J',
    relationship: SemanticRelationshipType.IDENTICAL,
    confidence: 1.0,
    mappedProperties: [
      { sourceProperty: 'id_client', globalProperty: 'id' },
      { sourceProperty: 'nom', globalProperty: 'name' },
      { sourceProperty: 'email', globalProperty: 'email' },
      { sourceProperty: 'adresse', globalProperty: 'address' },
      { sourceProperty: 'telephone', globalProperty: 'phoneNumber' }
    ]
  });
  
  // Register mappings for XML source
  service.registerMapping({
    sourceConcept: 'client',
    globalConcept: 'Client',
    sourceSystem: 'XML',
    relationship: SemanticRelationshipType.COMPATIBLE,
    confidence: 0.9,
    mappedProperties: [
      { sourceProperty: 'id', globalProperty: 'id' },
      { sourceProperty: 'nom', globalProperty: 'name' },
      { sourceProperty: 'courriel', globalProperty: 'email' },
      { sourceProperty: 'telephone', globalProperty: 'phoneNumber' }
    ]
  });
  
  // Register context information
  service.registerContext({
    conceptId: 'Product',
    constraints: ['price > 0'],
    scope: 'global',
    applicabilityCondition: 'all'
  });
  
  return service;
}