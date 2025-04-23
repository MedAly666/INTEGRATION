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
  getClients(): Promise<ClientCollection>;
  
  /**
   * Fetch employees data
   */
  getEmployees(): Promise<EmployeeCollection>;
  
  /**
   * Fetch agencies data
   */
  getAgences(): Promise<AgenceCollection>;
  
  /**
   * Fetch suppliers data
   */
  getFournisseurs(): Promise<FournisseurCollection>;
  
  /**
   * Fetch products data
   */
  getProduits(): Promise<ProduitCollection>;
  
  /**
   * Fetch orders data
   */
  getCommandes(): Promise<CommandeCollection>;
  
  /**
   * Fetch order details data
   */
  getDetailsCommande(): Promise<DetailCommandeCollection>;
  
  /**
   * Fetch invoices data
   */
  getFactures(): Promise<FactureCollection>;
  
  /**
   * Fetch deliveries data
   */
  getLivraisons(): Promise<LivraisonCollection>;
  
  /**
   * Fetch supply data 
   */
  getApprovisionnement(): Promise<ApprovisionnementCollection>;
}