/**
 * DataModel.ts
 * Contains all data models and collection classes
 */

// Base entity with common fields
export interface BaseEntity {
  sourceSystem: string;
}

// Client entity
export interface Client extends BaseEntity {
  idClient: string;
  nomComplet: string;
  emailContact?: string;
  adresse?: string;
  numeroTelephone?: string;
}

// Create a constructable Client class that implements the interface
export class Client implements Client {
  idClient: string;
  nomComplet: string;
  emailContact?: string;
  adresse?: string;
  numeroTelephone?: string;
  sourceSystem: string;

  constructor(data: Partial<Client> = {}) {
    this.idClient = data.idClient || '';
    this.nomComplet = data.nomComplet || '';
    this.emailContact = data.emailContact;
    this.adresse = data.adresse;
    this.numeroTelephone = data.numeroTelephone;
    this.sourceSystem = data.sourceSystem || 'unknown';
  }
}

// Employee entity
export interface Employee extends BaseEntity {
  idEmploye: string;
  nomComplet: string;
  email?: string;
  post?: string;
  salaire?: number;
  agenceRef?: string;
}

// Create a constructable Employee class
export class Employee implements Employee {
  idEmploye: string;
  nomComplet: string;
  email?: string;
  post?: string;
  salaire?: number;
  agenceRef?: string;
  sourceSystem: string;

  constructor(data: Partial<Employee> = {}) {
    this.idEmploye = data.idEmploye || '';
    this.nomComplet = data.nomComplet || '';
    this.email = data.email;
    this.post = data.post;
    this.salaire = data.salaire;
    this.agenceRef = data.agenceRef;
    this.sourceSystem = data.sourceSystem || 'unknown';
  }
}

// Agence entity
export interface Agence extends BaseEntity {
  idAgence: string;
  adresse?: string;
  ville: string;
  responsableRef?: string;
}

// Create a constructable Agence class
export class Agence implements Agence {
  idAgence: string;
  adresse?: string;
  ville: string;
  responsableRef?: string;
  sourceSystem: string;

  constructor(data: Partial<Agence> = {}) {
    this.idAgence = data.idAgence || '';
    this.adresse = data.adresse;
    this.ville = data.ville || '';
    this.responsableRef = data.responsableRef;
    this.sourceSystem = data.sourceSystem || 'unknown';
  }
}

// Fournisseur entity
export interface Fournisseur extends BaseEntity {
  idFournisseur: string;
  nomFournisseur: string;
  adresse?: string;
  numeroTelephone?: string;
}

// Create a constructable Fournisseur class
export class Fournisseur implements Fournisseur {
  idFournisseur: string;
  nomFournisseur: string;
  adresse?: string;
  numeroTelephone?: string;
  sourceSystem: string;

  constructor(data: Partial<Fournisseur> = {}) {
    this.idFournisseur = data.idFournisseur || '';
    this.nomFournisseur = data.nomFournisseur || '';
    this.adresse = data.adresse;
    this.numeroTelephone = data.numeroTelephone;
    this.sourceSystem = data.sourceSystem || 'unknown';
  }
}

// Produit entity
export interface Produit extends BaseEntity {
  idProduit: string;
  description: string;
  prixCout: number;
  categorie: string;
  quantiteTotale?: number;
}

// Create a constructable Produit class
export class Produit implements Produit {
  idProduit: string;
  description: string;
  prixCout: number;
  categorie: string;
  quantiteTotale?: number;
  sourceSystem: string;

  constructor(data: Partial<Produit> = {}) {
    this.idProduit = data.idProduit || '';
    this.description = data.description || '';
    this.prixCout = data.prixCout || 0;
    this.categorie = data.categorie || '';
    this.quantiteTotale = data.quantiteTotale;
    this.sourceSystem = data.sourceSystem || 'unknown';
  }
}

// Commande entity
export interface Commande extends BaseEntity {
  idCommande: string;
  dateCommande: string;
  clientRef: string;
  employeRef?: string;
  statut?: string;
  montant?: number;
  modePaiement?: string;
}

// Create a constructable Commande class
export class Commande implements Commande {
  idCommande: string;
  dateCommande: string;
  clientRef: string;
  employeRef?: string;
  statut?: string;
  montant?: number;
  modePaiement?: string;
  sourceSystem: string;

