<?php
/**
 * IAdapter.php
 * Interface for all data source adapters
 */

namespace Integration\Adapters;

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

interface IAdapter {
    /**
     * Connect to the data source
     */
    public function connect();
    
    /**
     * Disconnect from the data source
     */
    public function disconnect();
    
    /**
     * Get the source system identifier
     */
    public function getSourceSystem(): string;
    
    /**
     * Fetch clients data 
     */
    public function getClients(): ClientCollection;
    
    /**
     * Fetch employees data
     */
    public function getEmployees(): EmployeeCollection;
    
    /**
     * Fetch agencies data
     */
    public function getAgences(): AgenceCollection;
    
    /**
     * Fetch suppliers data
     */
    public function getFournisseurs(): FournisseurCollection;
    
    /**
     * Fetch products data
     */
    public function getProduits(): ProduitCollection;
    
    /**
     * Fetch orders data
     */
    public function getCommandes(): CommandeCollection;
    
    /**
     * Fetch order details data
     */
    public function getDetailsCommande(): DetailCommandeCollection;
    
    /**
     * Fetch invoices data
     */
    public function getFactures(): FactureCollection;
    
    /**
     * Fetch deliveries data
     */
    public function getLivraisons(): LivraisonCollection;
    
    /**
     * Fetch supply data 
     */
    public function getApprovisionnement(): ApprovisionnementCollection;
}