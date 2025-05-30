/**
 * LAVMapping.ts
 * Implements Local-As-View (LAV) mapping approach and the Bucket Algorithm for query rewriting
 */

import { Parser, Select, From, Where } from 'node-sql-parser';

/**
 * Represents a view definition in the LAV approach
 * Maps local data source schema to the global schema
 */
export interface LAVViewDefinition {
  sourceId: string;           // Source system identifier
  viewName: string;           // Local name for this view
  query: string;              // Query over the global schema that defines this view
  parameters?: Record<string, any>; // Optional parameters for the query
  bucketId?: string;          // Optional bucket identifier for grouping related views
}

/**
 * Statistics for LAV query rewriting
 */
export interface LAVStats {
  rewriteTime: number;       // Time taken for query rewriting
  numViewsConsidered: number; // Number of views considered
  numRewritings: number;     // Number of rewritings generated
}

/**
 * Interface for a rewritten query in LAV
 */
export interface LAVQueryRewrite {
  sourceId: string;          // Source system identifier
  query: string;             // Rewritten query for the source
  mapping: Record<string, string>; // Mapping from global schema to source schema
}

/**
 * Manages LAV view definitions and implements the bucket algorithm
 */
export class LAVMappingManager {
  private viewDefinitions: LAVViewDefinition[] = [];
  private buckets: Map<string, LAVViewDefinition[]> = new Map();
  private parser: Parser;

  constructor() {
    this.parser = new Parser();
  }

  /**
   * Add a LAV view definition
   */
  public addViewDefinition(view: LAVViewDefinition): void {
    this.viewDefinitions.push(view);

    // Add to bucket if bucketId is specified
    if (view.bucketId) {
      if (!this.buckets.has(view.bucketId)) {
        this.buckets.set(view.bucketId, []);
      }
      this.buckets.get(view.bucketId)!.push(view);
    }
  }

  /**
   * Get all view definitions from a specific source
   */
  public getSourceViewDefinitions(sourceId: string): LAVViewDefinition[] {
    return this.viewDefinitions.filter(view => view.sourceId === sourceId);
  }

  /**
   * Parse a SQL query using node-sql-parser
   * 
   * @param query SQL query string
   * @returns Parsed AST or null if parsing fails
   */
  private parseQuery(query: string): any {
    try {
      // Parse the query to an AST
      const ast = this.parser.astify(query, { database: 'mysql' });
      return ast;
    } catch (error) {
      console.error(`Error parsing query: ${query}`, error);
      return null;
    }
  }

  /**
   * Extract table names from a parsed SQL AST
   * 
   * @param ast Parsed SQL AST
   * @returns Array of table names
   */
  private extractTableNames(ast: any): string[] {
    const tables: string[] = [];
    
    if (!ast) return tables;
    
    // Handle different query types
    if (Array.isArray(ast)) {
      for (const item of ast) {
        tables.push(...this.extractTableNames(item));
      }
    } else if (ast.type === 'select') {
      // Process FROM clause to get table names
      if (ast.from) {
        for (const fromItem of ast.from) {
          // If it's a simple table reference
          if (fromItem.table) {
            tables.push(fromItem.table);
          }
          // If it's a subquery, recursively extract tables
          if (fromItem.expr) {
            tables.push(...this.extractTableNames(fromItem.expr));
          }
        }
      }
      
      // Process JOINs if any
      if (ast.join) {
        for (const joinItem of ast.join) {
          if (joinItem.table) {
            tables.push(joinItem.table);
          }
        }
      }
    }
    
    return tables;
  }

