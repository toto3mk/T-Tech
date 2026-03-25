  // Global setup
        // API configuration 
        const API_BASE = window.API_BASE_URL || 'http://localhost:3000/api';
        
        // Function to get token from either storage location
        function getToken() {
            return localStorage.getItem('adminAuthToken') || sessionStorage.getItem('adminAuthToken');
        }
        
        // Function to get headers with current token
        function getHeaders() {
            const token = getToken();
            if (!token) {
                return { 'Content-Type': 'application/json' };
            }
            return { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${token}` 
            };
        }
        
        let projectsCache = [];
        let filteredProjects = [];
        let deleteProjectId = null;
        
        // Token validation function
        async function validateToken() {
            const token = getToken();
            if (!token) {
                window.location.href = './login.html';
                return false;
            }
            
            try {
                // Create abort controller for timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                
                const response = await fetch(`${API_BASE}/projects`, { 
                    method: 'GET', 
                    headers: getHeaders(),
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (response.status === 401 || response.status === 403) {
                    // Token is invalid or expired
                    localStorage.removeItem('adminAuthToken');
                    sessionStorage.removeItem('adminAuthToken');
                    localStorage.removeItem('adminUsername');
                    sessionStorage.removeItem('adminUsername');
                    showToast('Session expired. Please login again.', 'error');
                    setTimeout(() => {
                        window.location.href = './login.html';
                    }, 2000);
                    return false;
                }
                return true;
            } catch (error) {
                // Network error or timeout 
                if (error.name === 'AbortError') {
                    console.warn('Token validation timeout');
                } else {
                    console.warn('Token validation failed:', error);
                }
                return true; // Assume token is valid if we cant verify
            }
        }

        // Toast notification function
        function showToast(message, type = 'info') {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.textContent = message;
            container.appendChild(toast);

            setTimeout(() => {
                toast.style.animation = 'slideIn 0.3s ease-out reverse';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }

        // Format date helper
        function formatDate(dateString) {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        }

        // Initialize Page
        document.addEventListener('DOMContentLoaded', async () => {
            // Validate token on page load
            const isValid = await validateToken();
            if (!isValid) return;
            
            // Get username from either storage location
            const username = localStorage.getItem('adminUsername') || sessionStorage.getItem('adminUsername') || 'Admin';
            document.getElementById('admin-username').textContent = `Logged in as: ${username}`;

            document.getElementById('logout-button').addEventListener('click', () => {
                // Clear both storage locations
                localStorage.removeItem('adminAuthToken');
                localStorage.removeItem('adminUsername');
                sessionStorage.removeItem('adminAuthToken');
                sessionStorage.removeItem('adminUsername');
                window.location.href = './login.html';
            });

            // Refresh button
            document.getElementById('refresh-btn').addEventListener('click', () => fetchProjects(true));

            // Clear filters button
            document.getElementById('clear-filters-btn').addEventListener('click', clearFilters);

            // Search and filter event listeners
            document.getElementById('search-input').addEventListener('input', applyFilters);
            document.getElementById('status-filter').addEventListener('change', applyFilters);

            // Delete modal buttons
            document.getElementById('confirm-delete-btn').addEventListener('click', confirmDelete);
            document.getElementById('cancel-delete-btn').addEventListener('click', closeDeleteModal);

            // Edit modal buttons
            document.getElementById('close-edit-modal-btn').addEventListener('click', closeEditModal);
            document.getElementById('cancel-edit-btn').addEventListener('click', closeEditModal);

            // Close modals on overlay click
            document.getElementById('edit-modal').addEventListener('click', (e) => {
                if (e.target.id === 'edit-modal') closeEditModal();
            });
            document.getElementById('delete-modal').addEventListener('click', (e) => {
                if (e.target.id === 'delete-modal') closeDeleteModal();
            });

            // Event delegation for dynamically generated buttons
            const tbody = document.getElementById('projects-tbody');
            tbody.addEventListener('click', (e) => {
                const target = e.target.closest('button');
                if (!target) return;
                
                if (target.classList.contains('edit-project-btn')) {
                    const id = parseInt(target.dataset.projectId);
                    openEditModal(id);
                } else if (target.classList.contains('delete-project-btn')) {
                    const id = parseInt(target.dataset.projectId);
                    openDeleteModal(id);
                } else if (target.classList.contains('retry-fetch-btn')) {
                    fetchProjects();
                } else if (target.classList.contains('clear-filters-dynamic-btn')) {
                    clearFilters();
                }
            });

            // Event delegation for status updates
            tbody.addEventListener('change', (e) => {
                if (e.target.classList.contains('status-select')) {
                    const id = parseInt(e.target.dataset.projectId);
                    const newStatus = e.target.value;
                    updateStatus(id, newStatus, e.target);
                }
            });

            fetchProjects(); // Load initial data
        });

        // PROJECT FUNCTIONS 
        async function fetchProjects(showSuccessToast = false) {
            const tbody = document.getElementById('projects-tbody');
            const refreshBtn = document.getElementById('refresh-btn');
            const originalContent = refreshBtn.innerHTML;
            const isManualRefresh = refreshBtn.disabled === false;
            
            tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-slate-400"><div class="spinner mx-auto"></div> Loading projects...</td></tr>';
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<div class="spinner"></div> Refreshing...';
            
            try {
                const headers = getHeaders();
                const token = getToken();
                
                if (!token) {
                    showToast('No authentication token found. Please login again.', 'error');
                    setTimeout(() => window.location.href = './login.html', 1500);
                    return;
                }
                
                const res = await fetch(`${API_BASE}/projects`, { 
                    method: 'GET',
                    headers: headers
                });
                
                if (!res.ok) {
                    if (res.status === 401 || res.status === 403) {
                        // Clear invalid tokens
                        localStorage.removeItem('adminAuthToken');
                        sessionStorage.removeItem('adminAuthToken');
                        localStorage.removeItem('adminUsername');
                        sessionStorage.removeItem('adminUsername');
                        showToast('Session expired. Please login again.', 'error');
                        setTimeout(() => window.location.href = './login.html', 1500);
                        return;
                    }
                    const errorText = await res.text().catch(() => 'Unknown error');
                    throw new Error(`HTTP ${res.status}: ${errorText}`);
                }
                
                const data = await res.json();
                projectsCache = Array.isArray(data) ? data : [];
                filteredProjects = [...projectsCache];
                applyFilters();
                
                if (isManualRefresh || showSuccessToast) {
                    showToast(`Projects loaded successfully (${projectsCache.length} project${projectsCache.length !== 1 ? 's' : ''})`, 'success');
                }
            } catch (e) {
                console.error('Error fetching projects:', e);
                let errorMessage = 'Failed to load projects';
                if (e.message.includes('fetch') || e.message.includes('network')) {
                    errorMessage = 'Network error. Please check your connection.';
                } else if (e.message) {
                    errorMessage = e.message;
                }
                
                tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-red-500">
                    <div class="flex flex-col items-center">
                        <svg class="w-12 h-12 text-red-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <p class="font-medium">Error loading projects</p>
                        <p class="text-sm text-slate-400 mt-1">${escapeHtml(errorMessage)}</p>
                        <button class="retry-fetch-btn mt-3 text-purple-400 hover:text-purple-300 text-sm font-medium">Try Again</button>
                    </div>
                </td></tr>`;
                showToast('Failed to load projects. Please try again.', 'error');
            } finally {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = originalContent;
            }
        }

        // Filter and search functionality
        function applyFilters() {
            const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();
            const statusFilter = document.getElementById('status-filter').value;
            const clearBtn = document.getElementById('clear-filters-btn');

            filteredProjects = projectsCache.filter(project => {
                const matchesSearch = !searchTerm || 
                    project.projectName?.toLowerCase().includes(searchTerm) ||
                    project.clientName?.toLowerCase().includes(searchTerm) ||
                    project.contactPerson?.toLowerCase().includes(searchTerm) ||
                    project.email?.toLowerCase().includes(searchTerm);
                
                const matchesStatus = !statusFilter || project.status === statusFilter;
                
                return matchesSearch && matchesStatus;
            });

            // Show/hide clear filters button
            if (searchTerm || statusFilter) {
                clearBtn.classList.remove('hidden');
            } else {
                clearBtn.classList.add('hidden');
            }

            renderProjects(filteredProjects);
            updateProjectCount();
        }

        function clearFilters() {
            document.getElementById('search-input').value = '';
            document.getElementById('status-filter').value = '';
            applyFilters();
        }

        function updateProjectCount() {
            document.getElementById('project-count').textContent = filteredProjects.length;
        }

        function renderProjects(data) {
            const tbody = document.getElementById('projects-tbody');
            if (data.length === 0) {
                const hasFilters = document.getElementById('search-input').value || document.getElementById('status-filter').value;
                tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-12 text-center">
                    <div class="flex flex-col items-center">
                        <svg class="w-16 h-16 text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        <p class="text-slate-400 font-medium text-lg">${hasFilters ? 'No projects match your filters' : 'No projects found'}</p>
                        <p class="text-slate-500 text-sm mt-1">${hasFilters ? 'Try adjusting your search or filter criteria' : 'Projects will appear here once submitted'}</p>
                        ${hasFilters ? '<button class="clear-filters-dynamic-btn mt-4 text-purple-400 hover:text-purple-300 text-sm font-medium">Clear Filters</button>' : ''}
                    </div>
                </td></tr>`;
                return;
            }
            tbody.innerHTML = data.map(p => `
                <tr class="hover:bg-white/5 transition-all duration-200 border-b border-white/5">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <select data-project-id="${p.id}" class="status-select text-xs rounded-full px-3 py-1 font-semibold ${getStatusColor(p.status)} border-0 cursor-pointer focus:ring-2 focus:ring-purple-500 focus:outline-none transition-colors appearance-none">
                            <option value="New" style="color:black;" ${p.status === 'New' ? 'selected' : ''}>New</option>
                            <option value="Reviewing" style="color:black;" ${p.status === 'Reviewing' ? 'selected' : ''}>Reviewing</option>
                            <option value="In Progress" style="color:black;" ${p.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                            <option value="Completed" style="color:black;" ${p.status === 'Completed' ? 'selected' : ''}>Completed</option>
                        </select>
                    </td>
                    <td class="px-6 py-4">
                        <div class="text-sm font-medium text-white">${escapeHtml(p.projectName || 'N/A')}</div>
                        ${p.projectDescription ? `<div class="text-xs text-slate-400 mt-1 line-clamp-1">${escapeHtml(p.projectDescription)}</div>` : ''}
                    </td>
                    <td class="px-6 py-4">
                        <div class="text-sm font-medium text-white">${escapeHtml(p.clientName || 'N/A')}</div>
                        <div class="text-sm text-slate-400">${escapeHtml(p.contactPerson || 'N/A')}</div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="text-sm font-medium text-white">$${p.budget ? Number(p.budget).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : 'N/A'}</div>
                        <div class="text-sm text-slate-400">Due: ${formatDate(p.dueDate)}</div>
                        ${p.duration ? `<div class="text-xs text-slate-500 mt-1">${p.duration} days</div>` : ''}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button data-project-id="${p.id}" class="edit-project-btn text-purple-400 hover:text-purple-300 mr-4 font-medium transition-colors">
                            Edit
                        </button>
                        <button data-project-id="${p.id}" class="delete-project-btn text-pink-500 hover:text-pink-400 font-medium transition-colors">
                            Delete
                        </button>
                    </td>
                </tr>
            `).join('');
        }

        // Escape HTML to prevent XSS
        function escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function getStatusColor(status) {
            switch (status) {
                case 'New': return 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30';
                case 'Reviewing': return 'bg-purple-500/20 text-purple-300 border border-purple-500/30';
                case 'In Progress': return 'bg-pink-500/20 text-pink-300 border border-pink-500/30';
                case 'Completed': return 'bg-teal-500/20 text-teal-300 border border-teal-500/30';
                default: return 'bg-white/10 text-slate-300 border border-white/20';
            }
        }

        async function updateStatus(id, newStatus, selectElement) {
            const originalStatus = projectsCache.find(p => p.id === id)?.status;
            const originalClass = selectElement.className;

            // Optimistic update
            selectElement.className = `status-select text-xs rounded-full px-3 py-1 font-semibold ${getStatusColor(newStatus)} border-0 cursor-pointer focus:ring-2 focus:ring-purple-500 focus:outline-none transition-colors appearance-none`;
            selectElement.disabled = true;

            try {
                const response = await fetch(`${API_BASE}/projects/${id}/status`, {
                    method: 'PATCH',
                    headers: getHeaders(),
                    body: JSON.stringify({ status: newStatus })
                });
                
                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        showToast('Session expired. Please login again.', 'error');
                        setTimeout(() => window.location.href = './login.html', 1500);
                        return;
                    }
                    throw new Error('Server update failed');
                }

                // Update cache
                const project = projectsCache.find(p => p.id === id);
                if (project) project.status = newStatus;

                showToast(`Status updated to ${newStatus}`, 'success');
            } catch (error) {
                console.error('Error updating status:', error);
                // Revert visual change
                selectElement.className = originalClass;
                selectElement.value = originalStatus;
                showToast('Failed to update status. Please try again.', 'error');
            } finally {
                selectElement.disabled = false;
            }
        }

        function openDeleteModal(id) {
            deleteProjectId = id;
            document.getElementById('delete-modal').classList.remove('hidden');
        }

        function closeDeleteModal() {
            deleteProjectId = null;
            document.getElementById('delete-modal').classList.add('hidden');
        }

        async function confirmDelete() {
            if (!deleteProjectId) return;

            const deleteBtn = document.getElementById('confirm-delete-btn');
            const originalContent = deleteBtn.innerHTML;
            deleteBtn.disabled = true;
            deleteBtn.innerHTML = '<div class="spinner"></div> Deleting...';

            try {
                const response = await fetch(`${API_BASE}/projects/${deleteProjectId}`, { 
                    method: 'DELETE', 
                    headers: getHeaders()
                });

                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        showToast('Session expired. Please login again.', 'error');
                        setTimeout(() => window.location.href = './login.html', 1500);
                        return;
                    }
                    throw new Error('Delete failed');
                }

                closeDeleteModal();
                showToast('Project deleted successfully', 'success');
                
                // Remove from cache
                projectsCache = projectsCache.filter(p => p.id !== deleteProjectId);
                applyFilters();
            } catch (error) {
                console.error('Error deleting project:', error);
                showToast('Failed to delete project. Please try again.', 'error');
            } finally {
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = originalContent;
            }
        }


        function openEditModal(id) {
            const p = projectsCache.find(p => p.id === id);
            if (!p) {
                showToast('Project not found', 'error');
                return;
            }

            document.getElementById('edit-id').value = p.id;
            document.getElementById('edit-clientName').value = p.clientName || '';
            document.getElementById('edit-contactPerson').value = p.contactPerson || '';
            document.getElementById('edit-projectName').value = p.projectName || '';
            document.getElementById('edit-projectDescription').value = p.projectDescription || '';
            document.getElementById('edit-email').value = p.email || '';
            document.getElementById('edit-phone').value = p.phone || '';
            document.getElementById('edit-dueDate').value = p.dueDate ? p.dueDate.split('T')[0] : '';
            document.getElementById('edit-budget').value = p.budget || '';
            document.getElementById('edit-duration').value = p.duration || '';
            
            document.getElementById('edit-modal').classList.remove('hidden');
        }

        function closeEditModal() {
            document.getElementById('edit-modal').classList.add('hidden');
            document.getElementById('edit-form').reset();
        }

        document.getElementById('edit-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('edit-id').value;
            const saveBtn = document.getElementById('save-btn');
            const originalContent = saveBtn.innerHTML;

            const data = {
                clientName: document.getElementById('edit-clientName').value.trim(),
                contactPerson: document.getElementById('edit-contactPerson').value.trim(),
                projectName: document.getElementById('edit-projectName').value.trim(),
                projectDescription: document.getElementById('edit-projectDescription').value.trim(),
                email: document.getElementById('edit-email').value.trim(),
                phone: document.getElementById('edit-phone').value.trim(),
                dueDate: document.getElementById('edit-dueDate').value || null,
                budget: document.getElementById('edit-budget').value ? parseFloat(document.getElementById('edit-budget').value) : null,
                duration: document.getElementById('edit-duration').value ? parseInt(document.getElementById('edit-duration').value) : null
            };

            // Validation
            if (!data.clientName || !data.contactPerson || !data.projectName || !data.email) {
                showToast('Please fill in all required fields', 'error');
                return;
            }

            if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
                showToast('Please enter a valid email address', 'error');
                return;
            }

            saveBtn.disabled = true;
            saveBtn.innerHTML = '<div class="spinner"></div> Saving...';

            try {
                const response = await fetch(`${API_BASE}/projects/${id}`, { 
                    method: 'PUT', 
                    headers: getHeaders(), 
                    body: JSON.stringify(data) 
                });

                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                        showToast('Session expired. Please login again.', 'error');
                        setTimeout(() => window.location.href = './login.html', 1500);
                        return;
                    }
                    throw new Error('Update failed');
                }

                closeEditModal();
                showToast('Project updated successfully', 'success');
                
                // Update cache
                const projectIndex = projectsCache.findIndex(p => p.id == id);
                if (projectIndex !== -1) {
                    projectsCache[projectIndex] = { ...projectsCache[projectIndex], ...data };
                }
                
                applyFilters();
            } catch (error) {
                console.error('Error updating project:', error);
                showToast('Failed to update project. Please try again.', 'error');
            } finally {
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalContent;
            }
        });