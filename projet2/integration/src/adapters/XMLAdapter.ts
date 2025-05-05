/**
 * XMLAdapter.ts
 * Adapter for XML data sources
 */

import fs from 'fs';
import path from 'path';
import { DOMParser } from 'xmldom';
import xpath from 'xpath';
import { IAdapter, QueryFilter, applyTypeScriptFilter } from './IAdapter';
import {
  ClientCollection, Client,
  EmployeeCollection, Employee,
  FournisseurCollection, Fournisseur,
  ProduitCollection, Produit,
  CommandeCollection, Commande,
  DetailCommandeCollection, DetailCommande,
  FactureCollection, Facture,
  LivraisonCollection, Livraison,
  AgenceCollection, Agence
} from '../common/DataModel';
import { SourceDescription, EntityAvailability, SourceCapabilities } from '../common/SourceDescription';
import { formatDate, formatDateTime, parseDate } from '../common/DateUtils';

export class XMLAdapter implements IAdapter {
  private xmlDoc: Document | null = null;
  private connected: boolean = false;
  private sourceSystem: string = 'XML';
  private xmlFilePath: string;

  /**
   * Constructor
   * 
   * @param sourceSystem Source system identifier
   * @param xmlFilePath Path to the XML file
   */
  constructor(
    sourceSystem: string,
    xmlFilePath: string
  ) {
    this.sourceSystem = sourceSystem;
    this.xmlFilePath = xmlFilePath;
  }

