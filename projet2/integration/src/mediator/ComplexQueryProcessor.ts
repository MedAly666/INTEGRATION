/**
 * ComplexQueryProcessor.ts
 * Processes complex SQL queries against the integrated data model
 * Uses query decomposition and reformulation to efficiently query across sources
 */

import { Parser } from 'node-sql-parser';
import alasql from 'alasql';
import { Mediator } from './Mediator';
import { it } from 'bun:test';
import { QueryFilter } from '../adapters/IAdapter';

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
    'approvisionnements': 'getApprovisionnements'
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
      
      // Create a QueryFilter from the analysis
      const filter: QueryFilter = {
        projections: queryInfo.projections,
        conditions: queryInfo.conditions,
        joins: queryInfo.joins,
        limit: queryInfo.limit,
        groupBy: queryInfo.groupBy,
        orderBy: queryInfo.orderBy,
        parameters: parameters
      };
      
      // Fetch only the necessary data from each source using the filter
      const results = await this.fetchRequiredData(queryInfo, filter);
      //console.log('================\nfetched data:', results);
      
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
    
    // Extract conditions from WHERE clause
    const conditions: any[] = [];
    if (actualAst.type === 'select' && actualAst.where) {
      this.extractConditions(actualAst.where, conditions);
      
      // Extract columns from WHERE conditions and add them to projections
      this.extractColumnsFromConditions(actualAst.where, projections);
    }
    
    // Extract join conditions
    const joins: any[] = [];
    if (actualAst.type === 'select' && actualAst.from && actualAst.from.length > 1) {
      // Multiple tables in FROM clause indicate a join
      for (let i = 1; i < actualAst.from.length; i++) {
        if (actualAst.from[i].join && actualAst.from[i].on) {
          joins.push({
            type: actualAst.from[i].join,
            on: actualAst.from[i].on
          });
          
          // Extract columns from the JOIN conditions and add them to projections
          this.extractColumnsFromJoinCondition(actualAst.from[i].on, projections);
        }
      }
    }
    
    // If no specific projections, select all columns
    if (projections.length === 0 || projections.includes('*')) {
      projections = ['*'];
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
        type: item.type || 'ASC' // Default to ASC if not specified
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
   * Extract column names from JOIN condition and add them to projections
   * 
   * @param joinCondition The JOIN ON condition from AST
   * @param projections Array of projections to append to
   */
  private extractColumnsFromJoinCondition(joinCondition: any, projections: string[]): void {
    try {
      if (joinCondition.type === 'binary_expr') {
        // Handle binary expressions (typical JOIN condition)
        if (joinCondition.left.type === 'column_ref') {
          // Add the column from the left side of the condition
          const colName = joinCondition.left.column;
          if (!projections.includes(colName)) {
            projections.push(colName);
          }
        }
        
        if (joinCondition.right.type === 'column_ref') {
          // Add the column from the right side of the condition
          const colName = joinCondition.right.column;
          if (!projections.includes(colName)) {
            projections.push(colName);
          }
        }
        
        // Handle compound conditions (AND/OR in JOIN ON clause)
        if (['AND', 'OR'].includes(joinCondition.operator)) {
          this.extractColumnsFromJoinCondition(joinCondition.left, projections);
          this.extractColumnsFromJoinCondition(joinCondition.right, projections);
        }
      }
    } catch (error) {
      console.warn('Error extracting columns from JOIN condition:', error);
    }
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
   * Extract column names from WHERE conditions and add them to projections
   * 
   * @param whereClause WHERE clause from AST
   * @param projections Array of projections to append to
   */
  private extractColumnsFromConditions(whereClause: any, projections: string[]): void {
    try {
      if (whereClause.type === 'binary_expr') {
        // Handle columns in binary expressions (e.g., column = value)
        if (whereClause.left && whereClause.left.type === 'column_ref') {
          const colName = whereClause.left.column;
          if (!projections.includes(colName) && colName !== '*') {
            projections.push(colName);
          }
        }
        
        if (whereClause.right && whereClause.right.type === 'column_ref') {
          const colName = whereClause.right.column;
          if (!projections.includes(colName) && colName !== '*') {
            projections.push(colName);
          }
        }
        
        // Handle compound conditions recursively (AND/OR)
        if (['AND', 'OR'].includes(whereClause.operator)) {
          this.extractColumnsFromConditions(whereClause.left, projections);
          this.extractColumnsFromConditions(whereClause.right, projections);
        }
      } else if (whereClause.type === 'function' && whereClause.arguments) {
        // Handle functions in WHERE clause (e.g., WHERE DATE(column) = value)
        for (const arg of whereClause.arguments) {
          if (arg.type === 'column_ref') {
            const colName = arg.column;
            if (!projections.includes(colName) && colName !== '*') {
              projections.push(colName);
            }
          }
        }
      }
    } catch (error) {
      console.warn('Error extracting columns from WHERE condition:', error);
    }
  }
  
  /**
   * Fetch only the required data from each source based on the query analysis
   * Delegates filtering to the adapters
   * 
   * @param queryInfo Information extracted from the query
   * @param filter QueryFilter object with projections, conditions, and joins
   * @returns Object containing data from each table
   */
  private async fetchRequiredData(queryInfo: any, filter: QueryFilter): Promise<any> {
    const data: Record<string, any[]> = {};
    
    for (const tableName of queryInfo.tables) {
      // Find the corresponding mediator method
      const methodName = this.tableMap[tableName];
      if (!methodName) {
        throw new Error(`Unknown table: ${tableName}`);
      }
      
      console.log(`Fetching data for table ${tableName} using ${methodName} with filter`);
      
      // Get all adapters from the mediator
      const adapters = this.mediator.getAdapters();
      const collections = [];
      
      // Query each adapter with the filter
      for (const adapter of adapters) {
        if (typeof adapter['executeFilteredQuery'] === 'function') {
          try {
            // Call the adapter's executeFilteredQuery with the table name and filter
            const collection = await adapter.executeFilteredQuery(tableName, filter);
            
            // Validate that the collection implements the expected interface
            if (collection && typeof collection.getItems === 'function') {
              collections.push(collection);
            } else if (collection) {
              console.warn(`Adapter ${adapter.getSourceSystem()} returned an invalid collection for ${tableName}: missing getItems() method`);
              
              // Try to convert to a compatible collection format if it has items directly
              if (Array.isArray(collection)) {
                // If collection is an array, wrap it in a compatible object
                collections.push({
                  getItems: () => collection,
                  count: () => collection.length,
                  merge: () => {} // No-op merge since this is a wrapper
                });
              } else if (collection.items && Array.isArray(collection.items)) {
                // If collection has an 'items' array property
                collections.push({
                  getItems: () => collection.items,
                  count: () => collection.items.length,
                  merge: () => {} // No-op merge since this is a wrapper
                });
              }
            }
          } catch (error) {
            console.warn(`Adapter ${adapter.getSourceSystem()} failed to process filtered query for ${tableName}:`, error);
          }
        }
      }
      
      // Merge all collections
      const mergedCollection = this.mediator.mergeCollections(collections, methodName);
      
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
      
      const items = (mergedCollection as DataCollection).getItems().map((item: DataItem): NormalizedItem => {
        const normalized: NormalizedItem = {};
        for (const [key, value] of Object.entries(item)) {
          // Convert camelCase to snake_case for SQL compatibility
          const normalizedKey = key.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
          normalized[normalizedKey] = value;
        }
        return normalized;
      });
      
      // Store the data
      data[tableName] = items;
      
      console.log(`Fetched ${items.length} records for table ${tableName}`);
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
      // First make sure alasql is properly defined
      if (!alasql || !alasql.tables) {
        console.log('Reinitializing alasql...');
        // @ts-ignore - Ensure alasql is defined globally
        if (typeof window !== 'undefined') window.alasql = alasql;
      }
      
      // Clear any previous tables/views with the same names
      console.log('Clearing any existing tables/views...');
      for (const tableName of Object.keys(data)) {
        try {
          console.log(`Dropping existing table/view ${tableName} if it exists`);
          alasql(`DROP TABLE IF EXISTS ${tableName}`);
          alasql(`DROP VIEW IF EXISTS ${tableName}`);
          
          // Also remove from alasql.tables if it exists
          if (alasql.tables && alasql.tables[tableName]) {
            delete alasql.tables[tableName];
          }
        } catch (error) {
          console.warn(`Error dropping table/view ${tableName}:`, error);
          // Continue anyway - the table/view might not exist
        }
      }
      
      // Register tables directly in alasql using a standard approach
      for (const [tableName, items] of Object.entries(data)) {
        try {
          if (!items || !Array.isArray(items) || items.length === 0) {
            console.warn(`No data available for table ${tableName}, creating empty table with schema`);
            
            // Create table with appropriate schema based on the entity type
            let createTableSQL = `CREATE TABLE ${tableName} (`;
            
            // Define the columns based on the table name - ONLY USING SNAKE_CASE
            let columns: string[] = [];
            
            if (tableName.toLowerCase() === 'livraisons') {
              columns = [
                'id_livraison',
                'transporteur', 
                'date_estimee',
                'commande_ref',
                'statut',
                'source_system'
              ];
            } else if (tableName.toLowerCase() === 'commandes') {
              columns = [
                'id_commande',
                'date_commande',
                'client_ref',
                'employe_ref',
                'statut',
                'montant',
                'mode_paiement',
                'source_system'
              ];
            } else if (tableName.toLowerCase() === 'clients') {
              columns = [
                'id_client',
                'nom_complet',
                'email_contact',
                'adresse',
                'numero_telephone',
                'source_system'
              ];
            } else {
              // Default to creating with just an id column
              columns = ['id'];
            }
            
            // Create SQL with the columns
            createTableSQL += columns.map(col => `[${col}] STRING`).join(', ');
            createTableSQL += ')';
            
            // Execute the create table statement
            alasql(createTableSQL);
            
            continue;
          }
          
          // Create a new array of items with ONLY snake_case versions of properties
          const standardizedItems = items.map(item => {
            const standardized: Record<string, any> = {};
            
            // Convert all properties to snake_case
            for (const [key, value] of Object.entries(item)) {
              // If camelCase property, convert to snake_case
              if (/[A-Z]/.test(key)) {
                const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
                standardized[snakeKey] = value;
              } else {
                // Already snake_case or simple property
                standardized[key] = value;
              }
            }
            
            return standardized;
          });
          
          // Get all unique column names from the standardized first item
          const standardizedFirstItem = standardizedItems[0];
          const columns = Object.keys(standardizedFirstItem);
          
          console.log(`Creating table ${tableName} with columns: ${columns.join(', ')}`);
          
          // Create the table with appropriate columns
          let createTableSQL = `CREATE TABLE ${tableName} (`;
          createTableSQL += columns.map(col => `[${col}] STRING`).join(', ');
          createTableSQL += ')';
          
          alasql(createTableSQL);
          
          // Insert the standardized data
          console.log(`Inserting ${standardizedItems.length} records into table ${tableName}`);
          
          // Insert records in batches to prevent issues with large datasets
          const batchSize = 1000;
          for (let i = 0; i < standardizedItems.length; i += batchSize) {
            const batch = standardizedItems.slice(i, i + batchSize);
            alasql.tables[tableName].data = alasql.tables[tableName].data || [];
            alasql.tables[tableName].data.push(...batch);
          }
          
          // Log a sample of the data to verify column names
          if (alasql.tables[tableName].data && 
              alasql.tables[tableName].data.length > 0 && 
              typeof alasql.tables[tableName].data[0] === 'object' && 
              alasql.tables[tableName].data[0] !== null) {
            console.log(`Table ${tableName} sample data columns:`, 
              Object.keys(alasql.tables[tableName].data[0] as object).join(', '));
          }
          
          console.log(`Successfully created and populated table ${tableName}`);
        } catch (error) {
          console.error(`Error creating table for ${tableName}:`, error);
          throw new Error(`Failed to create table for ${tableName}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      // Execute the original query on the temporary tables
      const processedQuery = this.applyParameters(originalQuery, parameters);
      console.log("Executing processed query:", processedQuery);
      
      let results;
      try {
        results = alasql(processedQuery);
        console.log(`Query execution successful, returned ${Array.isArray(results) ? results.length : 1} results`);
      } catch (error) {
        console.error("Error executing alasql query:", error);
        throw new Error(`Error executing query: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // Clean up - drop the temporary tables
      for (const tableName of Object.keys(data)) {
        try {
          alasql(`DROP TABLE IF EXISTS ${tableName}`);
          if (alasql.tables && alasql.tables[tableName]) {
            delete alasql.tables[tableName];
          }
        } catch (error) {
          console.warn(`Error cleaning up table ${tableName}:`, error);
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
      parameters.forEach((paramValue) => {
        const valueStr = typeof paramValue === 'string' ? `'${paramValue}'` : `${paramValue}`;
        processedQuery = processedQuery.replace('?', valueStr);
      });
    }
    
    return processedQuery;
  }
  
  /**
   * Process data collections and combine them into a unified result
   * 
   * @param tableName Name of the table to create
   * @param results Array of data collections
   * @returns Combined result as array
   */
  private async consolidateResults(tableName: string, results: any[]): Promise<any[]> {
    // Filter out empty results
    const validResults = results.filter(r => r && Array.isArray(r.getItems()) && r.getItems().length > 0);
    
    // If no valid results, return empty array
    if (validResults.length === 0) {
      return [];
    }
    
    try {
      // Use alasql to consolidate results
      console.log(`Processing ${validResults.length} valid results for ${tableName}`);
      
      // Create a temporary table for the results
      // First check if the table exists and drop it to avoid the "table already exists" error
      try {
        await alasql.promise(`DROP TABLE IF EXISTS ${tableName}`);
      } catch (dropError) {
        console.log(`Could not drop table ${tableName}: ${dropError}`);
        // Continue anyway, as the table might not exist
      }
      
      // Create a new table for our data
      let createTableSql = `CREATE TABLE ${tableName} (`;
      
      // Get columns from the first result
      const firstResult = validResults[0].getItems()[0];
      const columns = Object.keys(firstResult);
      
      // Generate column definitions
      createTableSql += columns.map(col => `[${col}] STRING`).join(', ');
      createTableSql += ')';
      
      await alasql.promise(createTableSql);
      
      // Insert data from all results
      let insertedCount = 0;
      for (const result of validResults) {
        const items = result.getItems();
        
        // Skip empty collections
        if (items.length === 0) continue;
        
        // Insert batch of records
        const values = items.map((item: { [key: string]: any }) => {
          // Ensure all values are properly escaped for SQL
          const rowValues = columns.map(col => {
            const val = item[col];
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
            return val;
          });
          return `(${rowValues.join(', ')})`;
        });
        
        // Insert in batches to prevent excessive string sizes
        const batchSize = 1000;
        for (let i = 0; i < values.length; i += batchSize) {
          const batch = values.slice(i, i + batchSize);
          const insertSql = `INSERT INTO ${tableName} VALUES ${batch.join(', ')}`;
          await alasql.promise(insertSql);
          insertedCount += batch.length;
        }
      }
      
      console.log(`Inserted ${insertedCount} records into temporary table ${tableName}`);
      
      // Execute query to get unified results
      const resultSet = await alasql.promise(`SELECT * FROM ${tableName}`);
      
      // Ensure we return an array of the correct type
      return Array.isArray(resultSet) ? resultSet as any[] : [resultSet];
    } catch (error) {
      console.error('Error consolidating results:', error);
      if (error instanceof Error) {
        throw new Error(`Error consolidating results: ${error.message}`);
      }
      throw error;
    }
  }
}