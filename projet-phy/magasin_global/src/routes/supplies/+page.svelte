<script lang="ts">
    import { Heading } from 'flowbite-svelte';
    import DataTable from '$lib/components/DataTable.svelte';
    import type { Approvisionnement } from "$lib/types/database";
    import type { PageProps } from './$types';
    import { goto } from '$app/navigation';

    let { data }: PageProps = $props();
    // State
    let supplies = $state(data.supplies as (Approvisionnement & { produit_description?: string, nom_fournisseur?: string })[]);
    let loading = $state(data.loading as boolean);

    // Column configuration based on the Approvisionnement interface with joined data
    const columns = [
        { key: 'id_produit', label: 'Product ID', sortable: true },
        { key: 'produit_description', label: 'Product', sortable: true },
        { key: 'id_fournisseur', label: 'Supplier ID', sortable: true },
        { key: 'nom_fournisseur', label: 'Supplier', sortable: true },
        { key: 'quantite', label: 'Quantity', sortable: true, format: formatNumber },
        { key: 'source_system', label: 'Source', sortable: true, badge: 'source' }
    ];

    // Badge color configuration
    const badgeColors = {
        source: {
            'SQL': 'blue',
            'NEO4J': 'green',
            'XML': 'purple'
        }
    };

    // Format functions
    function formatNumber(num: number): string {
        return new Intl.NumberFormat('en-US').format(num);
    }

    // Handle supply row click
    function handleSupplyClick(event: CustomEvent<Approvisionnement & { produit_description?: string, nom_fournisseur?: string }>) {
        const supply = event.detail;
        // Could navigate to product or supplier details
        goto(`/products/${supply.id_produit}`);
    }
</script>

<div class="space-y-6">
    <div>
        <Heading tag="h1" class="text-primary-500 mb-2">Supply Chain</Heading>
        <p class="text-gray-300">Manage product supplies and supplier relationships</p>
    </div>
    
    <DataTable 
        data={supplies}
        columns={columns}
        loading={loading}
        searchable={true}
        paginated={true}
        pageSize={15}
        emptyMessage="No supplies found"
        badgeColors={badgeColors}
        on:rowClick={handleSupplyClick}
        title="Supply Chain"
        striped={true}
        hover={true}
    />
</div>