  /**
   * Connect to the XML data source (load the XML file)
   */
  public async connect(): Promise<boolean> {
    try {
      console.log(`Opening XML file: ${this.xmlFilePath}`);
      
      // Check if file exists
      if (!fs.existsSync(this.xmlFilePath)) {
        throw new Error(`XML file not found: ${this.xmlFilePath}`);
      }
      
      // Read and parse XML file
      const xmlContent = fs.readFileSync(this.xmlFilePath, 'utf-8');
      const parser = new DOMParser({
        errorHandler: {
          warning: (w) => console.warn(`XML Warning: ${w}`),
          error: (e) => console.error(`XML Error: ${e}`),
          fatalError: (e) => { throw new Error(`XML Fatal Error: ${e}`); }
        }
      });
      
      this.xmlDoc = parser.parseFromString(xmlContent, 'application/xml');
      
      // Simple validation by checking for parse errors
      const errors = xpath.select('//parsererror', this.xmlDoc) as Node[];
      if (errors.length > 0) {
        const errorText = (errors[0] as Element).textContent;
        throw new Error(`XML Parse Error: ${errorText}`);
      }
      
      this.connected = true;
      console.log('Connected to XML data source successfully.');
      return true;
    } catch (error) {
      console.error('XML Connection Error:', error);
      this.connected = false;
      throw new Error(`Failed to connect to XML data source: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Disconnect from the XML data source
   */
  public disconnect(): void {
    this.xmlDoc = null;
    this.connected = false;
    console.log('Disconnected from XML data source.');
  }

  /**
   * Check if connected to the XML data source
   */
  public isConnected(): boolean {
    return this.connected && this.xmlDoc !== null;
  }

  /**
   * Get the source system identifier
   */
  public getSourceSystem(): string {
    return this.sourceSystem;
  }

  /**
   * Execute an XPath query
   * 
   * @param xpathQuery The XPath query
   * @returns Array of matched nodes
   */
  private executeXPathQuery(xpathQuery: string): Element[] {
    if (!this.isConnected()) {
      throw new Error('Not connected to XML data source');
    }
    
    console.log(`Executing XPath query: ${xpathQuery}`);
    
    try {
      const nodes = xpath.select(xpathQuery, this.xmlDoc as Node) as Element[];
      console.log(`XPath query returned ${nodes.length} nodes.`);
      return nodes;
    } catch (error) {
      console.error('XPath Query Error:', error);
      throw new Error(`XPath query failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Convert QueryFilter to XPath expressions
   * 
   * @param entityPath Base XPath for the entity
   * @param filter Query filter
   * @returns XPath query string
   */
  private buildXPathQuery(entityPath: string, filter?: QueryFilter): string {
    if (!filter || (!filter.conditions || filter.conditions.length === 0)) {
      return entityPath;
    }
    
    const conditions: string[] = [];
    
    if (filter.conditions) {
      for (const condition of filter.conditions) {
        if (condition.type === 'binary_expr' && condition.left.type === 'column_ref') {
          const field = this.translateFieldToXml(condition.left.column);
          const operator = condition.operator;
          const value = condition.right.value;
          
          switch (operator.toUpperCase()) {
            case '=':
              conditions.push(`${field}='${this.escapeXPathString(String(value))}'`);
              break;
            case '!=':
              conditions.push(`${field}!='${this.escapeXPathString(String(value))}'`);
              break;
            case '>':
              conditions.push(`${field} > ${value}`);
              break;
            case '<':
              conditions.push(`${field} < ${value}`);
              break;
            case '>=':
              conditions.push(`${field} >= ${value}`);
              break;
            case '<=':
              conditions.push(`${field} <= ${value}`);
              break;
            case 'LIKE':
              if (typeof value === 'string') {
                const escapedValue = this.escapeXPathString(value.replace(/%/g, ''));
                if (value.startsWith('%') && value.endsWith('%')) {
                  conditions.push(`contains(${field},'${escapedValue}')`);
                } else if (value.startsWith('%')) {
                  conditions.push(`ends-with(${field},'${escapedValue}')`);
                } else if (value.endsWith('%')) {
                  conditions.push(`starts-with(${field},'${escapedValue}')`);
                } else {
                  conditions.push(`${field}='${escapedValue}'`);
                }
              }
              break;
            // IN operator would be implemented as multiple OR conditions in XPath
            case 'IN':
              if (Array.isArray(value)) {
                const inConditions = value.map(v => 
                  `${field}='${this.escapeXPathString(String(v))}'`
                );
                conditions.push(`(${inConditions.join(' or ')})`);
              }
              break;
          }
        }
      }
    }
    
    return conditions.length > 0 ? 
      `${entityPath}[${conditions.join(' and ')}]` : 
      entityPath;
  }
  
  /**
   * Escape special characters in XPath string literals
   * 
   * @param str String to escape
   * @returns Escaped string
   */
  private escapeXPathString(str: string): string {
    // XPath strings can be delimited by either single or double quotes
    // Here we escape single quotes since we're using them in our queries
    return str.replace(/'/g, "''");
  }
  
  /**
   * Map between mediator model properties and XML fields
   * 
   * @param property Mediator model property name
   * @returns XML field name
   */
  private translateFieldToXml(property: string): string {
    const propertyMap: Record<string, string> = {
      'idClient': '@id',
      'nomComplet': 'nom',
      'emailContact': 'courriel',
      'numeroTelephone': 'telephone',
      
      'idEmploye': '@id',
      
      'idFournisseur': '@id',
      'nomFournisseur': 'nom',
      
      'idProduit': '@id',
      'prixCout': 'prix',
      
      'idCommande': '@id',
      'dateCommande': 'date',
      'modePaiement': 'mode_paiement',
      'clientRef': '@clientID',
      'employeRef': '@employeID',
      
      'idFacture': '@id',
      'montantTotal': 'montant',
      'dateFacture': 'date',
      'commandeRef': '@commandeID',
      
      'idLivraison': '@id',
      'dateEstimee': '@date_estimee',
    };
    
    return propertyMap[property] || property;
  }

  /**
   * Common method to apply filters and extract XML data
   * 
   * @param entityName The entity name for logging
   * @param xpathBase The base XPath expression
   * @param filter The query filter to apply
   * @param nodeToObject Function to convert XML node to object
   * @returns Filtered results
   */
  private async queryEntityWithFilter<T, C>(
    entityName: string, 
    xpathBase: string, 
    filter: QueryFilter | undefined,
    nodeToObject: (node: Element) => T,
    collectionConstructor: new () => C & { addItem(item: T): void }
  ): Promise<C> {
    if (!this.isConnected()) {
      await this.connect();
    }
    
    console.log(`Querying ${entityName} with filter:`, filter);
    
    const xpathQuery = this.buildXPathQuery(xpathBase, filter);
    console.log(`Generated XPath: ${xpathQuery}`);
    
    const nodes = this.executeXPathQuery(xpathQuery);
    console.log(`Found ${nodes.length} ${entityName}`);

    // Create collection and map XML nodes to objects
    const collection = new collectionConstructor();
    for (const node of nodes) {
      const item = nodeToObject(node);
      collection.addItem(item);
    }
    
    // Apply any additional TypeScript filtering for complex operations not handled by XPath
    // This is useful for aspects of the filter that can't be directly expressed in XPath
    if (filter) {
      const items = (collection as any).getItems();
      const filteredItems = applyTypeScriptFilter(items, filter);
      
      if (filteredItems.length !== items.length) {
        // Create a new collection with the filtered items
        const filteredCollection = new collectionConstructor();
        for (const item of filteredItems) {
          filteredCollection.addItem(item);
        }
        return filteredCollection as C;
      }
    }
    
    return collection;
  }

  /**
   * Execute a filtered query directly on the adapter
   * 
   * @param tableName The entity name to query
   * @param filter Query filter specification
   * @returns Filtered data collection
   */
  public async executeFilteredQuery(tableName: string, filter: QueryFilter): Promise<any> {
    const entityName = tableName.toLowerCase();
    
    switch (entityName) {
      case 'clients':
        return this.getClients(filter);
      case 'employees':
        return this.getEmployees(filter);
      case 'fournisseurs':
        return this.getFournisseurs(filter);
      case 'produits':
        return this.getProduits(filter);
      case 'commandes':
        return this.getCommandes(filter);
      case 'details_commande':
        return this.getDetailsCommande(filter);
      case 'factures':
        return this.getFactures(filter);
      case 'livraisons':
        return this.getLivraisons(filter);
      default:
        throw new Error(`XMLAdapter: Unknown entity type: ${tableName}`);
    }
  }

  /**
   * Get XML node text content safely
   */
  private getNodeText(node: Element, xpath: string, defaultValue: string = ''): string {
    const nodes = this.selectNodeChild(node, xpath);
    return nodes.length > 0 ? nodes[0].textContent || defaultValue : defaultValue;
  }
  
  /**
   * Get XML node attribute safely
   */
  private getNodeAttribute(node: Element, attrName: string, defaultValue: string = ''): string {
    return node.getAttribute(attrName) || defaultValue;
  }
  
  /**
   * Select child nodes with basic XPath
   */
  private selectNodeChild(node: Element, childPath: string): Element[] {
    try {
      return xpath.select(childPath, node) as Element[];
    } catch (error) {
      console.error(`Error selecting node child with path ${childPath}:`, error);
      return [];
    }
  }

  /**
   * Fetch clients data from XML
   * 
   * @param filter Optional query filter
   * @returns Collection of clients
   */
  public async getClients(filter?: QueryFilter): Promise<ClientCollection> {
    return this.queryEntityWithFilter<Client, ClientCollection>(
      'clients',
      '//clients/client',
      filter,
      (node: Element): Client => ({
        idClient: `XML_${this.getNodeAttribute(node, 'id')}`,
        sourceSystem: this.sourceSystem,
        nomComplet: this.getNodeText(node, 'nom'),
        adresse: '',  // XML data might not have this
        emailContact: this.getNodeText(node, 'courriel'),
        numeroTelephone: this.getNodeText(node, 'telephone')
      }),
      ClientCollection
    );
  }

  /**
   * Fetch employees data from XML
   * 
   * @param filter Optional query filter
   * @returns Collection of employees
   */
  public async getEmployees(filter?: QueryFilter): Promise<EmployeeCollection> {
    return this.queryEntityWithFilter<Employee, EmployeeCollection>(
      'employees',
      '//employes/employe',
      filter,
      (node: Element): Employee => ({
        idEmploye: `XML_${this.getNodeAttribute(node, 'id')}`,
        sourceSystem: this.sourceSystem,
        nomComplet: this.getNodeText(node, 'nom'),
        email: this.getNodeText(node, 'email'),
        post: '',  // XML data might not have this
        agenceRef: undefined  // XML data might not have this relationship
      }),
      EmployeeCollection
    );
  }
  
  /**
   * XML data might not contain agencies
   */
  public async getAgences(): Promise<AgenceCollection> {
    // Return empty collection since XML might not have this data
    return new AgenceCollection();
  }

  /**
   * Fetch suppliers data from XML
   * 
   * @param filter Optional query filter
   * @returns Collection of suppliers
   */
  public async getFournisseurs(filter?: QueryFilter): Promise<FournisseurCollection> {
    return this.queryEntityWithFilter<Fournisseur, FournisseurCollection>(
      'fournisseurs',
      '//fournisseurs/fournisseur',
      filter,
      (node: Element): Fournisseur => ({
        idFournisseur: `XML_${this.getNodeAttribute(node, 'id')}`,
        sourceSystem: this.sourceSystem,
        nomFournisseur: this.getNodeText(node, 'nom'),
        adresse: this.getNodeText(node, 'adresse'),
        numeroTelephone: this.getNodeText(node, 'telephone')
      }),
      FournisseurCollection
    );
  }

  /**
   * Fetch products data from XML
   * 
   * @param filter Optional query filter
   * @returns Collection of products
   */
  public async getProduits(filter?: QueryFilter): Promise<ProduitCollection> {
    return this.queryEntityWithFilter<Produit, ProduitCollection>(
      'produits',
      '//produits/produit',
      filter,
      (node: Element): Produit => ({
        idProduit: `XML_${this.getNodeAttribute(node, 'id')}`,
        sourceSystem: this.sourceSystem,
        description: this.getNodeText(node, 'description'),
        prixCout: parseFloat(this.getNodeText(node, 'prix', '0')),
        categorie: this.getNodeText(node, 'categorie')
      }),
      ProduitCollection
    );
  }

  /**
   * Fetch orders data from XML
   * 
   * @param filter Optional query filter
   * @returns Collection of orders
   */
  public async getCommandes(filter?: QueryFilter): Promise<CommandeCollection> {
    return this.queryEntityWithFilter<Commande, CommandeCollection>(
      'commandes',
      '//commandes/commande',
      filter,
      (node: Element): Commande => ({
        idCommande: `XML_${this.getNodeAttribute(node, 'id')}`,
        sourceSystem: this.sourceSystem,
        dateCommande: formatDate(this.getNodeText(node, 'date')),
        montant: parseFloat(this.getNodeText(node, 'montant', '0')),
        statut: this.getNodeText(node, 'statut'),
        modePaiement: this.getNodeText(node, 'mode_paiement'),
        clientRef: `XML_${this.getNodeAttribute(node, 'clientID')}`,
        employeRef: this.getNodeAttribute(node, 'employeID') ? 
          `XML_${this.getNodeAttribute(node, 'employeID')}` : 
          undefined
      }),
      CommandeCollection
    );
  }

  /**
   * Fetch order details data from XML
   * 
   * @param filter Optional query filter
   * @returns Collection of order details
   */
  public async getDetailsCommande(filter?: QueryFilter): Promise<DetailCommandeCollection> {
    return this.queryEntityWithFilter<DetailCommande, DetailCommandeCollection>(
      'details_commande',
      '//paniers/panier',
      filter,
      (node: Element): DetailCommande => {
        const commandeId = this.getNodeAttribute(node, 'id_commande');
        const produitId = this.getNodeAttribute(node, 'id_produit');
        return {
          sourceSystem: this.sourceSystem,
          idCommande: `XML_${commandeId}`,
          idProduit: `XML_${produitId}`,
          quantite: parseInt(this.getNodeText(node, 'nombre', '0'))
        };
      },
      DetailCommandeCollection
    );
  }

  /**
   * Fetch invoices data from XML
   * 
   * @param filter Optional query filter
   * @returns Collection of invoices
   */
  public async getFactures(filter?: QueryFilter): Promise<FactureCollection> {
    return this.queryEntityWithFilter<Facture, FactureCollection>(
      'factures',
      '//factures/facture',
      filter,
      (node: Element): Facture => ({
        idFacture: `XML_${this.getNodeAttribute(node, 'id')}`,
        sourceSystem: this.sourceSystem,
        montantTotal: parseFloat(this.getNodeText(node, 'montant', '0')),
        dateFacture: formatDate(this.getNodeText(node, 'date')),
        commandeRef: `XML_${this.getNodeAttribute(node, 'commandeID')}`
      }),
      FactureCollection
    );
  }

  /**
   * Fetch deliveries data from XML
   * 
   * @param filter Optional query filter
   * @returns Collection of deliveries
   */
  public async getLivraisons(filter?: QueryFilter): Promise<LivraisonCollection> {
    return this.queryEntityWithFilter<Livraison, LivraisonCollection>(
      'livraisons',
      '//livraisons/livraison',
      filter,
      (node: Element): Livraison => ({
        idLivraison: `XML_${this.getNodeAttribute(node, 'id')}`,
        sourceSystem: this.sourceSystem,
        transporteur: this.getNodeText(node, 'transporteur'),
        dateEstimee: this.getNodeAttribute(node, 'date_estimee') ? 
          formatDate(this.getNodeAttribute(node, 'date_estimee')) : 
          undefined,
        statut: this.getNodeText(node, 'statut'),
        commandeRef: `XML_${this.getNodeAttribute(node, 'commandeID')}`
      }),
      LivraisonCollection
    );
  }

  /**
   * XML data might not contain approvisionnement information
   */
  public async getApprovisionnements(): Promise<any> {
    // Return empty collection since XML might not have this data
    return { getItems: () => [], count: () => 0, merge: () => {} };
  }

  /**
   * Convert XML query results to the appropriate collection type
   * This method is a shorthand for queryEntityWithFilter that handles the conversion
   * 
   * @param entityName The entity name
   * @param results Array of XML query results
   * @returns Collection of the appropriate type
   */
  private convertXmlResultToCollection(entityName: string, results: any[]): any {
    // Determine the collection type based on entity name
    switch(entityName.toLowerCase()) {
      case 'clients':
        const clientCollection = new ClientCollection();
        for (const item of results) {
          clientCollection.addItem(item);
        }
        return clientCollection;
        
      case 'employes':
      case 'employees':
        const employeeCollection = new EmployeeCollection();
        for (const item of results) {
          employeeCollection.addItem(item);
        }
        return employeeCollection;
        
      case 'fournisseurs':
        const fournisseurCollection = new FournisseurCollection();
        for (const item of results) {
          fournisseurCollection.addItem(item);
        }
        return fournisseurCollection;
        
      case 'produits':
        const produitCollection = new ProduitCollection();
        for (const item of results) {
          produitCollection.addItem(item);
        }
        return produitCollection;
        
      case 'commandes':
        const commandeCollection = new CommandeCollection();
        for (const item of results) {
          commandeCollection.addItem(item);
        }
        return commandeCollection;
        
      case 'paniers':
      case 'details_commande':
        const detailCommandeCollection = new DetailCommandeCollection();
        for (const item of results) {
          detailCommandeCollection.addItem(item);
        }
        return detailCommandeCollection;
        
      case 'factures':
        const factureCollection = new FactureCollection();
        for (const item of results) {
          factureCollection.addItem(item);
        }
        return factureCollection;
        
      case 'livraisons':
        const livraisonCollection = new LivraisonCollection();
        for (const item of results) {
          livraisonCollection.addItem(item);
        }
        return livraisonCollection;
        
      default:
        console.warn(`No specific collection type for entity: ${entityName}`);
        return results; // Return the raw results if no specific collection type
    }
  }

  /**
   * Get source description for this adapter
   * This provides information about what data is available in this source
   * Following the formal framework (G,S,M) from the course material
   * 
   * @returns Source description
   */
  public getSourceDescription(): SourceDescription {
    // Define capabilities of XML source
    const capabilities: SourceCapabilities = {
      canFilter: true,
      canProject: true,
      canSort: false,     // XML doesn't natively support sorting
      canJoin: false,     // XML doesn't natively support joins
      canAggregate: false, // XML doesn't natively support aggregation
      maxComplexity: 4    // Medium complexity handling
    };
    
    // Define available entities and their attributes
    const entities: EntityAvailability[] = [
      {
        entityName: 'clients',
        isComplete: true,
        attributes: ['id', 'nom', 'courriel', 'telephone']
      },
      {
        entityName: 'employes',
        isComplete: true,
        attributes: ['id', 'nom', 'email']
      },
      {
        entityName: 'fournisseurs',
        isComplete: true,
        attributes: ['id', 'nom', 'adresse', 'telephone']
      },
      {
        entityName: 'produits',
        isComplete: true,
        attributes: ['id', 'description', 'prix', 'categorie']
      },
      {
        entityName: 'commandes',
        isComplete: true,
        attributes: ['id', 'date', 'montant', 'statut', 'mode_paiement', 'clientID', 'employeID']
      },
      {
        entityName: 'paniers',
        isComplete: true,
        attributes: ['id_commande', 'id_produit', 'nombre']
      },
      {
        entityName: 'factures',
        isComplete: true,
        attributes: ['id', 'montant', 'date', 'commandeID']
      },
      {
        entityName: 'livraisons',
        isComplete: true,
        attributes: ['id', 'transporteur', 'statut', 'commandeID']
      }
    ];
    
    return new SourceDescription(
      this.sourceSystem,
      'XML Data Source',
      entities,
      capabilities
    );
  }
  
  /**
   * Check if this adapter can handle a specific query
   * Allows the mediator to determine if this adapter can process the requested operation
   * 
   * @param filter Query filter to check
   * @param entityName Entity/table being queried
   * @returns Whether this adapter can handle the query
   */
  public canHandleQuery(filter: QueryFilter, entityName: string): boolean {
    // Check if this entity exists in our source
    const sourceDesc = this.getSourceDescription();
    
    // Check for entity existence (with name normalization)
    const normalizedEntityName = this.normalizeEntityName(entityName);
    if (!sourceDesc.hasEntity(normalizedEntityName)) {
      return false;
    }
    
    // XML can handle basic filtering but not complex operations
    
    // Check for unsupported operations
    if (filter.groupBy && filter.groupBy.length > 0) {
      return false; // XML doesn't support GROUP BY
    }
    
    if (filter.joins && filter.joins.length > 0) {
      return false; // XML doesn't support JOINs
    }
    
    // Check for complex conditions that XML XPath can't handle
    if (filter.conditions) {
      for (const condition of filter.conditions) {
        if (condition.type === 'binary_expr') {
          const operator = condition.operator.toUpperCase();
          if (['BETWEEN', 'NOT LIKE', 'IS NULL', 'IS NOT NULL'].includes(operator)) {
            return false; // These operations are not supported in basic XPath
          }
        } else if (condition.type !== 'binary_expr') {
          return false; // Only binary expressions are supported
        }
      }
    }
    
    return true;
  }
  
  /**
   * Normalize entity name between global schema and XML source
   * XML files might use slightly different entity names
   * 
   * @param entityName The entity name to normalize
   * @returns Normalized entity name for XML source
   */
  private normalizeEntityName(entityName: string): string {
    const entityMap: Record<string, string> = {
      'clients': 'clients',
      'employees': 'employes',
      'agences': 'agences',     // Not available in XML
      'fournisseurs': 'fournisseurs',
      'produits': 'produits',
      'commandes': 'commandes',
      'details_commande': 'paniers',
      'factures': 'factures',
      'livraisons': 'livraisons',
      'approvisionnements': 'approvisionnements'  // Not available in XML
    };
    
    return entityMap[entityName.toLowerCase()] || entityName.toLowerCase();
  }
  
  /**
   * Translate a global query into source-specific query
   * This follows the GAV approach where queries on the global schema
   * are translated to queries on the source schemas
   * 
   * @param filter Query filter in global schema terms
   * @param entityName Entity name in global schema
   * @returns XPath-specific query object
   */
  public translateQuery(filter: QueryFilter, entityName: string): any {
    // For XML, we'll convert the filter to an XPath expression
    const normalizedEntityName = this.normalizeEntityName(entityName);
    let xpathBase = '';
    
    // Map entity name to XPath base pattern
    switch (normalizedEntityName) {
      case 'clients':
        xpathBase = '//clients/client';
        break;
      case 'employes':
        xpathBase = '//employes/employe';
        break;
      case 'fournisseurs':
        xpathBase = '//fournisseurs/fournisseur';
        break;
      case 'produits':
        xpathBase = '//produits/produit';
        break;
      case 'commandes':
        xpathBase = '//commandes/commande';
        break;
      case 'paniers':
        xpathBase = '//paniers/panier';
        break;
      case 'factures':
        xpathBase = '//factures/facture';
        break;
      case 'livraisons':
        xpathBase = '//livraisons/livraison';
        break;
      default:
        xpathBase = `//${normalizedEntityName}/${normalizedEntityName.substring(0, normalizedEntityName.length - 1)}`;
    }
    
    // Convert filter to XPath
    const xpathQuery = this.buildXPathQuery(xpathBase, filter);
    
    return {
      xpath: xpathQuery,
      entityName: normalizedEntityName
    };
  }
}