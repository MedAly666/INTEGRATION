/**
 * CostBasedQueryOptimizer.ts
 * Implements cost-based query optimization for the mediator
 * as described in the course material
 */

import { IAdapter, QueryFilter } from '../../integration/src/adapters/IAdapter';
import { SourceDescription } from '../../integration/src/common/SourceDescription';

/**
 * Statistics for a data entity
 * Used for cost estimation
 */
export interface EntityStatistics {
  entityName: string;
  rowCount: number;
  avgRowSize: number;
  distinctValues?: Map<string, number>;
  indices?: string[];
}

/**
 * Network statistics for a source
 * Used to estimate communication costs
 */
export interface NetworkStats {
  avgLatency: number;    // milliseconds
  bandwidth: number;     // KB/s
  reliability: number;   // 0-1 scale
}

/**
 * Cost components for a query execution plan
 */
export interface QueryCost {
  ioReadCost: number;
  cpuProcessingCost: number;
  communicationCost: number;
  totalCost: number;
}

/**
 * Represents an operation in a query execution plan
 */
export interface PlanOperation {
  type: 'SELECT' | 'PROJECT' | 'JOIN' | 'SORT' | 'AGGREGATE' | 'FILTER';
  sourceSystem?: string;
  entityName?: string;
  attributes?: string[];
  condition?: any;
  children?: PlanOperation[];
  estimatedCost?: QueryCost;
  estimatedRows?: number;
}

/**
 * A complete query execution plan
 */
export interface ExecutionPlan {
  operations: PlanOperation[];
  totalCost: QueryCost;
  estimatedRows: number;
  sourceDistribution: Map<string, number>; // Percentage of work per source
}

/**
 * Manages cost-based query optimization
 * Based on the section "Modèles de coût" from the course
 */
export class CostBasedQueryOptimizer {
  private sourceStatistics: Map<string, Map<string, EntityStatistics>> = new Map();
  private networkStats: Map<string, NetworkStats> = new Map();
  
  // Cost weights for different operations
  private static readonly CPU_COST_WEIGHT = 0.2;
  private static readonly IO_COST_WEIGHT = 0.5;
  private static readonly NETWORK_COST_WEIGHT = 0.3;
  
  // Join cost factors by type
  private static readonly JOIN_COST_FACTORS = {
    NESTED_LOOP: 10,
    HASH_JOIN: 3,
    MERGE_JOIN: 2
  };
  
  /**
   * Add statistics for an entity in a source
   * 
   * @param sourceSystem Source system identifier
   * @param stats Entity statistics
   */
  public addEntityStatistics(sourceSystem: string, stats: EntityStatistics): void {
    if (!this.sourceStatistics.has(sourceSystem)) {
      this.sourceStatistics.set(sourceSystem, new Map());
    }
    
    this.sourceStatistics.get(sourceSystem)?.set(stats.entityName, stats);
  }
  
  /**
   * Add network statistics for a source
   * 
   * @param sourceSystem Source system identifier
   * @param stats Network statistics
   */
  public addNetworkStats(sourceSystem: string, stats: NetworkStats): void {
    this.networkStats.set(sourceSystem, stats);
  }
  
  /**
   * Optimize a query based on cost model
   * 
   * @param filter Query filter to optimize
   * @param entityName Entity name being queried
   * @param adapters Available adapters
   * @returns Optimized execution plan
   */
  public optimizeQuery(
    filter: QueryFilter, 
    entityName: string, 
    adapters: IAdapter[]
  ): ExecutionPlan {
    console.log(`Optimizing query for ${entityName}`);
    
    // 1. Identify capable sources for this query
    const capableSources = this.identifyCapableSources(filter, entityName, adapters);
    
    // 2. Generate alternative execution plans
    const plans = this.generateExecutionPlans(filter, entityName, capableSources);
    
    // 3. Estimate cost for each plan
    for (const plan of plans) {
      this.estimatePlanCost(plan, filter);
    }
    
    // 4. Select the plan with the lowest cost
    const optimalPlan = this.selectOptimalPlan(plans);
    
    console.log(`Selected optimal plan with cost: ${optimalPlan.totalCost.totalCost}`);
    
    return optimalPlan;
  }
  
