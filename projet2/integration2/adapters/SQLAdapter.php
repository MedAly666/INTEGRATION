<?php
/**
 * SQLAdapter.php
 * Adapter for SQL data source with real database connection or simulated data
 */

namespace Integration\Adapters;

use Integration\Common\Client;
use Integration\Common\Employee;
use Integration\Common\Agence;
use Integration\Common\Fournisseur;
use Integration\Common\Produit;
use Integration\Common\Commande;
use Integration\Common\DetailCommande;
use Integration\Common\Facture;
use Integration\Common\Livraison;
use Integration\Common\Approvisionnement;

use Integration\Common\ClientCollection;
use Integration\Common\EmployeeCollection;
use Integration\Common\AgenceCollection;
use Integration\Common\FournisseurCollection;
use Integration\Common\ProduitCollection;
use Integration\Common\CommandeCollection;
use Integration\Common\DetailCommandeCollection;
use Integration\Common\FactureCollection;
use Integration\Common\LivraisonCollection;
use Integration\Common\ApprovisionnementCollection;

class SQLAdapter implements IAdapter {
    private $conn;
    private $connected = false;
    private $useSimulatedData = false;
    
    // Database connection parameters
    private $dbHost;
    private $dbName;
    private $dbUser;
    private $dbPass;
    private $dbPort;
    private $sqlFilePath;
    
    /**
     * Constructor - Initialize with connection settings
     * 
     * @param string $host Database hostname
     * @param string $user Database username
     * @param string $pass Database password
     * @param string $name Database name
     * @param int $port Database port
     */
    public function __construct($host = '127.0.0.1', $user = 'root', $pass = 'root', $name = 'MAGASIN_SQL', $port = 3306) {
        $this->dbHost = $host;
        $this->dbUser = $user;
        $this->dbPass = $pass;
        $this->dbName = $name;
        $this->dbPort = $port;
        $this->sqlFilePath = dirname(dirname(dirname(__DIR__))) . '/sql/data-01.sql';
    }
    
    /**
     * Connect to the SQL database
     */
    public function connect() {
        try {
            // Try to connect to the database
            $this->conn = new \PDO("mysql:host={$this->dbHost};port={$this->dbPort};dbname={$this->dbName}", $this->dbUser, $this->dbPass);
            $this->conn->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
            
            // Test connection
            $stmt = $this->conn->query('SELECT 1');
            if ($stmt === false) {
                throw new \Exception("Could not execute test query");
            }
            
            // Check if we need to load data from SQL file
            $tableCount = $this->executeQuery("SHOW TABLES");
            if ($tableCount === null || (is_array($tableCount) && count($tableCount) < 5)) {
                // Database has fewer tables than expected, load schema and data
                $this->loadSQLFromFile();
            }
            
            $this->connected = true;
            $this->useSimulatedData = false;
            return true;
        } catch (\Exception $e) {
            echo "SQL Connection Error: " . $e->getMessage();
            echo "<p>Using simulated SQL data instead.</p>";
            
            $this->useSimulatedData = true;
            $this->connected = true; // We're "connected" but will use simulated data
            return true;  // Return success even though we're using simulated data
        }
    }
    
    /**
     * Load SQL schema and data from files
     */
    private function loadSQLFromFile() {
        // Get absolute paths to schema and data files
        $schemaFile = '/media/medaly/A4B4A33BB4A30F3C/TP/INTEGRATION/projet2/sql/schema-01.sql';
        $dataFile = '/media/medaly/A4B4A33BB4A30F3C/TP/INTEGRATION/projet2/sql/data-01.sql';
        
        echo "<p>Attempting to load schema from: $schemaFile</p>";
        echo "<p>Attempting to load data from: $dataFile</p>";
        
        try {
            // Load schema first
            if (file_exists($schemaFile)) {
                $schemaSql = file_get_contents($schemaFile);
                $this->conn->exec($schemaSql);
                echo "<p>Schema loaded successfully.</p>";
            } else {
                throw new \Exception("Schema file not found: $schemaFile");
            }
            
            // Then load data
            if (file_exists($dataFile)) {
                $dataSql = file_get_contents($dataFile);
                $this->conn->exec($dataSql);
                echo "<p>Data loaded successfully.</p>";
            } else {
                throw new \Exception("Data file not found: $dataFile");
            }
            
            return true;
        } catch (\Exception $e) {
            echo "<p>Error loading SQL files: " . $e->getMessage() . "</p>";
            return false;
        }
    }
    
