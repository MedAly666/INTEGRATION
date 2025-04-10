<script lang="ts">
    import { Heading } from 'flowbite-svelte';
    import DataTable from '$lib/components/DataTable.svelte';
    import type { Fournisseur } from "$lib/types/database";
    import type { PageProps } from './$types';
    import { goto } from '$app/navigation';

    let { data }: PageProps = $props();
    // State
    let suppliers = $state(data.suppliers as Fournisseur[]);
    let loading = $state(data.loading as boolean);

    // Column configuration based on the Fournisseur interface
    const columns = [
        { key: 'id_fournisseur', label: 'Supplier ID', sortable: true },
        { key: 'nom_fournisseur', label: 'Name', sortable: true },
        { key: 'adresse', label: 'Address', sortable: true },
        { key: 'numero_telephone', label: 'Phone', sortable: true },
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

    // Handle supplier row click
    function handleSupplierClick(event: CustomEvent<Fournisseur>) {
        const supplier = event.detail;
        goto(`/suppliers/${supplier.id_fournisseur}`);
    }
</script>

<div class="space-y-6">
    <div>
        <Heading tag="h1" class="text-primary-500 mb-2">Suppliers</Heading>
        <p class="text-gray-300">View and manage all suppliers from integrated systems</p>
    </div>
    
    <DataTable 
        data={suppliers}
        columns={columns}
        loading={loading}
        searchable={true}
        paginated={true}
        pageSize={15}
        emptyMessage="No suppliers found"
        badgeColors={badgeColors}
        on:rowClick={handleSupplierClick}
        title="Supplier List"
        striped={true}
        hover={true}
    />
</div>