  /**
   * Identify which sources can handle a query
   * 
   * @param filter Query filter
   * @param entityName Entity name
   * @param adapters Available adapters
   * @returns Adapters capable of handling the query
   */
  private identifyCapableSources(
    filter: QueryFilter, 
    entityName: string, 
    adapters: IAdapter[]
  ): IAdapter[] {
    const capableSources: IAdapter[] = [];
    
    for (const adapter of adapters) {
      if (adapter.canHandleQuery(filter, entityName)) {
        capableSources.push(adapter);
      }
    }
    
    return capableSources;
  }
  
  /**
   * Generate alternative execution plans
   * 
   * @param filter Query filter
   * @param entityName Entity name
   * @param adapters Capable adapters
   * @returns Array of execution plans
   */
  private generateExecutionPlans(
    filter: QueryFilter, 
    entityName: string, 
    adapters: IAdapter[]
  ): ExecutionPlan[] {
    const plans: ExecutionPlan[] = [];
    
    // For each adapter, generate a basic plan that executes the query on that source
    for (const adapter of adapters) {
      const sourceSystem = adapter.getSourceSystem();
      
      // Create operations for this plan
      const operations: PlanOperation[] = [];
      
      // Add filter operation if conditions exist
      if (filter.conditions && filter.conditions.length > 0) {
        operations.push({
          type: 'FILTER',
          sourceSystem,
          entityName,
          condition: filter.conditions
        });
      }
      
      // Add projection operation if projections exist
      if (filter.projections && filter.projections.length > 0) {
        operations.push({
          type: 'PROJECT',
          sourceSystem,
          entityName,
          attributes: filter.projections
        });
      }
      
      // Add sort operation if orderBy exists
      if (filter.orderBy && filter.orderBy.length > 0) {
        operations.push({
          type: 'SORT',
          sourceSystem,
          entityName,
          attributes: filter.orderBy.map(o => o.column)
        });
      }
      
      // If there are joins, add join operations
      if (filter.joins && filter.joins.length > 0) {
        for (const join of filter.joins) {
          operations.push({
            type: 'JOIN',
            sourceSystem,
            entityName: `${entityName}_${join.table}`, // Simplified representation
            condition: join.on
          });
        }
      }
      
      // Create the plan with 100% work on this source
      const sourceDistribution = new Map<string, number>();
      sourceDistribution.set(sourceSystem, 100);
      
      plans.push({
        operations,
        totalCost: { ioReadCost: 0, cpuProcessingCost: 0, communicationCost: 0, totalCost: 0 },
        estimatedRows: 0,
        sourceDistribution
      });
    }
    
    // If we have multiple sources, also create hybrid plans that distribute work
    if (adapters.length > 1) {
      // This is a simplification - in a real system we would generate more sophisticated
      // hybrid plans based on join strategies, different ways to split the query, etc.
      
      // Example: If we have filtering and sorting, we could do filtering on source1 
      // and sorting on source2 if source1 is good at filtering but not sorting
      
      // For simplicity, we'll just create one hybrid plan that distributes work evenly
      if (adapters.length >= 2) {
        const hybridOperations: PlanOperation[] = [];
        const sourceDistribution = new Map<string, number>();
        
        // Distribute work evenly among sources
        const sourceShare = 100 / adapters.length;
        for (const adapter of adapters) {
          sourceDistribution.set(adapter.getSourceSystem(), sourceShare);
        }
        
        // Use first source for filtering
        if (filter.conditions && filter.conditions.length > 0) {
          hybridOperations.push({
            type: 'FILTER',
            sourceSystem: adapters[0].getSourceSystem(),
            entityName,
            condition: filter.conditions
          });
        }
        
        // Use second source for projection
        if (filter.projections && filter.projections.length > 0 && adapters.length > 1) {
          hybridOperations.push({
            type: 'PROJECT',
            sourceSystem: adapters[1].getSourceSystem(),
            entityName,
            attributes: filter.projections
          });
        }
        
        plans.push({
          operations: hybridOperations,
          totalCost: { ioReadCost: 0, cpuProcessingCost: 0, communicationCost: 0, totalCost: 0 },
          estimatedRows: 0,
          sourceDistribution
        });
      }
    }
    
    return plans;
  }
  
