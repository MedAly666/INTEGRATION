<?php
/**
 * DataModel.php
 * Defines the common data structures that represent the global schema
 */

namespace Integration\Common;

/**
 * Entity classes representing the global schema
 */
class Client {
    public $id;
    public $nomComplet;
    public $adresse;
    public $emailContact;
    public $numeroTelephone;
    public $sourceSystem;
}

class Employee {
    public $id;
    public $nomComplet;
    public $email;
    public $poste;
    public $agenceRef;
    public $sourceSystem;
}

class Agence {
    public $id;
    public $ville;
    public $adresse;
    public $responsableRef;
    public $sourceSystem;
}

class Fournisseur {
    public $id;
    public $nomFournisseur;
    public $adresse;
    public $numeroTelephone;
    public $sourceSystem;
}

class Produit {
    public $id;
    public $description;
    public $prixCout;
    public $categorie;
    public $sourceSystem;
}

class Commande {
    public $id;
    public $dateCommande;
    public $montant;
    public $statut;
    public $modePaiement;
    public $clientRef;
    public $employeRef;
    public $sourceSystem;
}

class DetailCommande {
    public $commandeId;
    public $produitId;
    public $quantite;
    public $sourceSystem;
}

class Facture {
    public $id;
    public $montantTotal;
    public $dateFacture;
    public $commandeRef;
    public $sourceSystem;
}

class Livraison {
    public $id;
    public $transporteur;
    public $dateEstimee;
    public $statut;
    public $commandeRef;
    public $sourceSystem;
}

class Approvisionnement {
    public $produitId;
    public $fournisseurId;
    public $quantite;
    public $sourceSystem;
}

/**
 * Collection classes for managing lists of entity objects
 */
class BaseCollection implements \Iterator, \Countable {
    protected $items = [];
    protected $position = 0;

    public function addItem($item) {
        $this->items[] = $item;
    }

    public function getItems() {
        return $this->items;
    }

    // Iterator implementation
    public function rewind(): void {
        $this->position = 0;
    }

    public function current() {
        return $this->items[$this->position];
    }

    public function key(): int {
        return $this->position;
    }

    public function next(): void {
        ++$this->position;
    }

    public function valid(): bool {
        return isset($this->items[$this->position]);
    }

    // Countable implementation
    public function count(): int {
        return count($this->items);
    }
}

class ClientCollection extends BaseCollection {}
class EmployeeCollection extends BaseCollection {}
class AgenceCollection extends BaseCollection {}
class FournisseurCollection extends BaseCollection {}
class ProduitCollection extends BaseCollection {}
class CommandeCollection extends BaseCollection {}
class DetailCommandeCollection extends BaseCollection {}
class FactureCollection extends BaseCollection {}
class LivraisonCollection extends BaseCollection {}
class ApprovisionnementCollection extends BaseCollection {}