    /**
     * Disconnect from the data source
     */
    public function disconnect() {
        $this->conn = null;
        $this->connected = false;
    }
    
    /**
     * Get the source system identifier
     */
    public function getSourceSystem(): string {
        return 'SQL';
    }
    
    /**
     * Execute a SQL query on the database
     * 
     * @param string $sql The SQL query to execute
     * @param array $params Optional parameters for the query
     * @return array|null Query results or null if using simulation mode
     */
    private function executeQuery($sql, $params = []) {
        if ($this->useSimulatedData || !$this->connected) {
            return null;
        }
        
        try {
            $stmt = $this->conn->prepare($sql);
            $stmt->execute($params);
            return $stmt->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Exception $e) {
            echo "SQL Query Error: " . $e->getMessage();
            return null;
        }
    }
    
    /**
     * Fetch clients data
     */
    public function getClients(): ClientCollection {
        $collection = new ClientCollection();
        
        if (!$this->useSimulatedData) {
            $results = $this->executeQuery('SELECT * FROM Clients');
            
            if ($results) {
                foreach ($results as $row) {
                    $client = new Client();
                    $client->id = 'SQL_' . $row['id_client'];
                    $client->nomComplet = $row['nom_complet'];
                    $client->adresse = $row['adresse'];
                    $client->emailContact = $row['email_contact'];
                    $client->numeroTelephone = $row['numero_telephone'];
                    $client->sourceSystem = $this->getSourceSystem();
                    
                    $collection->addItem($client);
                }
                return $collection;
            }
        }
        
        // Simulated data if database connection failed or we're in simulation mode
        $simulatedClients = [
            ['id' => '1', 'nom' => 'Martin Dupont', 'adresse' => '15 Rue de la Paix, 75001 Paris', 'email' => 'martin.dupont@email.com', 'telephone' => '01 23 45 67 89'],
            ['id' => '2', 'nom' => 'Sophie Martin', 'adresse' => '8 Avenue des Champs-Élysées, 75008 Paris', 'email' => 'sophie.martin@email.com', 'telephone' => '01 98 76 54 32'],
            ['id' => '3', 'nom' => 'Jean Lefebvre', 'adresse' => '25 Boulevard Haussmann, 75009 Paris', 'email' => 'jean.lefebvre@email.com', 'telephone' => '01 45 67 89 01'],
            ['id' => '4', 'nom' => 'Catherine Dubois', 'adresse' => '10 Rue de Rivoli, 75004 Paris', 'email' => 'catherine.dubois@email.com', 'telephone' => '01 54 32 10 98'],
            ['id' => '5', 'nom' => 'Philippe Moreau', 'adresse' => '5 Place de la République, 75003 Paris', 'email' => 'philippe.moreau@email.com', 'telephone' => '01 67 89 01 23']
        ];
        
        foreach ($simulatedClients as $clientData) {
            $client = new Client();
            $client->id = 'SQL_' . $clientData['id'];
            $client->nomComplet = $clientData['nom'];
            $client->adresse = $clientData['adresse'];
            $client->emailContact = $clientData['email'];
            $client->numeroTelephone = $clientData['telephone'];
            $client->sourceSystem = $this->getSourceSystem();
            
            $collection->addItem($client);
        }
        
        return $collection;
    }
    
