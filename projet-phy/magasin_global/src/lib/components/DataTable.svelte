<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell, Search, Pagination, Button, Badge, Spinner } from 'flowbite-svelte';
    import { SortOutline, SearchOutline } from 'flowbite-svelte-icons';

    // Props
    let { data, title, columns, loading, striped, hover, searchable, paginated, pageSize, emptyMessage, badgeColors } = $props();

  // Auto-generate columns if not provided
    $effect(()=>{
        if (columns.length === 0 && data.length > 0) {
            columns = Object.keys(data[0]).map(key => ({
                key,
                label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
                sortable: true
            }));
        }
    })



    // State
    let searchTerm = $state('');
    let currentPage = $state(1);
    let sortColumn = $state('');
    let sortDirection = $state<'asc' | 'desc'>('asc');
    
    // Filtered data based on search
    let filteredData = $derived.by( ()=>{
            return data.filter((item: Record<string, any>) => {
                if (!searchTerm) return true;
                
                // Search across all visible columns
                return columns
                    .filter((col: typeof columns[0]) => !col.hidden)
                    .some((col: typeof columns[0]) => {
                        const value = item[col.key];
                        if (value === null || value === undefined) return false;
                        return String(value).toLowerCase().includes(searchTerm.toLowerCase());
                    });
            });
    })
  

  
  // Sorted data
    let sortedData = $derived.by( ()=>{
        return sortColumn 
        ? [...filteredData].sort((a, b) => {
            const valueA = a[sortColumn];
            const valueB = b[sortColumn];
            
            // Handle null/undefined values
            if (valueA === null || valueA === undefined) return sortDirection === 'asc' ? -1 : 1;
            if (valueB === null || valueB === undefined) return sortDirection === 'asc' ? 1 : -1;
            
            // Compare based on data type
            if (typeof valueA === 'string' && typeof valueB === 'string') {
            return sortDirection === 'asc' 
                ? valueA.localeCompare(valueB) 
                : valueB.localeCompare(valueA);
            }
            
            return sortDirection === 'asc' 
            ? (valueA > valueB ? 1 : -1) 
            : (valueA > valueB ? -1 : 1);
        })
        : filteredData;
  }) 
    
  // Paginated data
    let totalPages = $derived( paginated ? Math.ceil(sortedData.length / pageSize) : 1 );
    let paginatedData = $derived.by(() => {
        return paginated 
            ? sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize) 
            : sortedData;
    })
        
  
  // Reset to first page when filters change
  $effect(()=>{
      if (searchTerm) currentPage = 1;
  })
  
  // Event dispatcher
  const dispatch = createEventDispatcher();
  
  // Sorting function
  function handleSort(column: string) {
    if (sortColumn === column) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortColumn = column;
      sortDirection = 'asc';
    }
  }
  
  // Format cell value
  function formatCellValue(column: typeof columns[0], value: any): string | null {
    if (value === null || value === undefined) return null;
    
    // Use custom formatter if provided
    if (column.format) {
      return column.format(value);
    }
    
    // Format based on data type
    if (value instanceof Date) {
      return value.toLocaleString();
    }
    
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    return String(value);
  }
  
  function getBadgeColor(column: typeof columns[0], value: any): string {
    if (!column.badge || !value) return 'gray';
    
    const colorMap = badgeColors[column.badge];
    if (!colorMap) return 'gray';
    
    return colorMap[value] || 'gray';
  }
  
  function handleRowClick(item: any) {
    dispatch('rowClick', item);
  }
</script>

<div class="space-y-4">
  {#if title}
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-semibold text-primary-500">{title}</h2>
      
      {#if searchable}
        <div class="relative">
          <Search bind:value={searchTerm} size="md" placeholder="Search...">
            <SearchOutline slot="left" class="w-4 h-4" />
          </Search>
        </div>
      {/if}
    </div>
  {/if}
  
  <div class="relative overflow-x-auto">
    {#if loading}
      <div class="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 z-10">
        <Spinner size="xl" color="blue" />
      </div>
    {/if}
    
    <Table {striped} hoverable={hover} class="bg-gray-800 border-gray-700">
      <TableHead>
        {#each columns.filter(col => !col.hidden) as column}
          <TableHeadCell style={column.width ? `width: ${column.width}` : ''}>
            {#if column.sortable}
              <button 
                class="flex items-center gap-1 w-full" 
                onclick={() => handleSort(column.key)}
              >
                {column.label}
                {#if sortColumn === column.key}
                  {#if sortDirection === 'asc'}
                    <SortOutline class="h-4 w-4" />
                  {:else}
                    <SortOutline class="h-4 w-4" />
                  {/if}
                {/if}
              </button>
            {:else}
              {column.label}
            {/if}
          </TableHeadCell>
        {/each}
      </TableHead>
      
      <TableBody class="bg-gray-800 border-gray-700">
        {#if paginatedData.length === 0}
          <TableBodyRow>
            <TableBodyCell colspan={columns.filter(col => !col.hidden).length} class="text-center py-4">
              {emptyMessage}
            </TableBodyCell>
          </TableBodyRow>
        {/if}
        
        {#each paginatedData as item}
          <TableBodyRow on:click={() => handleRowClick(item)} class="cursor-pointer">
            {#each columns.filter(col => !col.hidden) as column}
              <TableBodyCell>
                {#if column.badge}
                  <Badge color={getBadgeColor(column, item[column.key])}>
                    {formatCellValue(column, item[column.key])}
                  </Badge>
                {:else}
                  {formatCellValue(column, item[column.key]) ?? '-'}
                {/if}
              </TableBodyCell>
            {/each}
          </TableBodyRow>
        {/each}
      </TableBody>
    </Table>
  </div>
  
  {#if paginated && totalPages > 1}
    <div class="flex justify-end">
      <Pagination 
        {totalPages}
        bind:currentPage
        showIcons={true}
        class="text-sm"
      />
    </div>
  {/if}
</div>