  /**
   * Estimate the cost of an execution plan
   * 
   * @param plan Execution plan to estimate
   * @param filter Original query filter
   */
  private estimatePlanCost(plan: ExecutionPlan, filter: QueryFilter): void {
    let ioReadCost = 0;
    let cpuProcessingCost = 0;
    let communicationCost = 0;
    let estimatedRows = this.estimateBaseRowCount(filter, plan);
    
    // Calculate cost for each operation
    for (const operation of plan.operations) {
      const sourceSystem = operation.sourceSystem || '';
      
      // Get source statistics
      const networkStat = this.networkStats.get(sourceSystem) || {
        avgLatency: 50, // Default 50ms latency
        bandwidth: 1000, // Default 1000 KB/s
        reliability: 0.95 // Default 95% reliability
      };
      
      // Estimate rows for this operation
      operation.estimatedRows = this.estimateOperationRows(operation, estimatedRows, filter);
      estimatedRows = operation.estimatedRows; // Update for next operation
      
      // Calculate IO cost based on row count and size
      const rowSize = this.estimateRowSize(operation.entityName || '', sourceSystem);
      const ioCost = operation.estimatedRows * rowSize * 
                     CostBasedQueryOptimizer.IO_COST_WEIGHT;
      
      // Calculate CPU cost based on operation type
      let cpuCost = operation.estimatedRows * CostBasedQueryOptimizer.CPU_COST_WEIGHT;
      
      // Adjust CPU cost based on operation type
      switch (operation.type) {
        case 'JOIN':
          cpuCost *= CostBasedQueryOptimizer.JOIN_COST_FACTORS.HASH_JOIN;
          break;
        case 'SORT':
          cpuCost *= Math.log2(operation.estimatedRows);
          break;
        case 'AGGREGATE':
          cpuCost *= 1.5;
          break;
      }
      
      // Calculate communication cost
      const commCost = operation.estimatedRows * rowSize / networkStat.bandwidth +
                      networkStat.avgLatency * (1 / networkStat.reliability);
      
      // Store costs in the operation
      operation.estimatedCost = {
        ioReadCost: ioCost,
        cpuProcessingCost: cpuCost,
        communicationCost: commCost,
        totalCost: ioCost + cpuCost + commCost
      };
      
      // Accumulate costs
      ioReadCost += ioCost;
      cpuProcessingCost += cpuCost;
      communicationCost += commCost;
    }
    
    // Set total costs in the plan
    plan.totalCost = {
      ioReadCost,
      cpuProcessingCost,
      communicationCost,
      totalCost: ioReadCost + cpuProcessingCost + communicationCost
    };
    
    plan.estimatedRows = estimatedRows;
  }
  
  /**
   * Estimate the number of rows for an operation
   * 
   * @param operation Plan operation
   * @param inputRows Number of input rows
   * @param filter Original query filter
   * @returns Estimated number of rows
   */
  private estimateOperationRows(
    operation: PlanOperation, 
    inputRows: number,
    filter: QueryFilter
  ): number {
    switch (operation.type) {
      case 'FILTER':
        // Estimate selectivity of filter conditions
        const selectivity = this.estimateFilterSelectivity(operation.condition, operation.entityName || '', operation.sourceSystem || '');
        return Math.max(1, Math.floor(inputRows * selectivity));
      
      case 'JOIN':
        // For joins, estimate based on foreign key relationships
        // This is a simplified model - real optimizers use more sophisticated methods
        return Math.floor(inputRows * 1.2); // Assume 20% growth in row count due to join
      
      case 'PROJECT':
        // Projection doesn't change row count
        return inputRows;
      
      case 'SORT':
        // Sorting doesn't change row count
        return inputRows;
      
      case 'AGGREGATE':
        // For aggregations, estimate based on GROUP BY columns
        if (filter.groupBy && filter.groupBy.length > 0) {
          // Estimate number of distinct values in GROUP BY columns
          const distinctGroups = this.estimateDistinctValues(filter.groupBy[0], operation.entityName || '', operation.sourceSystem || '');
          return Math.min(inputRows, distinctGroups);
        }
        return 1; // Default for aggregation without GROUP BY
      
      default:
        return inputRows;
    }
  }
  