    /**
     * Fetch employees data
     */
    public function getEmployees(): EmployeeCollection {
        $collection = new EmployeeCollection();
        
        if (!$this->useSimulatedData) {
            $results = $this->executeQuery('SELECT * FROM Employees');
            
            if ($results) {
                foreach ($results as $row) {
                    $employee = new Employee();
                    $employee->id = 'SQL_' . $row['id_employe'];
                    $employee->nomComplet = $row['nom_complet'];
                    $employee->email = $row['email'];
                    $employee->poste = $row['poste'];
                    $employee->agenceRef = !empty($row['agence_ref']) ? 'SQL_' . $row['agence_ref'] : null;
                    $employee->sourceSystem = $this->getSourceSystem();
                    
                    $collection->addItem($employee);
                }
                return $collection;
            }
        }
        
        // Simulated data if database connection failed or we're in simulation mode
        $simulatedEmployees = [
            ['id' => '1', 'nom' => 'Alexandre Blanc', 'email' => 'alexandre.blanc@company.com', 'poste' => 'Directeur', 'agence_ref' => '1'],
            ['id' => '2', 'nom' => 'Marie Leroy', 'email' => 'marie.leroy@company.com', 'poste' => 'Responsable Commercial', 'agence_ref' => '1'],
            ['id' => '3', 'nom' => 'Thomas Bernard', 'email' => 'thomas.bernard@company.com', 'poste' => 'Vendeur', 'agence_ref' => '2'],
            ['id' => '4', 'nom' => 'Julie Girard', 'email' => 'julie.girard@company.com', 'poste' => 'Responsable Marketing', 'agence_ref' => '2'],
            ['id' => '5', 'nom' => 'Nicolas Petit', 'email' => 'nicolas.petit@company.com', 'poste' => 'Technicien', 'agence_ref' => '3']
        ];
        
        foreach ($simulatedEmployees as $employeeData) {
            $employee = new Employee();
            $employee->id = 'SQL_' . $employeeData['id'];
            $employee->nomComplet = $employeeData['nom'];
            $employee->email = $employeeData['email'];
            $employee->poste = $employeeData['poste'];
            $employee->agenceRef = 'SQL_' . $employeeData['agence_ref'];
            $employee->sourceSystem = $this->getSourceSystem();
            
            $collection->addItem($employee);
        }
        
        return $collection;
    }
    
    /**
     * Fetch agencies data
     */
    public function getAgences(): AgenceCollection {
        $collection = new AgenceCollection();
        
        if (!$this->useSimulatedData) {
            $results = $this->executeQuery('SELECT * FROM Agences');
            
            if ($results) {
                foreach ($results as $row) {
                    $agence = new Agence();
                    $agence->id = 'SQL_' . $row['id_agence'];
                    $agence->ville = $row['ville'];
                    $agence->adresse = $row['adresse'];
                    $agence->responsableRef = !empty($row['responsable_ref']) ? 'SQL_' . $row['responsable_ref'] : null;
                    $agence->sourceSystem = $this->getSourceSystem();
                    
                    $collection->addItem($agence);
                }
                return $collection;
            }
        }
        
        // Simulated data if database connection failed or we're in simulation mode
        $simulatedAgences = [
            ['id' => '1', 'ville' => 'Paris', 'adresse' => '15 Rue de la République, 75001 Paris', 'responsable_ref' => '1'],
            ['id' => '2', 'ville' => 'Lyon', 'adresse' => '8 Place Bellecour, 69002 Lyon', 'responsable_ref' => '2'],
            ['id' => '3', 'ville' => 'Marseille', 'adresse' => '25 Rue Paradis, 13001 Marseille', 'responsable_ref' => '5']
        ];
        
        foreach ($simulatedAgences as $agenceData) {
            $agence = new Agence();
            $agence->id = 'SQL_' . $agenceData['id'];
            $agence->ville = $agenceData['ville'];
            $agence->adresse = $agenceData['adresse'];
            $agence->responsableRef = 'SQL_' . $agenceData['responsable_ref'];
            $agence->sourceSystem = $this->getSourceSystem();
            
            $collection->addItem($agence);
        }
        
        return $collection;
    }
    
