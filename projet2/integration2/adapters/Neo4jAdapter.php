<?php
/**
 * Neo4jAdapter.php
 * Adapter for Neo4j graph database using the Neo4j PHP client
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

class Neo4jAdapter implements IAdapter {
    private $client;
    private $connected = false;
    private $useRealConnection = false;
    private $cqlFilePath;
    
    // Neo4j connection settings
    private $uri = 'bolt://127.0.0.1:7687';
    private $username = 'neo4j';
    private $password = 'neo4j';
    
    /**
     * Constructor - Initialize with connection settings
     * 
     * @param bool $useRealConnection Whether to use a real Neo4j database connection (true) or simulated data (false)
     * @param string|null $uri Neo4j connection URI (e.g., bolt://localhost:7687)
     * @param string|null $username Neo4j username
     * @param string|null $password Neo4j password
     */
    public function __construct($useRealConnection = false, $uri = null, $username = null, $password = null) {
        $this->useRealConnection = $useRealConnection;
        $this->cqlFilePath = dirname(dirname(dirname(__DIR__))) . '/neo4j/data-03.cql';
        
        // Override default connection settings if provided
        if (!empty($uri)) $this->uri = $uri;
        if (!empty($username)) $this->username = $username;
        if (!empty($password)) $this->password = $password;
    }
    
    /**
     * Connect to the Neo4j graph database
     */
    public function connect() {
        try {
            if ($this->useRealConnection) {
                // Check if the Neo4j PHP client library is available
                if (!class_exists('\Laudis\Neo4j\ClientBuilder')) {
                    throw new \Exception("Neo4j PHP client library not found. Please install it with: composer require laudis/neo4j-php-client");
                }
                
                // Use the Neo4j PHP client library to connect
                $this->client = \Laudis\Neo4j\ClientBuilder::create()
                    ->withDriver('bolt', $this->uri, $this->username, $this->password)
                    ->build();
                
                // Test the connection
                $result = $this->client->run('RETURN 1 as test');
                if (empty($result)) {
                    throw new \Exception("Could not connect to Neo4j database");
                }
                
                // Check if we need to load data from CQL file
                $result = $this->client->run('MATCH (n) RETURN count(n) as count');
                $count = $result[0]->get('count');
                if ($count < 5) {
                    // Database is empty or has very few nodes, load data from CQL file
                    $this->loadDataFromCqlFile();
                }
            }
            // Either way, we consider ourselves connected
            $this->connected = true;
            return true;
        } catch (\Exception $e) {
            echo "Neo4j Connection Error: " . $e->getMessage();
            echo "<p>Using simulated Neo4j data instead.</p>";
            $this->useRealConnection = false;
            $this->connected = true; // We'll work with simulated data
            return true; // Return success even though we're using simulated data
        }
    }
    
    /**
     * Load data from CQL file into the Neo4j database
     */
    private function loadDataFromCqlFile() {
        try {
            if (!file_exists($this->cqlFilePath)) {
                throw new \Exception("CQL file not found: " . $this->cqlFilePath);
            }
            
            echo "<p>Attempting to load data from CQL file: " . $this->cqlFilePath . "</p>";
            
            $cqlContent = file_get_contents($this->cqlFilePath);
            if (empty($cqlContent)) {
                throw new \Exception("CQL file is empty");
            }
            
            // Split the CQL content into individual statements
            $statements = $this->splitCqlStatements($cqlContent);
            
            // Execute each statement
            foreach ($statements as $statement) {
                if (!empty(trim($statement))) {
                    $this->client->run(trim($statement));
                }
            }
            
            echo "<p>Successfully loaded Neo4j data from CQL file</p>";
            return true;
        } catch (\Exception $e) {
            echo "<p>Error loading CQL file: " . $e->getMessage() . "</p>";
            $this->useRealConnection = false; // Fall back to simulated data
            return false;
        }
    }
    
    /**
     * Split CQL content into individual statements based on semicolons
     * 
     * @param string $cqlContent The full content of the CQL file
     * @return array Array of individual CQL statements
     */
    private function splitCqlStatements($cqlContent) {
        // Remove comments and split by semicolons
        $lines = explode("\n", $cqlContent);
        $cleanedContent = '';
        
        foreach ($lines as $line) {
            // Remove comments starting with //
            $line = preg_replace('/\/\/.*$/', '', $line);
            $cleanedContent .= $line . "\n";
        }
        
        // Split by semicolon, but keep in mind that semicolons can appear within quotes
        $statements = [];
        $currentStatement = '';
        $inSingleQuote = false;
        $inDoubleQuote = false;
        
        for ($i = 0; $i < strlen($cleanedContent); $i++) {
            $char = $cleanedContent[$i];
            
            if ($char === "'" && ($i == 0 || $cleanedContent[$i-1] !== '\\')) {
                $inSingleQuote = !$inSingleQuote;
            } else if ($char === '"' && ($i == 0 || $cleanedContent[$i-1] !== '\\')) {
                $inDoubleQuote = !$inDoubleQuote;
            }
            
            if ($char === ';' && !$inSingleQuote && !$inDoubleQuote) {
                // End of statement
                $statements[] = $currentStatement;
                $currentStatement = '';
            } else {
                $currentStatement .= $char;
            }
        }
        
        // Add the last statement if it doesn't end with semicolon
        if (!empty(trim($currentStatement))) {
            $statements[] = $currentStatement;
        }
        
        return $statements;
    }
    
    /**
     * Disconnect from the data source
     */
    public function disconnect() {
        $this->client = null;
        $this->connected = false;
    }
    
    /**
     * Get the source system identifier
     */
    public function getSourceSystem(): string {
        return 'NEO4J';
    }
    
    /**
     * Execute a Cypher query on the Neo4j database
     * 
     * @param string $query The Cypher query to execute
     * @param array $parameters Optional parameters for the query
     * @return mixed Query results or null if not connected or simulation mode
     */
    private function executeCypherQuery($query, $parameters = []) {
        if (!$this->connected || !$this->useRealConnection) {
            return null;
        }
        
        try {
            return $this->client->run($query, $parameters);
        } catch (\Exception $e) {
            echo "Cypher Query Error: " . $e->getMessage();
            return null;
        }
    }
    
    /**
     * Fetch clients data - Using Cypher queries to retrieve data from Neo4j
     */
    public function getClients(): ClientCollection {
        $collection = new ClientCollection();
        
        if ($this->useRealConnection && $this->connected) {
            // Use actual Neo4j connection to get clients
            $query = "MATCH (c:Client) RETURN 
                      c.id_client as id, 
                      c.nom as nom, 
                      c.adresse as adresse, 
                      c.email as email, 
                      c.téléphone as telephone";
            
            $result = $this->executeCypherQuery($query);
            
            if ($result) {
                foreach ($result as $record) {
                    $client = new Client();
                    $client->id = 'NEO_' . $record->get('id');
                    $client->nomComplet = $record->get('nom');
                    $client->adresse = $record->get('adresse');
                    $client->emailContact = $record->get('email');
                    $client->numeroTelephone = $record->get('telephone');
                    $client->sourceSystem = $this->getSourceSystem();
                    
                    $collection->addItem($client);
                }
                return $collection;
            }
        }
        
        // Fallback to simulated data if no connection or query failed
        $clients = [
            ['id' => '1', 'nom' => 'Jean Dubois', 'adresse' => '23 Rue du Commerce, 75015 Paris', 'email' => 'jean.dubois@gmail.com', 'telephone' => '06 12 34 56 78'],
            ['id' => '2', 'nom' => 'Marie Leroy', 'adresse' => '45 Avenue Victor Hugo, 69003 Lyon', 'email' => 'marie.leroy@yahoo.fr', 'telephone' => '07 23 45 67 89'],
            ['id' => '3', 'nom' => 'Pierre Lefebvre', 'adresse' => '12 Boulevard des Capucines, 13001 Marseille', 'email' => 'p.lefebvre@hotmail.com', 'telephone' => '06 34 56 78 90'],
            ['id' => '4', 'nom' => 'Emma Garcia', 'adresse' => '78 Rue de la Paix, 44000 Nantes', 'email' => 'emma.garcia@gmail.com', 'telephone' => '07 45 67 89 01'],
            ['id' => '5', 'nom' => 'Antoine Martin', 'adresse' => '34 Avenue Foch, 67000 Strasbourg', 'email' => 'a.martin@outlook.com', 'telephone' => '06 56 78 90 12']
        ];
        
        foreach ($clients as $clientData) {
            $client = new Client();
            $client->id = 'NEO_' . $clientData['id'];
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
        
        if ($this->useRealConnection && $this->connected) {
            // Use actual Neo4j connection to get employees
            $query = "MATCH (e:Employé)
                      OPTIONAL MATCH (e)-[:TRAVAILLE_DANS]->(a:Agence)
                      RETURN e.id_employe as id,
                             e.nom as nom,
                             e.email as email,
                             e.poste as poste,
                             a.id_agence as agence_id";
            
            $result = $this->executeCypherQuery($query);
            
            if ($result) {
                foreach ($result as $record) {
                    $employee = new Employee();
                    $employee->id = 'NEO_' . $record->get('id');
                    $employee->nomComplet = $record->get('nom');
                    $employee->email = $record->get('email');
                    $employee->poste = $record->get('poste');
                    $employee->agenceRef = $record->get('agence_id') ? 'NEO_' . $record->get('agence_id') : null;
                    $employee->sourceSystem = $this->getSourceSystem();
                    
                    $collection->addItem($employee);
                }
                return $collection;
            }
        }
        
        // Fallback to simulated data if no connection or query failed
        $employees = [
            ['id' => '1', 'nom' => 'Martin Dupont', 'email' => 'martin.dupont@example.com', 'poste' => 'Directeur', 'agence_id' => '1'],
            ['id' => '2', 'nom' => 'Sophie Laurent', 'email' => 'sophie.laurent@example.com', 'poste' => 'Directeur Commercial', 'agence_id' => '1'],
            ['id' => '3', 'nom' => 'Thomas Petit', 'email' => 'thomas.petit@example.com', 'poste' => 'Responsable Logistique', 'agence_id' => '2'],
            ['id' => '4', 'nom' => 'Julie Moreau', 'email' => 'julie.moreau@example.com', 'poste' => 'Chargée de Clientèle', 'agence_id' => '2'],
            ['id' => '5', 'nom' => 'Luc Bernard', 'email' => 'luc.bernard@example.com', 'poste' => 'Directeur', 'agence_id' => '3'],
            ['id' => '6', 'nom' => 'Claire Durand', 'email' => 'claire.durand@example.com', 'poste' => 'Conseillère Commerciale', 'agence_id' => '3']
        ];
        
        foreach ($employees as $employeeData) {
            $employee = new Employee();
            $employee->id = 'NEO_' . $employeeData['id'];
            $employee->nomComplet = $employeeData['nom'];
            $employee->email = $employeeData['email'];
            $employee->poste = $employeeData['poste'];
            $employee->agenceRef = 'NEO_' . $employeeData['agence_id'];
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
        
        if ($this->useRealConnection && $this->connected) {
            // Use actual Neo4j connection to get agencies
            $query = "MATCH (a:Agence)
                      OPTIONAL MATCH (a)-[:DIRIGEE_PAR]->(e:Employé)
                      RETURN a.id_agence as id,
                             a.ville as ville,
                             a.adresse as adresse,
                             e.id_employe as responsable_id";
            
            $result = $this->executeCypherQuery($query);
            
            if ($result) {
                foreach ($result as $record) {
                    $agence = new Agence();
                    $agence->id = 'NEO_' . $record->get('id');
                    $agence->ville = $record->get('ville');
                    $agence->adresse = $record->get('adresse');
                    $agence->responsableRef = $record->get('responsable_id') ? 'NEO_' . $record->get('responsable_id') : null;
                    $agence->sourceSystem = $this->getSourceSystem();
                    
                    $collection->addItem($agence);
                }
                return $collection;
            }
        }
        
        // Fallback to simulated data if no connection or query failed
        $agences = [
            ['id' => '1', 'ville' => 'Paris', 'adresse' => '123 Avenue des Champs-Élysées, 75008 Paris', 'responsable_id' => '1'],
            ['id' => '2', 'ville' => 'Lyon', 'adresse' => '45 Rue de la République, 69002 Lyon', 'responsable_id' => '2'],
            ['id' => '3', 'ville' => 'Marseille', 'adresse' => '78 La Canebière, 13001 Marseille', 'responsable_id' => '5']
        ];
        
        foreach ($agences as $agenceData) {
            $agence = new Agence();
            $agence->id = 'NEO_' . $agenceData['id'];
            $agence->ville = $agenceData['ville'];
            $agence->adresse = $agenceData['adresse'];
            $agence->responsableRef = 'NEO_' . $agenceData['responsable_id'];
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
        
        if ($this->useRealConnection && $this->connected) {
            // Use actual Neo4j connection to get suppliers
            $query = "MATCH (f:Fournisseur)
                      RETURN f.id_fournisseur as id,
                             f.nom as nom,
                             f.téléphone as telephone,
                             f.adresse as adresse";
            
            $result = $this->executeCypherQuery($query);
            
            if ($result) {
                foreach ($result as $record) {
                    $fournisseur = new Fournisseur();
                    $fournisseur->id = 'NEO_' . $record->get('id');
                    $fournisseur->nomFournisseur = $record->get('nom');
                    $fournisseur->adresse = $record->get('adresse');
                    $fournisseur->numeroTelephone = $record->get('telephone');
                    $fournisseur->sourceSystem = $this->getSourceSystem();
                    
                    $collection->addItem($fournisseur);
                }
                return $collection;
            }
        }
        
        // Fallback to simulated data if no connection or query failed
        $fournisseurs = [
            ['id' => '1', 'nom' => 'ElectroTech', 'telephone' => '01 45 67 89 10', 'adresse' => '56 Rue de l\'Innovation, 92100 Boulogne'],
            ['id' => '2', 'nom' => 'MobileFrance', 'telephone' => '02 34 56 78 90', 'adresse' => '12 Boulevard Digital, 69003 Lyon'],
            ['id' => '3', 'nom' => 'InfoSolutions', 'telephone' => '03 22 33 44 55', 'adresse' => '78 Avenue Technologique, 31000 Toulouse'],
            ['id' => '4', 'nom' => 'AccessoiresPro', 'telephone' => '04 55 66 77 88', 'adresse' => '34 Rue des Composants, 44000 Nantes']
        ];
        
        foreach ($fournisseurs as $fournisseurData) {
            $fournisseur = new Fournisseur();
            $fournisseur->id = 'NEO_' . $fournisseurData['id'];
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
        
        if ($this->useRealConnection && $this->connected) {
            // Use actual Neo4j connection to get products
            $query = "MATCH (p:Produit)
                      RETURN p.id_produit as id,
                             p.description as description,
                             p.prix as prix,
                             p.catégorie as categorie";
            
            $result = $this->executeCypherQuery($query);
            
            if ($result) {
                foreach ($result as $record) {
                    $produit = new Produit();
                    $produit->id = 'NEO_' . $record->get('id');
                    $produit->description = $record->get('description');
                    $produit->prixCout = $record->get('prix');
                    $produit->categorie = $record->get('categorie');
                    $produit->sourceSystem = $this->getSourceSystem();
                    
                    $collection->addItem($produit);
                }
                return $collection;
            }
        }
        
        // Fallback to simulated data if no connection or query failed
        $produits = [
            ['id' => '1', 'description' => 'Smartphone Galaxy S22', 'prix' => 899.99, 'categorie' => 'Téléphonie'],
            ['id' => '2', 'description' => 'Ordinateur portable XPS 15', 'prix' => 1499.99, 'categorie' => 'Informatique'],
            ['id' => '3', 'description' => 'Tablette iPad Air', 'prix' => 699.99, 'categorie' => 'Téléphonie'],
            ['id' => '4', 'description' => 'Écran 27" 4K', 'prix' => 349.99, 'categorie' => 'Informatique'],
            ['id' => '5', 'description' => 'Casque sans fil', 'prix' => 199.99, 'categorie' => 'Audio'],
            ['id' => '6', 'description' => 'Clavier mécanique', 'prix' => 129.99, 'categorie' => 'Périphériques'],
            ['id' => '7', 'description' => 'Souris gaming', 'prix' => 89.99, 'categorie' => 'Périphériques'],
            ['id' => '8', 'description' => 'Enceinte bluetooth', 'prix' => 149.99, 'categorie' => 'Audio'],
            ['id' => '9', 'description' => 'Webcam HD', 'prix' => 79.99, 'categorie' => 'Périphériques'],
            ['id' => '10', 'description' => 'Hub USB-C', 'prix' => 49.99, 'categorie' => 'Connectique']
        ];
        
        foreach ($produits as $produitData) {
            $produit = new Produit();
            $produit->id = 'NEO_' . $produitData['id'];
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
        
        if ($this->useRealConnection && $this->connected) {
            // Use actual Neo4j connection to get orders
            $query = "MATCH (c:Client)-[:PASSE]->(o:Commande)
                      OPTIONAL MATCH (e:Employé)-[:GERE]->(o)
                      RETURN o.id_commande as id,
                             o.date as date,
                             o.montant as montant,
                             o.statut as statut,
                             o.mode_paiement as mode_paiement,
                             c.id_client as client_id,
                             e.id_employe as employe_id";
            
            $result = $this->executeCypherQuery($query);
            
            if ($result) {
                foreach ($result as $record) {
                    $commande = new Commande();
                    $commande->id = 'NEO_' . $record->get('id');
                    $commande->dateCommande = $record->get('date');
                    $commande->montant = $record->get('montant');
                    $commande->statut = $record->get('statut');
                    $commande->modePaiement = $record->get('mode_paiement');
                    $commande->clientRef = 'NEO_' . $record->get('client_id');
                    $commande->employeRef = $record->get('employe_id') ? 'NEO_' . $record->get('employe_id') : null;
                    $commande->sourceSystem = $this->getSourceSystem();
                    
                    $collection->addItem($commande);
                }
                return $collection;
            }
        }
        
        // Fallback to simulated data if no connection or query failed
        $commandes = [
            ['id' => '1', 'date' => '2024-02-10', 'montant' => 1599.98, 'statut' => 'Livrée', 'mode_paiement' => 'Carte Bancaire', 'client_id' => '1', 'employe_id' => '4'],
            ['id' => '2', 'date' => '2024-02-15', 'montant' => 2199.97, 'statut' => 'En préparation', 'mode_paiement' => 'PayPal', 'client_id' => '2', 'employe_id' => '6'],
            ['id' => '3', 'date' => '2024-02-20', 'montant' => 349.99, 'statut' => 'Expédiée', 'mode_paiement' => 'Carte Bancaire', 'client_id' => '3', 'employe_id' => '4'],
            ['id' => '4', 'date' => '2024-02-22', 'montant' => 279.98, 'statut' => 'Livrée', 'mode_paiement' => 'Virement', 'client_id' => '4', 'employe_id' => '6'],
            ['id' => '5', 'date' => '2024-03-01', 'montant' => 899.99, 'statut' => 'En préparation', 'mode_paiement' => 'Carte Bancaire', 'client_id' => '5', 'employe_id' => '6']
        ];
        
        foreach ($commandes as $commandeData) {
            $commande = new Commande();
            $commande->id = 'NEO_' . $commandeData['id'];
            $commande->dateCommande = $commandeData['date'];
            $commande->montant = $commandeData['montant'];
            $commande->statut = $commandeData['statut'];
            $commande->modePaiement = $commandeData['mode_paiement'];
            $commande->clientRef = 'NEO_' . $commandeData['client_id'];
            $commande->employeRef = 'NEO_' . $commandeData['employe_id'];
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
        
        if ($this->useRealConnection && $this->connected) {
            // Use actual Neo4j connection to get order details
            $query = "MATCH (o:Commande)-[d:DETAIL]->(p:Produit)
                      RETURN o.id_commande as commande_id,
                             p.id_produit as produit_id,
                             d.quantité as quantite";
            
            $result = $this->executeCypherQuery($query);
            
            if ($result) {
                foreach ($result as $record) {
                    $detail = new DetailCommande();
                    $detail->commandeId = 'NEO_' . $record->get('commande_id');
                    $detail->produitId = 'NEO_' . $record->get('produit_id');
                    $detail->quantite = $record->get('quantite');
                    $detail->sourceSystem = $this->getSourceSystem();
                    
                    $collection->addItem($detail);
                }
                return $collection;
            }
        }
        
        // Fallback to simulated data if no connection or query failed
        $details = [
            ['commande_id' => '1', 'produit_id' => '1', 'quantite' => 1],
            ['commande_id' => '1', 'produit_id' => '5', 'quantite' => 3],
            ['commande_id' => '2', 'produit_id' => '2', 'quantite' => 1],
            ['commande_id' => '2', 'produit_id' => '8', 'quantite' => 2],
            ['commande_id' => '2', 'produit_id' => '10', 'quantite' => 4],
            ['commande_id' => '3', 'produit_id' => '4', 'quantite' => 1],
            ['commande_id' => '4', 'produit_id' => '6', 'quantite' => 1],
            ['commande_id' => '4', 'produit_id' => '9', 'quantite' => 2],
            ['commande_id' => '5', 'produit_id' => '1', 'quantite' => 1]
        ];
        
        foreach ($details as $detailData) {
            $detail = new DetailCommande();
            $detail->commandeId = 'NEO_' . $detailData['commande_id'];
            $detail->produitId = 'NEO_' . $detailData['produit_id'];
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
        
        if ($this->useRealConnection && $this->connected) {
            // Use actual Neo4j connection to get invoices
            $query = "MATCH (o:Commande)-[:FACTURE]->(f:Facture)
                      RETURN f.id_facture as id,
                             f.montant_total as montant_total,
                             f.date as date,
                             o.id_commande as commande_id";
            
            $result = $this->executeCypherQuery($query);
            
            if ($result) {
                foreach ($result as $record) {
                    $facture = new Facture();
                    $facture->id = 'NEO_' . $record->get('id');
                    $facture->montantTotal = $record->get('montant_total');
                    $facture->dateFacture = $record->get('date');
                    $facture->commandeRef = 'NEO_' . $record->get('commande_id');
                    $facture->sourceSystem = $this->getSourceSystem();
                    
                    $collection->addItem($facture);
                }
                return $collection;
            }
        }
        
        // Fallback to simulated data if no connection or query failed
        $factures = [
            ['id' => '1', 'montant_total' => 1599.98, 'date' => '2024-02-10', 'commande_id' => '1'],
            ['id' => '2', 'montant_total' => 2199.97, 'date' => '2024-02-15', 'commande_id' => '2'],
            ['id' => '3', 'montant_total' => 349.99, 'date' => '2024-02-20', 'commande_id' => '3'],
            ['id' => '4', 'montant_total' => 279.98, 'date' => '2024-02-22', 'commande_id' => '4'],
            ['id' => '5', 'montant_total' => 899.99, 'date' => '2024-03-01', 'commande_id' => '5']
        ];
        
        foreach ($factures as $factureData) {
            $facture = new Facture();
            $facture->id = 'NEO_' . $factureData['id'];
            $facture->montantTotal = $factureData['montant_total'];
            $facture->dateFacture = $factureData['date'];
            $facture->commandeRef = 'NEO_' . $factureData['commande_id'];
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
        
        if ($this->useRealConnection && $this->connected) {
            // Use actual Neo4j connection to get deliveries
            $query = "MATCH (o:Commande)-[:LIVREE_PAR]->(l:Livraison)
                      RETURN l.id_livraison as id,
                             l.transporteur as transporteur,
                             l.date_estimee as date_estimee,
                             l.statut as statut,
                             o.id_commande as commande_id";
            
            $result = $this->executeCypherQuery($query);
            
            if ($result) {
                foreach ($result as $record) {
                    $livraison = new Livraison();
                    $livraison->id = 'NEO_' . $record->get('id');
                    $livraison->transporteur = $record->get('transporteur');
                    $livraison->dateEstimee = $record->get('date_estimee');
                    $livraison->statut = $record->get('statut');
                    $livraison->commandeRef = 'NEO_' . $record->get('commande_id');
                    $livraison->sourceSystem = $this->getSourceSystem();
                    
                    $collection->addItem($livraison);
                }
                return $collection;
            }
        }
        
        // Fallback to simulated data if no connection or query failed
        $livraisons = [
            ['id' => '1', 'transporteur' => 'Chronopost', 'date_estimee' => '2024-02-12', 'statut' => 'Livrée', 'commande_id' => '1'],
            ['id' => '2', 'transporteur' => 'DHL', 'date_estimee' => '2024-02-18', 'statut' => 'En préparation', 'commande_id' => '2'],
            ['id' => '3', 'transporteur' => 'UPS', 'date_estimee' => '2024-02-23', 'statut' => 'En transit', 'commande_id' => '3'],
            ['id' => '4', 'transporteur' => 'Chronopost', 'date_estimee' => '2024-02-24', 'statut' => 'Livrée', 'commande_id' => '4'],
            ['id' => '5', 'transporteur' => 'DHL', 'date_estimee' => '2024-03-04', 'statut' => 'En préparation', 'commande_id' => '5']
        ];
        
        foreach ($livraisons as $livraisonData) {
            $livraison = new Livraison();
            $livraison->id = 'NEO_' . $livraisonData['id'];
            $livraison->transporteur = $livraisonData['transporteur'];
            $livraison->dateEstimee = $livraisonData['date_estimee'];
            $livraison->statut = $livraisonData['statut'];
            $livraison->commandeRef = 'NEO_' . $livraisonData['commande_id'];
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
        
        if ($this->useRealConnection && $this->connected) {
            // Use actual Neo4j connection to get supplies
            $query = "MATCH (p:Produit)-[f:FOURNI_PAR]->(s:Fournisseur)
                      RETURN p.id_produit as produit_id,
                             s.id_fournisseur as fournisseur_id,
                             f.quantité as quantite";
            
            $result = $this->executeCypherQuery($query);
            
            if ($result) {
                foreach ($result as $record) {
                    $approvisionnement = new Approvisionnement();
                    $approvisionnement->produitId = 'NEO_' . $record->get('produit_id');
                    $approvisionnement->fournisseurId = 'NEO_' . $record->get('fournisseur_id');
                    $approvisionnement->quantite = $record->get('quantite');
                    $approvisionnement->sourceSystem = $this->getSourceSystem();
                    
                    $collection->addItem($approvisionnement);
                }
                return $collection;
            }
        }
        
        // Fallback to simulated data if no connection or query failed
        $approvisionnements = [
            ['produit_id' => '1', 'fournisseur_id' => '2', 'quantite' => 50],
            ['produit_id' => '2', 'fournisseur_id' => '1', 'quantite' => 30],
            ['produit_id' => '3', 'fournisseur_id' => '2', 'quantite' => 40],
            ['produit_id' => '4', 'fournisseur_id' => '3', 'quantite' => 25],
            ['produit_id' => '5', 'fournisseur_id' => '4', 'quantite' => 60],
            ['produit_id' => '6', 'fournisseur_id' => '3', 'quantite' => 45],
            ['produit_id' => '7', 'fournisseur_id' => '3', 'quantite' => 50],
            ['produit_id' => '8', 'fournisseur_id' => '4', 'quantite' => 35],
            ['produit_id' => '9', 'fournisseur_id' => '3', 'quantite' => 40],
            ['produit_id' => '10', 'fournisseur_id' => '1', 'quantite' => 70]
        ];
        
        foreach ($approvisionnements as $appData) {
            $approvisionnement = new Approvisionnement();
            $approvisionnement->produitId = 'NEO_' . $appData['produit_id'];
            $approvisionnement->fournisseurId = 'NEO_' . $appData['fournisseur_id'];
            $approvisionnement->quantite = $appData['quantite'];
            $approvisionnement->sourceSystem = $this->getSourceSystem();
            
            $collection->addItem($approvisionnement);
        }
        
        return $collection;
    }
}