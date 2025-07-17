// Fetch vendor data dynamically from MarketSpread

// Data cache for all locations
const vendorDataCache = new Map();
const loadingPromises = new Map();

// Market locations configuration
const MARKET_LOCATIONS = {
    kits: {
        name: 'Kitsilano',
        url: 'https://marketspread.com/widget/market/24929/vendors/?gopro=1&widget_id=6',
        hours: 'Sundays 10am - 2pm',
        opens: 'May 4',
        closes: 'Oct 26',
        address: 'Kitsilano Community Centre – Larch St & W 10th Ave'
    },
    downtown: {
        name: 'Downtown',
        url: 'https://marketspread.com/widget/market/24931/vendors/?gopro=1&widget_id=34',
        hours: 'Wednesdays 2pm - 6pm',
        opens: 'June 4',
        closes: 'Dec 17',
        address: '750 Hornby St, Vancouver, BC V6Z 2H7'
    },
    false_creek: {
        name: 'False Creek',
        url: 'https://marketspread.com/widget/market/24932/vendors/?gopro=1&widget_id=35',
        hours: 'Thursdays 3pm - 7pm',
        opens: 'Jul 3',
        closes: 'Oct 2',
        address: 'Olympic Village Square, Vancouver, BC V6Z 2R6'
    },
    mount_pleasant: {
        name: 'Mount Pleasant',
        url: 'https://marketspread.com/widget/market/24930/vendors/?gopro=1&widget_id=16', // Need actual URL
        hours: 'Sundays 10am - 2pm',
        opens: 'May 4',
        closes: 'Oct 26',
        address: 'Dude Chilling Park, 8th Ave & Guelph St'
    },
    riley_park: {
        name: 'Riley Park – Summer',
        url: 'https://marketspread.com/widget/market/24928/vendors/?gopro=1&widget_id=13', // Need actual URL
        hours: 'Saturdays 10am - 2pm',
        opens: 'Apr 5',
        closes: 'Oct 25',
        address: 'Riley Park, E 30th Ave & Ontario St'
    },
    trout_lake: {
        name: 'Trout Lake',
        url: 'https://marketspread.com/widget/market/24896/vendors/?gopro=1&widget_id=14', // Need actual URL
        hours: 'Saturdays 9am - 2pm',
        opens: 'Apr 5',
        closes: 'Oct 25',
        address: 'John Hendry Park, Lakewood Dr & E 13th Ave'
    },
    west_end: {
        name: 'West End',
        url: 'https://marketspread.com/widget/market/24927/vendors/?gopro=1&widget_id=15', // Need actual URL
        hours: 'Saturdays 9am - 2pm',
        opens: 'May 3',
        closes: 'Oct 25',
        address: '1100 Comox St, Vancouver, BC V6E 1K5'
    }
};

