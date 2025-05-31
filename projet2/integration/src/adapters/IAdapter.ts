/**
 * IAdapter.ts
 * Interface for all data source adapters
 */

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
  ApprovisionnementCollection
} from '../common/DataModel';
import { SourceDescription } from '../common/SourceDescription';
import { LAVViewDefinition, LAVQueryRewrite } from '../common/LAVMapping';

/**
 * Query filter structure that adapters can use to filter data
 */
export interface QueryFilter {
  projections?: string[];
  conditions?: any[];
  joins?: any[];
  limit?: number | null;
  offset?: number | null;
  groupBy?: string[] | null;
  orderBy?: { column: string, type: string }[] | null;
  parameters?: Record<string, any>;
}

/**
 * Helper function to apply filtering, sorting, limit, and projection in TypeScript
 * This is a common utility that can be used by all adapters
 * 
 * @param items Array of items to filter
 * @param filter Query filter specification
 * @returns Filtered array of items
 */
export function applyTypeScriptFilter(items: any[], filter: QueryFilter): any[] {
  // Create a copy of the filter with converted column names
  const convertedFilter = convertFilterColumnsToCamelCase(filter);
  let filteredItems = [...items]; // Start with a copy

  // 1. Apply Conditions (WHERE)
  if (convertedFilter.conditions && convertedFilter.conditions.length > 0) {
    console.log('Applying TS Conditions:', convertedFilter.conditions);
    filteredItems = filteredItems.filter(item => {
      return convertedFilter.conditions?.every(condition => {
        try {
          // Basic implementation for binary expressions using DataModel field names (camelCase)
          if (condition.type === 'binary_expr' && condition.left.type === 'column_ref') {
            const modelField = condition.left.column; // Now using converted camelCase field name
            const operator = condition.operator;
            const filterValue = condition.right.value;
            const itemValue = item[modelField];

            if (itemValue === undefined || itemValue === null) return false;

            switch (operator.toUpperCase()) {
              case '=': return itemValue == filterValue;
              case '!=': return itemValue != filterValue;
              case '>': return itemValue > filterValue;
              case '<': return itemValue < filterValue;
              case '>=': return itemValue >= filterValue;
              case '<=': return itemValue <= filterValue;
              case 'LIKE':
                if (typeof itemValue === 'string' && typeof filterValue === 'string') {
                  if (filterValue.startsWith('%') && filterValue.endsWith('%')) {
                    return itemValue.toLowerCase().includes(filterValue.substring(1, filterValue.length - 1).toLowerCase());
                  } else if (filterValue.endsWith('%')) {
                    return itemValue.toLowerCase().startsWith(filterValue.substring(0, filterValue.length - 1).toLowerCase());
                  } else if (filterValue.startsWith('%')) {
                    return itemValue.toLowerCase().endsWith(filterValue.substring(1).toLowerCase());
                  } else {
                    return itemValue.toLowerCase() === filterValue.toLowerCase();
                  }
                }
                return false;
              // Add IN, BETWEEN etc. if needed
              case 'IN':
                if (Array.isArray(filterValue)) {
                  return filterValue.includes(itemValue);
                }
                return false;
              case 'BETWEEN':
                if (Array.isArray(filterValue) && filterValue.length === 2) {
                  const [start, end] = filterValue;
                  return itemValue >= start && itemValue <= end;
                }
                return false; 
              case 'IS NULL':
                return itemValue === null;
              case 'IS NOT NULL':
                return itemValue !== null;
              case 'IS':
                if (typeof filterValue === 'string') {
                  return itemValue.toString().toLowerCase() === filterValue.toLowerCase();
                }
                return false;

              default: 
                console.warn(`Unsupported TS filter operator: ${operator}`);
                return true; // Be permissive
            }
          }
          console.warn(`Unsupported TS filter condition type: ${condition.type}`);
          return true; // Default for unhandled conditions
        } catch (evalError) {
          console.error("Error evaluating TS filter condition:", evalError, "Condition:", condition, "Item:", item);
          return false;
        }
      });
    });
    console.log(`${filteredItems.length} items after TS conditions.`);
  }

  // 2. Apply Sorting (ORDER BY)
  if (convertedFilter.orderBy && convertedFilter.orderBy.length > 0) {
    console.log('Applying TS Sorting:', convertedFilter.orderBy);
    filteredItems.sort((a, b) => {
      for (const order of convertedFilter.orderBy!) {
        const field = order.column; // Now using converted camelCase field name
        const propA = a[field];
        const propB = b[field];

        let comparison = 0;
        if (propA === null || propA === undefined) comparison = (propB === null || propB === undefined) ? 0 : -1;
        else if (propB === null || propB === undefined) comparison = 1;
        else if (propA < propB) comparison = -1;
        else if (propA > propB) comparison = 1;

        if (comparison !== 0) {
          return order.type.toUpperCase() === 'DESC' ? -comparison : comparison;
        }
      }
      return 0;
    });
  }

  // 3. Apply Limit
  if (convertedFilter.limit !== null && convertedFilter.limit !== undefined && convertedFilter.limit >= 0) {
    console.log(`Applying TS Limit: ${convertedFilter.limit}`);
    filteredItems = filteredItems.slice(0, convertedFilter.limit);
  }

  // 4. Apply Projections (SELECT) - Joins are ignored here
  if (convertedFilter.projections && convertedFilter.projections.length > 0 && !convertedFilter.projections.includes('*')) {
    console.log(`Applying TS Projections: ${convertedFilter.projections.join(', ')}`);
    filteredItems = filteredItems.map(item => {
      const projectedItem: any = {
        id: item.id, // Always include id
        sourceSystem: item.sourceSystem // Always include sourceSystem
      };
      for (const projField of convertedFilter.projections!) {
        if (item.hasOwnProperty(projField)) { // Check if property exists
          projectedItem[projField] = item[projField];
        }
      }
      return projectedItem;
    });
  }

  console.log('Filtered items:', filteredItems);

  return filteredItems;
}

