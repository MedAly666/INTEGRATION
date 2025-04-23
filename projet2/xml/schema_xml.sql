-- DB: MAGASIN_XML

-- Drop tables if they exist (in reverse order to avoid foreign key constraints)
DROP TABLE IF EXISTS livraisons;
DROP TABLE IF EXISTS factures;
DROP TABLE IF EXISTS paniers;
DROP TABLE IF EXISTS commandes;
DROP TABLE IF EXISTS produits;
DROP TABLE IF EXISTS fournisseurs;
DROP TABLE IF EXISTS clients;
DROP TABLE IF EXISTS employes;

-- Create clients table
CREATE TABLE clients (
    id VARCHAR(50) PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    courriel VARCHAR(100) NOT NULL,
    telephone VARCHAR(20)
);

-- Create employes table
CREATE TABLE employes (
    id VARCHAR(50) PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL
);

-- Create fournisseurs table
CREATE TABLE fournisseurs (
    id VARCHAR(50) PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    telephone VARCHAR(20),
    adresse TEXT
);

-- Create produits table
CREATE TABLE produits (
    id VARCHAR(50) PRIMARY KEY,
    description TEXT NOT NULL,
    prix DECIMAL(10,2) NOT NULL,
    categorie VARCHAR(50) NOT NULL,
    quantite_totale INT NOT NULL,
    id_fournisseur VARCHAR(50) NOT NULL,
    FOREIGN KEY (id_fournisseur) REFERENCES fournisseurs(id)
);

-- Create commandes table
CREATE TABLE commandes (
    id VARCHAR(50) PRIMARY KEY,
    date DATE NOT NULL,
    montant DECIMAL(10,2) NOT NULL,
    statut VARCHAR(50) NOT NULL,
    mode_paiement VARCHAR(50) NOT NULL,
    clientID VARCHAR(50) NOT NULL,
    employeID VARCHAR(50),
    FOREIGN KEY (clientID) REFERENCES clients(id),
    FOREIGN KEY (employeID) REFERENCES employes(id)
);

-- Create paniers table (junction table between commandes and produits)
CREATE TABLE paniers (
    id_commande VARCHAR(50),
    id_produit VARCHAR(50),
    nombre INT NOT NULL,
    PRIMARY KEY (id_commande, id_produit),
    FOREIGN KEY (id_commande) REFERENCES commandes(id),
    FOREIGN KEY (id_produit) REFERENCES produits(id)
);

-- Create factures table
CREATE TABLE factures (
    id VARCHAR(50) PRIMARY KEY,
    montant DECIMAL(10,2) NOT NULL,
    date DATE NOT NULL,
    commandeID VARCHAR(50) NOT NULL,
    FOREIGN KEY (commandeID) REFERENCES commandes(id)
);

-- Create livraisons table
CREATE TABLE livraisons (
    id VARCHAR(50) PRIMARY KEY,
    transporteur VARCHAR(100) NOT NULL,
    statut VARCHAR(50) NOT NULL,
    commandeID VARCHAR(50) NOT NULL,
    FOREIGN KEY (commandeID) REFERENCES commandes(id)
);