// Fetch vendor data for a specific location
async function fetchLocationData(locationKey) {
    // Check if we're already loading this location
    if (loadingPromises.has(locationKey)) {
        return await loadingPromises.get(locationKey);
    }
    
    // Check if data is already cached
    if (vendorDataCache.has(locationKey)) {
        return vendorDataCache.get(locationKey);
    }
    
    // Create a promise for this fetch operation
    const fetchPromise = async () => {
        console.log(`Fetching data for ${MARKET_LOCATIONS[locationKey].name}...`);
        
        const response = await fetch(MARKET_LOCATIONS[locationKey].url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const html = await response.text();
        
        // Parse the HTML to extract vendor data
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const vendorWidgetList = doc.querySelector('vendor-widget-list');
        
        if (!vendorWidgetList) {
            throw new Error('vendor-widget-list element not found');
        }
        
        const vendorsListAttr = vendorWidgetList.getAttribute('vendors-list');
        
        if (!vendorsListAttr) {
            throw new Error('vendors-list attribute not found');
        }
        
        // Parse the JSON data
        const vendorData = JSON.parse(vendorsListAttr);
        
        if (!Array.isArray(vendorData)) {
            throw new Error('Invalid vendor data format');
        }
        
        // Cache the data
        vendorDataCache.set(locationKey, vendorData);
        console.log(`Cached ${vendorData.length} vendors for ${MARKET_LOCATIONS[locationKey].name}`);
        
        return vendorData;
    };
    
    // Store the promise and execute it
    loadingPromises.set(locationKey, fetchPromise());
    
    try {
        const data = await loadingPromises.get(locationKey);
        return data;
    } finally {
        // Remove the promise once completed (success or failure)
        loadingPromises.delete(locationKey);
    }
}

// Load data from cache or fetch if needed (simplified for single location loading)
async function loadVendorData(locationKey = 'kits') {
    try {
        // Add the location to selected locations
        selectedLocations.add(locationKey);
        
        // Check if data is already cached
        if (vendorDataCache.has(locationKey)) {
            console.log(`Loading ${MARKET_LOCATIONS[locationKey].name} from cache - instant!`);
            
            // Initialize app if not already done (first load)
            if (!dateFiltersEl) {
                initializeApp();
            } else {
                // Re-populate filters and render vendors (subsequent loads)
                populateFilters();
                filterAndRenderVendors();
            }
            return;
        }
        
        // Show loading state for uncached data
        document.getElementById('vendorGrid').innerHTML = 
            `<div class="empty-state"><h3>Loading ${MARKET_LOCATIONS[locationKey].name} vendor data...</h3><p>Please wait while we fetch the latest vendor information.</p></div>`;
        
        // Fetch data (this will cache it)
        const fetchedData = await fetchLocationData(locationKey);
        
        console.log(`Loaded ${fetchedData.length} vendors for ${MARKET_LOCATIONS[locationKey].name}`);
        
        // Initialize app if not already done (first load)
        if (!dateFiltersEl) {
            initializeApp();
        } else {
            // Re-populate filters and render vendors (subsequent loads)
            populateFilters();
            filterAndRenderVendors();
        }
        
    } catch (error) {
        console.error('Error loading vendor data:', error);
        document.getElementById('vendorGrid').innerHTML = 
            `<div class="empty-state">
                <h3>Error loading vendor data</h3>
                <p>${error.message}</p>
                <p>Please check your internet connection and try refreshing the page.</p>
                <button onclick="loadVendorData('${locationKey}')" style="margin-top: 10px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Retry</button>
            </div>`;
    }
}

// Background loading for all locations
async function preloadAllLocations() {
    console.log('🚀 Starting background preload of all market locations...');
    
    const locationKeys = Object.keys(MARKET_LOCATIONS).filter(key => 
        MARKET_LOCATIONS[key].url && !MARKET_LOCATIONS[key].url.includes('[ID]')
    );
    
    // Load locations in parallel (excluding the already loaded one)
    const preloadPromises = locationKeys
        .filter(key => !vendorDataCache.has(key))
        .map(async (locationKey) => {
            try {
                await fetchLocationData(locationKey);
                console.log(`✅ Preloaded ${MARKET_LOCATIONS[locationKey].name}`);
            } catch (error) {
                console.warn(`⚠️ Failed to preload ${MARKET_LOCATIONS[locationKey].name}:`, error.message);
            }
        });
    
    await Promise.all(preloadPromises);
    console.log('🎉 Background preloading complete! All locations will now load instantly.');
}

// Get cache statistics (useful for debugging)
function getCacheStats() {
    const total = Object.keys(MARKET_LOCATIONS).length;
    const cached = vendorDataCache.size;
    const loading = loadingPromises.size;
    
    console.log(`📊 Cache Stats: ${cached}/${total} locations cached, ${loading} currently loading`);
    console.log('Cached locations:', Array.from(vendorDataCache.keys()).map(key => MARKET_LOCATIONS[key].name));
    
    return { total, cached, loading };
}

// State management
let selectedVendors = new Set();
let filteredVendors = [];
let selectedDates = new Set();
let selectedCategories = new Set();
let selectedLocations = new Set(['kits']); // Default to Kitsilano
let searchTerm = '';

// DOM elements
let searchBoxEl, locationFiltersEl, dateFiltersEl, categoryFiltersEl, vendorGridEl, itineraryListEl, selectedCountEl, vendorCountEl;

// Initialize the application
function initializeApp() {
    // Get DOM elements
    searchBoxEl = document.getElementById('searchBox');
    locationFiltersEl = document.getElementById('locationFilters');
    dateFiltersEl = document.getElementById('dateFilters');
    categoryFiltersEl = document.getElementById('categoryFilters');
    vendorGridEl = document.getElementById('vendorGrid');
    itineraryListEl = document.getElementById('itineraryList');
    selectedCountEl = document.getElementById('selectedCount');
    vendorCountEl = document.getElementById('vendorCount');

    // Setup event listeners
    setupEventListeners();
    
    // Populate location filters first
    populateLocationFilters();
    
    // Populate other filters
    populateFilters();
    
    // Initial render
    filterAndRenderVendors();
}

function setupEventListeners() {
    // Search functionality
    searchBoxEl.addEventListener('input', handleSearchInput);
    document.getElementById('clearSearch').addEventListener('click', clearSearch);
    
    // Clear filters
    document.getElementById('clearFilters').addEventListener('click', clearFilters);
}

function populateLocationFilters() {
    if (!locationFiltersEl) return;
    
    // Add select all/none controls
    locationFiltersEl.innerHTML = `
        <div class="filter-controls">
            <button type="button" class="filter-control-btn" onclick="selectAllLocations()">Select All</button>
            <button type="button" class="filter-control-btn" onclick="clearAllLocations()">Clear All</button>
        </div>
    `;
    
    Object.entries(MARKET_LOCATIONS).forEach(([key, location]) => {
        const isChecked = selectedLocations.has(key) ? 'checked' : '';
        const checkboxId = `location-${key}`;
        const checkboxHTML = `
            <div class="filter-checkbox">
                <input type="checkbox" id="${checkboxId}" value="${key}" ${isChecked} onchange="handleLocationFilterChange()">
                <label for="${checkboxId}" class="filter-checkbox-label">${location.name}</label>
            </div>
        `;
        locationFiltersEl.insertAdjacentHTML('beforeend', checkboxHTML);
    });
}

function clearFilterOptions() {
    // Clear existing filter options
    if (dateFiltersEl) {
        dateFiltersEl.innerHTML = '';
    }
    if (categoryFiltersEl) {
        categoryFiltersEl.innerHTML = '';
    }
    
    // Clear selected filter sets (but keep location selections)
    selectedDates.clear();
    selectedCategories.clear();
}

function populateFilters() {
    // Get all unique dates and types from all selected locations
    const allDates = new Set();
    const allTypes = new Set();
    
    // Collect data from all selected locations
    selectedLocations.forEach(locationKey => {
        if (vendorDataCache.has(locationKey)) {
            const locationData = vendorDataCache.get(locationKey);
            locationData.forEach(vendor => {
                // Add dates
                vendor.days.forEach(date => allDates.add(date));
                
                // Add vendor type
                if (vendor.type) {
                    allTypes.add(vendor.type);
                }
            });
        }
    });
    
    // Populate date filters
    populateDateFilters(Array.from(allDates).sort());
    
    // Populate category filters
    populateCategoryFilters(Array.from(allTypes).sort());
}

function populateDateFilters(dates) {
    if (!dateFiltersEl) return;
    
    // Add select all/none controls
    dateFiltersEl.innerHTML = `
        <div class="filter-controls">
            <button type="button" class="filter-control-btn" onclick="selectAllDates()">Select All</button>
            <button type="button" class="filter-control-btn" onclick="clearAllDates()">Clear All</button>
        </div>
    `;
    
    dates.forEach(date => {
        const checkboxId = `date-${date.replace(/[^a-zA-Z0-9]/g, '-')}`;
        const checkboxHTML = `
            <div class="filter-checkbox">
                <input type="checkbox" id="${checkboxId}" value="${date}" onchange="handleDateFilterChange()">
                <label for="${checkboxId}" class="filter-checkbox-label">${formatDateShort(date)}</label>
            </div>
        `;
        dateFiltersEl.insertAdjacentHTML('beforeend', checkboxHTML);
    });
}

function populateCategoryFilters(categories) {
    if (!categoryFiltersEl) return;
    
    // Add select all/none controls
    categoryFiltersEl.innerHTML = `
        <div class="filter-controls">
            <button type="button" class="filter-control-btn" onclick="selectAllCategories()">Select All</button>
            <button type="button" class="filter-control-btn" onclick="clearAllCategories()">Clear All</button>
        </div>
    `;
    
    categories.forEach(category => {
        const checkboxId = `category-${category.replace(/[^a-zA-Z0-9]/g, '-')}`;
        const checkboxHTML = `
            <div class="filter-checkbox">
                <input type="checkbox" id="${checkboxId}" value="${category}" onchange="handleCategoryFilterChange()">
                <label for="${checkboxId}" class="filter-checkbox-label">${category}</label>
            </div>
        `;
        categoryFiltersEl.insertAdjacentHTML('beforeend', checkboxHTML);
    });
}

// Search functionality
function handleSearchInput(event) {
    searchTerm = event.target.value.toLowerCase().trim();
    
    // Show/hide clear button
    const clearButton = document.getElementById('clearSearch');
    if (searchTerm) {
        clearButton.classList.add('visible');
    } else {
        clearButton.classList.remove('visible');
    }
    
    // Re-filter and render
    filterAndRenderVendors();
}

function clearSearch() {
    searchBoxEl.value = '';
    searchTerm = '';
    document.getElementById('clearSearch').classList.remove('visible');
    filterAndRenderVendors();
}

// Filter change handlers
function handleLocationFilterChange() {
    selectedLocations.clear();
    const checkedLocations = locationFiltersEl.querySelectorAll('input[type="checkbox"]:checked');
    checkedLocations.forEach(checkbox => {
        selectedLocations.add(checkbox.value);
    });
    
    // Load data for any newly selected locations that aren't cached
    const loadPromises = Array.from(selectedLocations)
        .filter(locationKey => !vendorDataCache.has(locationKey))
        .map(locationKey => fetchLocationData(locationKey));
    
    if (loadPromises.length > 0) {
        Promise.all(loadPromises).then(() => {
            populateFilters();
            filterAndRenderVendors();
        });
    } else {
        populateFilters();
        filterAndRenderVendors();
    }
}

function handleDateFilterChange() {
    selectedDates.clear();
    const checkedDates = dateFiltersEl.querySelectorAll('input[type="checkbox"]:checked');
    checkedDates.forEach(checkbox => {
        selectedDates.add(checkbox.value);
    });
    filterAndRenderVendors();
    updateSelectedVendorsDisplay(); // Update itinerary when date filters change
}

function handleCategoryFilterChange() {
    selectedCategories.clear();
    const checkedCategories = categoryFiltersEl.querySelectorAll('input[type="checkbox"]:checked');
    checkedCategories.forEach(checkbox => {
        selectedCategories.add(checkbox.value);
    });
    filterAndRenderVendors();
}

// Select all/clear all functions
function selectAllLocations() {
    const checkboxes = locationFiltersEl.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
        selectedLocations.add(checkbox.value);
    });
    handleLocationFilterChange();
}