    /**
     * Fetch suppliers data
     */
    public function getFournisseurs(): FournisseurCollection {
        $collection = new FournisseurCollection();
        
        if (!$this->useSimulatedData) {
            $results = $this->executeQuery('SELECT * FROM Fournisseurs');
            
            if ($results) {
                foreach ($results as $row) {
                    $fournisseur = new Fournisseur();
                    $fournisseur->id = 'SQL_' . $row['id_fournisseur'];
                    $fournisseur->nomFournisseur = $row['nom_fournisseur'];
                    $fournisseur->adresse = $row['adresse'];
                    $fournisseur->numeroTelephone = $row['numero_telephone'];
                    $fournisseur->sourceSystem = $this->getSourceSystem();
                    
                    $collection->addItem($fournisseur);
                }
                return $collection;
            }
        }
        
        // Simulated data if database connection failed or we're in simulation mode
        $simulatedFournisseurs = [
            ['id' => '1', 'nom' => 'TechSupply', 'adresse' => '35 Rue de l\'Industrie, 92000 Nanterre', 'telephone' => '01 45 67 89 10'],
            ['id' => '2', 'nom' => 'ElectroDistrib', 'adresse' => '12 Avenue des Techniques, 69100 Villeurbanne', 'telephone' => '04 78 90 12 34'],
            ['id' => '3', 'nom' => 'InformatiquePro', 'adresse' => '8 Rue de l\'Innovation, 44000 Nantes', 'telephone' => '02 40 56 78 90'],
            ['id' => '4', 'nom' => 'GlobalTech', 'adresse' => '25 Boulevard Digital, 13008 Marseille', 'telephone' => '04 91 23 45 67']
        ];
        
        foreach ($simulatedFournisseurs as $fournisseurData) {
            $fournisseur = new Fournisseur();
            $fournisseur->id = 'SQL_' . $fournisseurData['id'];
            $fournisseur->nomFournisseur = $fournisseurData['nom'];
            $fournisseur->adresse = $fournisseurData['adresse'];
            $fournisseur->numeroTelephone = $fournisseurData['telephone'];
            $fournisseur->sourceSystem = $this->getSourceSystem();
            
            $collection->addItem($fournisseur);
        }
        
        return $collection;
    }
    
    /**
     * Fetch products data
     */
    public function getProduits(): ProduitCollection {
        $collection = new ProduitCollection();
        
        if (!$this->useSimulatedData) {
            $results = $this->executeQuery('SELECT * FROM Produits');
            
            if ($results) {
                foreach ($results as $row) {
                    $produit = new Produit();
                    $produit->id = 'SQL_' . $row['id_produit'];
                    $produit->description = $row['description'];
                    $produit->prixCout = $row['prix_cout'];
                    $produit->categorie = $row['categorie'];
                    $produit->sourceSystem = $this->getSourceSystem();
                    
                    $collection->addItem($produit);
                }
                return $collection;
            }
        }
        
        // Simulated data if database connection failed or we're in simulation mode
        $simulatedProduits = [
            ['id' => '1', 'description' => 'Ordinateur portable 15"', 'prix' => 899.99, 'categorie' => 'Informatique'],
            ['id' => '2', 'description' => 'Smartphone dernière génération', 'prix' => 749.99, 'categorie' => 'Téléphonie'],
            ['id' => '3', 'description' => 'Imprimante laser couleur', 'prix' => 299.99, 'categorie' => 'Périphériques'],
            ['id' => '4', 'description' => 'Moniteur 27" 4K', 'prix' => 399.99, 'categorie' => 'Périphériques'],
            ['id' => '5', 'description' => 'Tablette tactile 10"', 'prix' => 349.99, 'categorie' => 'Informatique'],
            ['id' => '6', 'description' => 'Disque dur externe 2 To', 'prix' => 119.99, 'categorie' => 'Stockage'],
            ['id' => '7', 'description' => 'Clavier sans fil', 'prix' => 79.99, 'categorie' => 'Périphériques'],
            ['id' => '8', 'description' => 'Souris ergonomique', 'prix' => 49.99, 'categorie' => 'Périphériques']
        ];
        
        foreach ($simulatedProduits as $produitData) {
            $produit = new Produit();
            $produit->id = 'SQL_' . $produitData['id'];
            $produit->description = $produitData['description'];
            $produit->prixCout = $produitData['prix'];
            $produit->categorie = $produitData['categorie'];
            $produit->sourceSystem = $this->getSourceSystem();
            
            $collection->addItem($produit);
        }
        
        return $collection;
    }
    