/**
 * Convert snake_case column names to camelCase in filter objects
 * This ensures that filter column references match the data model property names
 * 
 * @param filter Query filter with possible snake_case column references
 * @returns Deep copy of the filter with converted column names
 */
function convertFilterColumnsToCamelCase(filter: QueryFilter): QueryFilter {
  // Create a deep copy of the filter
  const convertedFilter: QueryFilter = JSON.parse(JSON.stringify(filter));
  
  // Helper function to convert snake_case to camelCase
  const toCamelCase = (str: string): string => {
    // Skip if not snake_case
    if (!str.includes('_')) return str;
    
    // Handle table alias prefixes like "c.nom_complet" -> "c.nomComplet"
    const parts = str.split('.');
    if (parts.length === 2) {
      const alias = parts[0];
      const colName = parts[1];
      return `${alias}.${toCamelCase(colName)}`;
    }
    
    return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
  };

  // Convert column references in conditions
  if (convertedFilter.conditions && convertedFilter.conditions.length > 0) {
    for (const condition of convertedFilter.conditions) {
      if (condition.type === 'binary_expr' && condition.left.type === 'column_ref') {
        if (condition.left.column && typeof condition.left.column === 'string') {
          condition.left.column = toCamelCase(condition.left.column);
        }
      }
    }
  }

  // Convert column names in orderBy
  if (convertedFilter.orderBy && convertedFilter.orderBy.length > 0) {
    for (const orderItem of convertedFilter.orderBy) {
      if (orderItem.column && typeof orderItem.column === 'string') {
        orderItem.column = toCamelCase(orderItem.column);
      }
    }
  }

  // Convert column names in projections
  if (convertedFilter.projections && convertedFilter.projections.length > 0) {
    convertedFilter.projections = convertedFilter.projections.map(proj => {
      if (typeof proj === 'string') {
        return toCamelCase(proj);
      }
      return proj;
    });
  }

  // Convert column names in groupBy
  if (convertedFilter.groupBy && convertedFilter.groupBy.length > 0) {
    convertedFilter.groupBy = convertedFilter.groupBy.map(col => {
      if (typeof col === 'string') {
        return toCamelCase(col);
      }
      return col;
    });
  }

  return convertedFilter;
}

export interface IAdapter {
  /**
   * Connect to the data source
   */
  connect(): Promise<boolean>;
  
