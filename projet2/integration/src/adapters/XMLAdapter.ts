/**
 * XMLAdapter.ts
 * Adapter for XML data sources
 */

import { IAdapter, QueryFilter } from './IAdapter';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DOMParser } from 'xmldom';
import xpath from 'xpath';
import {
  ClientCollection,
  Client,
  EmployeeCollection,
  Employee,
  AgenceCollection,
  Agence,
  FournisseurCollection,
  Fournisseur,
  ProduitCollection,
  Produit,
  CommandeCollection,
  Commande,
  DetailCommandeCollection,
  DetailCommande,
  FactureCollection,
  Facture,
  LivraisonCollection,
  Livraison,
  ApprovisionnementCollection,
  Approvisionnement
} from '../common/DataModel';

export class XMLAdapter implements IAdapter {
  private connected: boolean = false;
  private sourceSystem: string = 'XML';
  private xmlFilePath: string;
  private xmlDocument: Document | null = null;
  
  /**
   * Constructor - Initialize with file path
   * 
   * @param sourceSystem Source system identifier
   * @param xmlFilePath Path to the XML file containing the data
   */
  constructor(
    sourceSystem: string,
    xmlFilePath: string = '/media/medaly/A4B4A33BB4A30F3C/TP/INTEGRATION/projet2/xml/data-03.xml'
  ) {
    this.sourceSystem = sourceSystem;
    this.xmlFilePath = xmlFilePath;
  }
  
  /**
   * Execute a query with filtering
   * 
   * @param tableName The name of the entity to query
   * @param filter Filter criteria to apply
   * @returns Promise with the filtered results
   */
  public async executeFilteredQuery(tableName: string, filter: QueryFilter): Promise<any> {
    if (!this.connected) {
      throw new Error('Not connected to XML data source');
    }
    
    let results: any;
    
    // Get the appropriate collection based on tableName
    switch (tableName.toLowerCase()) {
      case 'clients':
        results = await this.getClients();
        break;
      case 'employees':
        results = await this.getEmployees();
        break;
      case 'agences':
        results = await this.getAgences();
        break;
      case 'fournisseurs':
        results = await this.getFournisseurs();
        break;
      case 'produits':
        results = await this.getProduits();
        break;
      case 'commandes':
        results = await this.getCommandes();
        break;
      case 'details_commande':
        results = await this.getDetailsCommande();
        break;
      case 'factures':
        results = await this.getFactures();
        break;
      case 'livraisons':
        results = await this.getLivraisons();
        break;
      case 'approvisionnements':
        results = await this.getApprovisionnements();
        break;
      default:
        throw new Error(`Unknown table name: ${tableName}`);
    }
    
    // If no filter provided, return all results
    if (!filter || Object.keys(filter).length === 0) {
      return results;
    }
    
    // Apply filtering - only if there's a limit, otherwise return all items
    let filteredItems = results.getItems();
    
    // Apply limit filter if present
    if (filter.limit && typeof filter.limit === 'number') {
      filteredItems = filteredItems.slice(0, filter.limit);
    }
    
    // Create a new collection of the same type
    // Instead of using clone(), create a new collection of the appropriate type
    let newCollection;
    
    switch (tableName.toLowerCase()) {
      case 'clients':
        newCollection = new ClientCollection();
        break;
      case 'employees':
        newCollection = new EmployeeCollection();
        break;
      case 'agences':
        newCollection = new AgenceCollection();
        break;
      case 'fournisseurs':
        newCollection = new FournisseurCollection();
        break;
      case 'produits':
        newCollection = new ProduitCollection();
        break;
      case 'commandes':
        newCollection = new CommandeCollection();
        break;
      case 'details_commande':
        newCollection = new DetailCommandeCollection();
        break;
      case 'factures':
        newCollection = new FactureCollection();
        break;
      case 'livraisons':
        newCollection = new LivraisonCollection();
        break;
      case 'approvisionnements':
        newCollection = new ApprovisionnementCollection();
        break;
      default:
        throw new Error(`Unknown table name: ${tableName}`);
    }
    
    // Add filtered items to the new collection
    for (const item of filteredItems) {
      newCollection.addItem(item);
    }
    
    return newCollection;
  }