  constructor(data: Partial<Commande> = {}) {
    this.idCommande = data.idCommande || '';
    this.dateCommande = data.dateCommande || '';
    this.clientRef = data.clientRef || '';
    this.employeRef = data.employeRef;
    this.statut = data.statut;
    this.montant = data.montant;
    this.modePaiement = data.modePaiement;
    this.sourceSystem = data.sourceSystem || 'unknown';
  }
}

// DetailCommande entity
export interface DetailCommande extends BaseEntity {
  idCommande: string;
  idProduit: string;
  quantite: number;
}

// Create a constructable DetailCommande class
export class DetailCommande implements DetailCommande {
  idCommande: string;
  idProduit: string;
  quantite: number;
  sourceSystem: string;

  constructor(data: Partial<DetailCommande> = {}) {
    this.idCommande = data.idCommande || '';
    this.idProduit = data.idProduit || '';
    this.quantite = data.quantite || 0;
    this.sourceSystem = data.sourceSystem || 'unknown';
  }
}

// Facture entity
export interface Facture extends BaseEntity {
  idFacture: string;
  dateFacture: string;
  commandeRef: string;
  montantTotal: number;
}

// Create a constructable Facture class
export class Facture implements Facture {
  idFacture: string;
  dateFacture: string;
  commandeRef: string;
  montantTotal: number;
  sourceSystem: string;

  constructor(data: Partial<Facture> = {}) {
    this.idFacture = data.idFacture || '';
    this.dateFacture = data.dateFacture || '';
    this.commandeRef = data.commandeRef || '';
    this.montantTotal = data.montantTotal || 0;
    this.sourceSystem = data.sourceSystem || 'unknown';
  }
}

// Livraison entity
export interface Livraison extends BaseEntity {
  idLivraison: string;
  transporteur: string;
  dateEstimee: string | undefined; 
  commandeRef: string;
  statut?: string;
}

// Create a constructable Livraison class
export class Livraison implements Livraison {
  idLivraison: string;
  transporteur: string;
  dateEstimee: string | undefined;
  commandeRef: string;
  statut?: string;
  sourceSystem: string;

  constructor(data: Partial<Livraison> = {}) {
    this.idLivraison = data.idLivraison || '';
    this.transporteur = data.transporteur || '';
    this.dateEstimee = data.dateEstimee;
    this.commandeRef = data.commandeRef || '';
    this.statut = data.statut;
    this.sourceSystem = data.sourceSystem || 'unknown';
  }
}

// Approvisionnement entity
export interface Approvisionnement extends BaseEntity {
  idProduit: string;
  idFournisseur: string;
  quantite: number;
}

// Create a constructable Approvisionnement class
export class Approvisionnement implements Approvisionnement {
  idProduit: string;
  idFournisseur: string;
  quantite: number;
  sourceSystem: string;

  constructor(data: Partial<Approvisionnement> = {}) {
    this.idProduit = data.idProduit || '';
    this.idFournisseur = data.idFournisseur || '';
    this.quantite = data.quantite || 0;
    this.sourceSystem = data.sourceSystem || 'unknown';
  }
}

// Base collection class
export abstract class BaseCollection<T extends BaseEntity> {
  protected items: T[] = [];

  constructor(items: T[] = []) {
    this.items = items;
  }

  public getItems(): T[] {
    return this.items;
  }

  public addItem(item: T): void {
    this.items.push(item);
  }

  public count(): number {
    return this.items.length;
  }

  public merge(otherCollection: BaseCollection<T>): void {
    this.items = [...this.items, ...otherCollection.getItems()];
  }
}

// Specific collection classes
export class ClientCollection extends BaseCollection<Client> {}
export class EmployeeCollection extends BaseCollection<Employee> {}
export class AgenceCollection extends BaseCollection<Agence> {}
export class FournisseurCollection extends BaseCollection<Fournisseur> {}
export class ProduitCollection extends BaseCollection<Produit> {}
export class CommandeCollection extends BaseCollection<Commande> {}
export class DetailCommandeCollection extends BaseCollection<DetailCommande> {}
export class FactureCollection extends BaseCollection<Facture> {}
export class LivraisonCollection extends BaseCollection<Livraison> {}
export class ApprovisionnementCollection extends BaseCollection<Approvisionnement> {}