  /**
   * Estimate the selectivity of a filter condition
   * 
   * @param condition Filter condition
   * @param entityName Entity name
   * @param sourceSystem Source system
   * @returns Selectivity factor (0-1)
   */
  private estimateFilterSelectivity(
    condition: any,
    entityName: string,
    sourceSystem: string
  ): number {
    // In a real system, we would use histogram data or other statistics
    // to estimate selectivity more accurately
    
    if (!condition) return 1.0;
    
    // If we have multiple conditions, multiply their selectivities
    if (Array.isArray(condition)) {
      let combinedSelectivity = 1.0;
      for (const cond of condition) {
        combinedSelectivity *= this.estimateFilterSelectivity(cond, entityName, sourceSystem);
      }
      return combinedSelectivity;
    }
    
    // For binary expressions, estimate based on operator and column
    if (condition.type === 'binary_expr') {
      const operator = condition.operator.toUpperCase();
      
      switch (operator) {
        case '=':
          // Equality is typically more selective
          return 0.1;
        case '>':
        case '<':
        case '>=':
        case '<=':
          // Range conditions are less selective
          return 0.3;
        case 'LIKE':
          // LIKE with wildcards is usually less selective
          if (typeof condition.right.value === 'string') {
            if (condition.right.value.includes('%')) {
              return 0.5; // Wildcard search is less selective
            }
          }
          return 0.1; // Exact LIKE is more selective
        case 'IN':
          // Selectivity depends on number of values in IN list
          if (Array.isArray(condition.right.value)) {
            return Math.min(0.9, condition.right.value.length * 0.1);
          }
          return 0.2;
        case 'IS NULL':
        case 'IS NOT NULL':
          return 0.5; // Typically around 50% of rows
        default:
          return 0.5; // Default selectivity for unknown operators
      }
    }
    
    // Default selectivity
    return 0.5;
  }
  
  /**
   * Estimate the number of distinct values for a column
   * 
   * @param column Column name
   * @param entityName Entity name
   * @param sourceSystem Source system
   * @returns Estimated number of distinct values
   */
  private estimateDistinctValues(
    column: string,
    entityName: string,
    sourceSystem: string
  ): number {
    // Check if we have statistics for this entity and column
    const entityStats = this.sourceStatistics.get(sourceSystem)?.get(entityName);
    if (entityStats?.distinctValues?.has(column)) {
      return entityStats.distinctValues.get(column) || 10;
    }
    
    // Default estimates based on column name patterns
    if (column.includes('id')) {
      return 1000; // IDs typically have high cardinality
    } else if (column.includes('type') || column.includes('status') || column.includes('category')) {
      return 10; // Type/status columns typically have low cardinality
    } else if (column.includes('date')) {
      return 100; // Date columns have medium cardinality
    }
    
    // Default estimate
    return 50;
  }
  
  /**
   * Estimate the average row size for an entity
   * 
   * @param entityName Entity name
   * @param sourceSystem Source system
   * @returns Estimated row size in bytes
   */
  private estimateRowSize(entityName: string, sourceSystem: string): number {
    // Check if we have statistics for this entity
    const entityStats = this.sourceStatistics.get(sourceSystem)?.get(entityName);
    if (entityStats?.avgRowSize) {
      return entityStats.avgRowSize;
    }
    
    // Default sizes based on entity name patterns
    if (entityName.toLowerCase().includes('detail')) {
      return 50; // Detail records are typically small
    } else if (entityName.toLowerCase().includes('commande') || entityName.toLowerCase().includes('order')) {
      return 200; // Orders have medium size
    } else if (entityName.toLowerCase().includes('facture') || entityName.toLowerCase().includes('invoice')) {
      return 300; // Invoices can be larger
    }
    
    // Default row size
    return 100;
  }
  
