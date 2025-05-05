-- DB: MAGASIN_SQL

-- Create the Clients table
CREATE TABLE IF NOT EXISTS Clients (
    id_client INT PRIMARY KEY AUTO_INCREMENT,
    nom_complet VARCHAR(255),
    adresse VARCHAR(255),
    email_contact VARCHAR(255),
    numero_telephone VARCHAR(20)
);

-- Create the Fournisseurs table
CREATE TABLE IF NOT EXISTS Fournisseurs (
    id_fournisseur INT PRIMARY KEY AUTO_INCREMENT,
    nom_fournisseur VARCHAR(255),
    numero_telephone VARCHAR(20),
    adresse VARCHAR(255)
);

-- Create the Produits table
CREATE TABLE IF NOT EXISTS Produits (
    id_produit INT PRIMARY KEY AUTO_INCREMENT,
    prix_cout FLOAT,
    description VARCHAR(255),
    categorie VARCHAR(100)
);

-- Create base Employees table without foreign key first
CREATE TABLE IF NOT EXISTS Employees (
    id_employe INT PRIMARY KEY AUTO_INCREMENT,
    nom_complet VARCHAR(255),
    email VARCHAR(255),
    poste VARCHAR(100),
    agence_ref INT NULL
);

-- Create the Agences table
CREATE TABLE IF NOT EXISTS Agences (
    id_agence INT PRIMARY KEY AUTO_INCREMENT,
    ville VARCHAR(255),
    adresse VARCHAR(255),
    responsable_ref INT,
    CONSTRAINT fk_agence_employee FOREIGN KEY (responsable_ref) 
        REFERENCES Employees(id_employe) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Now add the foreign key to Employees if it doesn't exist
ALTER TABLE Employees
ADD CONSTRAINT fk_employee_agence
FOREIGN KEY (agence_ref) REFERENCES Agences(id_agence) ON DELETE SET NULL ON UPDATE CASCADE;

-- Create the Commandes table
CREATE TABLE IF NOT EXISTS Commandes (
    id_commande INT PRIMARY KEY AUTO_INCREMENT,
    date_commande DATE,
    montant DECIMAL(10, 2),
    statut VARCHAR(50),
    mode_paiement VARCHAR(50),
    client_ref INT,
    employe_ref INT,
    CONSTRAINT fk_commande_client FOREIGN KEY (client_ref) 
        REFERENCES Clients(id_client) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_commande_employee FOREIGN KEY (employe_ref) 
        REFERENCES Employees(id_employe) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create the Details_Commande table
CREATE TABLE IF NOT EXISTS Details_Commande (
    id_commande INT,
    id_produit INT,
    quantite INT,
    CONSTRAINT fk_details_commande FOREIGN KEY (id_commande) 
        REFERENCES Commandes(id_commande) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_details_produit FOREIGN KEY (id_produit) 
        REFERENCES Produits(id_produit) ON DELETE RESTRICT ON UPDATE CASCADE,
    PRIMARY KEY (id_commande, id_produit)
);

-- Create the Factures table
CREATE TABLE IF NOT EXISTS Factures (
    id_facture INT PRIMARY KEY AUTO_INCREMENT,
    montant_total DECIMAL(10, 2),
    date_facture DATE,
    commande_ref INT,
    CONSTRAINT fk_facture_commande FOREIGN KEY (commande_ref) 
        REFERENCES Commandes(id_commande) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create the Livraisons table
CREATE TABLE IF NOT EXISTS Livraisons (
    id_livraison INT PRIMARY KEY AUTO_INCREMENT,
    transporteur VARCHAR(255),
    date_estimee DATE,
    statut VARCHAR(50),
    commande_ref INT,
    CONSTRAINT fk_livraison_commande FOREIGN KEY (commande_ref) 
        REFERENCES Commandes(id_commande) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create the Approvisionnement table
CREATE TABLE IF NOT EXISTS Approvisionnement (
    id_produit INT,
    id_fournisseur INT,
    quantite INT,
    CONSTRAINT fk_appro_produit FOREIGN KEY (id_produit) 
        REFERENCES Produits(id_produit) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_appro_fournisseur FOREIGN KEY (id_fournisseur) 
        REFERENCES Fournisseurs(id_fournisseur) ON DELETE RESTRICT ON UPDATE CASCADE,
    PRIMARY KEY (id_produit, id_fournisseur)
);