  /**
   * Rewrite a query using the bucket algorithm for LAV integration
   * 
   * @param query The original query over the global schema
   * @returns A list of rewritten queries with their source mappings
   */
  public rewriteQuery(query: string): { 
    rewritings: LAVQueryRewrite[], 
    stats: LAVStats 
  } {
    const startTime = Date.now();
    let numViewsConsidered = 0;
    const rewritings: LAVQueryRewrite[] = [];

    try {
      // Step 1: Parse the query using node-sql-parser
      const ast = this.parseQuery(query);
      if (!ast) {
        throw new Error(`Failed to parse query: ${query}`);
      }
      
      // Step 2: Extract predicates (table names) from the query
      const queryPredicates = this.extractTableNames(ast);
      
      if (!queryPredicates || queryPredicates.length === 0) {
        throw new Error(`Could not extract predicates from query: ${query}`);
      }
      
      console.log(`Extracted predicates from query:`, queryPredicates);

      // Step 3: Create buckets for each predicate
      const predicateBuckets = this.createPredicateBuckets(queryPredicates);

      // Step 4: Generate rewritings using the bucket algorithm
      const candidateRewritings = this.executeBucketAlgorithm(query, predicateBuckets);
      numViewsConsidered = this.calculateViewsConsidered(predicateBuckets);

      // Step 5: Filter and refine the rewritings
      for (const candidate of candidateRewritings) {
        const refinedRewritings = this.refineRewriting(candidate, query);
        rewritings.push(...refinedRewritings);
      }
    } catch (error) {
      console.error(`Error in LAV query rewriting: ${error}`);
    }

    const stats: LAVStats = {
      rewriteTime: Date.now() - startTime,
      numViewsConsidered,
      numRewritings: rewritings.length
    };

    return { rewritings, stats };
  }

  /**
   * Create buckets for each query predicate
   * Each bucket contains views that can answer the predicate
   */
  private createPredicateBuckets(predicates: string[]): Map<string, LAVViewDefinition[]> {
    const buckets = new Map<string, LAVViewDefinition[]>();
    
    for (const predicate of predicates) {
      const bucket: LAVViewDefinition[] = [];
      
      // Find all views that can contribute to this predicate
      for (const view of this.viewDefinitions) {
        if (this.viewContainsPredicate(view, predicate)) {
          bucket.push(view);
        }
      }
      
      buckets.set(predicate, bucket);
      console.log(`Bucket for predicate ${predicate} contains ${bucket.length} views`);
    }
    
    return buckets;
  }

  /**
   * Check if a view contains a specific predicate
   * Implementation uses the SQL parser for more accurate matching
   */
  private viewContainsPredicate(view: LAVViewDefinition, predicate: string): boolean {
    // Parse the view query
    const ast = this.parseQuery(view.query);
    if (!ast) return false;
    
    // Extract tables from the view query
    const viewTables = this.extractTableNames(ast);
    
    // Check if the predicate (table name) is in the view definition
    return viewTables.some(table => 
      table.toLowerCase() === predicate.toLowerCase()
    );
  }

  /**
   * Execute the bucket algorithm to generate candidate rewritings
   */
  private executeBucketAlgorithm(
    query: string, 
    predicateBuckets: Map<string, LAVViewDefinition[]>
  ): LAVQueryRewrite[] {
    const candidates: LAVQueryRewrite[] = [];
    
    // Implementation of the bucket algorithm
    // Get predicates in order
    const predicates = Array.from(predicateBuckets.keys());
    
    if (predicates.length === 0) {
      return candidates;
    }
    
    // For each view in the first predicate's bucket
    for (const view of predicateBuckets.get(predicates[0]) || []) {
      // Start with this view as the initial candidate
      const initialCandidate: LAVQueryRewrite = {
        sourceId: view.sourceId,
        query: view.query,
        mapping: view.parameters?.mapping || {}
      };
      
      // Find compatible views for the rest of the predicates
      const compatibleCandidates = this.findCompatibleViews(
        initialCandidate, 
        predicateBuckets, 
        predicates.slice(1)
      );
      
      candidates.push(...compatibleCandidates);
    }
    
    return candidates;
  }

