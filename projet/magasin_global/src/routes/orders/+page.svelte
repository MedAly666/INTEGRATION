<script lang="ts">
    import { Heading } from 'flowbite-svelte';
    import DataTable from '$lib/components/DataTable.svelte';
    import type { Commande } from "$lib/types/database";
    import type { PageProps } from './$types';
    import { goto } from '$app/navigation';

    let { data }: PageProps = $props();
    // State
    let orders = $state(data.orders as Commande[]);
    let loading = $state(data.loading as boolean);

    // Column configuration based on the Commande interface
    const columns = [
        { key: 'id_commande', label: 'Order ID', sortable: true },
        { key: 'date_commande', label: 'Date', sortable: true, format: formatDate },
        { key: 'client_nom', label: 'Client', sortable: true },
        { key: 'montant', label: 'Amount', sortable: true, format: formatPrice },
        { key: 'statut', label: 'Status', sortable: true, badge: 'status' },
        { key: 'mode_paiement', label: 'Payment Method', sortable: true },
        { key: 'employe_nom', label: 'Employee', sortable: true },
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
            'completed': 'green',
            'pending': 'yellow',
            'processing': 'blue',
            'cancelled': 'red',
            'shipped': 'purple'
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

    // Handle order row click
    function handleOrderClick(event: CustomEvent<Commande>) {
        const order = event.detail;
        goto(`/orders/${order.id_commande}`);
    }
</script>

<div class="space-y-6">
    <div>
        <Heading tag="h1" class="text-primary-500 mb-2">Orders</Heading>
        <p class="text-gray-300">Manage customer orders from all integrated systems</p>
    </div>
    
    <DataTable 
        data={orders}
        columns={columns}
        loading={loading}
        searchable={true}
        paginated={true}
        pageSize={15}
        emptyMessage="No orders found"
        badgeColors={badgeColors}
        on:rowClick={handleOrderClick}
        title="Order List"
        striped={true}
        hover={true}
    />
</div>