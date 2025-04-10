<script lang="ts">
    import type { PageProps } from './$types';
    import { Heading } from 'flowbite-svelte';
    import DataTable from '$lib/components/DataTable.svelte';
    import { goto } from '$app/navigation';
    
    import type { Employee } from "$lib/types/database";
  
    let { data }: PageProps = $props();
    // State
    let employees = $state(data.employees as Employee[]);
    let loading = $state(data.loading as boolean);
    
    // Column configuration - FIXED to match the database schema
    const columns = [
      { key: 'id_employe', label: 'Employee ID', sortable: true },
      { key: 'nom_complet', label: 'Name', sortable: true },
      { key: 'email', label: 'Email', sortable: true },
      { key: 'poste', label: 'Position', sortable: true },
      { key: 'agence_ref', label: 'Agency', sortable: true },
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
    
    // Handle employee row click
    function handleEmployeeClick(event: CustomEvent<Employee>) {
      const employee = event.detail;
      goto(`/employees/${employee.id_employe}`);
    }
</script>
  
<div class="space-y-6">
  <div>
    <Heading tag="h1" class="text-primary-500 mb-2">Employees</Heading>
    <p class="text-gray-300">View and manage all employees from integrated systems</p>
  </div>
  
  <DataTable 
    data={employees}
    columns={columns}
    loading={loading}
    searchable={true}
    paginated={true}
    pageSize={15}
    emptyMessage="No employees found"
    badgeColors={badgeColors}
    on:rowClick={handleEmployeeClick}
    title="Employee List"
    striped={true}
    hover={true}
  />
</div>