// Table Touch Enhancements for iPad
// Improves table interactions on touch devices

(function() {
    'use strict';

    const TableTouchEnhancer = {
        init() {
            this.enhanceAllTables();
            this.setupSwipeToAction();
            this.setupTouchSorting();
        },

        enhanceAllTables() {
            const tables = document.querySelectorAll('table');
            tables.forEach(table => this.enhanceTable(table));
        },

        enhanceTable(table) {
            // Add touch-friendly scrolling for wide tables
            if (!table.closest('.table-container')) {
                const container = document.createElement('div');
                container.className = 'table-container touch-scroll';
                table.parentNode.insertBefore(container, table);
                container.appendChild(table);
            }

            // Enhance table rows for touch
            const rows = table.querySelectorAll('tbody tr');
            rows.forEach(row => this.enhanceRow(row));

            // Add touch-friendly sorting
            const headers = table.querySelectorAll('th[data-sort], th.sortable');
            headers.forEach(header => this.enhanceSortableHeader(header));
        },

        enhanceRow(row) {
            // Add touch feedback
            row.classList.add('touch-row');
            
            // Handle row selection on touch
            row.addEventListener('touchstart', (e) => {
                row.classList.add('touch-active');
            }, { passive: true });

            row.addEventListener('touchend', (e) => {
                setTimeout(() => {
                    row.classList.remove('touch-active');
                }, 150);
            }, { passive: true });

            // Add swipe detection for row actions
            this.addSwipeToRow(row);
        },

        enhanceSortableHeader(header) {
            // Ensure minimum touch target size
            if (!header.style.minHeight) {
                header.style.minHeight = '44px';
            }
            
            // Add visual touch feedback
            header.addEventListener('touchstart', (e) => {
                header.classList.add('header-touch-active');
            }, { passive: true });

            header.addEventListener('touchend', (e) => {
                setTimeout(() => {
                    header.classList.remove('header-touch-active');
                }, 200);
            }, { passive: true });
        },

        addSwipeToRow(row) {
            let startX, startY, startTime;
            
            row.addEventListener('touchstart', (e) => {
                const touch = e.touches[0];
                startX = touch.clientX;
                startY = touch.clientY;
                startTime = Date.now();
            }, { passive: true });

            row.addEventListener('touchmove', (e) => {
                if (!startX) return;
                
                const touch = e.touches[0];
                const deltaX = touch.clientX - startX;
                const deltaY = touch.clientY - startY;
                
                // Prevent vertical scrolling if horizontal swipe detected
                if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
                    this.showSwipeActions(row, deltaX);
                }
            }, { passive: false });

            row.addEventListener('touchend', (e) => {
                if (!startX) return;
                
                const touch = e.changedTouches[0];
                const deltaX = touch.clientX - startX;
                const deltaTime = Date.now() - startTime;
                
                if (Math.abs(deltaX) > 100 && deltaTime < 500) {
                    this.handleSwipeAction(row, deltaX > 0 ? 'right' : 'left');
                }
                
                this.hideSwipeActions(row);
                startX = null;
                startY = null;
            }, { passive: true });
        },

        showSwipeActions(row, deltaX) {
            // Visual feedback during swipe
            const opacity = Math.min(Math.abs(deltaX) / 100, 0.7);
            if (deltaX > 0) {
                row.style.backgroundColor = `rgba(46, 204, 113, ${opacity})`;
            } else {
                row.style.backgroundColor = `rgba(231, 76, 60, ${opacity})`;
            }
        },

        hideSwipeActions(row) {
            row.style.backgroundColor = '';
        },

        handleSwipeAction(row, direction) {
            // Dispatch custom swipe event
            const swipeEvent = new CustomEvent('tableRowSwipe', {
                detail: { row, direction },
                bubbles: true
            });
            row.dispatchEvent(swipeEvent);
            
            DebugLogger.log(`📊 Table row swiped ${direction}`, row);
        },

        setupSwipeToAction() {
            // Listen for swipe events and handle common actions
            document.addEventListener('tableRowSwipe', (e) => {
                const { row, direction } = e.detail;
                
                if (direction === 'right') {
                    // Right swipe - could trigger edit action
                    const editBtn = row.querySelector('.edit-btn, .btn-edit, [data-action="edit"]');
                    if (editBtn) {
                        this.showActionFeedback(row, 'edit');
                        setTimeout(() => editBtn.click(), 200);
                    }
                } else if (direction === 'left') {
                    // Left swipe - could trigger delete action
                    const deleteBtn = row.querySelector('.delete-btn, .btn-delete, [data-action="delete"]');
                    if (deleteBtn) {
                        this.showActionFeedback(row, 'delete');
                        setTimeout(() => deleteBtn.click(), 200);
                    }
                }
            });
        },

        showActionFeedback(row, action) {
            const feedback = document.createElement('div');
            feedback.className = `action-feedback ${action}`;
            feedback.textContent = action === 'edit' ? '✏️ Éditer' : '🗑️ Supprimer';
            
            row.style.position = 'relative';
            row.appendChild(feedback);
            
            setTimeout(() => {
                if (feedback.parentNode) {
                    feedback.parentNode.removeChild(feedback);
                }
                row.style.position = '';
            }, 1000);
        },

        setupTouchSorting() {
            // Enhanced sorting for touch devices
            document.addEventListener('click', (e) => {
                const header = e.target.closest('th[data-sort], th.sortable');
                if (!header || !window.iPadEnhancements?.detection.isIPad) return;
                
                // Add touch-specific sorting animation
                header.classList.add('sorting-active');
                setTimeout(() => {
                    header.classList.remove('sorting-active');
                }, 300);
            });
        }
    };

    // Table-specific CSS (inject into head)
    const tableCSS = `
        <style id="table-touch-styles">
        /* Table Touch Enhancements */
        .table-container.touch-scroll {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .touch-row {
            transition: background-color 0.15s ease;
            cursor: pointer;
        }
        
        .touch-row.touch-active {
            background-color: rgba(74, 144, 226, 0.1);
        }
        
        .header-touch-active {
            background-color: rgba(74, 144, 226, 0.2) !important;
            transform: scale(0.98);
            transition: all 0.1s ease;
        }
        
        .sorting-active {
            background-color: rgba(74, 144, 226, 0.3) !important;
            animation: sortPulse 0.3s ease;
        }
        
        @keyframes sortPulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        
        .action-feedback {
            position: absolute;
            top: 50%;
            right: 10px;
            transform: translateY(-50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 0.8rem;
            z-index: 1000;
            animation: feedbackSlide 0.3s ease;
        }
        
        .action-feedback.delete {
            background: rgba(231, 76, 60, 0.9);
        }
        
        .action-feedback.edit {
            background: rgba(46, 204, 113, 0.9);
        }
        
        @keyframes feedbackSlide {
            from { 
                opacity: 0; 
                transform: translateY(-50%) translateX(20px); 
            }
            to { 
                opacity: 1; 
                transform: translateY(-50%) translateX(0); 
            }
        }
        
        /* iPad-specific table improvements */
        @media (min-width: 768px) and (max-width: 1024px) {
            table th,
            table td {
                padding: 12px 8px;
                font-size: 0.95rem;
            }
            
            .action-buttons {
                display: flex;
                gap: 5px;
                flex-wrap: wrap;
            }
            
            .action-buttons button {
                min-width: 70px;
                padding: 8px 12px;
            }
        }
        </style>
    `;

    // Inject styles and initialize
    function init() {
        // Only enhance on iPad or touch devices
        if (window.iPadEnhancements?.detection.isIPad || 
            ('ontouchstart' in window)) {
            
            // Inject CSS
            document.head.insertAdjacentHTML('beforeend', tableCSS);
            
            // Initialize enhancements
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    TableTouchEnhancer.init();
                });
            } else {
                TableTouchEnhancer.init();
            }
            
            DebugLogger.log('📊 Table touch enhancements initialized');
        }
    }

    // Export for manual initialization if needed
    window.TableTouchEnhancer = TableTouchEnhancer;
    
    // Auto-initialize
    init();

})();