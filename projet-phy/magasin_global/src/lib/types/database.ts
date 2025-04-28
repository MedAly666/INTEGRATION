export interface Client {
  id_client: string;
  nom_complet: string;
  adresse: string | null;
  email_contact: string;
  numero_telephone: string;
  source_system: string;
}

export interface Employee {
  id_employe: string;
  nom_complet: string;
  email: string;
  poste: string | null;
  agence_ref: string | null;
  source_system: string;
}

export interface Agence {
  id_agence: string;
  ville: string;
  adresse: string;
  responsable_ref: string | null;
  source_system: string;
}

export interface Fournisseur {
  id_fournisseur: string;
  nom_fournisseur: string;
  adresse: string;
  numero_telephone: string;
  source_system: string;
}

export interface Produit {
  id_produit: string;
  description: string;
  prix_cout: number;
  categorie: string;
  source_system: string;
}

export interface Commande {
  id_commande: string;
  date_commande: Date;
  montant: number;
  statut: string;
  mode_paiement: string;
  client_ref: string;
  employe_ref: string | null;
  source_system: string;
}

export interface DetailCommande {
  id_commande: string;
  id_produit: string;
  quantite: number;
  source_system: string;
}

export interface Facture {
  id_facture: string;
  montant_total: number;
  date_facture: Date;
  commande_ref: string;
  source_system: string;
}

export interface Livraison {
  id_livraison: string;
  transporteur: string;
  data_estimee: Date | null;
  statut: string;
  commande_ref: string;
  source_system: string;
}

export interface Approvisionnement {
  id_produit: string;
  id_fournisseur: string;
  quantite: number;
  source_system: string;
}

export interface SalesAnalysis {
  month: string;
  order_count: number;
  total_sales: number;
  unique_customers: number;
  source_system: string;
  average_order_value: number;
}

export interface InventoryStatus {
  category: string;
  source_system: string;
  product_count: number;
  total_inventory: number;
  average_price: number;
  min_price: number;
  max_price: number;
}