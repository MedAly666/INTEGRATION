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

/**
 * Query filter structure that adapters can use to filter data
 */
export interface QueryFilter {
  projections?: string[];
  conditions?: any[];
  joins?: any[];
  limit?: number | null;
  groupBy?: string[] | null;
  orderBy?: { column: string, type: string }[] | null;
  parameters?: Record<string, any>;
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