/**
 * XMLAdapter.ts
 * Adapter for XML data sources
 */

import { IAdapter, QueryFilter, applyTypeScriptFilter } from './IAdapter';
import * as fs from 'fs/promises';
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

// Using shared applyTypeScriptFilter from IAdapter

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

    const lowerTableName = tableName.toLowerCase();
    console.log(`XMLAdapter: executeFilteredQuery for ${lowerTableName} (TS filtering)`);

    let allItemsCollection: any;
    let CollectionConstructor: any;

    // 1. Fetch ALL data using the appropriate get* method
    try {
      switch (lowerTableName) {
        case 'clients':
          allItemsCollection = await this.getClients();
          CollectionConstructor = ClientCollection;
          break;
        case 'employees':
          allItemsCollection = await this.getEmployees();
          CollectionConstructor = EmployeeCollection;
          break;
        case 'agences':
          allItemsCollection = await this.getAgences();
          CollectionConstructor = AgenceCollection;
          break;
        case 'fournisseurs':
          allItemsCollection = await this.getFournisseurs();
          CollectionConstructor = FournisseurCollection;
          break;
        case 'produits':
          allItemsCollection = await this.getProduits();
          CollectionConstructor = ProduitCollection;
          break;
        case 'commandes':
          allItemsCollection = await this.getCommandes();
          CollectionConstructor = CommandeCollection;
          break;
        case 'details_commande':
          allItemsCollection = await this.getDetailsCommande();
          CollectionConstructor = DetailCommandeCollection;
          break;
        case 'factures':
          allItemsCollection = await this.getFactures();
          CollectionConstructor = FactureCollection;
          break;
        case 'livraisons':
          allItemsCollection = await this.getLivraisons();
          CollectionConstructor = LivraisonCollection;
          break;
        case 'approvisionnements':
          allItemsCollection = await this.getApprovisionnements();
          CollectionConstructor = ApprovisionnementCollection;
          break;
        default:
          throw new Error(`XMLAdapter: Unknown table name: ${tableName}`);
      }
    } catch (error) {
        console.error(`XMLAdapter: Error fetching all data for ${tableName}:`, error);
        throw error;
    }

    const allItems = allItemsCollection.getItems();
    console.log(`XMLAdapter: Fetched ${allItems.length} total items for ${tableName}.`);

    // 2. Apply filtering, sorting, limit, projection using TypeScript helper
    const filteredItems = applyTypeScriptFilter(allItems, filter);
    console.log(`XMLAdapter: ${filteredItems.length} items after TS filtering for ${tableName}.`);

    // 3. Create a new collection of the correct type and add filtered items
    const finalCollection = new CollectionConstructor();
    for (const item of filteredItems) {
      finalCollection.addItem(item);
    }

    return finalCollection;
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
      idClient: `XML_${this.getElementTextContent(element, '@id')}`,
      sourceSystem: this.sourceSystem,
      nomComplet: this.getElementTextContent(element, 'nom'),
      emailContact: this.getElementTextContent(element, 'courriel'),
      numeroTelephone: this.getElementTextContent(element, 'telephone'),
      adresse: this.getElementTextContent(element, 'adresse'),
    };
  }

  private mapXmlElementToEmployee(element: Element): Employee {
    return {
      idEmploye: `XML_${this.getElementTextContent(element, '@id')}`,
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
      idAgence: `XML_${this.getElementTextContent(element, '@id')}`,
      sourceSystem: this.sourceSystem,
      adresse: this.getElementTextContent(element, 'Adresse'),
      ville: this.getElementTextContent(element, 'Ville'),
      // responsableRef: `XML_${this.getElementTextContent(element, 'responsableID')}`, // Add if exists
    };
  }

  private mapXmlElementToFournisseur(element: Element): Fournisseur {
    return {
      idFournisseur: `XML_${this.getElementTextContent(element, '@id')}`,
      sourceSystem: this.sourceSystem,
      nomFournisseur: this.getElementTextContent(element, 'nom'),
      adresse: this.getElementTextContent(element, 'adresse'),
      numeroTelephone: this.getElementTextContent(element, 'telephone')
    };
  }

  private mapXmlElementToProduit(element: Element): Produit {
    // Note: XML structure for 'quantiteTotale' might differ, adjust XPath if needed
    return {
      idProduit: `XML_${this.getElementTextContent(element, '@id')}`,
      sourceSystem: this.sourceSystem,
      description: this.getElementTextContent(element, 'description'),
      prixCout: parseFloat(this.getElementTextContent(element, 'prix', '0')),
      categorie: this.getElementTextContent(element, 'categorie'),
      quantiteTotale: parseInt(this.getElementTextContent(element, 'quantite', '0'), 10) // Assuming 'quantite' holds total quantity
    };
  }

  private mapXmlElementToCommande(element: Element): Commande {
    return {
      idCommande: `XML_${this.getElementTextContent(element, '@id')}`,
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
      idDetail: `XML_${commandeId}_${produitId}`,
      sourceSystem: this.sourceSystem,
      idCommande: `XML_${commandeId}`,
      idProduit: `XML_${produitId}`,
      quantite: parseInt(this.getElementTextContent(element, 'Quantite', '0'), 10),
    };
  }

  private mapXmlElementToFacture(element: Element): Facture {
    return {
      idFacture: `XML_${this.getElementTextContent(element, '@id')}`,
      sourceSystem: this.sourceSystem,
      dateFacture: (new Date(this.getElementTextContent(element, 'date', new Date().toISOString()))).toISOString(),
      commandeRef: `XML_${this.getElementTextContent(element, 'commandeID')}`,
      montantTotal: parseFloat(this.getElementTextContent(element, 'montant', '0')),
    };
  }

  private mapXmlElementToLivraison(element: Element): Livraison {
    // Assumes <Livraison> element structure
    return {
      idLivraison: `XML_${this.getElementTextContent(element, '@id')}`,
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
      idApprovisionnement: `XML_appro_${produitId}_${fournisseurId || index}`, // More specific ID
      sourceSystem: this.sourceSystem,
      idProduit: `XML_${produitId}`,
      idFournisseur: `XML_${fournisseurId}`, // May be empty if 'id_fournisseur' tag doesn't exist
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