document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const modeSelect = document.getElementById('modeSelect');
    const numProcessesInput = document.getElementById('numProcesses');
    const numResourcesInput = document.getElementById('numResources');
    const createMatricesButton = document.getElementById('createMatrices');
    const detectDeadlockButton = document.getElementById('detectDeadlock');
    const resetButton = document.getElementById('reset');
    const exportScenarioButton = document.getElementById('exportScenario');
    const importScenarioButton = document.getElementById('importScenario');
    const scenarioImportModal = document.getElementById('scenarioImportModal');
    const confirmImportButton = document.getElementById('confirmImport');
    const scenarioImportText = document.getElementById('scenarioImportText');
    const closeModalButton = document.querySelector('.close-modal');
    const matricesDiv = document.getElementById('matrices');
    const resultDiv = document.getElementById('result');
    const stepsContainer = document.getElementById('steps-container');
    const stepsVisualization = document.getElementById('steps-visualization');
    const ragVisualization = document.getElementById('rag-visualization');
    const maxSection = document.getElementById('maxSection');
    const allocatedSection = document.getElementById('allocatedSection');
    const requestedSection = document.getElementById('requestedSection');
    const availableSection = document.getElementById('availableSection');
    const ragHeading = document.getElementById('rag-heading');

    // Helper function to get matrix values
    function getMatrixValues() {
        try {
            const numProcesses = parseInt(numProcessesInput.value) || 0;
            const numResources = parseInt(numResourcesInput.value) || 0;
            const mode = modeSelect.value;
            
            if (numProcesses <= 0 || numResources <= 0) {
                throw new Error("Number of processes and resources must be positive.");
            }

            const max = [];
            const allocated = [];
            const requested = [];
            const available = [];
            
            if (mode === 'multi') {
                for (let i = 0; i < numProcesses; i++) {
                    const processMax = [];
                    for (let j = 0; j < numResources; j++) {
                        const value = parseInt(document.getElementById(`max-${i}-${j}`)?.value) || 0;
                        if (value < 0) throw new Error(`Negative value in max matrix at P${i}, R${j}.`);
                        processMax.push(value);
                    }
                    max.push(processMax);
                }
            }
            
            for (let i = 0; i < numProcesses; i++) {
                const processAllocated = [];
                for (let j = 0; j < numResources; j++) {
                    const value = parseInt(document.getElementById(`allocated-${i}-${j}`)?.value) || 0;
                    if (value < 0) throw new Error(`Negative value in allocated matrix at P${i}, R${j}.`);
                    processAllocated.push(value);
                }
                allocated.push(processAllocated);
            }
            
            if (mode === 'single') {
                for (let i = 0; i < numProcesses; i++) {
                    const processRequested = [];
                    for (let j = 0; j < numResources; j++) {
                        const value = parseInt(document.getElementById(`requested-${i}-${j}`)?.value) || 0;
                        if (value < 0) throw new Error(`Negative value in requested matrix at P${i}, R${j}.`);
                        processRequested.push(value);
                    }
                    requested.push(processRequested);
                }
            }
            
            for (let j = 0; j < numResources; j++) {
                const value = parseInt(document.getElementById(`available-${j}`)?.value) || 0;
                if (value < 0) throw new Error(`Negative value in available matrix for R${j}.`);
                available.push(value);
            }
            
            return { max, allocated, requested, available };
        } catch (error) {
            throw new Error(`Error reading matrix values: ${error.message}`);
        }
    }

    // Validate input for the current mode
    function validateInputForMode(matrices, mode, numProcesses, numResources) {
        const { max, allocated, requested, available } = matrices;

        // Check matrix dimensions
        if (allocated.length !== numProcesses || (allocated.length > 0 && allocated[0].length !== numResources)) {
            return `Error: Allocated matrix dimensions (${allocated.length}x${allocated[0]?.length || 0}) do not match specified processes (${numProcesses}) and resources (${numResources}).`;
        }
        if (mode === 'single' && (requested.length !== numProcesses || (requested.length > 0 && requested[0].length !== numResources))) {
            return `Error: Requested matrix dimensions (${requested.length}x${requested[0]?.length || 0}) do not match specified processes (${numProcesses}) and resources (${numResources}).`;
        }
        if (mode === 'multi' && (max.length !== numProcesses || (max.length > 0 && max[0].length !== numResources))) {
            return `Error: Max matrix dimensions (${max.length}x${max[0]?.length || 0}) do not match specified processes (${numProcesses}) and resources (${numResources}).`;
        }
        if (available.length !== numResources) {
            return `Error: Available matrix length (${available.length}) does not match specified resources (${numResources}).`;
        }

        if (mode === 'single') {
            // Single mode requires allocated, requested, and available, but not max
            if (!allocated.length || !requested.length || !available.length) {
                return "Error: Single mode requires allocated, requested, and available matrices.";
            }
            if (max.length > 0) {
                return "Error: Max matrix is not allowed in single mode.";
            }
            // Check that requested matrix values are 0 or 1
            for (let i = 0; i < requested.length; i++) {
                for (let j = 0; j < requested[i].length; j++) {
                    if (requested[i][j] > 1) {
                        return `Error: In single mode, requested values must be 0 or 1 (found ${requested[i][j]} at P${i}, R${j}).`;
                    }
                }
            }
            // Check that allocated matrix values are 0 or 1
            for (let i = 0; i < allocated.length; i++) {
                for (let j = 0; j < allocated[i].length; j++) {
                    if (allocated[i][j] > 1) {
                        return `Error: In single mode, allocated values must be 0 or 1 (found ${allocated[i][j]} at P${i}, R${j}).`;
                    }
                }
            }
            // Check that available values are 0 or 1
            for (let j = 0; j < available.length; j++) {
                if (available[j] > 1) {
                    return `Error: In single mode, available values must be 0 or 1 (found ${available[j]} for R${j}).`;
                }
            }
            // Check that sum of allocated and available for each resource does not exceed 1
            for (let j = 0; j < available.length; j++) {
                let totalAllocated = 0;
                for (let i = 0; i < allocated.length; i++) {
                    totalAllocated += allocated[i][j];
                }
                if (totalAllocated + available[j] > 1) {
                    return `Error: In single mode, the sum of allocated and available instances for R${j} must not exceed 1 (found allocated: ${totalAllocated}, available: ${available[j]}).`;
                }
            }
        } else if (mode === 'multi') {
            // Multi mode requires allocated, max, and available, but not requested
            if (!allocated.length || !max.length || !available.length) {
                return "Error: Multi mode requires allocated, max, and available matrices.";
            }
            if (requested.length > 0) {
                return "Error: Requested matrix is not allowed in multi mode.";
            }
        }
        return null; // No error
    }

    // Display result function
    function displayResult(result) {
        resultDiv.innerHTML = '';
        resultDiv.classList.remove('hidden');
        
        const resultHTML = `
            <div class="result-card ${result.isDeadlock ? 'deadlock' : 'safe'}">
                <h2>${result.isDeadlock ? '🚨 Deadlock Detected!' : '✅ No Deadlock'}</h2>
                ${result.isDeadlock ? 
                    `<p>Processes ${result.deadlockedProcesses.map(p => `P${p}`).join(', ')} are in a deadlock.</p>` : 
                    '<p>The system is in a safe state. No deadlock detected.</p>'
                }
            </div>
        `;
        resultDiv.innerHTML = resultHTML;
    }

    // Create matrix input tables dynamically
    function createDynamicTable(tableId, rows, columns, prefix) {
        const table = document.getElementById(tableId);
        if (!table) throw new Error(`Table with ID ${tableId} not found.`);
        table.innerHTML = '';

        const headerRow = document.createElement('tr');
        headerRow.innerHTML = '<th>Process</th>' + 
            Array.from({length: columns}, (_, j) => `<th>R${j}</th>`).join('');
        table.appendChild(headerRow);

        const mode = modeSelect.value;
        for (let i = 0; i < rows; i++) {
            const row = document.createElement('tr');
            row.innerHTML = `<td>P${i}</td>` + 
                Array.from({length: columns}, (_, j) => 
                    `<td><input type="number" min="0" ${mode === 'single' ? 'max="1" oninput="this.value = Math.min(1, Math.max(0, parseInt(this.value) || 0))"' : ''} id="${prefix}-${i}-${j}" value="0"></td>`
                ).join('');
            table.appendChild(row);
        }
    }

    // Create matrix tables based on user input
    createMatricesButton.addEventListener('click', () => {
        try {
            const numProcesses = parseInt(numProcessesInput.value);
            const numResources = parseInt(numResourcesInput.value);
            const mode = modeSelect.value;
            
            if (numProcesses <= 0 || numResources <= 0) {
                alert("Number of processes and resources must be positive.");
                return;
            }
            if (numProcesses > 10 || numResources > 10) {
                alert("Maximum 10 processes and 10 resources allowed.");
                return;
            }

            createDynamicTable('allocatedTable', numProcesses, numResources, 'allocated');
            const availableTable = document.getElementById('availableTable');
            availableTable.innerHTML = '<tr><th>Resource</th><th>Available</th></tr>' +
                Array.from({length: numResources}, (_, j) => 
                    `<tr><td>R${j}</td><td><input type="number" min="0" ${mode === 'single' ? 'max="1" oninput="this.value = Math.min(1, Math.max(0, parseInt(this.value) || 0))"' : ''} id="available-${j}" value="0"></td></tr>`
                ).join('');

            if (mode === 'single') {
                createDynamicTable('requestedTable', numProcesses, numResources, 'requested');
                requestedSection.classList.remove('hidden');
                maxSection.classList.add('hidden');
                ragVisualization.style.display = 'block';
                ragHeading.style.display = 'block';
            } else {
                createDynamicTable('maxTable', numProcesses, numResources, 'max');
                maxSection.classList.remove('hidden');
                requestedSection.classList.add('hidden');
                ragVisualization.style.display = 'none';
                ragHeading.style.display = 'none';
            }
            
            matricesDiv.classList.remove('hidden');
            resultDiv.classList.add('hidden');
            stepsContainer.classList.add('hidden');
        } catch (error) {
            alert(`Error configuring matrices: ${error.message}`);
        }
    });

    // Detect deadlock function with RAG data (only for single mode)
    function detectDeadlock() {
        try {
            const { max, allocated, requested, available } = getMatrixValues();
            const numProcesses = parseInt(numProcessesInput.value);
            const numResources = parseInt(numResourcesInput.value);
            const mode = modeSelect.value;
            
            const work = [...available];
            const finish = new Array(numProcesses).fill(false);
            const steps = [];
            
            let progress = true;
            while (progress) {
                progress = false;
                
                for (let i = 0; i < numProcesses; i++) {
                    if (finish[i]) continue;
                    
                    let canFinish = true;
                    let need = [];
                    if (mode === 'single') {
                        need = requested[i];
                        for (let j = 0; j < numResources; j++) {
                            if (requested[i][j] > work[j]) {
                                canFinish = false;
                                break;
                            }
                        }
                    } else {
                        need = max[i].map((m, j) => m - allocated[i][j]);
                        for (let j = 0; j < numResources; j++) {
                            if (need[j] > work[j]) {
                                canFinish = false;
                                break;
                            }
                        }
                    }
                    
                    if (canFinish) {
                        const step = {
                            process: i,
                            request: [...need],
                            allocated: [...allocated[i]],
                            beforeAvailable: [...work],
                            afterAvailable: null,
                            description: `Process P${i} can proceed and release resources.`
                        };
                        
                        finish[i] = true;
                        progress = true;
                        
                        for (let j = 0; j < numResources; j++) {
                            work[j] += allocated[i][j];
                        }
                        
                        step.afterAvailable = [...work];
                        steps.push(step);
                    }
                }
            }
            
            const deadlockedProcesses = [];
            for (let i = 0; i < numProcesses; i++) {
                if (!finish[i]) {
                    deadlockedProcesses.push(i);
                }
            }
            
            // Prepare RAG data only for single mode
            let rag = { nodes: [], edges: [] };
            if (mode === 'single') {
                const nodes = [];
                const edges = [];
                
                // Add process nodes
                for (let i = 0; i < numProcesses; i++) {
                    nodes.push({ id: `P${i}`, label: `P${i}`, shape: 'circle', color: finish[i] ? '#2ecc71' : '#e74c3c' });
                }
                
                // Add resource nodes
                for (let j = 0; j < numResources; j++) {
                    nodes.push({ id: `R${j}`, label: `R${j}`, shape: 'box', color: '#3498db' });
                }
                
                // Add allocation edges (Resource -> Process)
                for (let i = 0; i < numProcesses; i++) {
                    for (let j = 0; j < numResources; j++) {
                        if (allocated[i][j] > 0) {
                            edges.push({ from: `R${j}`, to: `P${i}`, arrows: 'to', label: `${allocated[i][j]}`, color: '#95a5a6' });
                            console.log(`Added allocation edge: R${j} -> P${i} with ${allocated[i][j]}`);
                        }
                    }
                }
                
                // Add request edges (Process -> Resource) for all non-zero requests
                for (let i = 0; i < numProcesses; i++) {
                    for (let j = 0; j < numResources; j++) {
                        if (requested[i][j] > 0) {
                            edges.push({ from: `P${i}`, to: `R${j}`, arrows: 'to', label: `${requested[i][j]}`, color: '#e74c3c', dashes: true });
                            console.log(`Added request edge: P${i} -> R${j} with ${requested[i][j]}`);
                        }
                    }
                }
                
                rag = { nodes, edges };
                console.log('RAG nodes:', nodes);
                console.log('RAG edges:', edges);
            }
            
            return { 
                isDeadlock: deadlockedProcesses.length > 0,
                deadlockedProcesses,
                steps,
                rag
            };
        } catch (error) {
            throw new Error(`Error detecting deadlock: ${error.message}`);
        }
    }

    // Visualize steps
    function visualizeSteps(result) {
        stepsVisualization.innerHTML = '';
        
        if (result.isDeadlock) {
            const deadlockMessage = document.createElement('div');
            deadlockMessage.classList.add('deadlock-message');
            deadlockMessage.innerHTML = `
                <div class="alert alert-danger">
                    <h3>🚨 Deadlock Detected!</h3>
                    <p>Processes ${result.deadlockedProcesses.map(p => `P${p}`).join(', ')} are in a deadlock.</p>
                </div>
            `;
            stepsVisualization.appendChild(deadlockMessage);
        }
        
        const timeline = document.createElement('div');
        timeline.classList.add('steps-timeline');
        
        result.steps.forEach((step, index) => {
            const stepElement = document.createElement('div');
            stepElement.classList.add('timeline-step');
            const colors = ['#00b894', '#6c5ce7', '#e84393', '#fd79a8', '#a29bfe'];
            const processColor = colors[step.process % colors.length];
            
            stepElement.innerHTML = `
                <div class="timeline-step-header" style="background-color: ${processColor}">
                    <span class="step-number">Step ${index + 1}</span>
                    <span class="step-process">Process P${step.process}</span>
                </div>
                <div class="timeline-step-content">
                    <div class="step-details">
                        <div class="detail-row">
                            <strong>${modeSelect.value === 'single' ? 'Request' : 'Need'}:</strong>
                            ${step.request.map((r, i) => `R${i}: ${r}`).join(' | ')}
                        </div>
                        <div class="detail-row">
                            <strong>Allocated:</strong>
                            ${step.allocated.map((a, i) => `R${i}: ${a}`).join(' | ')}
                        </div>
                        <div class="detail-row">
                            <strong>Before Available:</strong>
                            ${step.beforeAvailable.map((b, i) => `R${i}: ${b}`).join(' | ')}
                        </div>
                        <div class="detail-row">
                            <strong>After Available:</strong>
                            ${step.afterAvailable.map((a, i) => `R${i}: ${a}`).join(' | ')}
                        </div>
                    </div>
                    <div class="step-description">
                        <i class="icon">ℹ️</i> ${step.description}
                    </div>
                </div>
            `;
            
            timeline.appendChild(stepElement);
        });
        
        stepsVisualization.appendChild(timeline);
    }

    // Visualize RAG
    function visualizeRAG(rag) {
        try {
            if (!ragVisualization) {
                throw new Error("RAG visualization container not found.");
            }
            const container = ragVisualization;
            const data = {
                nodes: new vis.DataSet(rag.nodes),
                edges: new vis.DataSet(rag.edges)
            };
            const options = {
                nodes: {
                    font: { color: '#ffffff', size: 16 },
                    borderWidth: 2
                },
                edges: {
                    font: { color: '#ffffff', size: 14 }, // Increased font size for better readability
                    arrows: { to: { enabled: true, scaleFactor: 1 } },
                    smooth: { type: 'curvedCW', roundness: 0.2 }
                },
                layout: {
                    hierarchical: false
                },
                physics: {
                    enabled: true,
                    barnesHut: { gravitationalConstant: -2000 }
                }
            };
            new vis.Network(container, data, options);
        } catch (error) {
            console.error(`Error visualizing RAG: ${error.message}`);
            alert(`Error visualizing RAG: ${error.message}`);
        }
    }

    // Reset functionality
    resetButton.addEventListener('click', () => {
        modeSelect.value = 'single';
        numProcessesInput.value = 3;
        numResourcesInput.value = 3;
        matricesDiv.classList.add('hidden');
        resultDiv.classList.add('hidden');
        stepsContainer.classList.add('hidden');
        ragVisualization.style.display = 'block';
        ragHeading.style.display = 'block';
    });

    // Export scenario
    exportScenarioButton.addEventListener('click', () => {
        try {
            const { max, allocated, requested, available } = getMatrixValues();
            const mode = modeSelect.value;
            
            const scenario = { 
                mode: mode,
                allocated: allocated,
                available: available
            };
            
            if (mode === 'single') {
                scenario.requested = requested;
            } else {
                scenario.max = max;
            }
            
            const scenarioJSON = JSON.stringify(scenario, null, 2);
            
            const tempTextArea = document.createElement('textarea');
            tempTextArea.value = scenarioJSON;
            document.body.appendChild(tempTextArea);
            tempTextArea.select();
            document.execCommand('copy');
            document.body.removeChild(tempTextArea);
            
            alert('Scenario copied to clipboard!');
        } catch (error) {
            alert(`Error exporting scenario: ${error.message}`);
        }
    });

    // Import scenario button
    importScenarioButton.addEventListener('click', () => {
        scenarioImportModal.classList.remove('hidden');
    });

    // Close modal
    closeModalButton.addEventListener('click', () => {
        scenarioImportModal.classList.add('hidden');
    });

    // Confirm import
    confirmImportButton.addEventListener('click', () => {
        try {
            const scenarioJSON = scenarioImportText.value;
            const scenario = JSON.parse(scenarioJSON);
            
            // Validate imported scenario for the selected mode
            const mode = modeSelect.value;
            const numProcesses = scenario.allocated?.length || 0;
            const numResources = scenario.allocated?.[0]?.length || 0;
            
            const validationError = validateInputForMode({
                max: scenario.max || [],
                allocated: scenario.allocated || [],
                requested: scenario.requested || [],
                available: scenario.available || []
            }, mode, numProcesses, numResources);
            
            if (validationError) {
                alert(validationError);
                return;
            }
            
            if (scenario.mode === 'multi' && scenario.requested && 
                (Array.isArray(scenario.requested) && scenario.requested.length === 0)) {
                delete scenario.requested;
            }
            
            modeSelect.value = scenario.mode || 'single';
            numProcessesInput.value = numProcesses;
            numResourcesInput.value = numResources;
            
            createMatricesButton.click();
            
            scenario.allocated.forEach((processAllocated, i) => {
                processAllocated.forEach((val, j) => {
                    const input = document.getElementById(`allocated-${i}-${j}`);
                    if (input) input.value = val;
                });
            });
            
            if (scenario.mode === 'single' && scenario.requested) {
                scenario.requested.forEach((processRequested, i) => {
                    processRequested.forEach((val, j) => {
                        const input = document.getElementById(`requested-${i}-${j}`);
                        if (input) input.value = val;
                    });
                });
            } else if (scenario.mode === 'multi' && scenario.max) {
                scenario.max.forEach((processMax, i) => {
                    processMax.forEach((val, j) => {
                        const input = document.getElementById(`max-${i}-${j}`);
                        if (input) input.value = val;
                    });
                });
            }
            
            scenario.available.forEach((val, j) => {
                const input = document.getElementById(`available-${j}`);
                if (input) input.value = val;
            });
            
            scenarioImportModal.classList.add('hidden');
        } catch (error) {
            alert(`Invalid scenario JSON. Please check the format and error: ${error.message}`);
        }
    });

    // Detect deadlock button
    detectDeadlockButton.addEventListener('click', () => {
        try {
            const matrices = getMatrixValues();
            const mode = modeSelect.value;
            const numProcesses = parseInt(numProcessesInput.value);
            const numResources = parseInt(numResourcesInput.value);
            
            // Validate input for the current mode
            const validationError = validateInputForMode(matrices, mode, numProcesses, numResources);
            if (validationError) {
                alert(validationError);
                return;
            }
            
            const result = detectDeadlock();
            displayResult(result);
            visualizeSteps(result);
            if (mode === 'single') {
                visualizeRAG(result.rag);
                ragVisualization.style.display = 'block';
                ragHeading.style.display = 'block';
            } else {
                ragVisualization.style.display = 'none';
                ragHeading.style.display = 'none';
            }
            stepsContainer.classList.remove('hidden');
        } catch (error) {
            alert(`Error detecting deadlock: ${error.message}`);
        }
    });
});
