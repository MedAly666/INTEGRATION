/**
 * SourceDescription.ts
 * Formal description of data source capabilities and content
 * This follows the formal framework for data integration described in the course materials
 */

/**
 * Entity availability in a data source with completeness information
 */
export interface EntityAvailability {
  entityName: string;       // Name of the entity (e.g., "clients", "products")
  isComplete: boolean;      // Whether this source contains all possible instances
  attributes: string[];     // Available attributes for this entity
  constraints?: string[];   // Additional constraints on this entity data
}

/**
 * Describes the capabilities of a data source
 */
export interface SourceCapabilities {
  canFilter: boolean;       // Can the source filter data?
  canProject: boolean;      // Can the source select specific columns?
  canSort: boolean;         // Can the source sort results?
  canJoin: boolean;         // Can the source perform joins?
  canAggregate: boolean;    // Can the source perform aggregation operations?
  maxComplexity?: number;   // Optional complexity rating (1-10)
}

/**
 * Complete description of a data source for the mediator
 * Following the formal data integration framework: (G,S,M)
 * where S represents the source schema
 */
export class SourceDescription {
  private sourceId: string;
  private sourceName: string;
  private entities: EntityAvailability[];
  private capabilities: SourceCapabilities;
  
  constructor(
    sourceId: string,
    sourceName: string,
    entities: EntityAvailability[],
    capabilities: SourceCapabilities
  ) {
    this.sourceId = sourceId;
    this.sourceName = sourceName;
    this.entities = entities;
    this.capabilities = capabilities;
  }
  
  /**
   * Check if the source contains a specific entity
   */
  public hasEntity(entityName: string): boolean {
    return this.entities.some(entity => entity.entityName.toLowerCase() === entityName.toLowerCase());
  }
  
  /**
   * Get availability information for a specific entity
   */
  public getEntityAvailability(entityName: string): EntityAvailability | undefined {
    return this.entities.find(entity => entity.entityName.toLowerCase() === entityName.toLowerCase());
  }
  
  /**
   * Check if the source can handle a specific capability
   */
  public hasCapability(capability: keyof SourceCapabilities): boolean {
    return this.capabilities[capability] === true;
  }
  
  /**
   * Get all entity names available in this source
   */
  public getEntityNames(): string[] {
    return this.entities.map(entity => entity.entityName);
  }
  
  /**
   * Get source identifier
   */
  public getSourceId(): string {
    return this.sourceId;
  }
  
  /**
   * Get source name
   */
  public getSourceName(): string {
    return this.sourceName;
  }
  
  /**
   * Get source capabilities
   */
  public getCapabilities(): SourceCapabilities {
    return { ...this.capabilities };
  }
  
  /**
   * Get all entity availability information
   */
  public getAllEntities(): EntityAvailability[] {
    return [...this.entities];
  }
}