  /**
   * Find views compatible with the current candidate for remaining predicates
   */
  private findCompatibleViews(
    candidate: LAVQueryRewrite,
    buckets: Map<string, LAVViewDefinition[]>,
    remainingPredicates: string[]
  ): LAVQueryRewrite[] {
    if (remainingPredicates.length === 0) {
      return [candidate];
    }
    
    const results: LAVQueryRewrite[] = [];
    const currentPredicate = remainingPredicates[0];
    
    for (const view of buckets.get(currentPredicate) || []) {
      // Check if view is compatible with current candidate
      if (view.sourceId === candidate.sourceId) {
        // Create a new candidate by combining current and this view
        const newCandidate: LAVQueryRewrite = {
          sourceId: candidate.sourceId,
          query: this.combineQueries(candidate.query, view.query),
          mapping: { ...candidate.mapping, ...(view.parameters?.mapping || {}) }
        };
        
        // Recursively find compatibles for remaining predicates
        const compatibles = this.findCompatibleViews(
          newCandidate,
          buckets,
          remainingPredicates.slice(1)
        );
        
        results.push(...compatibles);
      }
    }
    
    return results;
  }

  /**
   * Combine two queries using SQL parser for more intelligent merging
   */
  private combineQueries(query1: string, query2: string): string {
    try {
      // Parse both queries
      const ast1 = this.parseQuery(query1);
      const ast2 = this.parseQuery(query2);
      
      if (!ast1 || !ast2) {
        // If parsing fails, fall back to simple combination
        return `/* Combined query: */ ${query1} /* WITH */ ${query2}`;
      }
      
      // For simplicity in this example, if both are SELECT queries, 
      // we'll create a JOIN between them
      if (ast1.type === 'select' && ast2.type === 'select') {
        // Extract the first table from each query to use for the join
        const table1 = ast1.from?.[0]?.table;
        const table2 = ast2.from?.[0]?.table;
        
        if (table1 && table2) {
          // Create a simple join query - in a real system, this would be more sophisticated
          return `SELECT * FROM ${table1} JOIN ${table2} ON ${table1}.id = ${table2}.id`;
        }
      }
      
      // Fall back to simple combination if the above doesn't apply
      return `/* Combined query: */ ${query1} /* WITH */ ${query2}`;
    } catch (error) {
      console.error(`Error combining queries: ${error}`);
      return `/* Error combining queries: */ ${query1} /* WITH */ ${query2}`;
    }
  }

  /**
   * Calculate the total number of views considered
   */
  private calculateViewsConsidered(buckets: Map<string, LAVViewDefinition[]>): number {
    let count = 0;
    for (const views of buckets.values()) {
      count += views.length;
    }
    return count;
  }

  /**
   * Refine a candidate rewriting to generate the final rewritten queries
   */
  private refineRewriting(
    candidate: LAVQueryRewrite, 
    originalQuery: string
  ): LAVQueryRewrite[] {
    try {
      // Parse the original query to extract any filter conditions
      const originalAst = this.parseQuery(originalQuery);
      const candidateAst = this.parseQuery(candidate.query);
      
      if (!originalAst || !candidateAst) {
        return [candidate];
      }
      
      // If the original query has WHERE conditions, try to apply them to the rewritten query
      if (originalAst.type === 'select' && originalAst.where && candidateAst.type === 'select') {
        // Properly format the WHERE condition
        const whereStr = this.parser.sqlify(originalAst.where);
        
        // Check if candidate already has a WHERE clause
        if (candidateAst.where) {
          // Append to existing WHERE clause
          candidate.query = candidate.query.replace(
            /WHERE\s+(.*)/i,
            `WHERE $1 AND ${whereStr}`
          );
        } else {
          // Add WHERE clause if none exists
          candidate.query += ` WHERE ${whereStr}`;
        }
      }
      
      return [candidate];
    } catch (error) {
      console.error(`Error refining rewriting: ${error}`);
      return [candidate]; // Return the original candidate if refinement fails
    }
  }

  /**
   * Get all view definitions
   */
  public getAllViewDefinitions(): LAVViewDefinition[] {
    return [...this.viewDefinitions];
  }

  /**
   * Get all bucket IDs
   */
  public getAllBucketIds(): string[] {
    return Array.from(this.buckets.keys());
  }

  /**
   * Get views in a specific bucket
   */
  public getViewsInBucket(bucketId: string): LAVViewDefinition[] {
    return this.buckets.get(bucketId) || [];
  }
}