  /**
   * Connect to the XML data source
   * 
   * @returns Whether the connection was successful
   */
  public async connect(): Promise<boolean> {
    try {
      // Read the XML file
      const xmlContent = await fs.readFile(this.xmlFilePath, 'utf-8');
      
      // Parse the XML content
      const parser = new DOMParser({
        errorHandler: {
          warning: (msg: string) => console.warn('XML parse warning:', msg),
          error: (msg: string) => console.error('XML parse error:', msg),
          fatalError: (msg: string) => { throw new Error(`Fatal XML parse error: ${msg}`); }
        }
      });
      
      this.xmlDocument = parser.parseFromString(xmlContent, 'application/xml');
      
      this.connected = true;
      console.log(`Connected to XML data source (${this.xmlFilePath}) successfully.`);
      return true;
    } catch (error) {
      console.error('XML Connection Error:', error);
      this.connected = false;
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to connect to XML data source: ${errorMessage}`);
    }
  }

  /**
   * Disconnect from the data source
   */
  public disconnect(): void {
    this.xmlDocument = null;
    this.connected = false;
    console.log('Disconnected from XML data source.');
  }

  /**
   * Check if connected to the data source
   */
  public isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get the source system identifier
   */
  public getSourceSystem(): string {
    return this.sourceSystem;
  }

  /**
   * Query XML elements using XPath
   * 
   * @param xpathQuery The XPath query to execute
   * @returns Array of matching nodes
   */
  private queryXML(xpathQuery: string): Element[] {
    if (!this.connected || !this.xmlDocument) {
      throw new Error('Not connected to XML data source');
    }
    
    try {
      const nodes = xpath.select(xpathQuery, this.xmlDocument);
      if (Array.isArray(nodes)) {
        return nodes.filter(node => node.nodeType === 1) as Element[];
      }
      return [];
    } catch (error) {
      console.error('XML Query Error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`XML query failed: ${errorMessage}`);
    }
  }

  /**
   * Get text content of an element or attribute
   * 
   * @param element The element to extract from
   * @param selector XPath selector relative to element
   * @param defaultValue Default value if not found
   * @returns The text content or default value
   */
  private getElementTextContent(element: Element, selector: string, defaultValue: string = ''): string {
    try {
      const nodes = xpath.select(selector, element);
      
      // Handle array result
      if (Array.isArray(nodes) && nodes.length > 0) {
        const node = nodes[0] as Node;
        if (node.nodeType === 2) { // Attribute
          return (node as Attr).value || defaultValue;
        } else {
          return node.textContent || defaultValue;
        }
      }
      // Handle single node result
      else if (nodes && typeof nodes === 'object' && 'nodeType' in nodes) {
        const node = nodes as Node;
        if (node.nodeType === 2) { // Attribute
          return (node as Attr).value || defaultValue;
        } else {
          return node.textContent || defaultValue;
        }
      }
      // Handle primitive value
      else if (nodes !== null && nodes !== undefined) {
        return String(nodes);
      }
      
      return defaultValue;
    } catch (error) {
      console.error('XML Element Selection Error:', error);
      return defaultValue;
    }
  }

  // --- Start: XML Element to DataModel Mapping Helpers ---

  private mapXmlElementToClient(element: Element): Client {
    return {
      id: `XML_${this.getElementTextContent(element, '@id')}`,
      sourceSystem: this.sourceSystem,
      nomComplet: this.getElementTextContent(element, 'nom'),
      emailContact: this.getElementTextContent(element, 'courriel'),
      numeroTelephone: this.getElementTextContent(element, 'telephone'),
      adresse: this.getElementTextContent(element, 'adresse'),
    };
  }

  private mapXmlElementToEmployee(element: Element): Employee {
    return {
      id: `XML_${this.getElementTextContent(element, '@id')}`,
      sourceSystem: this.sourceSystem,
      nomComplet: this.getElementTextContent(element, 'nom'),
      email: this.getElementTextContent(element, 'email'),
      // Assuming 'post' and 'agenceRef' might not be directly in the <employe> element based on getEmployees
      // post: this.getElementTextContent(element, 'poste'), // Add if exists
      // agenceRef: `XML_${this.getElementTextContent(element, 'agenceID')}`, // Add if exists
    };
  }

  private mapXmlElementToAgence(element: Element): Agence {
    return {
      id: `XML_${this.getElementTextContent(element, '@id')}`,
      sourceSystem: this.sourceSystem,
      adresse: this.getElementTextContent(element, 'Adresse'),
      ville: this.getElementTextContent(element, 'Ville'),
      // responsableRef: `XML_${this.getElementTextContent(element, 'responsableID')}`, // Add if exists
    };
  }

  private mapXmlElementToFournisseur(element: Element): Fournisseur {
    return {
      id: `XML_${this.getElementTextContent(element, '@id')}`,
      sourceSystem: this.sourceSystem,
      nomFournisseur: this.getElementTextContent(element, 'nom'),
      adresse: this.getElementTextContent(element, 'adresse'),
      numeroTelephone: this.getElementTextContent(element, 'telephone')
    };
  }

  private mapXmlElementToProduit(element: Element): Produit {
    // Note: XML structure for 'quantiteTotale' might differ, adjust XPath if needed
    return {
      id: `XML_${this.getElementTextContent(element, '@id')}`,
      sourceSystem: this.sourceSystem,
      description: this.getElementTextContent(element, 'description'),
      prixCout: parseFloat(this.getElementTextContent(element, 'prix', '0')),
      categorie: this.getElementTextContent(element, 'categorie'),
      quantiteTotale: parseInt(this.getElementTextContent(element, 'quantite', '0'), 10) // Assuming 'quantite' holds total quantity
    };
  }

  private mapXmlElementToCommande(element: Element): Commande {
    return {
      id: `XML_${this.getElementTextContent(element, '@id')}`,
      sourceSystem: this.sourceSystem,
      dateCommande: (new Date(this.getElementTextContent(element, 'date', new Date().toISOString()))).toISOString(),
      clientRef: `XML_${this.getElementTextContent(element, 'clientID')}`,
      employeRef: `XML_${this.getElementTextContent(element, 'employeID')}`, // May be empty if not present
      statut: this.getElementTextContent(element, 'statut'),
      montant: parseFloat(this.getElementTextContent(element, 'montant', '0')),
      modePaiement: this.getElementTextContent(element, 'modePaiement')
    };
  }

  private mapXmlElementToDetailCommande(element: Element): DetailCommande {
    // Assumes <paniers> element structure
    const commandeId = this.getElementTextContent(element, 'id_commande');
    const produitId = this.getElementTextContent(element, 'id_produit');
    return {
      id: `XML_${commandeId}_${produitId}`,
      sourceSystem: this.sourceSystem,
      commandeId: `XML_${commandeId}`,
      produitId: `XML_${produitId}`,
      quantite: parseInt(this.getElementTextContent(element, 'Quantite', '0'), 10),
    };
  }

  private mapXmlElementToFacture(element: Element): Facture {
    return {
      id: `XML_${this.getElementTextContent(element, '@id')}`,
      sourceSystem: this.sourceSystem,
      dateFacture: (new Date(this.getElementTextContent(element, 'date', new Date().toISOString()))).toISOString(),
      commandeRef: `XML_${this.getElementTextContent(element, 'commandeID')}`,
      montantTotal: parseFloat(this.getElementTextContent(element, 'montant', '0')),
    };
  }

  private mapXmlElementToLivraison(element: Element): Livraison {
    // Assumes <Livraison> element structure
    return {
      id: `XML_${this.getElementTextContent(element, '@id')}`,
      sourceSystem: this.sourceSystem,
      commandeRef: `XML_${this.getElementTextContent(element, 'commandeID')}`,
      statut: this.getElementTextContent(element, 'statut'),
      transporteur: this.getElementTextContent(element, 'transporteur'),
      dateEstimee: this.getElementTextContent(element, 'dateEstimee'), // Keep as string, parsing can be done later if needed
    };
  }

  private mapXmlElementToApprovisionnement(element: Element, index: number): Approvisionnement {
     // This mapping is based on the previous potentially incorrect getApprovisionnements.
     // It assumes supply info is within the <produit> element. Needs verification.
     // Using index for a temporary unique ID.
    const produitId = this.getElementTextContent(element, '@id'); // Assuming product ID from <produit>
    const fournisseurId = this.getElementTextContent(element, 'id_fournisseur'); // Assuming this exists within <produit>
    return {
      id: `XML_appro_${produitId}_${fournisseurId || index}`, // More specific ID
      sourceSystem: this.sourceSystem,
      produitId: `XML_${produitId}`,
      fournisseurId: `XML_${fournisseurId}`, // May be empty if 'id_fournisseur' tag doesn't exist
      quantite: parseInt(this.getElementTextContent(element, 'quantite_totale', '0'), 10), // Assuming this represents supply quantity
    };
  }

  // --- End: XML Element to DataModel Mapping Helpers ---


  /**
   * Fetch clients data
   * 
   * @returns Collection of clients
   */
  public async getClients(): Promise<ClientCollection> {
    if (!this.connected) {
      throw new Error('Not connected to XML data source');
    }
    const collection = new ClientCollection();
    const elements = this.queryXML('//client');
    for (const element of elements) {
      collection.addItem(this.mapXmlElementToClient(element));
    }
    return collection;
  }

  /**
   * Fetch employees data
   * 
   * @returns Collection of employees
   */
  public async getEmployees(): Promise<EmployeeCollection> {
    if (!this.connected) {
      throw new Error('Not connected to XML data source');
    }
    
    const collection = new EmployeeCollection();
    
    // Query all employee elements
    const employees = this.queryXML('//employe');
    
    for (const element of employees) {
      collection.addItem(this.mapXmlElementToEmployee(element));
    }
    
    return collection;
  }

  /**
   * Fetch agencies data
   * 
   * @returns Collection of agencies
   */
  public async getAgences(): Promise<AgenceCollection> {
    if (!this.connected) {
      throw new Error('Not connected to XML data source');
    }
    
    const collection = new AgenceCollection();
    
    // Query all agency elements
    const agencies = this.queryXML('//agence');
    
    for (const element of agencies) {
      collection.addItem(this.mapXmlElementToAgence(element));
    }
    
    return collection;
  }

  /**
   * Fetch suppliers data
   * 
   * @returns Collection of suppliers
   */
  public async getFournisseurs(): Promise<FournisseurCollection> {
    if (!this.connected) {
      throw new Error('Not connected to XML data source');
    }
    
    const collection = new FournisseurCollection();
    
    // Query all supplier elements
    const suppliers = this.queryXML('//fournisseur');
    
    for (const element of suppliers) {
      collection.addItem(this.mapXmlElementToFournisseur(element));
    }
    
    return collection;
  }

  /**
   * Fetch products data
   * 
   * @returns Collection of products
   */
  public async getProduits(): Promise<ProduitCollection> {
    if (!this.connected) {
      throw new Error('Not connected to XML data source');
    }
    
    const collection = new ProduitCollection();
    
    // Query all product elements
    const products = this.queryXML('//produit');
    
    for (const element of products) {
      collection.addItem(this.mapXmlElementToProduit(element));
    }
    
    return collection;
  }

  /**
   * Fetch orders data
   * 
   * @returns Collection of orders
   */
  public async getCommandes(): Promise<CommandeCollection> {
    if (!this.connected) {
      throw new Error('Not connected to XML data source');
    }
    
    const collection = new CommandeCollection();
    
    // Query all order elements
    const orders = this.queryXML('//commande');
    
    for (const element of orders) {
      collection.addItem(this.mapXmlElementToCommande(element));
    }
    
    return collection;
  }

  /**
   * Fetch order details data
   * 
   * @returns Collection of order details
   */
  public async getDetailsCommande(): Promise<DetailCommandeCollection> {
    if (!this.connected) {
      throw new Error('Not connected to XML data source');
    }
    
    const collection = new DetailCommandeCollection();
    
    // Query all order detail elements
    const details = this.queryXML('//paniers');
    
    for (const element of details) {
      collection.addItem(this.mapXmlElementToDetailCommande(element));
    }
    
    return collection;
  }

  /**
   * Fetch invoices data
   * 
   * @returns Collection of invoices
   */
  public async getFactures(): Promise<FactureCollection> {
    if (!this.connected) {
      throw new Error('Not connected to XML data source');
    }
    
    const collection = new FactureCollection();
    
    // Query all invoice elements
    const invoices = this.queryXML('//facture');
    
    for (const element of invoices) {
      collection.addItem(this.mapXmlElementToFacture(element));
    }
    
    return collection;
  }

  /**
   * Fetch deliveries data
   * 
   * @returns Collection of deliveries
   */
  public async getLivraisons(): Promise<LivraisonCollection> {
    if (!this.connected) {
      throw new Error('Not connected to XML data source');
    }
    
    const collection = new LivraisonCollection();
    
    // Query all delivery elements
    const deliveries = this.queryXML('//Livraison');
    
    for (const element of deliveries) {
      collection.addItem(this.mapXmlElementToLivraison(element));
    }
    
    return collection;
  }

  /**
   * Fetch supply data
   * 
   * @returns Collection of supply records
   */
  public async getApprovisionnements(): Promise<ApprovisionnementCollection> {
    if (!this.connected) {
      throw new Error('Not connected to XML data source');
    }
    
    const collection = new ApprovisionnementCollection();
    
    // Query all supply elements
    const supplies = this.queryXML('//produit');
    let i = 0;
    for (const element of supplies) {
      collection.addItem(this.mapXmlElementToApprovisionnement(element, i));
      i++;
    }
    
    return collection;
  }
}