function clearAllLocations() {
    const checkboxes = locationFiltersEl.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    selectedLocations.clear();
    handleLocationFilterChange();
}

function selectAllDates() {
    const checkboxes = dateFiltersEl.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
        selectedDates.add(checkbox.value);
    });
    filterAndRenderVendors();
    updateSelectedVendorsDisplay(); // Update itinerary when selecting all dates
}

function clearAllDates() {
    const checkboxes = dateFiltersEl.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    selectedDates.clear();
    filterAndRenderVendors();
    updateSelectedVendorsDisplay(); // Update itinerary when clearing all dates
}

function selectAllCategories() {
    const checkboxes = categoryFiltersEl.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
        selectedCategories.add(checkbox.value);
    });
    filterAndRenderVendors();
}

function clearAllCategories() {
    const checkboxes = categoryFiltersEl.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    selectedCategories.clear();
    filterAndRenderVendors();
}


function formatDate(dateString) {
    // Convert MM-DD-YYYY to YYYY-MM-DD format for proper parsing
    const [month, day, year] = dateString.split('-');
    const isoDateString = `${year}-${month}-${day}`;
    const date = new Date(isoDateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

function filterAndRenderVendors() {
    // Collect all vendor data from selected locations
    let allVendorData = [];
    selectedLocations.forEach(locationKey => {
        if (vendorDataCache.has(locationKey)) {
            const locationData = vendorDataCache.get(locationKey);
            // Add location info to each vendor for display
            const vendorsWithLocation = locationData.map(vendor => ({
                ...vendor,
                locationKey,
                locationName: MARKET_LOCATIONS[locationKey].name
            }));
            allVendorData = allVendorData.concat(vendorsWithLocation);
        }
    });
    
    filteredVendors = allVendorData.filter(vendor => {
        // Filter by search term (if any)
        if (searchTerm) {
            const searchableText = [
                vendor.name,
                vendor.type,
                vendor.bio,
                vendor.locationName,
                ...(vendor.categories || []),
                ...(vendor.days || [])
            ].filter(Boolean).join(' ').toLowerCase();
            
            if (!searchableText.includes(searchTerm)) {
                return false;
            }
        }
        
        // Filter by dates (if any dates are selected)
        if (selectedDates.size > 0) {
            const hasMatchingDate = vendor.days.some(date => selectedDates.has(date));
            if (!hasMatchingDate) {
                return false;
            }
        }
        
        // Filter by categories (if any categories are selected)
        if (selectedCategories.size > 0) {
            if (!selectedCategories.has(vendor.type)) {
                return false;
            }
        }
        
        return true;
    });
    
    renderVendors();
    updateVendorCount();
}

function renderVendors() {
    if (filteredVendors.length === 0) {
        let emptyMessage = '';
        if (searchTerm) {
            emptyMessage = `
                <div class="empty-state">
                    <h3>No vendors found for "${searchTerm}"</h3>
                    <p>Try a different search term or adjust your filters.</p>
                    <button onclick="clearSearch()" style="margin-top: 10px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Clear Search</button>
                </div>
            `;
        } else {
            emptyMessage = `
                <div class="empty-state">
                    <h3>No vendors found</h3>
                    <p>Try adjusting your filters to see more vendors.</p>
                </div>
            `;
        }
        vendorGridEl.innerHTML = emptyMessage;
        return;
    }
    
    vendorGridEl.innerHTML = filteredVendors.map(vendor => createVendorCard(vendor)).join('');
    
    // Add click event listeners to vendor cards
    vendorGridEl.querySelectorAll('.vendor-card').forEach(card => {
        card.addEventListener('click', () => toggleVendorSelection(card.dataset.vendorId));
    });
}

function createVendorCard(vendor) {
    const isSelected = selectedVendors.has(vendor.id);
    const logoSrc = vendor.logo || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik0yNSAxNUwyOSAyM0gyMSAyM0wyNSAxNVoiIGZpbGw9IiM2Qzc1N0QiLz4KPC9zdmc+Cg==';
    
    return `
        <div class="vendor-card ${isSelected ? 'selected' : ''}" data-vendor-id="${vendor.id}">
            <div class="vendor-header">
                <img src="${logoSrc}" alt="${vendor.name}" class="vendor-logo" 
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik0yNSAxNUwyOSAyM0gyMSAyM0wyNSAxNVoiIGZpbGw9IiM2Qzc1N0QiLz4KPC9zdmc+Cg=='">
                <div class="vendor-info">
                    <h3>${vendor.name}</h3>
                    <span class="vendor-type">${vendor.type || 'Vendor'}</span>
                    ${vendor.locationName ? `<span class="vendor-location">📍 ${vendor.locationName}</span>` : ''}
                </div>
            </div>
            
            ${vendor.bio ? `<p class="vendor-bio">${vendor.bio}</p>` : ''}
            
            <div class="vendor-dates">
                <h4>Market Dates:</h4>
                <div class="dates-list">
                    ${vendor.days.map(date => `<span class="date-tag">${formatDateShort(date)}</span>`).join('')}
                </div>
            </div>
            
            ${vendor.categories && vendor.categories.length > 0 ? `
            <div class="vendor-categories">
                <h4>Categories:</h4>
                <div class="categories-list">
                    ${vendor.categories.map(cat => `<span class="category-tag">${cat.replace(/_/g, ' ')}</span>`).join('')}
                </div>
            </div>
            ` : ''}
            
            <div class="vendor-links">
                ${vendor.url ? `<a href="${vendor.url}" target="_blank" class="vendor-link" onclick="event.stopPropagation()">Website</a>` : ''}
                ${vendor.facebook ? `<a href="https://facebook.com/${vendor.facebook}" target="_blank" class="vendor-link" onclick="event.stopPropagation()">Facebook</a>` : ''}
                ${vendor.instagram ? `<a href="https://instagram.com/${vendor.instagram}" target="_blank" class="vendor-link" onclick="event.stopPropagation()">Instagram</a>` : ''}
            </div>
        </div>
    `;
}

function formatDateShort(dateString) {
    // Convert MM-DD-YYYY to YYYY-MM-DD format for proper parsing
    const [month, day, year] = dateString.split('-');
    const isoDateString = `${year}-${month}-${day}`;
    const date = new Date(isoDateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
    });
}

function toggleVendorSelection(vendorId) {
    const id = parseInt(vendorId);
    
    if (selectedVendors.has(id)) {
        selectedVendors.delete(id);
    } else {
        selectedVendors.add(id);
    }
    
    updateSelectedVendorsDisplay();
    updateVendorCardSelection(vendorId);
}

function updateVendorCardSelection(vendorId) {
    const card = document.querySelector(`[data-vendor-id="${vendorId}"]`);
    if (card) {
        card.classList.toggle('selected', selectedVendors.has(parseInt(vendorId)));
    }
}

function updateSelectedVendorsDisplay() {
    if (selectedCountEl) {
        const vendorText = selectedVendors.size === 1 ? 'vendor' : 'vendors';
        selectedCountEl.textContent = `(${selectedVendors.size} ${vendorText} selected)`;
    }
    
    if (!itineraryListEl) return; // Exit if elements not initialized
    
    if (selectedVendors.size === 0) {
        itineraryListEl.innerHTML = `
            <div class="empty-itinerary">
                <p>🛒 Select vendors to build your market itinerary</p>
                <p>Vendors will be grouped by their market dates</p>
            </div>
        `;
        return;
    }
    
    // Collect all vendor data from selected locations
    let allVendorData = [];
    selectedLocations.forEach(locationKey => {
        if (vendorDataCache.has(locationKey)) {
            const locationData = vendorDataCache.get(locationKey);
            const vendorsWithLocation = locationData.map(vendor => ({
                ...vendor,
                locationKey,
                locationName: MARKET_LOCATIONS[locationKey].name
            }));
            allVendorData = allVendorData.concat(vendorsWithLocation);
        }
    });
    
    const selectedVendorData = allVendorData.filter(vendor => selectedVendors.has(vendor.id));
    
    // Group vendors by date
    const vendorsByDate = {};
    selectedVendorData.forEach(vendor => {
        vendor.days.forEach(date => {
            // Only include dates that match the date filter (if any dates are selected)
            if (selectedDates.size > 0 && !selectedDates.has(date)) {
                return; // Skip this date if it's not in the selected dates filter
            }
            
            if (!vendorsByDate[date]) {
                vendorsByDate[date] = [];
            }
            // Avoid duplicates (same vendor might be in multiple locations)
            if (!vendorsByDate[date].find(v => v.id === vendor.id)) {
                vendorsByDate[date].push(vendor);
            }
        });
    });
    
    // Sort dates
    const sortedDates = Object.keys(vendorsByDate).sort();
    
    // Check if we have any dates to show
    if (sortedDates.length === 0) {
        const filterMessage = selectedDates.size > 0 
            ? 'No selected vendors are available on the filtered dates.'
            : 'No vendors selected.';
        itineraryListEl.innerHTML = `
            <div class="empty-itinerary">
                <p>📅 ${filterMessage}</p>
                <p>Try adjusting your date filters or selecting different vendors.</p>
            </div>
        `;
        return;
    }
    
    // Create itinerary HTML
    itineraryListEl.innerHTML = sortedDates.map(date => {
        const vendors = vendorsByDate[date];
        const vendorCount = vendors.length;
        
        return `
            <div class="itinerary-date">
                <div class="itinerary-date-header">
                    <div class="itinerary-date-title">
                        📅 ${formatDate(date)}
                        <span class="itinerary-vendor-count">${vendorCount} vendor${vendorCount !== 1 ? 's' : ''}</span>
                    </div>
                </div>
                
                <div class="itinerary-vendors">
                    ${vendors.map(vendor => `
                        <div class="itinerary-vendor">
                            ${vendor.name}
                            ${vendor.locationName ? `<small>(${vendor.locationName})</small>` : ''}
                            <button class="remove" onclick="removeSelectedVendor(${vendor.id})" title="Remove vendor">×</button>
                        </div>
                    `).join('')}
                </div>
                
                <button class="itinerary-add-to-calendar" onclick="addDateToCalendar('${date}')">
                    📅 Create G.Cal Event
                </button>
            </div>
        `;
    }).join('');
}

function removeSelectedVendor(vendorId) {
    selectedVendors.delete(vendorId);
    updateSelectedVendorsDisplay();
    updateVendorCardSelection(vendorId.toString());
}

function updateVendorCount() {
    vendorCountEl.textContent = filteredVendors.length;
}

function clearFilters() {
    // Clear search
    clearSearch();
    
    // Clear all location checkboxes
    if (locationFiltersEl) {
        const locationCheckboxes = locationFiltersEl.querySelectorAll('input[type="checkbox"]');
        locationCheckboxes.forEach(checkbox => checkbox.checked = false);
    }
    
    // Clear all date checkboxes
    if (dateFiltersEl) {
        const dateCheckboxes = dateFiltersEl.querySelectorAll('input[type="checkbox"]');
        dateCheckboxes.forEach(checkbox => checkbox.checked = false);
    }
    
    // Clear all category checkboxes
    if (categoryFiltersEl) {
        const categoryCheckboxes = categoryFiltersEl.querySelectorAll('input[type="checkbox"]');
        categoryCheckboxes.forEach(checkbox => checkbox.checked = false);
    }
    
    // Clear selected sets
    selectedLocations.clear();
    selectedDates.clear();
    selectedCategories.clear();
    
    // Re-render
    filterAndRenderVendors();
}

function addDateToCalendar(date) {
    if (selectedVendors.size === 0) return;
    
    // Collect all vendor data from selected locations
    let allVendorData = [];
    selectedLocations.forEach(locationKey => {
        if (vendorDataCache.has(locationKey)) {
            const locationData = vendorDataCache.get(locationKey);
            const vendorsWithLocation = locationData.map(vendor => ({
                ...vendor,
                locationKey,
                locationName: MARKET_LOCATIONS[locationKey].name
            }));
            allVendorData = allVendorData.concat(vendorsWithLocation);
        }
    });
    
    const selectedVendorData = allVendorData.filter(vendor => selectedVendors.has(vendor.id));
    
    // Get vendors for this specific date
    const vendorsForDate = selectedVendorData.filter(vendor => 
        vendor.days.includes(date)
    );
    
    // Remove duplicates (same vendor might be in multiple locations)
    const uniqueVendors = vendorsForDate.filter((vendor, index, self) => 
        index === self.findIndex(v => v.id === vendor.id)
    );
    
    if (uniqueVendors.length === 0) return;
    
    // Get unique locations for this date
    const locations = [...new Set(uniqueVendors.map(v => v.locationName).filter(Boolean))];
    const locationKeys = [...new Set(uniqueVendors.map(v => v.locationKey).filter(Boolean))];
    
    // Create title with just the location name
    const title = locations.length === 1 
        ? `${locations[0]} Farmers Market`
        : `Farmers Market - ${locations.join(' & ')}`;
    
    // Create description with proper grouping for multiple locations
    let description;
    if (locations.length === 1) {
        // Single location - simple list
        const vendorList = uniqueVendors.map(vendor => `• ${vendor.name}`).join('%0A');
        description = `Visit these vendors at the ${locations[0]} farmers market:%0A%0A${vendorList}`;
    } else {
        // Multiple locations - group by location
        const vendorsByLocation = {};
        uniqueVendors.forEach(vendor => {
            const loc = vendor.locationName || 'Unknown Location';
            if (!vendorsByLocation[loc]) {
                vendorsByLocation[loc] = [];
            }
            vendorsByLocation[loc].push(vendor.name);
        });
        
        const locationSections = Object.entries(vendorsByLocation).map(([location, vendors]) => {
            const vendorList = vendors.map(name => `• ${name}`).join('%0A');
            return `📍 ${location}:%0A${vendorList}`;
        }).join('%0A%0A');
        
        description = `Visit these vendors at farmers markets:%0A%0A${locationSections}`;
    }
    
    // Handle address - only include for single location
    const addressText = locations.length === 1 
        ? MARKET_LOCATIONS[locationKeys[0]]?.address || ''
        : ''; // Leave blank for multiple locations
    
    // Fix date parsing - convert MM-DD-YYYY to proper format
    const [month, day, year] = date.split('-');
    const properDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const startDate = properDate.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Create Google Calendar URL
    let calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startDate}/${startDate}&details=${description}`;
    
    // Only add location if it's a single location
    if (addressText) {
        calendarUrl += `&location=${encodeURIComponent(addressText)}`;
    }
    
    calendarUrl += '&sf=true&output=xml';
    
    // Open in new tab
    window.open(calendarUrl, '_blank');
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Load initial data for the default location (Kitsilano)
    // initializeApp() will be called from within loadVendorData()
    await loadVendorData('kits');
    
    // Start background preloading of other locations
    // This runs in the background and doesn't block the UI
    preloadAllLocations().catch(error => {
        console.warn('Background preloading had some failures:', error);
    });
});
