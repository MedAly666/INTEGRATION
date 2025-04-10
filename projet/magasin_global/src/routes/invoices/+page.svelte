<script lang="ts">
    import { Heading } from 'flowbite-svelte';
    import DataTable from '$lib/components/DataTable.svelte';
    import type { Facture } from "$lib/types/database";
    import type { PageProps } from './$types';
    import { goto } from '$app/navigation';

    let { data }: PageProps = $props();
    // State
    let invoices = $state(data.invoices as Facture[]);
    let loading = $state(data.loading as boolean);

    // Column configuration based on the Facture interface
    const columns = [
        { key: 'id_facture', label: 'Invoice ID', sortable: true },
        { key: 'date_facture', label: 'Date', sortable: true, format: formatDate },
        { key: 'montant_total', label: 'Amount', sortable: true, format: formatPrice },
        { key: 'commande_ref', label: 'Order Reference', sortable: true },
        { key: 'statut', label: 'Status', sortable: true, badge: 'status' },
        { key: 'source_system', label: 'Source', sortable: true, badge: 'source' }
    ];

    // Badge color configuration
    const badgeColors = {
        source: {
            'SQL': 'blue',
            'NEO4J': 'green',
            'XML': 'purple'
        },
        status: {
            'paid': 'green',
            'pending': 'yellow',
            'overdue': 'red',
            'cancelled': 'gray'
        }
    };

    // Format functions
    function formatDate(date: Date | string | null): string {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    function formatPrice(amount: number): string {
        return new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: 'USD' 
        }).format(amount);
    }

    // Handle invoice row click
    function handleInvoiceClick(event: CustomEvent<Facture>) {
        const invoice = event.detail;
        goto(`/invoices/${invoice.id_facture}`);
    }
</script>

<div class="space-y-6">
    <div>
        <Heading tag="h1" class="text-primary-500 mb-2">Invoices</Heading>
        <p class="text-gray-300">Manage all invoices from integrated systems</p>
    </div>
    
    <DataTable 
        data={invoices}
        columns={columns}
        loading={loading}
        searchable={true}
        paginated={true}
        pageSize={15}
        emptyMessage="No invoices found"
        badgeColors={badgeColors}
        on:rowClick={handleInvoiceClick}
        title="Invoice List"
        striped={true}
        hover={true}
    />
</div>