  /**
   * Disconnect from the data source
   */
  disconnect(): void;
  
  /**
   * Check if connected to the data source
   */
  isConnected(): boolean;
  
  /**
   * Get the source system identifier
   */
  getSourceSystem(): string;
  
  /**
   * Get detailed source description including capabilities and available data
   * This is important for the mediator to locate relevant information
   * as described in the course material
   */
  getSourceDescription(): SourceDescription;
  
  /**
   * Check if this adapter can handle a specific query
   * Allows the mediator to determine if this adapter can process the requested operation
   * before sending the query
   * 
   * @param filter Query filter to check
   * @param entityName Entity/table being queried
   * @returns Whether this adapter can handle the query
   */
  canHandleQuery(filter: QueryFilter, entityName: string): boolean;
  
  /**
   * Translate a global query into source-specific query
   * This follows the GAV approach where queries on the global schema
   * are translated to queries on the source schemas
   * 
   * @param filter Query filter in global schema terms
   * @param entityName Entity name in global schema
   * @returns Source-specific query object
   */
  translateQuery(filter: QueryFilter, entityName: string): any;
  
  /**
   * Get LAV view definitions for this data source
   * Following the LAV approach, this describes what each data source can provide
   * in terms of the global schema. These views map local data to the global schema
   * and are used by the mediator to determine how to rewrite queries.
   * 
   * @returns Array of LAV view definitions that map local data to global schema
   */
  getLAVViews(): LAVViewDefinition[];
  
  /**
   * Execute a query that has been rewritten using the LAV bucket algorithm
   * This method should handle the execution of a query that has been transformed 
   * by the mediator using LAV view definitions
   * 
   * @param query The rewritten query specific to this source
   * @param parameters Additional parameters including mapping information for LAV
   * @returns Query results mapped to the global schema
   */
  executeQuery(query: string, parameters: Record<string, any>): Promise<any[]>;
  
  /**
   * Execute a specific LAV view with the provided filter
   * This method is called by executeQuery to process a specific view definition
   * 
   * @param viewDef The LAV view definition to execute
   * @param filter Query filter to apply to the view
   * @returns Results from executing the view with the filter applied
   */
  executeLAVView?(viewDef: any, filter: QueryFilter): Promise<any[]>;
  
  /**
   * Check if this adapter can handle a specific query pattern
   * Used by the bucket algorithm to match views to query predicates
   * 
   * @param pattern Query pattern to check
   * @returns Whether this adapter can handle the pattern
   */
  canHandleQueryPattern(pattern: string): boolean;
  
  /**
   * Fetch clients data 
   */
  getClients(filter?: QueryFilter): Promise<ClientCollection>;
  
  /**
   * Fetch employees data
   */
  getEmployees(filter?: QueryFilter): Promise<EmployeeCollection>;
  
  /**
   * Fetch agencies data
   */
  getAgences(filter?: QueryFilter): Promise<AgenceCollection>;
  
  /**
   * Fetch suppliers data
   */
  getFournisseurs(filter?: QueryFilter): Promise<FournisseurCollection>;
  
  /**
   * Fetch products data
   */
  getProduits(filter?: QueryFilter): Promise<ProduitCollection>;
  
  /**
   * Fetch orders data
   */
  getCommandes(filter?: QueryFilter): Promise<CommandeCollection>;
  
  /**
   * Fetch order details data
   */
  getDetailsCommande(filter?: QueryFilter): Promise<DetailCommandeCollection>;
  
  /**
   * Fetch invoices data
   */
  getFactures(filter?: QueryFilter): Promise<FactureCollection>;
  
  /**
   * Fetch deliveries data
   */
  getLivraisons(filter?: QueryFilter): Promise<LivraisonCollection>;
  
  /**
   * Fetch supply data 
   */
  getApprovisionnements(filter?: QueryFilter): Promise<ApprovisionnementCollection>;
  
  /**
   * Execute a filtered query directly on the adapter
   * @param tableName The table/entity to query
   * @param filter Query filter specification
   * @returns Generic data collection
   */
  executeFilteredQuery(tableName: string, filter: QueryFilter): Promise<any>;
}