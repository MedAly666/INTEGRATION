/**
 * XMLAdapter.ts
 * Adapter for XML data sources
 */

import { IAdapter } from './IAdapter';
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
    
    // Query all client elements
    const clients = this.queryXML('//client');
    
    for (const element of clients) {
      const client: Client = {
        id: `XML_${this.getElementTextContent(element, '@id')}`,
        sourceSystem: this.sourceSystem,
        nomComplet: this.getElementTextContent(element, 'nom'),
        emailContact: this.getElementTextContent(element, 'courriel'),
        numeroTelephone: this.getElementTextContent(element, 'telephone'),
        adresse: this.getElementTextContent(element, 'adresse'),
      };
      
      collection.addItem(client);
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
      const employee: Employee = {
        id: `XML_${this.getElementTextContent(element, '@id')}`,
        sourceSystem: this.sourceSystem,
        nomComplet: this.getElementTextContent(element, 'nom'),
        email: this.getElementTextContent(element, 'email'),
      };
      
      collection.addItem(employee);
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
      const agence: Agence = {
        id: `XML_${this.getElementTextContent(element, '@id')}`,
        sourceSystem: this.sourceSystem,
        adresse: this.getElementTextContent(element, 'Adresse'),
        ville: this.getElementTextContent(element, 'Ville'),
      };
      
      collection.addItem(agence);
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
      const fournisseur: Fournisseur = {
        id: `XML_${this.getElementTextContent(element, '@id')}`,
        sourceSystem: this.sourceSystem,
        nomFournisseur: this.getElementTextContent(element, 'nom'),
        adresse: this.getElementTextContent(element, 'adresse'),
        numeroTelephone: this.getElementTextContent(element, 'telephone')
      };
      
      collection.addItem(fournisseur);
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
      const produit: Produit = {
        id: `XML_${this.getElementTextContent(element, '@id')}`,
        sourceSystem: this.sourceSystem,
        description: this.getElementTextContent(element, 'description'),
        prixCout: parseFloat(this.getElementTextContent(element, 'prix')),
        categorie: this.getElementTextContent(element, 'categorie'),
        quantiteTotale: parseInt(this.getElementTextContent(element, 'quantite'), 10)
      };
      
      collection.addItem(produit);
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
      const commande: Commande = {
        id: `XML_${this.getElementTextContent(element, '@id')}`,
        sourceSystem: this.sourceSystem,
        dateCommande: (new Date(this.getElementTextContent(element, 'date'))).toISOString(),
        clientRef: `XML_${this.getElementTextContent(element, 'clientID')}`,
        employeRef: `XML_${this.getElementTextContent(element, 'employeID')}`,
        statut: this.getElementTextContent(element, 'statut'),
        montant: parseFloat(this.getElementTextContent(element, 'montant')),
        modePaiement: this.getElementTextContent(element, 'modePaiement')
      };
      
      collection.addItem(commande);
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
      const commandeId = this.getElementTextContent(element, 'id_commande');
      const produitId = this.getElementTextContent(element, 'id_produit');
      
      const detail: DetailCommande = {
        id: `XML_${commandeId}_${produitId}`,
        sourceSystem: this.sourceSystem,
        commandeId: `XML_${commandeId}`,
        produitId: `XML_${produitId}`,
        quantite: parseInt(this.getElementTextContent(element, 'Quantite'), 10),
      };
      
      collection.addItem(detail);
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
      const facture: Facture = {
        id: `XML_${this.getElementTextContent(element, '@id')}`,
        sourceSystem: this.sourceSystem,
        dateFacture: (new Date(this.getElementTextContent(element, 'date'))).toISOString(),
        commandeRef: `XML_${this.getElementTextContent(element, 'commandeID')}`,
        montantTotal: parseFloat(this.getElementTextContent(element, 'montant')),
      };
      
      collection.addItem(facture);
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
      const livraison: Livraison = {
        id: `XML_${this.getElementTextContent(element, '@id')}`,
        sourceSystem: this.sourceSystem,
        commandeRef: `XML_${this.getElementTextContent(element, 'commandeID')}`,
        statut: this.getElementTextContent(element, 'statut'),
        transporteur: this.getElementTextContent(element, 'transporteur'),
        dateEstimee: this.getElementTextContent(element, 'dateEstimee'),
      };
      
      collection.addItem(livraison);
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
      const approvisionnement: Approvisionnement = {
        id: `XML_${i}`,
        sourceSystem: this.sourceSystem,
        produitId: `XML_${this.getElementTextContent(element, 'id')}`,
        fournisseurId: `XML_${this.getElementTextContent(element, 'id_fournisseur')}`,
        quantite: parseInt(this.getElementTextContent(element, 'quantite_totale'), 10),
      };
      
      collection.addItem(approvisionnement);

      i++;
    }
    
    return collection;
  }
}