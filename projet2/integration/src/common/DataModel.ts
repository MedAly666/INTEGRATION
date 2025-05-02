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

// Employee entity
export interface Employee extends BaseEntity {
  idEmploye: string;
  nomComplet: string;
  email?: string;
  post?: string;
  salaire?: number;
  agenceRef?: string;
}

// Agence entity
export interface Agence extends BaseEntity {
  idAgence: string;
  adresse?: string;
  ville: string;
  responsableRef?: string;
}

// Fournisseur entity
export interface Fournisseur extends BaseEntity {
  idFournisseur: string;
  nomFournisseur: string;
  adresse?: string;
  numeroTelephone?: string;
}

// Produit entity
export interface Produit extends BaseEntity {
  idProduit: string;
  description: string;
  prixCout: number;
  categorie: string;
  quantiteTotale?: number;
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

// DetailCommande entity
export interface DetailCommande extends BaseEntity {
  idDetail: string;
  idCommande: string;
  idProduit: string;
  quantite: number;
}

// Facture entity
export interface Facture extends BaseEntity {
  idFacture: string;
  dateFacture: string;
  commandeRef: string;
  montantTotal: number;
}

// Livraison entity
export interface Livraison extends BaseEntity {
  idLivraison: string;
  transporteur: string;
  dateEstimee: string | undefined; // Note: Using data_estimee as in global schema (typo in original schema)
  commandeRef: string;
  statut?: string;
}

// Approvisionnement entity
export interface Approvisionnement extends BaseEntity {
  idApprovisionnement: string;
  idProduit: string;
  idFournisseur: string;
  quantite: number;
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