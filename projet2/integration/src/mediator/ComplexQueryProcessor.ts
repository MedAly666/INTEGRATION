/**
 * ComplexQueryProcessor.ts
 * Processes complex SQL queries against the integrated data model
 * Uses query decomposition and reformulation to efficiently query across sources
 */

import { Parser } from 'node-sql-parser';
import alasql from 'alasql';
import { Mediator } from './Mediator';
import { it } from 'bun:test';

export class ComplexQueryProcessor {
  private mediator: Mediator;
  private parser: Parser;
  private tableMap: Record<string, keyof Mediator & string> = {
    'clients': 'getClients',
    'employees': 'getEmployees',
    'agences': 'getAgences',
    'fournisseurs': 'getFournisseurs',
    'produits': 'getProduits',
    'commandes': 'getCommandes',
    'details_commande': 'getDetailsCommande',
    'factures': 'getFactures',
    'livraisons': 'getLivraisons',
    'approvisionnement': 'getApprovisionnement'
  };

  /**
   * Constructor
   * 
   * @param mediator The mediator instance
   */
  constructor(mediator: Mediator) {
    this.mediator = mediator;
    this.parser = new Parser();
    
    // Initialize AlaSQL
    alasql.options.casesensitive = false;
  }

  /**
   * Execute a SQL query against the integrated data
   * 
   * @param query SQL query string
   * @param parameters Optional query parameters
   * @returns Query results
   */
  public async executeQuery(query: string, parameters: Record<string, any> = {}): Promise<any[]> {
    console.log(`Executing query: ${query}`);
    console.log(`With parameters:`, parameters);
    
    try {
      // Parse the query to understand its structure
      const ast = this.parser.astify(query);
      console.log('Query AST:', JSON.stringify(ast, null, 2));
      
      // Extract tables, projections, and conditions from the query
      const queryInfo = this.analyzeQuery(ast);
      console.log('Query analysis:', queryInfo);
      
      // Verify that tables were properly extracted
      if (!queryInfo.tables || queryInfo.tables.length === 0) {
        console.error('No tables found in query');
        throw new Error('Could not determine which tables to query from the SQL statement. Please check your query syntax.');
      }
      
      // Validate that all tables in the query are known to the system
      for (const tableName of queryInfo.tables) {
        if (!this.tableMap[tableName]) {
          throw new Error(`Unknown table: ${tableName}. Available tables are: ${Object.keys(this.tableMap).join(', ')}`);
        }
      }
      
      // Fetch only the necessary data from each source
      const results = await this.fetchRequiredData(queryInfo, parameters);
      
      
      // Apply the final query to the combined results
      return this.processResults(results, queryInfo, query, parameters);
    } catch (error) {
      console.error('Error executing query:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Query execution failed: ${errorMessage}`);
    }
  }
  
  /**
   * Analyze the query AST to extract tables, projections, and conditions
   * 
   * @param ast Abstract syntax tree of the query
   * @returns Query information including tables, projections, and conditions
   */
  private analyzeQuery(ast: any): any {
    // Handle array of statements
    const actualAst = Array.isArray(ast) ? ast[0] : ast;
    
    // Extract table names
    const tableNames = this.extractTableNamesFromAst(ast);
    
    // Extract projections (columns needed)
    let projections: string[] = [];
    if (actualAst.type === 'select' && actualAst.columns) {
      for (const col of actualAst.columns) {
        if (col.expr.type === 'column_ref') {
          // Add specific column
          const colName = col.expr.column === '*' ? '*' : col.expr.column;
          projections.push(colName);
        } else {
          // Add all columns for complex expressions (aggregations, etc.)
          projections.push('*');
        }
      }
    }
    
    // If no specific projections, select all columns
    if (projections.length === 0 || projections.includes('*')) {
      projections = ['*'];
    }
    
    // Extract conditions from WHERE clause
    const conditions: any[] = [];
    if (actualAst.type === 'select' && actualAst.where) {
      this.extractConditions(actualAst.where, conditions);
    }
    
    // Extract join conditions
    const joins: any[] = [];
    if (actualAst.type === 'select' && actualAst.from && actualAst.from.length > 1) {
      // Multiple tables in FROM clause indicate a join
      for (let i = 1; i < actualAst.from.length; i++) {
        if (actualAst.from[i].join) {
          joins.push({
            type: actualAst.from[i].join,
            on: actualAst.from[i].on
          });
        }
      }
    }
    
    // Extract LIMIT, GROUP BY, ORDER BY, etc. with null checks
    const limit = actualAst.type === 'select' && actualAst.limit ? 
      (actualAst.limit.value && actualAst.limit.value[0] ? actualAst.limit.value[0].value : null) 
      : null;
      
    const groupBy = actualAst.type === 'select' && actualAst.groupby && Array.isArray(actualAst.groupby) ? 
      actualAst.groupby.map((item: any) => item.column) 
      : null;
      
    const orderBy = actualAst.type === 'select' && actualAst.orderby && Array.isArray(actualAst.orderby) ? 
      actualAst.orderby.map((item: any) => ({
        column: item.expr.column,
        type: item.type
      })) 
      : null;
    
    return {
      tables: tableNames,
      projections,
      conditions,
      joins,
      limit,
      groupBy,
      orderBy
    };
  }
  
  /**
   * Extract conditions from WHERE clause
   * 
   * @param whereClause WHERE clause from AST
   * @param conditions Array to store extracted conditions
   */
  private extractConditions(whereClause: any, conditions: any[]): void {
    if (whereClause.operator && ['AND', 'OR'].includes(whereClause.operator)) {
      // Recursively extract from nested conditions
      this.extractConditions(whereClause.left, conditions);
      this.extractConditions(whereClause.right, conditions);
    } else {
      // Add the condition to the list
      conditions.push(whereClause);
    }
  }
  
  /**
   * Extract table names from the query AST
   * 
   * @param ast Query abstract syntax tree
   * @returns Array of table names
   */
  private extractTableNamesFromAst(ast: any): string[] {
    const tableNames: string[] = [];
    
    try {
      // Handle plain SELECT queries
      if (ast.type === 'select' && ast.from) {
        for (const fromItem of ast.from) {
          if (fromItem.table) {
            tableNames.push(fromItem.table.toLowerCase());
          }
        }
      }
      
      // Handle array of statements (for multiple statements)
      if (Array.isArray(ast) && ast.length > 0) {
        for (const stmt of ast) {
          if (stmt.type === 'select' && stmt.from) {
            for (const fromItem of stmt.from) {
              if (fromItem.table) {
                tableNames.push(fromItem.table.toLowerCase());
              }
            }
          }
        }
      }
      
      // Handle JOIN clauses
      if ((ast.type === 'select' || (Array.isArray(ast) && ast[0]?.type === 'select')) && ast.from) {
        const fromClause = Array.isArray(ast) ? ast[0].from : ast.from;
        for (const fromItem of fromClause) {
          if (fromItem.join) {
            for (const joinItem of fromItem.join) {
              if (joinItem.table) {
                tableNames.push(joinItem.table.toLowerCase());
              }
            }
          }
        }
      }
      
      console.log("Extracted table names:", tableNames);
      
      // Remove duplicates
      return [...new Set(tableNames)];
    } catch (error) {
      console.error("Error extracting table names:", error);
      return tableNames;
    }
  }
  
  /**
   * Fetch only the required data from each source based on the query analysis
   * 
   * @param queryInfo Information extracted from the query
   * @param parameters Query parameters
   * @returns Object containing data from each table
   */
  private async fetchRequiredData(queryInfo: any, parameters: Record<string, any>): Promise<any> {
    const data: Record<string, any[]> = {};
    
    for (const tableName of queryInfo.tables) {
      // Find the corresponding mediator method
      const methodName = this.tableMap[tableName];
      if (!methodName) {
        throw new Error(`Unknown table: ${tableName}`);
      }
      
      console.log(`Fetching data for table ${tableName} using ${methodName}`);
      if (typeof this.mediator[methodName as keyof Mediator] === 'function') {
        // Call the appropriate method on the mediator
        const collection = await (this.mediator[methodName as keyof Mediator] as Function).call(this.mediator);
        
        // Extract items and normalize property names
        interface DataItem {
          [key: string]: any;
        }
        
        interface DataCollection {
          getItems(): DataItem[];
        }
        
        interface NormalizedItem {
          [key: string]: any;
        }
        
        const items = (collection as DataCollection).getItems().map((item: DataItem): NormalizedItem => {
          const normalized: NormalizedItem = {};
          for (const [key, value] of Object.entries(item)) {
            // Convert camelCase to snake_case for SQL compatibility
            const normalizedKey = key.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
            normalized[normalizedKey] = value;
            // Keep the original key as well
            //normalized[key] = value;
          }
          return normalized;
        });
        
        // Store the data
        data[tableName] = items;
        
        console.log(`Fetched ${items.length} records for table ${tableName}`);
      } else {
        throw new Error(`Method ${methodName} not found in mediator`);
      }
    }
    
    return data;
  }
  
  /**
   * Process the fetched data based on the query
   * 
   * @param data Data fetched from sources
   * @param queryInfo Query analysis information
   * @param originalQuery Original SQL query
   * @param parameters Query parameters
   * @returns Processed query results
   */
  private processResults(
    data: Record<string, any[]>, 
    queryInfo: any, 
    originalQuery: string, 
    parameters: Record<string, any>
  ): any[] {    
    try {
      // Clear any previous tables with the same names
      for (const tableName of Object.keys(data)) {
        try {
          alasql(`DROP TABLE IF EXISTS ${tableName}`);
        } catch (error) {
          console.warn(`Error dropping table ${tableName}:`, error);
        }
      }
      
      // Create tables with the fetched data directly in the default database
      for (const [tableName, items] of Object.entries(data)) {
        // Create the table
        if (items.length > 0) {
          // Generate column definitions based on the first item
          const firstItem = items[0];
          const columns = Object.keys(firstItem);
          
          // Create table with all columns
          alasql(`CREATE TABLE ${tableName} (${columns.map(col => `[${col}]`).join(',')})`);
          
          // Insert data
          for (const item of items) {
            alasql(`INSERT INTO ${tableName} VALUES ?`, [item]);
          }
          
          console.log(`Created temporary table ${tableName} with ${items.length} records`);
        } else {
          // Create empty table with a generic structure
          alasql(`CREATE TABLE ${tableName} (id STRING)`);
          console.log(`Created empty temporary table ${tableName}`);
        }
      }
      
      // Execute the original query on the temporary tables
      const processedQuery = this.applyParameters(originalQuery, parameters);
      console.log("Executing processed query:", processedQuery);
      const results = alasql(processedQuery);
      
      // Clean up - drop the temporary tables
      for (const tableName of Object.keys(data)) {
        try {
          alasql(`DROP TABLE IF EXISTS ${tableName}`);
        } catch (error) {
          console.warn(`Error dropping table ${tableName}:`, error);
        }
      }
      
      return Array.isArray(results) ? results : [results];
    } catch (error) {
      console.error('Error processing results:', error);
      if (error instanceof Error) {
        throw new Error(`Error processing results: ${error.message}`);
      } else {
        throw new Error(`Error processing results: ${String(error)}`);
      }
    }
  }
  
  /**
   * Replace parameter placeholders in the query
   * 
   * @param query Original query with placeholders
   * @param parameters Parameters to insert
   * @returns Processed query
   */
  private applyParameters(query: string, parameters: Record<string, any>): string {
    let processedQuery = query;
    
    // Replace :param style parameters
    for (const [key, value] of Object.entries(parameters)) {
      const regex = new RegExp(`:${key}\\b`, 'g');
      
      if (typeof value === 'string') {
        processedQuery = processedQuery.replace(regex, `'${value}'`);
      } else {
        processedQuery = processedQuery.replace(regex, `${value}`);
      }
    }
    
    // Replace ? style parameters (positional)
    if (Array.isArray(parameters)) {
      parameters.forEach((value) => {
        const valueStr = typeof value === 'string' ? `'${value}'` : `${value}`;
        processedQuery = processedQuery.replace('?', valueStr);
      });
    }
    
    return processedQuery;
  }
}