    /**
     * Fetch orders data
     */
    public function getCommandes(): CommandeCollection {
        $collection = new CommandeCollection();
        
        if (!$this->useSimulatedData) {
            $results = $this->executeQuery('SELECT * FROM Commandes');
            
            if ($results) {
                foreach ($results as $row) {
                    $commande = new Commande();
                    $commande->id = 'SQL_' . $row['id_commande'];
                    $commande->dateCommande = $row['date_commande'];
                    $commande->montant = $row['montant'];
                    $commande->statut = $row['statut'];
                    $commande->modePaiement = $row['mode_paiement'];
                    $commande->clientRef = !empty($row['client_ref']) ? 'SQL_' . $row['client_ref'] : null;
                    $commande->employeRef = !empty($row['employe_ref']) ? 'SQL_' . $row['employe_ref'] : null;
                    $commande->sourceSystem = $this->getSourceSystem();
                    
                    $collection->addItem($commande);
                }
                return $collection;
            }
        }
        
        // Simulated data if database connection failed or we're in simulation mode
        $simulatedCommandes = [
            ['id' => '1', 'date' => '2024-01-15', 'montant' => 1249.98, 'statut' => 'Livrée', 'mode_paiement' => 'Carte bancaire', 'client_id' => '1', 'employe_id' => '2'],
            ['id' => '2', 'date' => '2024-01-20', 'montant' => 749.99, 'statut' => 'En cours de livraison', 'mode_paiement' => 'PayPal', 'client_id' => '2', 'employe_id' => '3'],
            ['id' => '3', 'date' => '2024-01-22', 'montant' => 299.99, 'statut' => 'En préparation', 'mode_paiement' => 'Carte bancaire', 'client_id' => '3', 'employe_id' => '2'],
            ['id' => '4', 'date' => '2024-01-25', 'montant' => 949.97, 'statut' => 'Livrée', 'mode_paiement' => 'Virement bancaire', 'client_id' => '4', 'employe_id' => '3'],
            ['id' => '5', 'date' => '2024-02-01', 'montant' => 499.98, 'statut' => 'En préparation', 'mode_paiement' => 'Carte bancaire', 'client_id' => '5', 'employe_id' => '3']
        ];
        
        foreach ($simulatedCommandes as $commandeData) {
            $commande = new Commande();
            $commande->id = 'SQL_' . $commandeData['id'];
            $commande->dateCommande = $commandeData['date'];
            $commande->montant = $commandeData['montant'];
            $commande->statut = $commandeData['statut'];
            $commande->modePaiement = $commandeData['mode_paiement'];
            $commande->clientRef = 'SQL_' . $commandeData['client_id'];
            $commande->employeRef = 'SQL_' . $commandeData['employe_id'];
            $commande->sourceSystem = $this->getSourceSystem();
            
            $collection->addItem($commande);
        }
        
        return $collection;
    }
    
