--DB: MAGASIN_NEO4J

-- MySQL Schema for E-commerce System based on Neo4j data

-- Drop tables if they exist (in reverse order to avoid foreign key constraints)
DROP TABLE IF EXISTS agence_directeur;
DROP TABLE IF EXISTS employe_agence;
DROP TABLE IF EXISTS employe_commande;
DROP TABLE IF EXISTS commande_produit;
DROP TABLE IF EXISTS produit_fournisseur;
DROP TABLE IF EXISTS livraison;
DROP TABLE IF EXISTS facture;
DROP TABLE IF EXISTS commande;
DROP TABLE IF EXISTS produit;
DROP TABLE IF EXISTS fournisseur;
DROP TABLE IF EXISTS employe;
DROP TABLE IF EXISTS client;
DROP TABLE IF EXISTS agence;

-- Create base tables for all node types
CREATE TABLE client (
    id_client VARCHAR(10) PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    adresse TEXT NOT NULL,
    email VARCHAR(100) NOT NULL,
    telephone VARCHAR(20)
);

CREATE TABLE agence (
    id_agence VARCHAR(10) PRIMARY KEY,
    ville VARCHAR(50) NOT NULL,
    adresse TEXT NOT NULL
);

CREATE TABLE employe (
    id_employe VARCHAR(10) PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    poste VARCHAR(50) NOT NULL,
    salaire INT(50) NOT NULL
);

CREATE TABLE fournisseur (
    id_fournisseur VARCHAR(10) PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    telephone VARCHAR(20),
    adresse TEXT
);

CREATE TABLE produit (
    id_produit VARCHAR(10) PRIMARY KEY,
    description TEXT NOT NULL,
    prix DECIMAL(10,2) NOT NULL,
    categorie VARCHAR(50) NOT NULL
);

CREATE TABLE commande (
    id_commande VARCHAR(10) PRIMARY KEY,
    date DATE NOT NULL,
    montant DECIMAL(10,2) NOT NULL,
    statut VARCHAR(30) NOT NULL,
    mode_paiement VARCHAR(30) NOT NULL,
    id_client VARCHAR(10) NOT NULL,
    FOREIGN KEY (id_client) REFERENCES client(id_client)
);

CREATE TABLE facture (
    id_facture VARCHAR(10) PRIMARY KEY,
    montant_total DECIMAL(10,2) NOT NULL,
    date DATE NOT NULL,
    id_commande VARCHAR(10) NOT NULL,
    FOREIGN KEY (id_commande) REFERENCES commande(id_commande)
);

CREATE TABLE livraison (
    id_livraison VARCHAR(10) PRIMARY KEY,
    transporteur VARCHAR(50) NOT NULL,
    date_estimee DATE NOT NULL,
    statut VARCHAR(30) NOT NULL,
    id_commande VARCHAR(10) NOT NULL,
    FOREIGN KEY (id_commande) REFERENCES commande(id_commande)
);

-- Create junction tables for relationships with properties
CREATE TABLE produit_fournisseur (
    id_produit VARCHAR(10),
    id_fournisseur VARCHAR(10),
    quantite INT NOT NULL,
    PRIMARY KEY (id_produit, id_fournisseur),
    FOREIGN KEY (id_produit) REFERENCES produit(id_produit),
    FOREIGN KEY (id_fournisseur) REFERENCES fournisseur(id_fournisseur)
);

CREATE TABLE commande_produit (
    id_commande VARCHAR(10),
    id_produit VARCHAR(10),
    quantite INT NOT NULL,
    PRIMARY KEY (id_commande, id_produit),
    FOREIGN KEY (id_commande) REFERENCES commande(id_commande),
    FOREIGN KEY (id_produit) REFERENCES produit(id_produit)
);

CREATE TABLE employe_commande (
    id_employe VARCHAR(10),
    id_commande VARCHAR(10),
    PRIMARY KEY (id_employe, id_commande),
    FOREIGN KEY (id_employe) REFERENCES employe(id_employe),
    FOREIGN KEY (id_commande) REFERENCES commande(id_commande)
);

CREATE TABLE employe_agence (
    id_employe VARCHAR(10),
    id_agence VARCHAR(10),
    PRIMARY KEY (id_employe, id_agence),
    FOREIGN KEY (id_employe) REFERENCES employe(id_employe),
    FOREIGN KEY (id_agence) REFERENCES agence(id_agence)
);

CREATE TABLE agence_directeur (
    id_agence VARCHAR(10) PRIMARY KEY,
    id_employe VARCHAR(10) NOT NULL,
    FOREIGN KEY (id_agence) REFERENCES agence(id_agence),
    FOREIGN KEY (id_employe) REFERENCES employe(id_employe)
);