  /**
   * Estimate the base row count for a query
   * 
   * @param filter Query filter
   * @param plan Execution plan
   * @returns Estimated base row count
   */
  private estimateBaseRowCount(filter: QueryFilter, plan: ExecutionPlan): number {
    // If we have specific source statistics, use them
    if (plan.operations.length > 0) {
      const firstOp = plan.operations[0];
      const sourceSystem = firstOp.sourceSystem || '';
      const entityName = firstOp.entityName || '';
      
      const entityStats = this.sourceStatistics.get(sourceSystem)?.get(entityName);
      if (entityStats?.rowCount) {
        return entityStats.rowCount;
      }
    }
    
    // Default estimates based on entity type
    if (plan.operations.length > 0) {
      const entityName = plan.operations[0].entityName || '';
      
      if (entityName.toLowerCase().includes('client') || entityName.toLowerCase().includes('customer')) {
        return 1000; // Typically moderate number of customers
      } else if (entityName.toLowerCase().includes('produit') || entityName.toLowerCase().includes('product')) {
        return 5000; // Typically larger number of products
      } else if (entityName.toLowerCase().includes('commande') || entityName.toLowerCase().includes('order')) {
        return 10000; // Orders can be numerous
      } else if (entityName.toLowerCase().includes('detail')) {
        return 50000; // Order details are typically very numerous
      }
    }
    
    // Very conservative default
    return 1000;
  }
  
  /**
   * Select the optimal execution plan from alternatives
   * 
   * @param plans Alternative execution plans
   * @returns Optimal plan with lowest cost
   */
  private selectOptimalPlan(plans: ExecutionPlan[]): ExecutionPlan {
    if (plans.length === 0) {
      throw new Error('No execution plans available');
    }
    
    // Sort plans by total cost
    plans.sort((a, b) => a.totalCost.totalCost - b.totalCost.totalCost);
    
    // Return the plan with lowest cost
    return plans[0];
  }
  
  /**
   * Initialize optimizer with default statistics
   * In a real system, these would be collected from the sources
   */
  public initializeWithDefaults(): void {
    // Add network stats for sources
    this.addNetworkStats('SQL', {
      avgLatency: 10,    // 10ms latency (local network)
      bandwidth: 10000,  // 10MB/s
      reliability: 0.99  // 99% reliability
    });
    
    this.addNetworkStats('NEO4J', {
      avgLatency: 15,    // 15ms latency
      bandwidth: 8000,   // 8MB/s
      reliability: 0.98  // 98% reliability
    });
    
    this.addNetworkStats('XML', {
      avgLatency: 20,    // 20ms latency
      bandwidth: 5000,   // 5MB/s
      reliability: 0.97  // 97% reliability
    });
    
    // Add entity statistics for SQL source
    this.addEntityStatistics('SQL', {
      entityName: 'clients',
      rowCount: 1000,
      avgRowSize: 150,
      distinctValues: new Map([
        ['id_client', 1000],
        ['nom_complet', 950],
        ['adresse', 800],
        ['email_contact', 950],
        ['numero_telephone', 950]
      ])
    });
    
    this.addEntityStatistics('SQL', {
      entityName: 'produits',
      rowCount: 5000,
      avgRowSize: 200,
      distinctValues: new Map([
        ['id_produit', 5000],
        ['description', 4800],
        ['prix_cout', 500],
        ['categorie', 20]
      ])
    });
    
    this.addEntityStatistics('SQL', {
      entityName: 'commandes',
      rowCount: 10000,
      avgRowSize: 250,
      distinctValues: new Map([
        ['id_commande', 10000],
        ['date_commande', 500],
        ['statut', 5],
        ['mode_paiement', 4],
        ['client_ref', 1000]
      ])
    });
    
    // Add entity statistics for Neo4J source
    this.addEntityStatistics('NEO4J', {
      entityName: 'Client',
      rowCount: 800,
      avgRowSize: 180,
      distinctValues: new Map([
        ['id_client', 800],
        ['nom', 780],
        ['adresse', 700],
        ['email', 780],
        ['telephone', 780]
      ])
    });
    
    // Add entity statistics for XML source
    this.addEntityStatistics('XML', {
      entityName: 'clients',
      rowCount: 500,
      avgRowSize: 120,
      distinctValues: new Map([
        ['id', 500],
        ['nom', 490],
        ['courriel', 490],
        ['telephone', 490]
      ])
    });
  }
}