    /**
     * Fetch order details data
     */
    public function getDetailsCommande(): DetailCommandeCollection {
        $collection = new DetailCommandeCollection();
        
        if (!$this->useSimulatedData) {
            $results = $this->executeQuery('SELECT * FROM Details_Commande');
            
            if ($results) {
                foreach ($results as $row) {
                    $detail = new DetailCommande();
                    $detail->commandeId = 'SQL_' . $row['id_commande'];
                    $detail->produitId = 'SQL_' . $row['id_produit'];
                    $detail->quantite = $row['quantite'];
                    $detail->sourceSystem = $this->getSourceSystem();
                    
                    $collection->addItem($detail);
                }
                return $collection;
            }
        }
        
        // Simulated data if database connection failed or we're in simulation mode
        $simulatedDetails = [
            ['commande_id' => '1', 'produit_id' => '1', 'quantite' => 1],
            ['commande_id' => '1', 'produit_id' => '7', 'quantite' => 2],
            ['commande_id' => '2', 'produit_id' => '2', 'quantite' => 1],
            ['commande_id' => '3', 'produit_id' => '3', 'quantite' => 1],
            ['commande_id' => '4', 'produit_id' => '4', 'quantite' => 1],
            ['commande_id' => '4', 'produit_id' => '6', 'quantite' => 2],
            ['commande_id' => '4', 'produit_id' => '8', 'quantite' => 1],
            ['commande_id' => '5', 'produit_id' => '5', 'quantite' => 1],
            ['commande_id' => '5', 'produit_id' => '8', 'quantite' => 2]
        ];
        
        foreach ($simulatedDetails as $detailData) {
            $detail = new DetailCommande();
            $detail->commandeId = 'SQL_' . $detailData['commande_id'];
            $detail->produitId = 'SQL_' . $detailData['produit_id'];
            $detail->quantite = $detailData['quantite'];
            $detail->sourceSystem = $this->getSourceSystem();
            
            $collection->addItem($detail);
        }
        
        return $collection;
    }
    
    /**
     * Fetch invoices data
     */
    public function getFactures(): FactureCollection {
        $collection = new FactureCollection();
        
        if (!$this->useSimulatedData) {
            $results = $this->executeQuery('SELECT * FROM Factures');
            
            if ($results) {
                foreach ($results as $row) {
                    $facture = new Facture();
                    $facture->id = 'SQL_' . $row['id_facture'];
                    $facture->montantTotal = $row['montant_total'];
                    $facture->dateFacture = $row['date_facture'];
                    $facture->commandeRef = !empty($row['commande_ref']) ? 'SQL_' . $row['commande_ref'] : null;
                    $facture->sourceSystem = $this->getSourceSystem();
                    
                    $collection->addItem($facture);
                }
                return $collection;
            }
        }
        
        // Simulated data if database connection failed or we're in simulation mode
        $simulatedFactures = [
            ['id' => '1', 'montant_total' => 1249.98, 'date' => '2024-01-15', 'commande_id' => '1'],
            ['id' => '2', 'montant_total' => 749.99, 'date' => '2024-01-20', 'commande_id' => '2'],
            ['id' => '3', 'montant_total' => 299.99, 'date' => '2024-01-22', 'commande_id' => '3'],
            ['id' => '4', 'montant_total' => 949.97, 'date' => '2024-01-25', 'commande_id' => '4'],
            ['id' => '5', 'montant_total' => 499.98, 'date' => '2024-02-01', 'commande_id' => '5']
        ];
        
        foreach ($simulatedFactures as $factureData) {
            $facture = new Facture();
            $facture->id = 'SQL_' . $factureData['id'];
            $facture->montantTotal = $factureData['montant_total'];
            $facture->dateFacture = $factureData['date'];
            $facture->commandeRef = 'SQL_' . $factureData['commande_id'];
            $facture->sourceSystem = $this->getSourceSystem();
            
            $collection->addItem($facture);
        }
        
        return $collection;
    }
    
