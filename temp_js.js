        // Add event listener for retriever type selection
        document.getElementById('retrieverType').addEventListener('change', function() {
            const retrieverType = this.value;
            
            // Show/hide boost controls based on retriever type
            const fieldBoostsSection = document.getElementById('fieldBoostsSection');
            const fieldSelectionSection = document.getElementById('fieldSelectionSection');
            const resetBoostsButton = document.getElementById('resetBoostsButton');
            const resetSelectionButton = document.getElementById('resetSelectionButton');
            
            if (retrieverType === 'linear') {
                fieldBoostsSection.classList.remove('d-none');
                fieldSelectionSection.classList.add('d-none');
                resetBoostsButton.classList.remove('d-none');
                resetSelectionButton.classList.add('d-none');
                // Initialize boost slider visibility based on checkbox states
                updateBoostSliderVisibility();
            } else if (retrieverType === 'rrf') {
                fieldBoostsSection.classList.add('d-none');
                fieldSelectionSection.classList.remove('d-none');
                resetBoostsButton.classList.add('d-none');
                resetSelectionButton.classList.remove('d-none');
            } else {
                fieldBoostsSection.classList.add('d-none');
                fieldSelectionSection.classList.add('d-none');
                resetBoostsButton.classList.add('d-none');
                resetSelectionButton.classList.add('d-none');
            }
            
            // Show/hide Linear parameters based on retriever type
            const linearParams = document.getElementById('linearParams');
            if (retrieverType === 'linear') {
                linearParams.classList.remove('d-none');
            } else {
                linearParams.classList.add('d-none');
            }
            
            // Show/hide RRF parameters based on retriever type
            const rrfParams = document.getElementById('rrfParams');
            if (retrieverType === 'rrf') {
                rrfParams.classList.remove('d-none');
            } else {
                rrfParams.classList.add('d-none');
            }
            
            updateQuery();
        });

        document.getElementById('searchButton').addEventListener('click', performSearch);
        document.getElementById('searchQuery').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });

        // Add event listener for search query changes
        document.getElementById('searchQuery').addEventListener('input', updateQuery);

        // Add event listener for reranking checkbox
        document.getElementById('enableReranking').addEventListener('change', function() {
            const rerankingParams = document.getElementById('rerankingParams');
            rerankingParams.classList.toggle('d-none', !this.checked);
            updateQuery();
        });

        // Add listeners for reranking parameters
        document.getElementById('rerankerField').addEventListener('change', updateQuery);
        document.getElementById('rankWindowSize').addEventListener('change', updateQuery);



        // Add event listener for result size
        document.getElementById('resultSize').addEventListener('change', function() {
            const resultSize = parseInt(this.value);
            
            // Update RRF rank window size
            const rrfRankWindowSize = document.getElementById('rrfRankWindowSize');
            rrfRankWindowSize.min = resultSize;
            if (parseInt(rrfRankWindowSize.value) < resultSize) {
                rrfRankWindowSize.value = resultSize;
            }
            
            // Update Linear rank window size
            const linearRankWindowSize = document.getElementById('linearRankWindowSize');
            linearRankWindowSize.min = resultSize;
            if (parseInt(linearRankWindowSize.value) < resultSize) {
                linearRankWindowSize.value = resultSize;
            }
            
            updateQuery();
        });

        // Add event listeners for Linear parameters
        document.getElementById('linearRankWindowSize').addEventListener('input', updateQuery);
        
        // Add event listeners for RRF parameters
        document.getElementById('rrfRankWindowSize').addEventListener('input', updateQuery);
        document.getElementById('rrfRankConstant').addEventListener('input', updateQuery);

        // Add event listeners for RRF field selection checkboxes
        document.getElementById('selectBodyContentE5').addEventListener('change', updateQuery);
        document.getElementById('selectBodyContentElser').addEventListener('change', updateQuery);
        document.getElementById('selectTitle').addEventListener('change', updateQuery);
        document.getElementById('selectPropertyDescription').addEventListener('change', updateQuery);
        document.getElementById('selectPropertyFeatures').addEventListener('change', updateQuery);
        document.getElementById('selectMetaDescription').addEventListener('change', updateQuery);
        document.getElementById('selectHeadings').addEventListener('change', updateQuery);

        // Add event listeners for Linear field selection checkboxes
        document.getElementById('linearSelectBodyContentE5').addEventListener('change', function() {
            updateBoostSliderVisibility();
            updateQuery();
        });
        document.getElementById('linearSelectBodyContentElser').addEventListener('change', function() {
            updateBoostSliderVisibility();
            updateQuery();
        });
        document.getElementById('linearSelectTitle').addEventListener('change', function() {
            updateBoostSliderVisibility();
            updateQuery();
        });
        document.getElementById('linearSelectPropertyDescription').addEventListener('change', function() {
            updateBoostSliderVisibility();
            updateQuery();
        });
        document.getElementById('linearSelectPropertyFeatures').addEventListener('change', function() {
            updateBoostSliderVisibility();
            updateQuery();
        });
        document.getElementById('linearSelectMetaDescription').addEventListener('change', function() {
            updateBoostSliderVisibility();
            updateQuery();
        });
        document.getElementById('linearSelectHeadings').addEventListener('change', function() {
            updateBoostSliderVisibility();
            updateQuery();
        });



        // Add event listener for explain checkbox
        document.getElementById('enableExplain').addEventListener('change', updateQuery);

        // Add event listeners for boost sliders
        document.querySelectorAll('input[type="range"][id^="boost"]').forEach(slider => {
            slider.addEventListener('input', function() {
                // Update the display value
                const valueDisplay = document.getElementById(this.id + 'Value');
                if (valueDisplay) {
                    valueDisplay.textContent = this.value;
                }
                updateQuery();
            });
        });

        // Add event listeners for location filter controls
        document.getElementById('enableLocationFilter').addEventListener('change', function() {
            const locationParams = document.getElementById('locationParams');
            const latitudeInput = document.getElementById('latitude');
            const longitudeInput = document.getElementById('longitude');
            
            if (this.checked) {
                // Set default Chicago coordinates when location filter is enabled
                latitudeInput.value = '41.9172';
                longitudeInput.value = '-87.6270';
                
                // Show notification
                showTemporaryMessage('Location filter enabled - defaulted to Chicago coordinates (41.9172, -87.6270)', 'info', 4000);
            }
            
            locationParams.classList.toggle('d-none', !this.checked);
            updateQuery();
        });

        // Add event listeners for location parameters
        document.getElementById('latitude').addEventListener('input', updateQuery);
        document.getElementById('longitude').addEventListener('input', updateQuery);
        document.getElementById('distance').addEventListener('input', updateQuery);

        // Add event listeners for price filter
        document.getElementById('minPriceSlider').addEventListener('input', updatePriceFilter);
        document.getElementById('maxPriceSlider').addEventListener('input', updatePriceFilter);

        function updatePriceFilter() {
            const minPrice = parseInt(document.getElementById('minPriceSlider').value);
            const maxPrice = parseInt(document.getElementById('maxPriceSlider').value);
            
            // Update displays
            updatePriceDisplay('minPriceDisplay', minPrice);
            updatePriceDisplay('maxPriceDisplay', maxPrice);
            
            updateQuery();
        }

        function updatePriceDisplay(displayId, price) {
            const display = document.getElementById(displayId);
            display.textContent = formatPrice(price);
        }

        function formatPrice(price) {
            if (price >= 1000000) {
                return `$${(price / 1000000).toFixed(1)}M`;
            } else if (price >= 1000) {
                return `$${(price / 1000).toFixed(0)}K`;
            } else {
                return `$${price.toLocaleString()}`;
            }
        }

        // Add event listeners for highlight field checkboxes
        document.querySelectorAll('input[type="checkbox"][id^="highlight"]').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const optionsId = this.id + 'Options';
                const optionsDiv = document.getElementById(optionsId);
                if (optionsDiv) {
                    optionsDiv.classList.toggle('d-none', !this.checked);
                }
                updateQuery();
            });
        });

        // Add event listeners for highlight options
        document.querySelectorAll('.highlight-options input, .highlight-options select').forEach(element => {
            element.addEventListener('change', updateQuery);
        });



        function updateQuery() {
            const queryDisplay = document.getElementById('generatedQuery');
            const searchQuery = document.getElementById('searchQuery').value;
            
            console.log('updateQuery() called');
            console.log('Search query:', searchQuery);
            
            // Add visual indicator that query is updating
            if (queryDisplay) {
                queryDisplay.style.borderColor = '#ffc107'; // Yellow border to indicate updating
                queryDisplay.placeholder = 'Updating query...';
            }
            
            if (searchQuery) {
                const enableReranking = document.getElementById('enableReranking').checked;
                const rerankerField = document.getElementById('rerankerField').value;
                const rankWindowSize = parseInt(document.getElementById('rankWindowSize').value);
                const selectedFields = getSelectedFields();
                const highlightConfig = getHighlightConfig();
                const resultSize = parseInt(document.getElementById('resultSize').value);
                const retrieverType = document.getElementById('retrieverType').value;
                
                // Get Linear parameters
                const linearRankWindowSize = parseInt(document.getElementById('linearRankWindowSize').value);
                
                // Get RRF parameters
                const rrfRankWindowSize = parseInt(document.getElementById('rrfRankWindowSize').value);
                const rrfRankConstant = parseInt(document.getElementById('rrfRankConstant').value);
                
                // Get explain parameter
                const enableExplain = document.getElementById('enableExplain').checked;
                
                // Get location filter parameters
                const enableLocationFilter = document.getElementById('enableLocationFilter').checked;
                const latitude = parseFloat(document.getElementById('latitude').value);
                const longitude = parseFloat(document.getElementById('longitude').value);
                const distance = parseFloat(document.getElementById('distance').value);
                
                // Get price filter parameters (only if price is selected)
                const minPrice = getCurrentPrice();
                const maxPrice = 10000000; // $10M max
                
                // Only include price parameters if price is selected
                const requestBody = {
                    query: searchQuery,
                    enableReranking: enableReranking,
                    rerankingParams: {
                        rerankerField: rerankerField,
                        rankWindowSize: rankWindowSize
                    },
                    selectedFields: selectedFields,
                    highlightConfig: highlightConfig,
                    resultSize: resultSize,
                    retrieverType: retrieverType,
                    linearParams: {
                        rank_window_size: linearRankWindowSize
                    },
                    rrfParams: {
                        rank_window_size: rrfRankWindowSize,
                        rank_constant: rrfRankConstant
                    },
                    enableExplain: enableExplain,
                    enableLocationFilter: enableLocationFilter,
                    locationParams: {
                        latitude: latitude,
                        longitude: longitude,
                        distance: distance
                    }
                };
                
                // Only add price parameters if price is selected
                if (minPrice > 0) {
                    requestBody.ratingParams = {
                        minRating: minPrice,
                        maxRating: maxPrice
                    };
                }
                
                // Debug logging
                console.log('Full request body being sent:', JSON.stringify(requestBody, null, 2));
                console.log('Request body weights:', requestBody.weights);
                
                fetch('/search', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody)
                })
                .then(response => response.json())
                .then(data => {
                    console.log('Response received from backend:', data);
                    console.log('Full response data:', JSON.stringify(data, null, 2));
                    if (data.query) {
                        console.log('Query from response:', JSON.stringify(data.query, null, 2));
                        queryDisplay.value = JSON.stringify(data.query, null, 2);
                        
                        // Reset visual indicator
                        queryDisplay.style.borderColor = '#28a745'; // Green border to indicate success
                        queryDisplay.placeholder = '';
                        
                        // Debug logging for the generated query
                        console.log('Query updated successfully');
                        
                        // Check if the display was actually updated
                        setTimeout(() => {
                            console.log('Display value after update:', queryDisplay.value);
                        }, 100);
                    } else {
                        console.log('No query in response');
                        // Reset visual indicator on error
                        queryDisplay.style.borderColor = '#dc3545'; // Red border to indicate error
                        queryDisplay.placeholder = 'Error updating query';
                    }
                })
                .catch(error => {
                    console.error('Error updating query:', error);
                    // Reset visual indicator on error
                    if (queryDisplay) {
                        queryDisplay.style.borderColor = '#dc3545'; // Red border to indicate error
                        queryDisplay.placeholder = 'Error updating query';
                    }
                });
            } else {
                console.log('No search query, skipping updateQuery');
                // Reset visual indicator
                if (queryDisplay) {
                    queryDisplay.style.borderColor = '';
                    queryDisplay.placeholder = '';
                }
            }
        }

        function performSearch() {
            const query = document.getElementById('searchQuery').value;
            const resultsDiv = document.getElementById('results');
            const loadingDiv = document.getElementById('loading');

            const enableReranking = document.getElementById('enableReranking').checked;
            const rerankerField = document.getElementById('rerankerField').value;
            const rankWindowSize = parseInt(document.getElementById('rankWindowSize').value);
            const selectedFields = getSelectedFields();
            const highlightConfig = getHighlightConfig();
            const resultSize = parseInt(document.getElementById('resultSize').value);
            const retrieverType = document.getElementById('retrieverType').value;

            // Get RRF parameters
            const rrfRankWindowSize = parseInt(document.getElementById('rrfRankWindowSize').value);
            const rrfRankConstant = parseInt(document.getElementById('rrfRankConstant').value);

            // Get explain parameter
            const enableExplain = document.getElementById('enableExplain').checked;

            // Get location filter parameters
            const enableLocationFilter = document.getElementById('enableLocationFilter').checked;
            const latitude = parseFloat(document.getElementById('latitude').value);
            const longitude = parseFloat(document.getElementById('longitude').value);
            const distance = parseFloat(document.getElementById('distance').value);

            // Get price filter parameters
            const minPrice = getCurrentPrice();
            const maxPrice = getCurrentMaxPrice();

            if (!query) {
                resultsDiv.innerHTML = '<div class="alert alert-warning">Please enter a search query</div>';
                return;
            }

            // Show loading spinner
            loadingDiv.classList.remove('d-none');
            resultsDiv.innerHTML = '';

            // Always include price parameters
            const requestBody = {
                query: query,
                enableReranking: enableReranking,
                rerankingParams: {
                    rerankerField: rerankerField,
                    rankWindowSize: rankWindowSize
                },
                selectedFields: selectedFields,
                highlightConfig: highlightConfig,
                resultSize: resultSize,
                retrieverType: retrieverType,
                rrfParams: {
                    rank_window_size: rrfRankWindowSize,
                    rank_constant: rrfRankConstant
                },
                enableExplain: enableExplain,
                enableLocationFilter: enableLocationFilter,
                locationParams: {
                    latitude: latitude,
                    longitude: longitude,
                    distance: distance
                },
                priceParams: {
                    minPrice: minPrice,
                    maxPrice: maxPrice
                }
            };

            fetch('/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            })
            .then(response => response.json())
            .then(data => {
                loadingDiv.classList.add('d-none');
                
                if (data.error) {
                    // Enhanced error handling for reranker issues
                    let errorMessage = data.error;
                    let errorClass = 'alert-danger';
                    
                    if (data.error.includes('Reranker error') || data.error.includes('text_similarity_reranker')) {
                        errorMessage = `
                            <strong>Reranker Error:</strong> ${data.error}<br><br>
                            <strong>Troubleshooting steps:</strong><br>
                            1. Wait a few moments and try again<br>
                            2. Check if your Elasticsearch cluster has the required models deployed
                        `;
                        errorClass = 'alert-warning';
                    } else if (data.error.includes('Inference model error')) {
                        errorMessage = `
                            <strong>Inference Model Error:</strong> ${data.error}<br><br>
                            <strong>Troubleshooting steps:</strong><br>
                            1. Wait a few moments and try again<br>
                            2. Check if your Elasticsearch cluster has the required models deployed
                        `;
                        errorClass = 'alert-warning';
                    }
                    
                    resultsDiv.innerHTML = `<div class="alert ${errorClass}">${errorMessage}</div>`;
                    return;
                }

                // Update the generated query display
                const queryDisplay = document.getElementById('generatedQuery');
                queryDisplay.value = JSON.stringify(data.query, null, 2);

                if (!data.results || data.results.length === 0) {
                    resultsDiv.innerHTML = '<div class="alert alert-info">No results found</div>';
                    return;
                }

                const resultsHtml = data.results.map(result => {
                    let highlightsHtml = '';
                    let semanticHighlightsHtml = '';
                    
                    if (result.highlights && typeof result.highlights === 'object') {
                        // Process highlights organized by field
                        const semanticFields = ['body_content_e5', 'body_content_elser'];
                        const semanticHighlights = {};
                        const otherHighlights = {};
                        
                        Object.keys(result.highlights).forEach(field => {
                            const fragments = result.highlights[field];
                            if (semanticFields.includes(field)) {
                                semanticHighlights[field] = fragments;
                            } else {
                                otherHighlights[field] = fragments;
                            }
                        });
                        
                        // Create semantic highlights section
                        if (Object.keys(semanticHighlights).length > 0) {
                            const semanticHtml = Object.keys(semanticHighlights).map(field => {
                                const fragments = semanticHighlights[field];
                                return `
                                    <div class="field-highlight-group">
                                        <div class="field-label text-primary fw-bold">${field}:</div>
                                        <div class="highlights-container">
                                            ${fragments.map(fragment => `<div class="highlight-item">${fragment}</div>`).join('')}
                                        </div>
                                    </div>
                                `;
                            }).join('');
                            
                            semanticHighlightsHtml = `
                                <div class="highlights-section semantic-highlight">
                                    <div class="field-label text-primary fw-bold">Semantic Highlights:</div>
                                    ${semanticHtml}
                                </div>
                            `;
                        }
                        
                        // Create other highlights section
                        if (Object.keys(otherHighlights).length > 0) {
                            const otherHtml = Object.keys(otherHighlights).map(field => {
                                const fragments = otherHighlights[field];
                                return `
                                    <div class="field-highlight-group">
                                        <div class="field-label">${field}:</div>
                                        <div class="highlights-container">
                                            ${fragments.map(fragment => `<div class="highlight-item">${fragment}</div>`).join('')}
                                        </div>
                                    </div>
                                `;
                            }).join('');
                            
                            highlightsHtml = `
                                <div class="highlights-section">
                                    <div class="field-label">Other Highlights:</div>
                                    ${otherHtml}
                                </div>
                            `;
                        }
                    }

                    // AI Summary button if explanation exists
                    let aiSummaryBtn = '';
                    if (result.explanation) {
                        aiSummaryBtn = `<button class="btn btn-outline-success btn-sm mb-2" type="button" onclick='openAISummaryChat(${JSON.stringify(result.explanation)}, "${result._id || ''}")'>🤖 AI Summary</button>`;
                    }

                    return `
                        <div class="result-card">
                            <div class="mb-3">
                                <div class="score">Score: ${result.score}</div>
                                ${result.explanation ? `
                                <div class="explanation-buttons mt-2">
                                    <button class="btn btn-outline-success btn-sm" type="button" onclick='openAISummaryChat(${JSON.stringify(result.explanation)}, "${result._id || ''}")'>🤖 Advisor</button>
                                    <button class="btn btn-outline-primary btn-sm" type="button" onclick='generateVisualExplanation(${JSON.stringify(result.explanation)}, "${result._id || ''}")'>📊 Visual Score Breakdown</button>
                                    <button class="btn btn-outline-info btn-sm" type="button" onclick="toggleExplanationSummary('explanation-summary-${result._id}', 'explanation-json-${result._id}')">Show Raw Explain Output</button>
                                </div>
                                <div id="explanation-summary-${result._id}" class="explanation-summary mt-2">
                                    ${renderExplanationSummary(result.explanation, result._id)}
                                </div>
                                <div id="visual-explanation-${result._id}" class="visual-explanation-content d-none mt-2">
                                    <div class="text-center">
                                        <div class="spinner-border text-primary" role="status">
                                            <span class="visually-hidden">Generating visual explanation...</span>
                                        </div>
                                        <p class="mt-2">Generating visual explanation...</p>
                                    </div>
                                </div>
                                <pre id="explanation-json-${result._id}" class="explanation-json d-none mt-2" style="background:#f8f9fa; border:1px solid #dee2e6; border-radius:4px; padding:1em; max-height:300px; overflow:auto;">${JSON.stringify(result.explanation, null, 2)}</pre>
                                ` : ''}
                            </div>
                            <div class="document-id" onclick="toggleDocumentId(this)">
                                <div class="document-id-header">
                                    <div class="document-id-left">
                                        <span>Document ID</span>
                                        <span class="copy-icon" onclick="copyDocumentId(event, '${result._id || 'N/A'}')" title="Copy Document ID">
                                            📋
                                        </span>
                                    </div>
                                    <span class="toggle-icon">▼</span>
                                </div>
                                <div class="document-id-content">
                                    ${result._id || 'N/A'}
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-8">
                                    <div class="property-name">${result.title || 'Unknown'}</div>
                                    <div class="field-value">
                                        <div class="field-label">Property Description:</div>
                                        <div class="description-container">${result['property-description'] || 'Unknown'}</div>
                                    </div>
                                    <div class="field-value">
                                        <div class="field-label">Property Features:</div>
                                        <div>${result['property-features'] || 'Unknown'}</div>
                                    </div>
                                    <div class="field-value">
                                        <div class="field-label">Meta Description:</div>
                                        <div>${result.meta_description || 'Unknown'}</div>
                                    </div>
                                    <div class="field-value">
                                        <div class="field-label">Headings:</div>
                                        <div>${result.headings || 'Unknown'}</div>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="field-value">
                                        <div class="field-label">Listing Agent Info:</div>
                                        <div>${result['listing-agent-info'] || 'Unknown'}</div>
                                    </div>
                                    <div class="field-value">
                                        <div class="field-label">Property Status:</div>
                                        <div>${result['property-status'] || 'Unknown'}</div>
                                    </div>
                                    <div class="field-value">
                                        <div class="field-label">Bedrooms:</div>
                                        <div>${result['number-of-bedrooms']}</div>
                                    </div>
                                    <div class="field-value">
                                        <div class="field-label">Bathrooms:</div>
                                        <div>${result['number-of-bathrooms']}</div>
                                    </div>
                                    <div class="field-value">
                                        <div class="field-label">Square Footage:</div>
                                        <div>${result['square-footage']}</div>
                                    </div>
                                    <div class="field-value">
                                        <div class="field-label">Home Price:</div>
                                        <div>${result['home-price']}</div>
                                    </div>
                                    <div class="field-value">
                                        <div class="field-label">Annual Tax:</div>
                                        <div>${result['annual-tax']}</div>
                                    </div>
                                    <div class="field-value">
                                        <div class="field-label">Maintenance Fee:</div>
                                        <div>${result['maintenance-fee']}</div>
                                    </div>
                                </div>
                            </div>

                            ${semanticHighlightsHtml ? `<div class="content-divider"></div>${semanticHighlightsHtml}` : ''}
                            ${highlightsHtml ? `<div class="content-divider"></div>${highlightsHtml}` : ''}
                        </div>
                    `;
                }).join('');

                resultsDiv.innerHTML = resultsHtml;

                // Insert AI Summary Chat Pane if not present
                if (!document.getElementById('aiSummaryChatPane')) {
                    const chatPane = document.createElement('div');
                    chatPane.id = 'aiSummaryChatPane';
                    chatPane.style.display = 'none';
                    chatPane.style.position = 'fixed';
                    chatPane.style.top = '0';
                    chatPane.style.right = '0';
                    chatPane.style.height = '100vh';
                    chatPane.style.zIndex = '2000';
                    chatPane.style.background = '#fff';
                    chatPane.style.boxShadow = '-2px 0 12px rgba(0,0,0,0.12)';
                    chatPane.style.borderLeft = '1px solid #dee2e6';
                    chatPane.style.display = 'none';
                    chatPane.style.flexDirection = 'column';
                    chatPane.style.width = '420px';
                    chatPane.innerHTML = `
                        <div id="aiSummaryResizeHandle" style="position:absolute;left:-6px;top:0;width:12px;height:100%;cursor:ew-resize;z-index:2100;"></div>
                        <div id="aiSummaryChatOverlay" style="height:100vh;display:flex;flex-direction:column;">
                            <div style="padding:1rem;border-bottom:1px solid #dee2e6;display:flex;justify-content:space-between;align-items:center;">
                                                                    <span style="font-weight:bold;font-size:1.1em;">Advisor</span>
                                <div>
                                    <button class="btn btn-sm btn-outline-success me-2" onclick="attachCurrentExplainPlan()" title="Attach the latest explain plan to this conversation so the AI can reference how the search was performed">
                                        <i class="fas fa-link"></i> Attach
                                        <i class="fas fa-info-circle ms-1" style="font-size: 0.8em; opacity: 0.7;" title="Attach the latest explain plan to this conversation so the AI can reference how the search was performed"></i>
                                    </button>
                                    <button class="btn btn-sm btn-outline-primary me-2" onclick="startNewConversationFromChat()">
                                        <i class="fas fa-plus"></i> New
                                    </button>
                                    <button class="btn btn-sm btn-outline-danger" onclick="closeAISummaryChat()">Close</button>
                                </div>
                            </div>
                            <div id="aiSummaryChatHistory" style="flex:1;overflow-y:auto;padding:1rem 1rem 0 1rem;background:#f8f9fa;"></div>
                            <form id="aiSummaryChatForm" style="padding:1rem;border-top:1px solid #dee2e6;display:flex;gap:0.5rem;">
                                <input id="aiSummaryChatInput" type="text" class="form-control" placeholder="Ask a follow-up question..." autocomplete="off" style="flex:1;">
                                <button class="btn btn-primary" type="submit">Send</button>
                            </form>
                        </div>
                    `;
                    document.body.appendChild(chatPane);

                    // Resizable logic
                    const handle = chatPane.querySelector('#aiSummaryResizeHandle');
                    let isResizing = false;
                    let startX = 0;
                    let startWidth = 0;
                    handle.addEventListener('mousedown', function(e) {
                        isResizing = true;
                        startX = e.clientX;
                        startWidth = parseInt(document.defaultView.getComputedStyle(chatPane).width, 10);
                        document.body.style.cursor = 'ew-resize';
                        document.body.style.userSelect = 'none';
                        e.preventDefault();
                    });
                    document.addEventListener('mousemove', function(e) {
                        if (!isResizing) return;
                        let newWidth = startWidth - (e.clientX - startX);
                        newWidth = Math.max(320, Math.min(window.innerWidth - 100, newWidth));
                        chatPane.style.width = newWidth + 'px';
                        // Optionally, adjust main content margin if needed
                        document.querySelector('.right-pane').style.marginRight = chatPane.style.display === 'block' ? chatPane.style.width : '0px';
                    });
                    document.addEventListener('mouseup', function() {
                        if (isResizing) {
                            isResizing = false;
                            document.body.style.cursor = '';
                            document.body.style.userSelect = '';
                        }
                    });
                }

                // After search results are loaded and rendered (in the .then(data => { ... }) of performSearch):
                window.lastSearchResults = data.results;
                
                // Check if there's an active chat session and notify about potential explain plan attachment
                const currentSession = aiChatSessionsManager.getCurrentSession();
                if (currentSession && data.results && data.results.length > 0) {
                    // Check if any results have explanations and match the current document
                    const matchingResult = data.results.find(r => r._id === currentSession.docId && r.explanation);
                    if (matchingResult) {
                        showTemporaryMessage(
                            `New explain plan available for "${matchingResult.title || 'current property'}". Click the "Attach" button to add it.`, 
                            'info', 
                            5000
                        );
                    }
                }
            })
            .catch(error => {
                loadingDiv.classList.add('d-none');
                resultsDiv.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
            });
        }



        // Add execute query functionality
        document.getElementById('executeQueryButton').addEventListener('click', function() {
            const queryText = document.getElementById('generatedQuery').value;
            const resultsDiv = document.getElementById('results');
            const loadingDiv = document.getElementById('loading');

            try {
                const query = JSON.parse(queryText);
                
                // Show loading spinner
                loadingDiv.classList.remove('d-none');
                resultsDiv.innerHTML = '';

                fetch('/execute-query', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        query: query
                    })
                })
                .then(response => response.json())
                .then(data => {
                    loadingDiv.classList.add('d-none');
                    
                    if (data.error) {
                        resultsDiv.innerHTML = `<div class="alert alert-danger">${data.error}</div>`;
                        return;
                    }

                    if (!data.results || data.results.length === 0) {
                        resultsDiv.innerHTML = '<div class="alert alert-info">No results found</div>';
                        return;
                    }

                    // Use the same result rendering logic as the search function
                    const resultsHtml = data.results.map(result => {
                        let highlightsHtml = '';
                        let semanticHighlightsHtml = '';
                        
                        if (result.highlights && typeof result.highlights === 'object') {
                            // Process highlights organized by field
                            const semanticFields = ['body_content_e5', 'body_content_elser'];
                            const semanticHighlights = {};
                            const otherHighlights = {};
                            
                            Object.keys(result.highlights).forEach(field => {
                                const fragments = result.highlights[field];
                                if (semanticFields.includes(field)) {
                                    semanticHighlights[field] = fragments;
                                } else {
                                    otherHighlights[field] = fragments;
                                }
                            });
                            
                            // Create semantic highlights section
                            if (Object.keys(semanticHighlights).length > 0) {
                                const semanticHtml = Object.keys(semanticHighlights).map(field => {
                                    const fragments = semanticHighlights[field];
                                    return `
                                        <div class="field-highlight-group">
                                            <div class="field-label text-primary fw-bold">${field}:</div>
                                            <div class="highlights-container">
                                                ${fragments.map(fragment => `<div class="highlight-item">${fragment}</div>`).join('')}
                                            </div>
                                        </div>
                                    `;
                                }).join('');
                                
                                semanticHighlightsHtml = `
                                    <div class="highlights-section semantic-highlight">
                                        <div class="field-label text-primary fw-bold">Semantic Highlights:</div>
                                        ${semanticHtml}
                                    </div>
                                `;
                            }
                            
                            // Create other highlights section
                            if (Object.keys(otherHighlights).length > 0) {
                                const otherHtml = Object.keys(otherHighlights).map(field => {
                                    const fragments = otherHighlights[field];
                                    return `
                                        <div class="field-highlight-group">
                                            <div class="field-label">${field}:</div>
                                            <div class="highlights-container">
                                                ${fragments.map(fragment => `<div class="highlight-item">${fragment}</div>`).join('')}
                                            </div>
                                        </div>
                                    `;
                                }).join('');
                                
                                highlightsHtml = `
                                    <div class="highlights-section">
                                        <div class="field-label">Other Highlights:</div>
                                        ${otherHtml}
                                    </div>
                                `;
                            }
                        }

                        // AI Summary button if explanation exists
                        let aiSummaryBtn = '';
                        if (result.explanation) {
                            aiSummaryBtn = `<button class="btn btn-outline-success btn-sm mb-2" type="button" onclick='openAISummaryChat(${JSON.stringify(result.explanation)}, "${result._id || ''}")'>🤖 AI Summary</button>`;
                        }

                        return `
                            <div class="result-card">
                                <div class="mb-3">
                                    <div class="d-flex align-items-center">
                                        <div class="score">Score: ${result.score}</div>
                                        ${result.explanation ? `
                                        <div class="explanation-buttons ms-3">
                                            <button class="btn btn-outline-success btn-sm" type="button" onclick='openAISummaryChat(${JSON.stringify(result.explanation)}, "${result._id || ''}")'>🤖 Advisor</button>
                                            <button class="btn btn-outline-primary btn-sm" type="button" onclick='generateVisualExplanation(${JSON.stringify(result.explanation)}, "${result._id || ''}")'>📊 Visual Score Breakdown</button>
                                            <button class="btn btn-outline-info btn-sm" type="button" onclick="toggleExplanationSummary('explanation-summary-${result._id}', 'explanation-json-${result._id}')">Show Raw Explain Output</button>
                                        </div>
                                        ` : ''}
                                    </div>
                                    ${result.explanation ? `
                                    <div id="explanation-summary-${result._id}" class="explanation-summary mt-2">
                                        ${renderExplanationSummary(result.explanation, result._id)}
                                    </div>
                                    <div id="visual-explanation-${result._id}" class="visual-explanation-content d-none mt-2">
                                        <div class="text-center">
                                            <div class="spinner-border text-primary" role="status">
                                                <span class="visually-hidden">Generating visual explanation...</span>
                                            </div>
                                            <p class="mt-2">Generating visual explanation...</p>
                                        </div>
                                    </div>
                                    <pre id="explanation-json-${result._id}" class="explanation-json d-none mt-2" style="background:#f8f9fa; border:1px solid #dee2e6; border-radius:4px; padding:1em; max-height:300px; overflow:auto;">${JSON.stringify(result.explanation, null, 2)}</pre>
                                    ` : ''}
                                </div>
                                <div class="document-id" onclick="toggleDocumentId(this)">
                                    <div class="document-id-header">
                                        <div class="document-id-left">
                                            <span>Document ID</span>
                                            <span class="copy-icon" onclick="copyDocumentId(event, '${result._id || 'N/A'}')" title="Copy Document ID">
                                                📋
                                            </span>
                                        </div>
                                        <span class="toggle-icon">▼</span>
                                    </div>
                                    <div class="document-id-content">
                                        ${result._id || 'N/A'}
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-8">
                                        <div class="property-name">${result.title || 'Unknown'}</div>
                                        <div class="field-value">
                                            <div class="field-label">Property Description:</div>
                                            <div class="description-container">${result['property-description'] || 'Unknown'}</div>
                                        </div>
                                        <div class="field-value">
                                            <div class="field-label">Property Features:</div>
                                            <div>${result['property-features'] || 'Unknown'}</div>
                                        </div>
                                        <div class="field-value">
                                            <div class="field-label">Meta Description:</div>
                                            <div>${result.meta_description || 'Unknown'}</div>
                                        </div>
                                        <div class="field-value">
                                            <div class="field-label">Headings:</div>
                                            <div>${result.headings || 'Unknown'}</div>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="field-value">
                                            <div class="field-label">Listing Agent Info:</div>
                                            <div>${result['listing-agent-info'] || 'Unknown'}</div>
                                        </div>
                                        <div class="field-value">
                                            <div class="field-label">Property Status:</div>
                                            <div>${result['property-status'] || 'Unknown'}</div>
                                        </div>
                                        <div class="field-value">
                                            <div class="field-label">Bedrooms:</div>
                                            <div>${result['number-of-bedrooms']}</div>
                                        </div>
                                        <div class="field-value">
                                            <div class="field-label">Bathrooms:</div>
                                            <div>${result['number-of-bathrooms']}</div>
                                        </div>
                                        <div class="field-value">
                                            <div class="field-label">Square Footage:</div>
                                            <div>${result['square-footage']}</div>
                                        </div>
                                        <div class="field-value">
                                            <div class="field-label">Home Price:</div>
                                            <div>${result['home-price']}</div>
                                        </div>
                                        <div class="field-value">
                                            <div class="field-label">Annual Tax:</div>
                                            <div>${result['annual-tax']}</div>
                                        </div>
                                        <div class="field-value">
                                            <div class="field-label">Maintenance Fee:</div>
                                            <div>${result['maintenance-fee']}</div>
                                        </div>
                                    </div>
                                </div>

                                ${semanticHighlightsHtml ? `<div class="content-divider"></div>${semanticHighlightsHtml}` : ''}
                                ${highlightsHtml ? `<div class="content-divider"></div>${highlightsHtml}` : ''}
                            </div>
                        `;
                    }).join('');

                    resultsDiv.innerHTML = resultsHtml;

                    // Check if there's an active chat session and notify about potential explain plan attachment
                    const currentSession = aiChatSessionsManager.getCurrentSession();
                    if (currentSession && data.results && data.results.length > 0) {
                        // Check if any results have explanations and match the current document
                        const matchingResult = data.results.find(r => r._id === currentSession.docId && r.explanation);
                        if (matchingResult) {
                            showTemporaryMessage(
                                `New explain plan available for "${matchingResult.title || 'current property'}". Click the "Attach" button to add it.`, 
                                'info', 
                                5000
                            );
                        }
                    }

                    // Insert AI Summary Chat Pane if not present
                    if (!document.getElementById('aiSummaryChatPane')) {
                        const chatPane = document.createElement('div');
                        chatPane.id = 'aiSummaryChatPane';
                        chatPane.style.display = 'none';
                        chatPane.style.position = 'fixed';
                        chatPane.style.top = '0';
                        chatPane.style.right = '0';
                        chatPane.style.height = '100vh';
                        chatPane.style.zIndex = '2000';
                        chatPane.style.background = '#fff';
                        chatPane.style.boxShadow = '-2px 0 12px rgba(0,0,0,0.12)';
                        chatPane.style.borderLeft = '1px solid #dee2e6';
                        chatPane.style.display = 'none';
                        chatPane.style.flexDirection = 'column';
                        chatPane.style.width = '420px';
                        chatPane.innerHTML = `
                            <div id="aiSummaryResizeHandle" style="position:absolute;left:-6px;top:0;width:12px;height:100%;cursor:ew-resize;z-index:2100;"></div>
                            <div id="aiSummaryChatOverlay" style="height:100vh;display:flex;flex-direction:column;">
                                <div style="padding:1rem;border-bottom:1px solid #dee2e6;display:flex;justify-content:space-between;align-items:center;">
                                    <span style="font-weight:bold;font-size:1.1em;">Advisor</span>
                                    <div>
                                        <button class="btn btn-sm btn-outline-success me-2" onclick="attachCurrentExplainPlan()" title="Attach the latest explain plan to this conversation so the AI can reference how the search was performed">
                                            <i class="fas fa-link"></i> Attach
                                            <i class="fas fa-info-circle ms-1" style="font-size: 0.8em; opacity: 0.7;" title="Attach the latest explain plan to this conversation so the AI can reference how the search was performed"></i>
                                        </button>
                                        <button class="btn btn-sm btn-outline-primary me-2" onclick="startNewConversationFromChat()">
                                            <i class="fas fa-plus"></i> New
                                        </button>
                                        <button class="btn btn-sm btn-outline-danger" onclick="closeAISummaryChat()">Close</button>
                                    </div>
                                </div>
                                <div id="aiSummaryChatHistory" style="flex:1;overflow-y:auto;padding:1rem 1rem 0 1rem;background:#f8f9fa;"></div>
                                <form id="aiSummaryChatForm" style="padding:1rem;border-top:1px solid #dee2e6;display:flex;gap:0.5rem;">
                                    <input id="aiSummaryChatInput" type="text" class="form-control" placeholder="Ask a follow-up question..." autocomplete="off" style="flex:1;">
                                    <button class="btn btn-primary" type="submit">Send</button>
                                </form>
                            </div>
                        `;
                        document.body.appendChild(chatPane);

                        // Resizable logic
                        const handle = chatPane.querySelector('#aiSummaryResizeHandle');
                        let isResizing = false;
                        let startX = 0;
                        let startWidth = 0;
                        handle.addEventListener('mousedown', function(e) {
                            isResizing = true;
                            startX = e.clientX;
                            startWidth = parseInt(document.defaultView.getComputedStyle(chatPane).width, 10);
                            document.body.style.cursor = 'ew-resize';
                            document.body.style.userSelect = 'none';
                            e.preventDefault();
                        });
                        document.addEventListener('mousemove', function(e) {
                            if (!isResizing) return;
                            let newWidth = startWidth - (e.clientX - startX);
                            newWidth = Math.max(320, Math.min(window.innerWidth - 100, newWidth));
                            chatPane.style.width = newWidth + 'px';
                            // Optionally, adjust main content margin if needed
                            document.querySelector('.right-pane').style.marginRight = chatPane.style.display === 'block' ? chatPane.style.width : '0px';
                        });
                        document.addEventListener('mouseup', function() {
                            if (isResizing) {
                                isResizing = false;
                                document.body.style.cursor = '';
                                document.body.style.userSelect = '';
                            }
                        });
                    }
                })
                .catch(error => {
                    loadingDiv.classList.add('d-none');
                    resultsDiv.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
                });
            } catch (error) {
                alert('Invalid JSON query: ' + error.message);
            }
        });

        // Function to toggle document ID visibility
        function toggleDocumentId(element) {
            const content = element.querySelector('.document-id-content');
            const icon = element.querySelector('.toggle-icon');
            
            if (content.classList.contains('show')) {
                content.classList.remove('show');
                icon.classList.remove('rotated');
            } else {
                content.classList.add('show');
                icon.classList.add('rotated');
            }
        }

        // Function to copy document ID to clipboard
        function copyDocumentId(event, documentId) {
            event.stopPropagation(); // Prevent triggering the toggle function
            
            const copyIcon = event.target;
            const originalText = copyIcon.textContent;
            
            // Function to show visual feedback
            const showFeedback = (success) => {
                if (success) {
                    copyIcon.textContent = '✅';
                    copyIcon.classList.add('copied');
                    showNotification('Document ID copied to clipboard!', 'success');
                } else {
                    copyIcon.textContent = '❌';
                    showNotification('Failed to copy document ID', 'error');
                }
                
                // Reset after 2 seconds
                setTimeout(() => {
                    copyIcon.textContent = originalText;
                    copyIcon.classList.remove('copied');
                }, 2000);
            };
            
            // Try modern clipboard API first
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(documentId)
                    .then(() => showFeedback(true))
                    .catch(err => {
                        console.error('Clipboard API failed: ', err);
                        // Fallback to older method
                        fallbackCopyTextToClipboard(documentId, showFeedback);
                    });
            } else {
                // Fallback for older browsers
                fallbackCopyTextToClipboard(documentId, showFeedback);
            }
        }
        
        // Fallback copy method for older browsers
        function fallbackCopyTextToClipboard(text, callback) {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                callback(successful);
            } catch (err) {
                console.error('Fallback copy failed: ', err);
                document.body.removeChild(textArea);
                callback(false);
            }
        }

        // Function to copy generated query to clipboard
        function copyGeneratedQuery(event) {
            event.stopPropagation(); // Prevent any parent event handlers
            
            const copyIcon = event.target;
            const originalText = copyIcon.textContent;
            const generatedQuery = document.getElementById('generatedQuery').value;
            
            if (!generatedQuery.trim()) {
                showNotification('No query to copy!', 'warning');
                return;
            }
            
            // Function to show visual feedback
            const showFeedback = (success) => {
                if (success) {
                    copyIcon.textContent = '✅';
                    copyIcon.classList.add('copied');
                    showNotification('Generated query copied to clipboard!', 'success');
                } else {
                    copyIcon.textContent = '❌';
                    showNotification('Failed to copy generated query', 'error');
                }
                
                // Reset after 2 seconds
                setTimeout(() => {
                    copyIcon.textContent = originalText;
                    copyIcon.classList.remove('copied');
                }, 2000);
            };
            
            // Try modern clipboard API first
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(generatedQuery)
                    .then(() => showFeedback(true))
                    .catch(err => {
                        console.error('Clipboard API failed: ', err);
                        // Fallback to older method
                        fallbackCopyTextToClipboard(generatedQuery, showFeedback);
                    });
            } else {
                // Fallback for older browsers
                fallbackCopyTextToClipboard(generatedQuery, showFeedback);
            }
        }

        // Function to show validation messages
        function showValidationMessage(message) {
            // Create a temporary alert or use a toast notification
            const alertDiv = document.createElement('div');
            alertDiv.className = 'alert alert-warning alert-dismissible fade show position-fixed';
            alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 1050; max-width: 300px;';
            alertDiv.innerHTML = `
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            document.body.appendChild(alertDiv);
            
            // Auto-remove after 3 seconds
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, 3000);
        }

        // Function to show temporary messages (replaces alert popups)
        function showTemporaryMessage(message, type = 'info', duration = 3000) {
            const alertDiv = document.createElement('div');
            let alertClass = 'alert-info';
            
            if (type === 'success') {
                alertClass = 'alert-success';
            } else if (type === 'error') {
                alertClass = 'alert-danger';
            } else if (type === 'warning') {
                alertClass = 'alert-warning';
            }
            
            alertDiv.className = `alert ${alertClass} alert-dismissible fade show position-fixed`;
            alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 1050; max-width: 350px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
            alertDiv.innerHTML = `
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            document.body.appendChild(alertDiv);
            
            // Auto-remove after specified duration (default 3 seconds)
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, duration);
        }

        // Function to show notifications (used by copy functionality)
        function showNotification(message, type = 'info') {
            showTemporaryMessage(message, type);
        }



        function getSelectedFields() {
            const retrieverType = document.getElementById('retrieverType').value;
            const selectedFields = [];
            
            if (retrieverType === 'linear') {
                // For linear retriever, use both field selection checkboxes and boost sliders
                const fieldMappings = {
                    'boostBodyContentE5': 'body_content_e5',
                    'boostBodyContentElser': 'body_content_elser',
                    'boostTitle': 'title',
                    'boostPropertyDescription': 'property-description',
                    'boostPropertyFeatures': 'property-features',
                    'boostMetaDescription': 'meta_description',
                    'boostHeadings': 'headings'
                };
                
                Object.keys(fieldMappings).forEach(sliderId => {
                    const slider = document.getElementById(sliderId);
                    const checkboxId = sliderId.replace('boost', 'linearSelect');
                    const checkbox = document.getElementById(checkboxId);
                    
                    if (slider && checkbox) {
                        const boostValue = parseFloat(slider.value);
                        const fieldName = fieldMappings[sliderId];
                        
                        // Include fields that are selected, regardless of boost value
                        if (checkbox.checked) {
                            if (boostValue > 0) {
                                selectedFields.push(`${fieldName}^${boostValue}`);
                            } else {
                                selectedFields.push(fieldName);
                            }
                        }
                    }
                });
            } else if (retrieverType === 'rrf') {
                // For RRF retriever, use checkboxes
                const fieldMappings = {
                    'selectBodyContentE5': 'body_content_e5',
                    'selectBodyContentElser': 'body_content_elser',
                    'selectTitle': 'title',
                    'selectPropertyDescription': 'property-description',
                    'selectPropertyFeatures': 'property-features',
                    'selectMetaDescription': 'meta_description',
                    'selectHeadings': 'headings'
                };
                
                Object.keys(fieldMappings).forEach(checkboxId => {
                    const checkbox = document.getElementById(checkboxId);
                    if (checkbox && checkbox.checked) {
                        const fieldName = fieldMappings[checkboxId];
                        selectedFields.push(fieldName);
                    }
                });
            }
            
            return selectedFields;
        }

        function getHighlightConfig() {
            const highlightMappings = {
                'highlightBodyContentE5': 'body_content_e5',
                'highlightBodyContentElser': 'body_content_elser'
            };
            const highlightConfig = {};
            Object.keys(highlightMappings).forEach(checkboxId => {
                if (document.getElementById(checkboxId).checked) {
                    const fieldName = highlightMappings[checkboxId];
                    const optionsId = checkboxId + 'Options';
                    const optionsDiv = document.getElementById(optionsId);
                    if (optionsDiv) {
                        const fragmentsInput = optionsDiv.querySelector('input[type="number"]');
                        const orderSelect = optionsDiv.querySelector('select');
                        const config = {
                            number_of_fragments: parseInt(fragmentsInput.value),
                            order: orderSelect.value
                        };
                        if (fieldName === 'body_content_elser' || fieldName === 'body_content_e5') {
                            config.type = 'semantic';
                        }
                        highlightConfig[fieldName] = config;
                    }
                }
            });
            return highlightConfig;
        }

        function getCurrentPrice() {
            return parseInt(document.getElementById('minPriceSlider').value) || 0;
        }

        function getCurrentMaxPrice() {
            return parseInt(document.getElementById('maxPriceSlider').value) || 10000000;
        }





        function resetFieldBoosts() {
            // Reset all boost sliders to 0
            document.querySelectorAll('input[type="range"][id^="boost"]').forEach(slider => {
                slider.value = 0;
                // Update the display value
                const valueDisplay = document.getElementById(slider.id + 'Value');
                if (valueDisplay) {
                    valueDisplay.textContent = '0';
                }
            });
            updateQuery();
        }

        function updateBoostSliderVisibility() {
            const checkboxSliderMappings = {
                'linearSelectBodyContentE5': 'boostBodyContentE5Container',
                'linearSelectBodyContentElser': 'boostBodyContentElserContainer',
                'linearSelectTitle': 'boostTitleContainer',
                'linearSelectPropertyDescription': 'boostPropertyDescriptionContainer',
                'linearSelectPropertyFeatures': 'boostPropertyFeaturesContainer',
                'linearSelectMetaDescription': 'boostMetaDescriptionContainer',
                'linearSelectHeadings': 'boostHeadingsContainer'
            };
            
            Object.keys(checkboxSliderMappings).forEach(checkboxId => {
                const checkbox = document.getElementById(checkboxId);
                const sliderContainer = document.getElementById(checkboxSliderMappings[checkboxId]);
                
                if (checkbox && sliderContainer) {
                    if (checkbox.checked) {
                        sliderContainer.classList.remove('hidden');
                    } else {
                        sliderContainer.classList.add('hidden');
                    }
                }
            });
        }

        function resetFieldSelection() {
            // Reset all field selection checkboxes to checked (default state)
            document.querySelectorAll('input[type="checkbox"][id^="select"]').forEach(checkbox => {
                checkbox.checked = true;
            });
            // Also reset linear field selection checkboxes
            document.querySelectorAll('input[type="checkbox"][id^="linearSelect"]').forEach(checkbox => {
                checkbox.checked = true;
            });
            // Update boost slider visibility
            updateBoostSliderVisibility();
            updateQuery();
        }
        

        
        // Function to force clear and refresh the query display
        function forceClearAndRefreshQuery() {
            console.log('Force clearing and refreshing query display...');
            const queryDisplay = document.getElementById('generatedQuery');
            queryDisplay.value = ''; // Clear the display first
            setTimeout(() => {
                updateQuery(); // Then refresh with new data
            }, 100);
        }



        // Function to toggle explanation visibility
        function toggleExplanation(explanationId) {
            const explanationDiv = document.getElementById(explanationId);
            if (explanationDiv) {
                explanationDiv.classList.toggle('d-none');
            }
        }

        // Initialize page and update query with current values
        function initializePage() {
            console.log('Page initialized.');
            // Initialize price filter displays
            updatePriceFilter();
            
            // Initialize linear rank window size to match result size
            const resultSize = parseInt(document.getElementById('resultSize').value);
            const linearRankWindowSize = document.getElementById('linearRankWindowSize');
            linearRankWindowSize.value = resultSize;
            linearRankWindowSize.min = resultSize;
            
            // Initialize field sections based on retriever type
            const retrieverType = document.getElementById('retrieverType').value;
            const fieldBoostsSection = document.getElementById('fieldBoostsSection');
            const fieldSelectionSection = document.getElementById('fieldSelectionSection');
            const resetBoostsButton = document.getElementById('resetBoostsButton');
            const resetSelectionButton = document.getElementById('resetSelectionButton');
            
            if (retrieverType === 'linear') {
                fieldBoostsSection.classList.remove('d-none');
                fieldSelectionSection.classList.add('d-none');
                resetBoostsButton.classList.remove('d-none');
                resetSelectionButton.classList.add('d-none');
                // Initialize boost slider visibility
                updateBoostSliderVisibility();
            } else if (retrieverType === 'rrf') {
                fieldBoostsSection.classList.add('d-none');
                fieldSelectionSection.classList.remove('d-none');
                resetBoostsButton.classList.add('d-none');
                resetSelectionButton.classList.remove('d-none');
            } else {
                fieldBoostsSection.classList.add('d-none');
                fieldSelectionSection.classList.add('d-none');
                resetBoostsButton.classList.add('d-none');
                resetSelectionButton.classList.add('d-none');
            }
            
            // Initialize Linear parameters
            const linearParams = document.getElementById('linearParams');
            if (retrieverType === 'linear') {
                linearParams.classList.remove('d-none');
            } else {
                linearParams.classList.add('d-none');
            }
            
            // Initialize RRF parameters
            const rrfParams = document.getElementById('rrfParams');
            if (retrieverType === 'rrf') {
                rrfParams.classList.remove('d-none');
            } else {
                rrfParams.classList.add('d-none');
            }
            
            // Update query if there's already a search query
            if (document.getElementById('searchQuery').value) {
                updateQuery();
            }
        }
        
        // Call initialization when page loads
        document.addEventListener('DOMContentLoaded', initializePage);

        // Add this JS function after the result rendering logic:
        function toggleExplanationSummary(summaryId, jsonId) {
            const summaryDiv = document.getElementById(summaryId);
            const jsonDiv = document.getElementById(jsonId);
            const docId = summaryId.replace('explanation-summary-', '');
            const visualDiv = document.getElementById(`visual-explanation-${docId}`);
            
            if (summaryDiv && jsonDiv) {
                // Hide visual explanation if it's showing
                if (visualDiv) {
                    visualDiv.classList.add('d-none');
                }
                
                // Reset visual explanation button text
                const visualBtn = document.querySelector(`button[onclick*="generateVisualExplanation"][onclick*="${docId}"]`);
                if (visualBtn) {
                    visualBtn.innerText = '📊 Visual Score Breakdown';
                }
                
                summaryDiv.classList.toggle('d-none');
                jsonDiv.classList.toggle('d-none');
                // Change button text
                const btn = event.target;
                if (btn.innerText.includes('Raw')) {
                    btn.innerText = 'Show Summary';
                } else {
                    btn.innerText = 'Show Raw JSON';
                }
            }
        }

        // Get current search settings
        function getCurrentSearchSettings() {
            const settings = {
                retrieverType: document.getElementById('retrieverType').value,
                selectedFields: []
            };
            
            // Get selected fields based on retriever type
            if (settings.retrieverType === 'linear') {
                // For linear retriever, get fields that are both selected and have non-zero boosts
                const fieldBoosts = {
                    'body_content_e5': parseFloat(document.getElementById('boostBodyContentE5').value),
                    'body_content_elser': parseFloat(document.getElementById('boostBodyContentElser').value),
                    'title': parseFloat(document.getElementById('boostTitle').value),
                    'property-description': parseFloat(document.getElementById('boostPropertyDescription').value),
                    'property-features': parseFloat(document.getElementById('boostPropertyFeatures').value),
                    'meta_description': parseFloat(document.getElementById('boostMetaDescription').value),
                    'headings': parseFloat(document.getElementById('boostHeadings').value)
                };
                
                const fieldSelection = {
                    'body_content_e5': document.getElementById('linearSelectBodyContentE5').checked,
                    'body_content_elser': document.getElementById('linearSelectBodyContentElser').checked,
                    'title': document.getElementById('linearSelectTitle').checked,
                    'property-description': document.getElementById('linearSelectPropertyDescription').checked,
                    'property-features': document.getElementById('linearSelectPropertyFeatures').checked,
                    'meta_description': document.getElementById('linearSelectMetaDescription').checked,
                    'headings': document.getElementById('linearSelectHeadings').checked
                };
                
                // Add fields that are both selected AND have non-zero boosts
                Object.entries(fieldBoosts).forEach(([field, boost]) => {
                    if (fieldSelection[field] && boost > 0) {
                        settings.selectedFields.push(field);
                    }
                });
            } else if (settings.retrieverType === 'rrf') {
                // For RRF retriever, get checked fields
                const checkboxes = [
                    'selectBodyContentE5',
                    'selectBodyContentElser', 
                    'selectTitle',
                    'selectPropertyDescription',
                    'selectPropertyFeatures',
                    'selectMetaDescription',
                    'selectHeadings'
                ];
                
                const fieldMap = {
                    'selectBodyContentE5': 'body_content_e5',
                    'selectBodyContentElser': 'body_content_elser',
                    'selectTitle': 'title',
                    'selectPropertyDescription': 'property-description',
                    'selectPropertyFeatures': 'property-features',
                    'selectMetaDescription': 'meta_description',
                    'selectHeadings': 'headings'
                };
                
                checkboxes.forEach(checkboxId => {
                    const checkbox = document.getElementById(checkboxId);
                    if (checkbox && checkbox.checked) {
                        settings.selectedFields.push(fieldMap[checkboxId]);
                    }
                });
            }
            
            return settings;
        }

        // Determine component names based on the explain JSON and current settings
        function determineComponentNames(explanation, numComponents, currentSettings = null) {
            const componentNames = [];
            const usedModels = new Set();
            const fieldMatches = []; // Array to store field names in order
            const componentTypes = []; // Array to store the type of each component
            
            // Find the weighted linear combination node and analyze its components
            function analyzeWeightedComponents(node) {
                if (!node) return;
                
                // Look for weighted linear combination
                if (node.description && node.description.startsWith('weighted linear combination score')) {
                    if (node.details && Array.isArray(node.details)) {
                        // Analyze each component in the weighted combination
                        node.details.forEach((component, index) => {
                            let fieldName = null;
                            let isSemantic = false;
                            let semanticType = null;
                            
                            // Recursively search this component for field information
                            function searchComponent(compNode) {
                                if (!compNode) return;
                                
                                if (compNode.description) {
                                    // Look for field matches (e.g., "weight(title:bay in 209)")
                                    const fieldMatch = compNode.description.match(/weight\(([^:]+):[^)]+\)/);
                                    if (fieldMatch && !fieldName) {
                                        fieldName = fieldMatch[1];
                                    }
                                    
                                    // Check for semantic models
                                    if (compNode.description.includes('body_content_e5.inference.chunks.embeddings') || 
                                        compNode.description.includes('FeatureQuery(field=body_content_e5') ||
                                        compNode.description.includes('found vector with calculated similarity')) {
                                        usedModels.add('E5');
                                        isSemantic = true;
                                        semanticType = 'E5';
                                    }
                                    
                                    if (compNode.description.includes('body_content_elser.inference.chunks.embeddings') || 
                                        compNode.description.includes('FeatureQuery(field=body_content_elser') ||
                                        compNode.description.includes('Linear function on the body_content_elser.inference.chunks.embeddings field')) {
                                        usedModels.add('ELSER');
                                        isSemantic = true;
                                        semanticType = 'ELSER';
                                    }
                                }
                                
                                // Recursively search child details
                                if (compNode.details && Array.isArray(compNode.details)) {
                                    compNode.details.forEach(child => searchComponent(child));
                                }
                            }
                            
                            searchComponent(component);
                            
                            // Store the component type for this index
                            // Prioritize field matches over semantic models for more specific labeling
                            if (fieldName) {
                                fieldMatches[index] = fieldName;
                                componentTypes[index] = 'field';
                            } else if (isSemantic) {
                                componentTypes[index] = semanticType;
                            } else {
                                // If no field match or semantic model found in this component,
                                // check if this component has nested weighted linear combinations
                                // that might contain semantic models
                                let hasNestedSemantic = false;
                                let nestedSemanticType = null;
                                
                                function checkNestedSemantic(node) {
                                    if (!node) return;
                                    if (node.description && (
                                        node.description.includes('body_content_e5.inference.chunks.embeddings') ||
                                        node.description.includes('body_content_elser.inference.chunks.embeddings') ||
                                        node.description.includes('Linear function on the body_content_elser.inference.chunks.embeddings field') ||
                                        node.description.includes('found vector with calculated similarity')
                                    )) {
                                        hasNestedSemantic = true;
                                        if (node.description.includes('body_content_e5') || node.description.includes('found vector')) {
                                            nestedSemanticType = 'E5';
                                        }
                                        if (node.description.includes('body_content_elser') || node.description.includes('Linear function on the body_content_elser')) {
                                            nestedSemanticType = 'ELSER';
                                        }
                                    }
                                    if (node.details && Array.isArray(node.details)) {
                                        node.details.forEach(child => checkNestedSemantic(child));
                                    }
                                }
                                checkNestedSemantic(component);
                                
                                if (hasNestedSemantic) {
                                    componentTypes[index] = nestedSemanticType || 'ELSER';
                                } else {
                                    componentTypes[index] = 'unknown';
                                }
                            }
                        });
                    }
                }
                
                // Recursively search child details
                if (node.details && Array.isArray(node.details)) {
                    node.details.forEach(child => analyzeWeightedComponents(child));
                }
            }
            
            // Analyze the explain JSON
            analyzeWeightedComponents(explanation);
            
            // Build component names based on the component types we found and current settings
            for (let i = 0; i < numComponents; i++) {
                const componentType = componentTypes[i];
                
                if (componentType === 'E5') {
                    componentNames.push('E5 Semantic Search');
                } else if (componentType === 'ELSER') {
                    componentNames.push('ELSER Semantic Search');
                } else if (componentType === 'field') {
                    componentNames.push('Field Match');
                } else {
                    // For unknown components, try to infer from current settings
                    if (currentSettings && currentSettings.selectedFields && currentSettings.selectedFields.length > 0) {
                        // Map field names to component names
                        const fieldToComponentMap = {
                            'body_content_e5': 'E5 Semantic Search',
                            'body_content_elser': 'ELSER Semantic Search',
                            'title': 'Title Match',
                            'property-description': 'Property Description Match',
                            'property-features': 'Property Features Match',
                            'meta_description': 'Meta Description Match',
                            'headings': 'Headings Match'
                        };
                        
                        // Find the next field that should be in this position
                        const expectedField = currentSettings.selectedFields[i];
                        if (expectedField && fieldToComponentMap[expectedField]) {
                            componentNames.push(fieldToComponentMap[expectedField]);
                        } else {
                            // Fallback to semantic models if found in overall structure
                            if (usedModels.has('E5') && !componentNames.includes('E5 Semantic Search')) {
                                componentNames.push('E5 Semantic Search');
                            } else if (usedModels.has('ELSER') && !componentNames.includes('ELSER Semantic Search')) {
                                componentNames.push('ELSER Semantic Search');
                            } else {
                                componentNames.push('Text Match');
                            }
                        }
                    } else {
                        // When no fields are boosted, analyze the explain JSON more carefully
                        // Check if this component has field matches in its details
                        let hasFieldMatches = false;
                        let hasSemanticModels = false;
                        
                        function analyzeComponent(node) {
                            if (!node) return;
                            
                            if (node.description) {
                                // Check for field matches
                                if (node.description.match(/weight\(([^:]+):[^)]+\)/)) {
                                    hasFieldMatches = true;
                                }
                                
                                // Check for semantic models
                                if (node.description.includes('body_content_e5.inference.chunks.embeddings') ||
                                    node.description.includes('found vector with calculated similarity')) {
                                    hasSemanticModels = true;
                                }
                                if (node.description.includes('body_content_elser.inference.chunks.embeddings') ||
                                    node.description.includes('Linear function on the body_content_elser.inference.chunks.embeddings field')) {
                                    hasSemanticModels = true;
                                }
                            }
                            
                            if (node.details && Array.isArray(node.details)) {
                                node.details.forEach(child => analyzeComponent(child));
                            }
                        }
                        
                        // Analyze the current component
                        if (explanation.details && Array.isArray(explanation.details) && explanation.details[i]) {
                            analyzeComponent(explanation.details[i]);
                        }
                        
                        if (hasFieldMatches) {
                            // If this component has field matches, label it as Field Match
                            componentNames.push('Field Match');
                        } else if (hasSemanticModels) {
                            // If this component has semantic models, determine which one
                            if (usedModels.has('E5') && usedModels.has('ELSER')) {
                                componentNames.push('ELSER Semantic Search'); // Default to ELSER if both found
                            } else if (usedModels.has('E5')) {
                                componentNames.push('E5 Semantic Search');
                            } else if (usedModels.has('ELSER')) {
                                componentNames.push('ELSER Semantic Search');
                            } else {
                                componentNames.push('Semantic Search');
                            }
                        } else {
                            componentNames.push('Text Match');
                        }
                    }
                }
            }
            
            return componentNames;
        }

        // Render AI-generated summary for explanation
        function renderExplanationSummary(explanation, id) {
            // Store the explanation for this result
            if (!window.resultExplanations) {
                window.resultExplanations = {};
            }
            window.resultExplanations[id] = explanation;
            
            return '';
        }

        // Extract detailed information for each component
        function extractComponentDetails(componentDetail, index) {
            const details = {
                description: componentDetail.description || '',
                value: componentDetail.value || 0,
                fieldMatches: [],
                filters: [],
                boosts: []
            };
            
            // Recursively search for field matches, filters, and boosts
            function searchDetails(node, path = '') {
                if (!node) return;
                
                // Look for field matches
                if (node.description && node.description.includes('weight(') && node.description.includes(')')) {
                    const fieldMatch = node.description.match(/weight\(([^:]+):([^)]+)\)/);
                    if (fieldMatch) {
                        details.fieldMatches.push({
                            field: fieldMatch[1],
                            term: fieldMatch[2],
                            boost: node.value || 1,
                            description: node.description
                        });
                    }
                }
                
                // Look for filters
                if (node.description && (node.description.includes('filter') || node.description.includes('range'))) {
                    details.filters.push({
                        description: node.description,
                        value: node.value
                    });
                }
                
                // Look for boosts
                if (node.description && node.description.includes('boost')) {
                    details.boosts.push({
                        description: node.description,
                        value: node.value
                    });
                }
                
                // Recursively search child details
                if (node.details && Array.isArray(node.details)) {
                    node.details.forEach((child, i) => {
                        searchDetails(child, `${path}.${i}`);
                    });
                }
            }
            
            searchDetails(componentDetail);
            return details;
        }

        // Render detailed breakdown for a component
        function renderComponentDetails(details, index) {
            let html = '';
            
            if (details.fieldMatches && details.fieldMatches.length > 0) {
                html += '<div class="mb-2"><strong>Field Matches:</strong></div>';
                html += '<ul class="list-unstyled ms-3" style="font-size:0.9em;">';
                details.fieldMatches.forEach(match => {
                    html += `<li>• <strong>${match.field}</strong>: "${match.term}" (boost: ${match.boost})</li>`;
                });
                html += '</ul>';
            }
            
            if (details.filters && details.filters.length > 0) {
                html += '<div class="mb-2"><strong>Filters Applied:</strong></div>';
                html += '<ul class="list-unstyled ms-3" style="font-size:0.9em;">';
                details.filters.forEach(filter => {
                    html += `<li>• ${filter.description}</li>`;
                });
                html += '</ul>';
            }
            
            if (details.boosts && details.boosts.length > 0) {
                html += '<div class="mb-2"><strong>Boosts:</strong></div>';
                html += '<ul class="list-unstyled ms-3" style="font-size:0.9em;">';
                details.boosts.forEach(boost => {
                    html += `<li>• ${boost.description}: ${boost.value}</li>`;
                });
                html += '</ul>';
            }
            
            return html || '<div class="text-muted">No detailed breakdown available</div>';
        }

        // Toggle component details visibility
        function toggleComponentDetails(detailsId) {
            const detailsDiv = document.getElementById(detailsId);
            if (detailsDiv) {
                detailsDiv.classList.toggle('d-none');
            }
        }



        // AI Chat Sessions Manager
        let aiChatSessionsManager = {
            sessions: new Map(), // Map of sessionId -> session data
            currentSessionId: null,
            nextSessionId: 1,
            
            // Create a new session
            createSession: function(explain, docId, documentFields) {
                const sessionId = `session_${this.nextSessionId++}`;
                
                // Extract property name from document fields
                const propertyName = documentFields && documentFields.title ? documentFields.title : 'Unknown Property';
                
                const session = {
                    id: sessionId,
                    propertyName: propertyName,
                    explainPlans: [{
                        explain: explain,
                        documentFields: documentFields,
                        timestamp: new Date(),
                        searchQuery: document.getElementById('searchQuery').value || '',
                        uiSettings: getCurrentUISettings()
                    }],
                    currentExplainIndex: 0,
                    messages: [],
                    docId: docId,
                    createdAt: new Date(),
                    lastActivity: new Date()
                };
                this.sessions.set(sessionId, session);
                this.currentSessionId = sessionId;
                return sessionId;
            },
            
            // Get current session
            getCurrentSession: function() {
                if (!this.currentSessionId) return null;
                return this.sessions.get(this.currentSessionId);
            },
            
            // Switch to a different session
            switchSession: function(sessionId) {
                if (this.sessions.has(sessionId)) {
                    this.currentSessionId = sessionId;
                    const session = this.sessions.get(sessionId);
                    session.lastActivity = new Date();
                    return session;
                }
                return null;
            },
            
            // Add message to current session
            addMessage: function(role, content) {
                const session = this.getCurrentSession();
                if (session) {
                    session.messages.push({ role, content });
                    session.lastActivity = new Date();
                }
            },
            
            // Check if recommendations have been provided in this session
            hasProvidedRecommendations: function() {
                const session = this.getCurrentSession();
                if (!session) return false;
                
                // Look for assistant messages that contain recommendations
                return session.messages.some(msg => 
                    msg.role === 'assistant' && 
                    (msg.content.includes('Boost') || 
                     msg.content.includes('recommend') || 
                     msg.content.includes('suggest') ||
                     msg.content.includes('try') ||
                     msg.content.includes('adjust') ||
                     msg.content.includes('1.') && msg.content.includes('2.') && msg.content.includes('3.'))
                );
            },
            
            // Get all sessions for a document
            getSessionsForDocument: function(docId) {
                const sessions = [];
                for (const [sessionId, session] of this.sessions) {
                    if (session.docId === docId) {
                        sessions.push(session);
                    }
                }
                return sessions.sort((a, b) => b.lastActivity - a.lastActivity);
            },
            
            // Delete a session
            deleteSession: function(sessionId) {
                this.sessions.delete(sessionId);
                if (this.currentSessionId === sessionId) {
                    this.currentSessionId = null;
                }
            },
            
            // Clear all sessions
            clearAllSessions: function() {
                this.sessions.clear();
                this.currentSessionId = null;
            },
            
            // Add a new explain plan to current session
            addExplainPlan: function(explain, documentFields) {
                const session = this.getCurrentSession();
                if (session) {
                    const newExplainPlan = {
                        explain: explain,
                        documentFields: documentFields,
                        timestamp: new Date(),
                        searchQuery: document.getElementById('searchQuery').value || '',
                        uiSettings: getCurrentUISettings()
                    };
                    session.explainPlans.push(newExplainPlan);
                    session.currentExplainIndex = session.explainPlans.length - 1;
                    session.lastActivity = new Date();
                    
                    // Update property name if available in new document fields
                    if (documentFields && documentFields.title && documentFields.title !== session.propertyName) {
                        session.propertyName = documentFields.title;
                    }
                    
                    return session.explainPlans.length - 1;
                }
                return -1;
            },
            
            // Get current explain plan
            getCurrentExplainPlan: function() {
                const session = this.getCurrentSession();
                if (session && session.explainPlans.length > 0) {
                    return session.explainPlans[session.currentExplainIndex];
                }
                return null;
            },
            
            // Switch to a different explain plan in current session
            switchExplainPlan: function(index) {
                const session = this.getCurrentSession();
                if (session && index >= 0 && index < session.explainPlans.length) {
                    session.currentExplainIndex = index;
                    session.lastActivity = new Date();
                    return session.explainPlans[index];
                }
                return null;
            },
            
            // Get all explain plans for current session
            getExplainPlans: function() {
                const session = this.getCurrentSession();
                return session ? session.explainPlans : [];
            },
            
            // Get the last explain plan from any session (for creating new conversations)
            getLastExplainPlan: function() {
                // Find the most recent session with explain plans
                let lastSession = null;
                let lastTimestamp = 0;
                
                for (const [sessionId, session] of this.sessions) {
                    if (session.explainPlans && session.explainPlans.length > 0) {
                        const lastExplainPlan = session.explainPlans[session.explainPlans.length - 1];
                        if (lastExplainPlan.timestamp > lastTimestamp) {
                            lastTimestamp = lastExplainPlan.timestamp;
                            lastSession = session;
                        }
                    }
                }
                
                if (lastSession && lastSession.explainPlans.length > 0) {
                    const lastExplainPlan = lastSession.explainPlans[lastSession.explainPlans.length - 1];
                    return {
                        explain: lastExplainPlan.explain,
                        docId: lastSession.docId,
                        documentFields: lastExplainPlan.documentFields
                    };
                }
                
                // If no sessions have explain plans, try to get from current search results
                if (window.lastSearchResults && window.lastSearchResults.length > 0) {
                    // Get the first result with an explanation
                    const resultWithExplain = window.lastSearchResults.find(r => r.explanation);
                    if (resultWithExplain) {
                        // Extract document fields from the result
                        const documentFields = {
                            title: resultWithExplain.title,
                            'property-description': resultWithExplain['property-description'],
                            'property-features': resultWithExplain['property-features'],
                            'meta_description': resultWithExplain.meta_description,
                            headings: resultWithExplain.headings,
                            'listing-agent-info': resultWithExplain['listing-agent-info'],
                            'property-status': resultWithExplain['property-status'],
                            'number-of-bedrooms': resultWithExplain['number-of-bedrooms'],
                            'number-of-bathrooms': resultWithExplain['number-of-bathrooms'],
                            'square-footage': resultWithExplain['square-footage'],
                            'home-price': resultWithExplain['home-price'],
                            'annual-tax': resultWithExplain['annual-tax'],
                            'maintenance-fee': resultWithExplain['maintenance-fee']
                        };
                        
                        return {
                            explain: resultWithExplain.explanation,
                            docId: resultWithExplain._id,
                            documentFields: documentFields
                        };
                    }
                }
                
                return null;
            }
        };

        // Function to get current UI settings for AI context
        function getCurrentUISettings() {
            const settings = {
                retrieverType: document.getElementById('retrieverType').value,
                resultSize: parseInt(document.getElementById('resultSize').value),
                enableExplain: document.getElementById('enableExplain').checked,
                enableReranking: document.getElementById('enableReranking').checked,
                enableLocationFilter: document.getElementById('enableLocationFilter').checked
            };

            // Add retriever-specific settings
            if (settings.retrieverType === 'linear') {
                settings.linearParams = {
                    rankWindowSize: parseInt(document.getElementById('linearRankWindowSize').value)
                };
                // Add field boosts for linear retriever
                settings.fieldBoosts = {
                    bodyContentE5: parseFloat(document.getElementById('boostBodyContentE5').value),
                    bodyContentElser: parseFloat(document.getElementById('boostBodyContentElser').value),
                    title: parseFloat(document.getElementById('boostTitle').value),
                    propertyDescription: parseFloat(document.getElementById('boostPropertyDescription').value),
                    propertyFeatures: parseFloat(document.getElementById('boostPropertyFeatures').value),
                    metaDescription: parseFloat(document.getElementById('boostMetaDescription').value),
                    headings: parseFloat(document.getElementById('boostHeadings').value)
                };
                // Add field selection for linear retriever
                settings.selectedFields = {
                    bodyContentE5: document.getElementById('linearSelectBodyContentE5').checked,
                    bodyContentElser: document.getElementById('linearSelectBodyContentElser').checked,
                    title: document.getElementById('linearSelectTitle').checked,
                    propertyDescription: document.getElementById('linearSelectPropertyDescription').checked,
                    propertyFeatures: document.getElementById('linearSelectPropertyFeatures').checked,
                    metaDescription: document.getElementById('linearSelectMetaDescription').checked,
                    headings: document.getElementById('linearSelectHeadings').checked
                };
            } else if (settings.retrieverType === 'rrf') {
                settings.rrfParams = {
                    rankWindowSize: parseInt(document.getElementById('rrfRankWindowSize').value),
                    rankConstant: parseInt(document.getElementById('rrfRankConstant').value)
                };
                // Add field selection for RRF retriever
                settings.selectedFields = {
                    bodyContentE5: document.getElementById('selectBodyContentE5').checked,
                    bodyContentElser: document.getElementById('selectBodyContentElser').checked,
                    title: document.getElementById('selectTitle').checked,
                    propertyDescription: document.getElementById('selectPropertyDescription').checked,
                    propertyFeatures: document.getElementById('selectPropertyFeatures').checked,
                    metaDescription: document.getElementById('selectMetaDescription').checked,
                    headings: document.getElementById('selectHeadings').checked
                };
            }

            // Add reranking settings
            if (settings.enableReranking) {
                settings.rerankingParams = {
                    rerankerField: document.getElementById('rerankerField').value,
                    rankWindowSize: parseInt(document.getElementById('rankWindowSize').value)
                };
            }

            // Add location filter settings
            if (settings.enableLocationFilter) {
                settings.locationParams = {
                    latitude: parseFloat(document.getElementById('latitude').value) || null,
                    longitude: parseFloat(document.getElementById('longitude').value) || null,
                    distance: parseFloat(document.getElementById('distance').value)
                };
            }

            // Add price filter settings
            settings.priceParams = {
                minPrice: parseInt(document.getElementById('minPriceSlider').value),
                maxPrice: parseInt(document.getElementById('maxPriceSlider').value)
            };

            return settings;
        }

        function openAISummaryChat(explain, docId) {
            // Find the result object for this docId
            let documentFields = null;
            if (window.lastSearchResults) {
                const match = window.lastSearchResults.find(r => r._id === docId);
                if (match) {
                    // Extract document fields from the result
                    documentFields = {
                        title: match.title,
                        'property-description': match['property-description'],
                        'property-features': match['property-features'],
                        'meta_description': match.meta_description,
                        headings: match.headings,
                        'listing-agent-info': match['listing-agent-info'],
                        'property-status': match['property-status'],
                        'number-of-bedrooms': match['number-of-bedrooms'],
                        'number-of-bathrooms': match['number-of-bathrooms'],
                        'square-footage': match['square-footage'],
                        'home-price': match['home-price'],
                        'annual-tax': match['annual-tax'],
                        'maintenance-fee': match['maintenance-fee']
                    };
                }
            }

            // Check if there are existing sessions for this document
            const existingSessions = aiChatSessionsManager.getSessionsForDocument(docId);
            
            if (existingSessions.length > 0) {
                // Show session selection dialog
                showSessionSelectionDialog(docId, existingSessions, explain, documentFields);
            } else {
                // Create new session and open chat
                createNewChatSession(explain, docId, documentFields);
            }
        }

        function showSessionSelectionDialog(docId, existingSessions, explain, documentFields) {
            // Create modal for session selection
            const modalHtml = `
                <div class="modal fade" id="sessionSelectionModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Choose Conversation</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="mb-3">
                                    <button class="btn btn-primary w-100" onclick="createNewChatSession(${JSON.stringify(explain)}, '${docId}', ${JSON.stringify(documentFields)})">
                                        <i class="fas fa-plus"></i> Start New Conversation
                                    </button>
                                </div>
                                <hr>
                                <h6>Previous Conversations:</h6>
                                <div class="list-group">
                                    ${existingSessions.map(session => `
                                        <button class="list-group-item list-group-item-action" onclick="resumeChatSession('${session.id}')">
                                            <div class="d-flex justify-content-between align-items-center">
                                                <div>
                                                    <strong>${session.propertyName || 'Unknown Property'}</strong>
                                                    <br>
                                                    <small class="text-muted">
                                                        ${session.messages.length} messages • 
                                                        ${session.explainPlans ? session.explainPlans.length : 1} explain plan${session.explainPlans && session.explainPlans.length !== 1 ? 's' : ''} • 
                                                        ${new Date(session.lastActivity).toLocaleString()}
                                                    </small>
                                                </div>
                                                <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); deleteChatSession('${session.id}')">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </button>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Remove existing modal if any
            const existingModal = document.getElementById('sessionSelectionModal');
            if (existingModal) {
                existingModal.remove();
            }
            
            // Add modal to body
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('sessionSelectionModal'));
            modal.show();
            
            // Clean up modal after it's hidden
            document.getElementById('sessionSelectionModal').addEventListener('hidden.bs.modal', function() {
                this.remove();
            });
        }

        function createNewChatSession(explain, docId, documentFields) {
            console.log('createNewChatSession called with:', { explain, docId, documentFields });
            
            // Close session selection modal if open
            const modal = bootstrap.Modal.getInstance(document.getElementById('sessionSelectionModal'));
            if (modal) {
                modal.hide();
            }
            
            // Create new session
            const sessionId = aiChatSessionsManager.createSession(explain, docId, documentFields);
            console.log('Created session with ID:', sessionId);
            
            // Open chat pane
            const chatPane = document.getElementById('aiSummaryChatPane');
            const chatHistory = document.getElementById('aiSummaryChatHistory');
            
            if (!chatPane) {
                console.error('Chat pane not found!');
                return;
            }
            
            chatPane.style.display = 'block';
            chatHistory.innerHTML = '<div class="text-muted">Loading summary...</div>';
            document.getElementById('aiSummaryChatInput').value = '';
            
            // Get current search query and settings
            const searchQuery = document.getElementById('searchQuery').value || '';
            const currentSettings = getCurrentUISettings();
            console.log('Sending request with:', { searchQuery, currentSettings });
            
            // Initial summary
            fetch('/ai-summary-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    explain: explain,
                    search_query: searchQuery,
                    current_settings: currentSettings,
                    document_fields: documentFields
                })
            })
            .then(r => {
                console.log('Response status:', r.status);
                return r.json();
            })
            .then(data => {
                console.log('Response data:', data);
                if (data.error) {
                    chatHistory.innerHTML = `<div class='alert alert-danger'>${data.error}</div>`;
                } else {
                    aiChatSessionsManager.addMessage('assistant', data.ai_message);
                    renderAISummaryChatHistory();
                }
            })
            .catch(e => {
                console.error('Error in createNewChatSession:', e);
                chatHistory.innerHTML = `<div class='alert alert-danger'>${e}</div>`;
            });
            
            setTimeout(() => document.getElementById('aiSummaryChatInput').focus(), 200);
            document.querySelector('.right-pane').style.marginRight = chatPane.style.width;
        }

        function resumeChatSession(sessionId) {
            // Close session selection modal if open
            const modal = bootstrap.Modal.getInstance(document.getElementById('sessionSelectionModal'));
            if (modal) {
                modal.hide();
            }
            
            // Switch to the selected session
            const session = aiChatSessionsManager.switchSession(sessionId);
            if (!session) {
                showTemporaryMessage('Session not found', 'error');
                return;
            }
            
            // Open chat pane
            const chatPane = document.getElementById('aiSummaryChatPane');
            const chatHistory = document.getElementById('aiSummaryChatHistory');
            chatPane.style.display = 'block';
            document.getElementById('aiSummaryChatInput').value = '';
            
            // Render existing messages
            renderAISummaryChatHistory();
            
            setTimeout(() => document.getElementById('aiSummaryChatInput').focus(), 200);
            document.querySelector('.right-pane').style.marginRight = chatPane.style.width;
        }

        function deleteChatSession(sessionId) {
            aiChatSessionsManager.deleteSession(sessionId);
            
            // Check if we're in the session selection modal
            const modal = document.getElementById('sessionSelectionModal');
            if (modal && modal.classList.contains('show')) {
                // We're in the modal, so handle deletion from modal
                const currentSession = aiChatSessionsManager.getCurrentSession();
                if (currentSession) {
                    // Get the current explain plan and document fields
                    const currentExplainPlan = aiChatSessionsManager.getCurrentExplainPlan();
                    if (currentExplainPlan) {
                        // Check if there are any remaining sessions for this document
                        const existingSessions = aiChatSessionsManager.getSessionsForDocument(currentSession.docId);
                        if (existingSessions.length > 0) {
                            // Refresh the modal with updated session list
                            showSessionSelectionDialog(currentSession.docId, existingSessions, currentExplainPlan.explain, currentExplainPlan.documentFields);
                        } else {
                            // No more sessions for this document, close modal and start new conversation
                            const modalInstance = bootstrap.Modal.getInstance(modal);
                            if (modalInstance) {
                                modalInstance.hide();
                            }
                            // Start a new conversation
                            createNewChatSession(currentExplainPlan.explain, currentSession.docId, currentExplainPlan.documentFields);
                        }
                    }
                } else {
                    // No current session, try to get last explain plan and start new conversation
                    const lastExplainPlan = aiChatSessionsManager.getLastExplainPlan();
                    if (lastExplainPlan) {
                        // Close the modal
                        const modalInstance = bootstrap.Modal.getInstance(modal);
                        if (modalInstance) {
                            modalInstance.hide();
                        }
                        // Start a new conversation
                        createNewChatSession(lastExplainPlan.explain, lastExplainPlan.docId, lastExplainPlan.documentFields);
                    } else {
                        // No explain plan available, close the modal
                        const modalInstance = bootstrap.Modal.getInstance(modal);
                        if (modalInstance) {
                            modalInstance.hide();
                        }
                    }
                }
            } else {
                // We're not in the modal (probably deleting from chat view), handle as before
                const currentSession = aiChatSessionsManager.getCurrentSession();
                if (currentSession) {
                    // Close the session selection modal if open
                    const modalInstance = bootstrap.Modal.getInstance(document.getElementById('sessionSelectionModal'));
                    if (modalInstance) {
                        modalInstance.hide();
                    }
                    
                    // Get the current explain plan
                    const currentExplainPlan = aiChatSessionsManager.getCurrentExplainPlan();
                    if (currentExplainPlan) {
                        // Clear the chat history immediately to show the deletion
                        const chatHistory = document.getElementById('aiSummaryChatHistory');
                        if (chatHistory) {
                            chatHistory.innerHTML = '<div class="text-muted">Creating new conversation...</div>';
                        }
                        
                        // Always start a new conversation after deletion
                        createNewChatSession(currentExplainPlan.explain, currentSession.docId, currentExplainPlan.documentFields);
                    } else {
                        console.error('No explain plan available for new conversation');
                        showTemporaryMessage('No explain plan available for new conversation', 'error');
                    }
                } else {
                    // No current session after deletion, try to create a new one with the last explain plan
                    const lastExplainPlan = aiChatSessionsManager.getLastExplainPlan();
                    if (lastExplainPlan) {
                        // Clear the chat history immediately to show the deletion
                        const chatHistory = document.getElementById('aiSummaryChatHistory');
                        if (chatHistory) {
                            chatHistory.innerHTML = '<div class="text-muted">Creating new conversation...</div>';
                        }
                        
                        // Create a new conversation with the last explain plan
                        createNewChatSession(lastExplainPlan.explain, lastExplainPlan.docId, lastExplainPlan.documentFields);
                    } else {
                        // No explain plan available, show error message
                        const chatHistory = document.getElementById('aiSummaryChatHistory');
                        if (chatHistory) {
                            chatHistory.innerHTML = '<div class="text-muted">No explain plan available for new conversation.</div>';
                        }
                        showTemporaryMessage('No explain plan available for new conversation', 'error');
                    }
                }
            }
        }

        function startNewConversationFromChat() {
            const currentSession = aiChatSessionsManager.getCurrentSession();
            if (!currentSession) {
                showTemporaryMessage('No active session', 'error');
                return;
            }
            
            // Create a new session with the same document
            createNewChatSession(currentSession.explain, currentSession.docId, currentSession.documentFields);
        }

        function switchToSessionSelection() {
            const currentSession = aiChatSessionsManager.getCurrentSession();
            if (!currentSession) {
                showTemporaryMessage('No active session', 'error');
                return;
            }
            
            const currentExplainPlan = aiChatSessionsManager.getCurrentExplainPlan();
            const existingSessions = aiChatSessionsManager.getSessionsForDocument(currentSession.docId);
            showSessionSelectionDialog(currentSession.docId, existingSessions, currentExplainPlan.explain, currentExplainPlan.documentFields);
        }

        function switchExplainPlan(index) {
            const explainPlan = aiChatSessionsManager.switchExplainPlan(index);
            if (explainPlan) {
                renderAISummaryChatHistory();
                showTemporaryMessage(`Switched to Explain Plan ${index + 1}`, 'info');
            }
        }

        function attachCurrentExplainPlan() {
            const currentSession = aiChatSessionsManager.getCurrentSession();
            if (!currentSession) {
                showTemporaryMessage('No active session', 'error');
                return;
            }
            
            // Check if there are current search results with explain plans
            if (!window.lastSearchResults || window.lastSearchResults.length === 0) {
                showTemporaryMessage('No current search results to attach. Please run a search first.', 'warning');
                return;
            }
            
            // Find the result for the current document
            const currentDocId = currentSession.docId;
            const matchingResult = window.lastSearchResults.find(r => r._id === currentDocId);
            
            if (!matchingResult) {
                showTemporaryMessage('Current document not found in search results. Please search for this document first.', 'warning');
                return;
            }
            
            if (!matchingResult.explanation) {
                showTemporaryMessage('No explain plan available for current search. Enable "Explain" option and search again.', 'warning');
                return;
            }
            
            // Extract document fields
            const documentFields = {
                title: matchingResult.title,
                'property-description': matchingResult['property-description'],
                'property-features': matchingResult['property-features'],
                'meta_description': matchingResult.meta_description,
                headings: matchingResult.headings,
                'listing-agent-info': matchingResult['listing-agent-info'],
                'property-status': matchingResult['property-status'],
                'number-of-bedrooms': matchingResult['number-of-bedrooms'],
                'number-of-bathrooms': matchingResult['number-of-bathrooms'],
                'square-footage': matchingResult['square-footage'],
                'home-price': matchingResult['home-price'],
                'annual-tax': matchingResult['annual-tax'],
                'maintenance-fee': matchingResult['maintenance-fee']
            };
            
            // Add the new explain plan
            const newIndex = aiChatSessionsManager.addExplainPlan(matchingResult.explanation, documentFields);
            
            // Update property name if it has changed
            const session = aiChatSessionsManager.getCurrentSession();
            if (session && matchingResult.title && matchingResult.title !== session.propertyName) {
                session.propertyName = matchingResult.title;
            }
            
            if (newIndex >= 0) {
                renderAISummaryChatHistory();
                showTemporaryMessage(`Attached new explain plan (Plan ${newIndex + 1})`, 'success');
            } else {
                showTemporaryMessage('Failed to attach explain plan', 'error');
            }
        }

        function cleanLLMHtml(html) {
            // Remove code block markers (with or without 'html')
            return html
                .replace(/```html\s*([\s\S]*?)```/gi, '$1')
                .replace(/```([\s\S]*?)```/gi, '$1');
        }

        function generateVisualExplanation(explain, docId) {
            // Find the result object for this docId
            let documentFields = null;
            if (window.lastSearchResults) {
                const match = window.lastSearchResults.find(r => r._id === docId);
                if (match) {
                    // Extract document fields from the result
                    documentFields = {
                        title: match.title,
                        'property-description': match['property-description'],
                        'property-features': match['property-features'],
                        'meta_description': match.meta_description,
                        headings: match.headings,
                        'listing-agent-info': match['listing-agent-info'],
                        'property-status': match['property-status'],
                        'number-of-bedrooms': match['number-of-bedrooms'],
                        'number-of-bathrooms': match['number-of-bathrooms'],
                        'square-footage': match['square-footage'],
                        'home-price': match['home-price'],
                        'annual-tax': match['annual-tax'],
                        'maintenance-fee': match['maintenance-fee']
                    };
                }
            }

            // Show the visual explanation container and loading spinner
            const visualExplanationDiv = document.getElementById(`visual-explanation-${docId}`);
            const explanationSummaryDiv = document.getElementById(`explanation-summary-${docId}`);
            const explanationJsonDiv = document.getElementById(`explanation-json-${docId}`);
            
            // Check if visual explanation is already loaded and not empty
            if (visualExplanationDiv && !visualExplanationDiv.classList.contains('d-none') && 
                !visualExplanationDiv.innerHTML.includes('spinner-border') && 
                !visualExplanationDiv.innerHTML.includes('Error')) {
                // Visual explanation is already loaded, toggle it
                visualExplanationDiv.classList.add('d-none');
                explanationSummaryDiv.classList.remove('d-none');
                // Change button text back
                const btn = event.target;
                btn.innerText = '📊 Visual Score Breakdown';
                return;
            }
            
            // Hide other explanation views
            explanationSummaryDiv.classList.add('d-none');
            explanationJsonDiv.classList.add('d-none');
            
            // Show visual explanation container with loading spinner
            visualExplanationDiv.classList.remove('d-none');
            visualExplanationDiv.innerHTML = `
                <div class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Generating visual explanation...</span>
                    </div>
                    <p class="mt-2">Generating visual explanation...</p>
                </div>
            `;
            
            // Change button text to indicate it's active
            const btn = event.target;
            btn.innerText = '📊 Hide Visual Breakdown';

            // Get current search query and settings
            const searchQuery = document.getElementById('searchQuery').value || '';
            const currentSettings = getCurrentUISettings();

            // Call the visual explanation endpoint
            fetch('/ai-visual-explanation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    explain: explain,
                    search_query: searchQuery,
                    current_settings: currentSettings,
                    document_fields: documentFields
                })
            })
            .then(r => r.json())
            .then(data => {
                if (data.error) {
                    visualExplanationDiv.innerHTML = `<div class='alert alert-danger'>Error generating visual explanation: ${data.error}</div>`;
                    // Reset button text on error
                    const btn = event.target;
                    btn.innerText = '📊 Visual Score Breakdown';
                } else {
                    // Strip any accidental code block markers before rendering
                    visualExplanationDiv.innerHTML = cleanLLMHtml(data.html_content);
                    // Keep button text as "Hide Visual Breakdown" since it's now loaded
                }
            })
            .catch(e => {
                visualExplanationDiv.innerHTML = `<div class='alert alert-danger'>Error generating visual explanation: ${e.message}</div>`;
                // Reset button text on error
                const btn = event.target;
                btn.innerText = '📊 Visual Score Breakdown';
            });
        }

        function closeAISummaryChat() {
            const chatPane = document.getElementById('aiSummaryChatPane');
            chatPane.style.display = 'none';
            // Don't clear the current session - just hide the pane
            document.querySelector('.right-pane').style.marginRight = '0px';
        }

        function renderAISummaryChatHistory() {
            const chatHistory = document.getElementById('aiSummaryChatHistory');
            const currentSession = aiChatSessionsManager.getCurrentSession();
            
            if (!currentSession || !currentSession.messages.length) {
                chatHistory.innerHTML = '<div class="text-muted">No messages yet.</div>';
                return;
            }
            
            const currentExplainPlan = aiChatSessionsManager.getCurrentExplainPlan();
            const explainPlans = aiChatSessionsManager.getExplainPlans();
            
            // Add session header with explain plan selector
            const sessionHeader = `
                <div class="mb-3 p-2 bg-light border rounded">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <small class="text-muted">
                            <strong>${currentSession.propertyName || 'Unknown Property'}</strong> • 
                            ${currentSession.messages.length} messages • 
                            Last active: ${new Date(currentSession.lastActivity).toLocaleString()}
                        </small>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-secondary btn-sm" onclick="switchToSessionSelection()">
                                <i class="fas fa-exchange-alt"></i> Switch
                            </button>
                            <button class="btn btn-outline-danger btn-sm" onclick="deleteChatSession('${currentSession.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    ${explainPlans.length > 1 ? `
                        <div class="mb-2">
                            <small class="text-muted">Explain Plans:</small>
                            <div class="btn-group btn-group-sm ms-2">
                                ${explainPlans.map((plan, index) => `
                                    <button class="btn btn-sm ${index === currentSession.currentExplainIndex ? 'btn-primary' : 'btn-outline-primary'}" 
                                            onclick="switchExplainPlan(${index})">
                                        Plan ${index + 1}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    ${currentExplainPlan ? `
                        <div class="small text-muted">
                            <strong>Current Plan:</strong> ${currentExplainPlan.searchQuery || 'No query'} • 
                            ${new Date(currentExplainPlan.timestamp).toLocaleString()}
                        </div>
                    ` : ''}
                </div>
            `;
            
            const messagesHtml = currentSession.messages.map(msg => {
                if (msg.role === 'user') {
                    return `<div style='margin-bottom:0.5em;text-align:right;'><span class='badge bg-primary'>You</span> <span style='background:#e7f1ff;padding:0.5em 0.8em;border-radius:1em;display:inline-block;'>${msg.content}</span></div>`;
                } else {
                    return `<div style='margin-bottom:0.5em;text-align:left;'><span class='badge bg-success'>AI</span> <span style='background:#f1f8e7;padding:0.5em 0.8em;border-radius:1em;display:inline-block;'>${msg.content}</span></div>`;
                }
            }).join('');
            
            chatHistory.innerHTML = sessionHeader + messagesHtml;
            chatHistory.scrollTop = chatHistory.scrollHeight;
        }

        document.addEventListener('DOMContentLoaded', function() {
            // Chat form submit handler
            document.body.addEventListener('submit', function(e) {
                if (e.target && e.target.id === 'aiSummaryChatForm') {
                    e.preventDefault();
                    const input = document.getElementById('aiSummaryChatInput');
                    const question = input.value.trim();
                    if (!question) return;
                    
                    const currentSession = aiChatSessionsManager.getCurrentSession();
                    if (!currentSession) {
                        showTemporaryMessage('No active session', 'error');
                        return;
                    }
                    
                    aiChatSessionsManager.addMessage('user', question);
                    renderAISummaryChatHistory();
                    input.value = '';
                    
                    // Call backend with full message history (excluding system prompt)
                    const currentExplainPlan = aiChatSessionsManager.getCurrentExplainPlan();
                    const hasRecommendations = aiChatSessionsManager.hasProvidedRecommendations();
                    fetch('/ai-summary-chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            explain: currentExplainPlan.explain,
                            messages: currentSession.messages,
                            search_query: currentExplainPlan.searchQuery || document.getElementById('searchQuery').value || '',
                            current_settings: currentExplainPlan.uiSettings || getCurrentUISettings(),
                            document_fields: currentExplainPlan.documentFields,
                            has_recommendations: hasRecommendations
                        })
                    })
                    .then(r => r.json())
                    .then(data => {
                        if (data.error) {
                            aiChatSessionsManager.addMessage('assistant', '[Error: ' + data.error + ']');
                        } else {
                            aiChatSessionsManager.addMessage('assistant', data.ai_message);
                        }
                        renderAISummaryChatHistory();
                    })
                    .catch(e => {
                        aiChatSessionsManager.addMessage('assistant', '[Error: ' + e + ']');
                        renderAISummaryChatHistory();
                    });
                }
            });
        });



