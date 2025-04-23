<?php
/**
 * XMLAdapter.php
 * Adapter for XML data source that reads directly from the XML file
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

class XMLAdapter implements IAdapter {
    private $xmlData = null;
    private $xmlFilePath;
    private $xmlSchemaPath;
    private $xmlDtdPath;
    
    /**
     * Constructor - Initialize with relative path to XML file
     */
    public function __construct() {
        // Calculate path relative to this file /media/medaly/A4B4A33BB4A30F3C/TP/INTEGRATION/projet2/xml/data-03.xml
        $this->xmlFilePath = dirname(dirname(dirname(__DIR__))) . '/projet2/xml/data-03.xml';
        $this->xmlSchemaPath = dirname(dirname(dirname(__DIR__))) . '/projet2/xml/schema.xml';
        $this->xmlDtdPath = dirname(dirname(dirname(__DIR__))) . '/projet2/xml/xml.dtd';
    }
    
    /**
     * Connect to the XML data source
     */
    public function connect() {
        try {
            // Load XML file
            if (!file_exists($this->xmlFilePath)) {
                throw new \Exception("XML file not found: {$this->xmlFilePath}");
            }
            
            // Load XML with error handling
            libxml_use_internal_errors(true);
            $this->xmlData = simplexml_load_file($this->xmlFilePath);
            
            if ($this->xmlData === false) {
                $errors = libxml_get_errors();
                libxml_clear_errors();
                throw new \Exception("XML parsing error: " . ($errors ? $errors[0]->message : "Unknown error"));
            }
            
            // Validate XML data against schema and DTD
            if (!$this->validateXML()) {
                echo "<p>Warning: XML validation failed, but continuing with the data.</p>";
            }
            
            return true;
        } catch (\Exception $e) {
            echo "XML Connection Error: " . $e->getMessage();
            return false;
        }
    }
    
    /**
     * Validate XML data against schema and DTD
     * 
     * @return bool True if validation passed, false otherwise
     */
    private function validateXML() {
        try {
            // Create a new DOMDocument
            $dom = new \DOMDocument();
            $dom->load($this->xmlFilePath);
            
            $validationPassed = true;
            $validationErrors = [];
            
            // Try to validate against XML Schema if it exists
            if (file_exists($this->xmlSchemaPath)) {
                if (!$dom->schemaValidate($this->xmlSchemaPath)) {
                    $validationPassed = false;
                    $errors = libxml_get_errors();
                    foreach ($errors as $error) {
                        $validationErrors[] = "Schema validation error: {$error->message} (Line: {$error->line}, Column: {$error->column})";
                    }
                    libxml_clear_errors();
                }
            }
            
            // Try to validate against DTD if it exists
            if (file_exists($this->xmlDtdPath)) {
                // We need to add the DTD reference if it's not already there
                // Create a temporary file with DTD reference
                $xmlContent = file_get_contents($this->xmlFilePath);
                $dtdContent = file_get_contents($this->xmlDtdPath);
                
                // Check if we need to add the DTD reference
                if (strpos($xmlContent, '<!DOCTYPE') === false) {
                    $tempContent = preg_replace('/<\?xml.*?\?>\s*/s', 
                                               "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<!DOCTYPE Vente SYSTEM \"{$this->xmlDtdPath}\">\n", 
                                               $xmlContent);
                    
                    $tempFile = tempnam(sys_get_temp_dir(), 'xml_dtd_');
                    file_put_contents($tempFile, $tempContent);
                    
                    $tempDom = new \DOMDocument();
                    $tempDom->load($tempFile);
                    
                    if (!$tempDom->validate()) {
                        $validationPassed = false;
                        $errors = libxml_get_errors();
                        foreach ($errors as $error) {
                            $validationErrors[] = "DTD validation error: {$error->message} (Line: {$error->line}, Column: {$error->column})";
                        }
                        libxml_clear_errors();
                    }
                    
                    // Clean up the temporary file
                    unlink($tempFile);
                } else {
                    // The XML already has a DOCTYPE declaration
                    if (!$dom->validate()) {
                        $validationPassed = false;
                        $errors = libxml_get_errors();
                        foreach ($errors as $error) {
                            $validationErrors[] = "DTD validation error: {$error->message} (Line: {$error->line}, Column: {$error->column})";
                        }
                        libxml_clear_errors();
                    }
                }
            }
            
            // Output validation errors
            if (!$validationPassed && !empty($validationErrors)) {
                echo "<div style='color: orange; margin: 10px 0;'><strong>XML Validation Warnings:</strong><br>";
                foreach ($validationErrors as $error) {
                    echo "{$error}<br>";
                }
                echo "</div>";
            }
            
            return $validationPassed;
            
        } catch (\Exception $e) {
            echo "XML Validation Error: " . $e->getMessage();
            return false;
        }
    }
    
    /**
     * Disconnect from the data source
     */
    public function disconnect() {
        $this->xmlData = null;
    }
    
    /**
     * Get the source system identifier
     */
    public function getSourceSystem(): string {
        return 'XML';
    }
    
    /**
     * Fetch clients data
     */
    public function getClients(): ClientCollection {
        $collection = new ClientCollection();
        
        if ($this->xmlData === null) {
            return $collection;
        }
        
        foreach ($this->xmlData->clients->client as $clientXml) {
            $client = new Client();
            $client->id = 'XML_' . (string)$clientXml->id;
            $client->nomComplet = (string)$clientXml->nom;
            $client->adresse = null; // Address is not available in the XML source
            $client->emailContact = (string)$clientXml->courriel;
            $client->numeroTelephone = (string)$clientXml->telephone;
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
        
        if ($this->xmlData === null) {
            return $collection;
        }
        
        foreach ($this->xmlData->employes->employe as $employeXml) {
            $employee = new Employee();
            $employee->id = 'XML_' . (string)$employeXml->id;
            $employee->nomComplet = (string)$employeXml->nom;
            $employee->email = (string)$employeXml->email;
            $employee->poste = null; // Position is not available in the XML source
            $employee->agenceRef = null; // Agency reference is not available in the XML source
            $employee->sourceSystem = $this->getSourceSystem();
            
            $collection->addItem($employee);
        }
        
        return $collection;
    }
    
    /**
     * Fetch agencies data - XML source does not have this entity
     */
    public function getAgences(): AgenceCollection {
        // XML source doesn't have agency data
        return new AgenceCollection();
    }
    
    /**
     * Fetch suppliers data
     */
    public function getFournisseurs(): FournisseurCollection {
        $collection = new FournisseurCollection();
        
        if ($this->xmlData === null) {
            return $collection;
        }
        
        foreach ($this->xmlData->fournisseurs->fournisseur as $fournisseurXml) {
            $fournisseur = new Fournisseur();
            $fournisseur->id = 'XML_' . (string)$fournisseurXml->id;
            $fournisseur->nomFournisseur = (string)$fournisseurXml->nom;
            $fournisseur->adresse = (string)$fournisseurXml->adresse;
            $fournisseur->numeroTelephone = (string)$fournisseurXml->telephone;
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
        
        if ($this->xmlData === null) {
            return $collection;
        }
        
        foreach ($this->xmlData->produits->produit as $produitXml) {
            $produit = new Produit();
            $produit->id = 'XML_' . (string)$produitXml->id;
            $produit->description = (string)$produitXml->description;
            $produit->prixCout = (float)$produitXml->prix;
            $produit->categorie = (string)$produitXml->categorie;
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
        
        if ($this->xmlData === null) {
            return $collection;
        }
        
        foreach ($this->xmlData->commandes->commande as $commandeXml) {
            $commande = new Commande();
            $commande->id = 'XML_' . (string)$commandeXml->id;
            $commande->dateCommande = (string)$commandeXml->date;
            $commande->montant = (float)$commandeXml->montant;
            $commande->statut = (string)$commandeXml->statut;
            $commande->modePaiement = (string)$commandeXml->mode_paiement;
            $commande->clientRef = 'XML_' . (string)$commandeXml->clientID;
            $commande->employeRef = !empty($commandeXml->employeID) ? 'XML_' . (string)$commandeXml->employeID : null;
            $commande->sourceSystem = $this->getSourceSystem();
            
            $collection->addItem($commande);
        }
        
        return $collection;
    }
    
    /**
     * Fetch order details data (paniers in XML source)
     */
    public function getDetailsCommande(): DetailCommandeCollection {
        $collection = new DetailCommandeCollection();
        
        if ($this->xmlData === null) {
            return $collection;
        }
        
        foreach ($this->xmlData->paniers->panier as $panierXml) {
            $detail = new DetailCommande();
            $detail->commandeId = 'XML_' . (string)$panierXml->id_commande;
            $detail->produitId = 'XML_' . (string)$panierXml->id_produit;
            $detail->quantite = (int)$panierXml->nombre;
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
        
        if ($this->xmlData === null) {
            return $collection;
        }
        
        foreach ($this->xmlData->factures->facture as $factureXml) {
            $facture = new Facture();
            $facture->id = 'XML_' . (string)$factureXml->id;
            $facture->montantTotal = (float)$factureXml->montant;
            $facture->dateFacture = (string)$factureXml->date;
            $facture->commandeRef = 'XML_' . (string)$factureXml->commandeID;
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
        
        if ($this->xmlData === null) {
            return $collection;
        }
        
        foreach ($this->xmlData->livraisons->livraison as $livraisonXml) {
            $livraison = new Livraison();
            $livraison->id = 'XML_' . (string)$livraisonXml->id;
            $livraison->transporteur = (string)$livraisonXml->transporteur;
            $livraison->dateEstimee = null; // Date estimée is not available in the XML source
            $livraison->statut = (string)$livraisonXml->statut;
            $livraison->commandeRef = 'XML_' . (string)$livraisonXml->commandeID;
            $livraison->sourceSystem = $this->getSourceSystem();
            
            $collection->addItem($livraison);
        }
        
        return $collection;
    }
    
    /**
     * Fetch supply data - XML source doesn't have direct equivalent,
     * but we can derive it from produits table which has fournisseur references
     */
    public function getApprovisionnement(): ApprovisionnementCollection {
        $collection = new ApprovisionnementCollection();
        
        if ($this->xmlData === null) {
            return $collection;
        }
        
        // In XML schema, product has direct reference to supplier
        foreach ($this->xmlData->produits->produit as $produitXml) {
            // Only create records if there is a supplier reference
            if (!empty((string)$produitXml->id_fournisseur)) {
                $approvisionnement = new Approvisionnement();
                $approvisionnement->produitId = 'XML_' . (string)$produitXml->id;
                $approvisionnement->fournisseurId = 'XML_' . (string)$produitXml->id_fournisseur;
                $approvisionnement->quantite = (int)$produitXml->quantite_totale; // Using total quantity as supply quantity
                $approvisionnement->sourceSystem = $this->getSourceSystem();
                
                $collection->addItem($approvisionnement);
            }
        }
        
        return $collection;
    }
    
    /**
     * Load XML data from files
     */
    private function loadDataFromFile() {
        // Get absolute path to data file
        $dataFile = '/media/medaly/A4B4A33BB4A30F3C/TP/INTEGRATION/projet2/xml/data-03.xml';
        $dtdFile = '/media/medaly/A4B4A33BB4A30F3C/TP/INTEGRATION/projet2/xml/xml.dtd';
        $schemaFile = '/media/medaly/A4B4A33BB4A30F3C/TP/INTEGRATION/projet2/xml/schema.xml';
        
        echo "<p>Attempting to load XML data from: $dataFile</p>";
        
        if (!file_exists($dataFile)) {
            echo "<p>Error: XML data file not found at $dataFile</p>";
            return;
        }
    }
}