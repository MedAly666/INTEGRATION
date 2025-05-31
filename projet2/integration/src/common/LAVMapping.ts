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
  queryLanguage?: string;     // Optional query language identifier (sql, cypher, xpath)
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
    // Detect query language based on syntax
    const queryLanguage = this.detectQueryLanguage(query);
    
    // If it's not a SQL query, handle it differently
    if (queryLanguage !== 'sql') {
      return this.createCustomAstForNonSql(query, queryLanguage);
    }
    
    try {
      // Parse the query to an AST with enhanced configuration
      const ast = this.parser.astify(query, { 
        database: 'mysql',
        skipParentheses: true, // Skip parsing parentheses to avoid common syntax errors
        tolerance: true // Be more tolerant of syntax variations
      });
      return ast;
    } catch (error) {
      console.error(`Error parsing query: ${query}`, error);
      
      // Try an alternative parsing approach if the first attempt fails
      try {
        // Try with different configuration
        const ast = this.parser.astify(query, { 
          database: 'transactsql', // Try an alternative SQL dialect
          skipParentheses: true
        });
        return ast;
      } catch (fallbackError) {
        console.error(`Fallback parsing also failed:`, fallbackError);
        
        // As a last resort, try to handle the query manually for simple cases
        if (query.toUpperCase().includes('SELECT') && query.toUpperCase().includes('FROM')) {
          // Create a simplified AST for basic SELECT queries
          return this.createSimplifiedAst(query);
        }
        
        return null;
      }
    }
  }
  
  /**
   * Detect the query language based on syntax patterns
   * 
   * @param query The query string to analyze
   * @returns The detected query language ('sql', 'cypher', 'xpath', etc.)
   */
  private detectQueryLanguage(query: string): string {
    const trimmedQuery = query.trim().toUpperCase();
    
    // Check for Cypher query patterns
    if (trimmedQuery.startsWith('MATCH') || 
        trimmedQuery.startsWith('CREATE') && trimmedQuery.includes('NODE') ||
        trimmedQuery.includes('MERGE') && (trimmedQuery.includes('(') && trimmedQuery.includes(')')) ||
        trimmedQuery.includes('RETURN') && (trimmedQuery.includes('(') && trimmedQuery.includes(')'))) {
      return 'cypher';
    }
    
    // Check for XPath query patterns
    if (trimmedQuery.startsWith('//') || trimmedQuery.startsWith('/') || 
        (trimmedQuery.includes('[@') && trimmedQuery.includes(']'))) {
      return 'xpath';
    }
    
    // Default to SQL
    return 'sql';
  }
  
  /**
   * Create a custom AST for non-SQL queries that can't be parsed by node-sql-parser
   * 
   * @param query The non-SQL query string
   * @param language The query language ('cypher', 'xpath', etc.)
   * @returns A simplified AST-like structure
   */
  private createCustomAstForNonSql(query: string, language: string): any {
    console.log(`Creating custom AST for ${language} query: ${query}`);
    
    if (language === 'cypher') {
      // Extract node labels and relationships from Cypher query
      const nodePattern = /\((\w+):(\w+)\)/g;
      const relationshipPattern = /\[(\w*):?(\w*)\]/g;
      
      const nodes: {alias: string, label: string}[] = [];
      const relationships: {alias: string, type: string}[] = [];
      
      // Extract nodes
      let nodeMatch;
      while ((nodeMatch = nodePattern.exec(query)) !== null) {
        nodes.push({
          alias: nodeMatch[1],
          label: nodeMatch[2]
        });
      }
      
      // Extract relationships
      let relMatch;
      while ((relMatch = relationshipPattern.exec(query)) !== null) {
        relationships.push({
          alias: relMatch[1] || '',
          type: relMatch[2] || ''
        });
      }
      
      // Create a custom AST structure
      return {
        type: 'cypher',
        operation: query.trim().split(' ')[0], // MATCH, CREATE, etc.
        nodes,
        relationships,
        returns: query.includes('RETURN') ? 
          query.split('RETURN')[1].trim().split(',').map(r => r.trim()) : []
      };
    }
    
    if (language === 'xpath') {
      // For XPath, extract the path components
      const paths = query.split('/').filter(p => p.length > 0);
      
      return {
        type: 'xpath',
        paths,
        predicates: query.includes('[') ? 
          query.match(/\[(.*?)\]/g)?.map(p => p.slice(1, -1)) || [] : []
      };
    }
    
    // For other languages, return a minimal structure
    return {
      type: 'unknown',
      raw: query
    };
  }
  
  /**
   * Create a simplified AST for basic queries when parsing fails
   * This is a fallback method for common query patterns
   */
  private createSimplifiedAst(query: string): any {
    try {
      // Extract the basic components of a SELECT query
      const selectMatch = query.match(/SELECT\s+(.*?)\s+FROM\s+(.*?)(?:\s+WHERE\s+(.*?))?(?:\s+LIMIT\s+(\d+))?(?:\s*;)?$/i);
      
      if (selectMatch) {
        const [, columns, tables, where, limit] = selectMatch;
        
        // Create a simplified AST
        return {
          type: 'select',
          columns: columns.split(',').map(col => ({ 
            expr: { type: 'column_ref', column: col.trim() },
            as: null
          })),
          from: tables.split(',').map(table => ({
            table: table.trim(),
            as: null
          })),
          where: where ? { type: 'raw', value: where.trim() } : null,
          limit: limit ? { value: [{ type: 'number', value: parseInt(limit) }] } : null
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error creating simplified AST:', error);
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
        if (Array.isArray(ast.from)) {
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
        } else if (typeof ast.from === 'object') {
          // Handle case where from is a single object, not an array
          if (ast.from.table) {
            tables.push(ast.from.table);
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
    
    // Normalize table names - ensure they're lowercase for consistency
    return tables.map(table => table.toLowerCase());
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
        console.warn(`Unable to parse query, but attempting to continue with alternative approach: ${query}`);
        // Instead of throwing error, try to continue with a manual approach
        return this.handleUnparsableQuery(query, startTime);
      }
      
      // Step 2: Extract predicates (table names) from the query
      const queryPredicates = this.extractTableNames(ast);
      
      if (!queryPredicates || queryPredicates.length === 0) {
        console.warn(`Could not extract predicates from query, attempting fallback approach: ${query}`);
        return this.handleUnparsableQuery(query, startTime);
      }
      
      console.log(`Extracted predicates from query:`, queryPredicates);

      // Step 3: Create buckets for each predicate
      const predicateBuckets = this.createPredicateBuckets(queryPredicates);
      console.log(`Created predicate buckets:`,
        Array.from(predicateBuckets.keys()).map(key => ({
          predicate: key,
          views: predicateBuckets.get(key)?.length || 0
        }))
      );
      

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
      // Attempt to recover with a simple pass-through approach
      return this.handleUnparsableQuery(query, startTime);
    }

    const stats: LAVStats = {
      rewriteTime: Date.now() - startTime,
      numViewsConsidered,
      numRewritings: rewritings.length
    };

    return { rewritings, stats };
  }
  
  /**
   * Fallback handler for queries that can't be parsed
   */
  private handleUnparsableQuery(query: string, startTime: number): { 
    rewritings: LAVQueryRewrite[], 
    stats: LAVStats 
  } {
    // For unparsable queries, create a simple pass-through rewriting for each source
    const rewritings: LAVQueryRewrite[] = [];
    
    // Extract table names using regex as a fallback
    const tableMatch = query.match(/FROM\s+([a-zA-Z0-9_]+)/i);
    const tableName = tableMatch ? tableMatch[1].toLowerCase() : null;
    
    if (tableName) {
      // Create a pass-through rewriting for sources that might have this table
      for (const view of this.viewDefinitions) {
        const viewAst = this.parseQuery(view.query);
        if (viewAst) {
          const viewTables = this.extractTableNames(viewAst);
          if (viewTables.some(table => table.toLowerCase() === tableName.toLowerCase())) {
            rewritings.push({
              sourceId: view.sourceId,
              query: query, // Pass the original query through
              mapping: { [tableName]: tableName } // Simple identity mapping
            });
          }
        }
      }
    }
    
    // If we couldn't find any matches, create a default rewriting for each source
    if (rewritings.length === 0) {
      // Get unique source IDs
      const sourceIds = [...new Set(this.viewDefinitions.map(view => view.sourceId))];
      
      for (const sourceId of sourceIds) {
        rewritings.push({
          sourceId,
          query: query,
          mapping: {} // Empty mapping since we don't know the schema
        });
      }
    }
    
    const stats: LAVStats = {
      rewriteTime: Date.now() - startTime,
      numViewsConsidered: this.viewDefinitions.length,
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
    // Handle different query languages
    const queryLanguage = view.queryLanguage || this.detectQueryLanguage(view.query);
    
    if (queryLanguage === 'cypher') {
      // Consider both singular and plural forms and case-insensitive matching
      const predicateLower = predicate.toLowerCase();
      const singularForm = predicateLower.endsWith('s') ? predicateLower.slice(0, -1) : predicateLower;
      const pluralForm = predicateLower.endsWith('s') ? predicateLower : predicateLower + 's';
      
      return view.query.toLowerCase().includes(`:${singularForm}`) || 
             view.query.toLowerCase().includes(`:${pluralForm}`) || 
             view.query.toLowerCase().includes(predicateLower) ||
             (view.bucketId && view.bucketId.toLowerCase() === predicateLower);
    }
    
    if (queryLanguage === 'xpath') {
      // For XPath queries, use case-insensitive matching and check bucket ID
      const predicateLower = predicate.toLowerCase();
      return view.query.toLowerCase().includes(`/${predicateLower}`) || 
             view.query.toLowerCase().includes(`/${predicateLower}/`) ||
             view.query.toLowerCase().includes(`//${predicateLower}`) ||
             (view.bucketId && view.bucketId.toLowerCase() === predicateLower);
    }
    
    // For SQL, use the standard parsing approach with enhanced bucket matching
    const ast = this.parseQuery(view.query);
    if (!ast) {
      // If parsing fails, fall back to simple string matching and bucket ID check
      return view.query.toLowerCase().includes(predicate.toLowerCase()) ||
             (view.bucketId && view.bucketId.toLowerCase() === predicate.toLowerCase());
    }
    
    // Extract tables from the view query
    const viewTables = this.extractTableNames(ast);
    
    // Check if the predicate (table name) is in the view definition or matches the bucket ID
    return viewTables.some(table => 
      table.toLowerCase() === predicate.toLowerCase()
    ) || (view.bucketId && view.bucketId.toLowerCase() === predicate.toLowerCase());
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
      const ast1 = this.parser.astify(query1);
      const ast2 = this.parser.astify(query2);
      
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

  /**
   * Utility method to test query language detection and parsing
   * For debugging purposes
   * 
   * @param query The query to analyze
   * @returns Analysis information including detected language and parsing results
   */
  public analyzeQueryLanguage(query: string): any {
    const language = this.detectQueryLanguage(query);
    
    let ast = null;
    let parseSuccess = false;
    
    try {
      if (language === 'sql') {
        ast = this.parser.astify(query, { database: 'mysql' });
        parseSuccess = true;
      } else {
        ast = this.createCustomAstForNonSql(query, language);
        parseSuccess = !!ast;
      }
    } catch (error) {
      console.error(`Error parsing ${language} query:`, error);
    }
    
    return {
      query,
      detectedLanguage: language,
      parseSuccess,
      ast: ast ? JSON.stringify(ast, null, 2) : 'Failed to parse'
    };
  }
}