    /**
     * Fetch deliveries data
     */
    public function getLivraisons(): LivraisonCollection {
        $collection = new LivraisonCollection();
        
        if (!$this->useSimulatedData) {
            $results = $this->executeQuery('SELECT * FROM Livraisons');
            
            if ($results) {
                foreach ($results as $row) {
                    $livraison = new Livraison();
                    $livraison->id = 'SQL_' . $row['id_livraison'];
                    $livraison->transporteur = $row['transporteur'];
                    $livraison->dateEstimee = $row['date_estimee']; // Fixed field name from 'data_estimee' to 'date_estimee'
                    $livraison->statut = $row['statut'];
                    $livraison->commandeRef = !empty($row['commande_ref']) ? 'SQL_' . $row['commande_ref'] : null;
                    $livraison->sourceSystem = $this->getSourceSystem();
                    
                    $collection->addItem($livraison);
                }
                return $collection;
            }
        }
        
        // Simulated data if database connection failed or we're in simulation mode
        $simulatedLivraisons = [
            ['id' => '1', 'transporteur' => 'DHL', 'date_estimee' => '2024-01-18', 'statut' => 'Livrée', 'commande_id' => '1'],
            ['id' => '2', 'transporteur' => 'UPS', 'date_estimee' => '2024-01-24', 'statut' => 'En transit', 'commande_id' => '2'],
            ['id' => '3', 'transporteur' => 'Fedex', 'date_estimee' => '2024-01-26', 'statut' => 'En préparation', 'commande_id' => '3'],
            ['id' => '4', 'transporteur' => 'DHL', 'date_estimee' => '2024-01-28', 'statut' => 'Livrée', 'commande_id' => '4'],
            ['id' => '5', 'transporteur' => 'Chronopost', 'date_estimee' => '2024-02-03', 'statut' => 'En préparation', 'commande_id' => '5']
        ];
        
        foreach ($simulatedLivraisons as $livraisonData) {
            $livraison = new Livraison();
            $livraison->id = 'SQL_' . $livraisonData['id'];
            $livraison->transporteur = $livraisonData['transporteur'];
            $livraison->dateEstimee = $livraisonData['date_estimee'];
            $livraison->statut = $livraisonData['statut'];
            $livraison->commandeRef = 'SQL_' . $livraisonData['commande_id'];
            $livraison->sourceSystem = $this->getSourceSystem();
            
            $collection->addItem($livraison);
        }
        
        return $collection;
    }
    
    /**
     * Fetch supply data
     */
    public function getApprovisionnement(): ApprovisionnementCollection {
        $collection = new ApprovisionnementCollection();
        
        if (!$this->useSimulatedData) {
            $results = $this->executeQuery('SELECT * FROM Approvisionnement');
            
            if ($results) {
                foreach ($results as $row) {
                    $approvisionnement = new Approvisionnement();
                    $approvisionnement->produitId = 'SQL_' . $row['id_produit'];
                    $approvisionnement->fournisseurId = 'SQL_' . $row['id_fournisseur'];
                    $approvisionnement->quantite = $row['quantite'];
                    $approvisionnement->sourceSystem = $this->getSourceSystem();
                    
                    $collection->addItem($approvisionnement);
                }
                return $collection;
            }
        }
        
        // Simulated data if database connection failed or we're in simulation mode
        $simulatedApprovisionnement = [
            ['produit_id' => '1', 'fournisseur_id' => '1', 'quantite' => 50],
            ['produit_id' => '2', 'fournisseur_id' => '2', 'quantite' => 75],
            ['produit_id' => '3', 'fournisseur_id' => '3', 'quantite' => 30],
            ['produit_id' => '4', 'fournisseur_id' => '1', 'quantite' => 20],
            ['produit_id' => '5', 'fournisseur_id' => '2', 'quantite' => 40],
            ['produit_id' => '6', 'fournisseur_id' => '1', 'quantite' => 60],
            ['produit_id' => '7', 'fournisseur_id' => '4', 'quantite' => 80],
            ['produit_id' => '8', 'fournisseur_id' => '4', 'quantite' => 100]
        ];
        
        foreach ($simulatedApprovisionnement as $approvData) {
            $approvisionnement = new Approvisionnement();
            $approvisionnement->produitId = 'SQL_' . $approvData['produit_id'];
            $approvisionnement->fournisseurId = 'SQL_' . $approvData['fournisseur_id'];
            $approvisionnement->quantite = $approvData['quantite'];
            $approvisionnement->sourceSystem = $this->getSourceSystem();
            
            $collection->addItem($approvisionnement);
        }
        
        return $collection;
    }
}