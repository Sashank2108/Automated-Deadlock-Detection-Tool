document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
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

    // Helper function to get matrix values
    function getMatrixValues() {
        const numProcesses = parseInt(numProcessesInput.value);
        const numResources = parseInt(numResourcesInput.value);
        
        const allocated = [];
        const requested = [];
        const available = [];
        
        // Collect allocated resources
        for (let i = 0; i < numProcesses; i++) {
            const processAllocated = [];
            for (let j = 0; j < numResources; j++) {
                processAllocated.push(parseInt(document.getElementById(`allocated-${i}-${j}`).value) || 0);
            }
            allocated.push(processAllocated);
        }
        
        // Collect requested resources
        for (let i = 0; i < numProcesses; i++) {
            const processRequested = [];
            for (let j = 0; j < numResources; j++) {
                processRequested.push(parseInt(document.getElementById(`requested-${i}-${j}`).value) || 0);
            }
            requested.push(processRequested);
        }
        
        // Collect available resources
        for (let j = 0; j < numResources; j++) {
            available.push(parseInt(document.getElementById(`available-${j}`).value) || 0);
        }
        
        return { allocated, requested, available };
    }

    // Display result function
    function displayResult(result) {
        resultDiv.innerHTML = ''; // Clear previous results
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
        table.innerHTML = ''; // Clear existing content

        // Create header row
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = '<th>Process</th>' + 
            Array.from({length: columns}, (_, j) => `<th>R${j}</th>`).join('');
        table.appendChild(headerRow);

        // Create input rows
        for (let i = 0; i < rows; i++) {
            const row = document.createElement('tr');
            row.innerHTML = `<td>P${i}</td>` + 
                Array.from({length: columns}, (_, j) => 
                    `<td><input type="number" min="0" id="${prefix}-${i}-${j}" value="0"></td>`
                ).join('');
            table.appendChild(row);
        }
    }

    // Create matrix tables based on user input
    createMatricesButton.addEventListener('click', () => {
        const numProcesses = parseInt(numProcessesInput.value);
        const numResources = parseInt(numResourcesInput.value);
        
        if (numProcesses > 0 && numResources > 0) {
            createDynamicTable('allocatedTable', numProcesses, numResources, 'allocated');
            createDynamicTable('requestedTable', numProcesses, numResources, 'requested');
            
            // Create available resources table
            const availableTable = document.getElementById('availableTable');
            availableTable.innerHTML = '<tr><th>Resource</th><th>Available</th></tr>' +
                Array.from({length: numResources}, (_, j) => 
                    `<tr><td>R${j}</td><td><input type="number" min="0" id="available-${j}" value="0"></td></tr>`
                ).join('');
            
            matricesDiv.classList.remove('hidden');
            resultDiv.classList.add('hidden');
            stepsContainer.classList.add('hidden');
        }
    });

    // Detect deadlock function
    function detectDeadlock() {
        const { allocated, requested, available } = getMatrixValues();
        const numProcesses = allocated.length;
        const numResources = available.length;
        
        const work = [...available];
        const finish = new Array(numProcesses).fill(false);
        const steps = [];
        
        let progress = true;
        while (progress) {
            progress = false;
            
            for (let i = 0; i < numProcesses; i++) {
                if (finish[i]) continue;
                
                let canFinish = true;
                for (let j = 0; j < numResources; j++) {
                    if (requested[i][j] > work[j]) {
                        canFinish = false;
                        break;
                    }
                }
                
                if (canFinish) {
                    const step = {
                        process: i,
                        request: requested[i],
                        allocated: allocated[i],
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
        
        return { 
            isDeadlock: deadlockedProcesses.length > 0,
            deadlockedProcesses,
            steps
        };
    }

    // Visualize steps with improved styling
    function visualizeSteps(result) {
        stepsVisualization.innerHTML = ''; // Clear previous visualization
        
        // Create deadlock message if needed
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
        
        // Create steps timeline
        const timeline = document.createElement('div');
        timeline.classList.add('steps-timeline');
        
        result.steps.forEach((step, index) => {
            const stepElement = document.createElement('div');
            stepElement.classList.add('timeline-step');
            
            // Determine color based on process
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
                            <strong>Request:</strong>
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

    // Reset functionality
    resetButton.addEventListener('click', () => {
        numProcessesInput.value = 3;
        numResourcesInput.value = 3;
        matricesDiv.classList.add('hidden');
        resultDiv.classList.add('hidden');
        stepsContainer.classList.add('hidden');
    });

    // Export scenario
    exportScenarioButton.addEventListener('click', () => {
        const { allocated, requested, available } = getMatrixValues();
        const scenario = { allocated, requested, available };
        const scenarioJSON = JSON.stringify(scenario, null, 2);
        
        // Create a temporary textarea to copy the JSON
        const tempTextArea = document.createElement('textarea');
        tempTextArea.value = scenarioJSON;
        document.body.appendChild(tempTextArea);
        tempTextArea.select();
        document.execCommand('copy');
        document.body.removeChild(tempTextArea);
        
        alert('Scenario copied to clipboard!');
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
            
            // Update inputs and create matrices
            numProcessesInput.value = scenario.allocated.length;
            numResourcesInput.value = scenario.allocated[0].length;
            
            // Trigger matrix creation
            createMatricesButton.click();
            
            // Populate matrices
            scenario.allocated.forEach((processAllocated, i) => {
                processAllocated.forEach((val, j) => {
                    document.getElementById(`allocated-${i}-${j}`).value = val;
                });
            });
            
            scenario.requested.forEach((processRequested, i) => {
                processRequested.forEach((val, j) => {
                    document.getElementById(`requested-${i}-${j}`).value = val;
                });
            });
            
            scenario.available.forEach((val, j) => {
                document.getElementById(`available-${j}`).value = val;
            });
            
            scenarioImportModal.classList.add('hidden');
        } catch (error) {
            alert('Invalid scenario JSON. Please check the format.');
        }
    });

    // Detect deadlock button
    detectDeadlockButton.addEventListener('click', () => {
        const result = detectDeadlock();
        displayResult(result);
        visualizeSteps(result);
        stepsContainer.classList.remove('hidden');
    });
});
document.addEventListener('DOMContentLoaded', () => {
    // ... [Previous existing code remains the same] ...

    // Enhanced Deadlock Detection Function with Resolution Strategies
    function detectDeadlock() {
        const { allocated, requested, available } = getMatrixValues();
        const numProcesses = allocated.length;
        const numResources = available.length;
        
        const work = [...available];
        const finish = new Array(numProcesses).fill(false);
        const steps = [];
        const resolutionStrategies = [];
        
        let progress = true;
        while (progress) {
            progress = false;
            
            for (let i = 0; i < numProcesses; i++) {
                if (finish[i]) continue;
                
                let canFinish = true;
                for (let j = 0; j < numResources; j++) {
                    if (requested[i][j] > work[j]) {
                        canFinish = false;
                        break;
                    }
                }
                
                if (canFinish) {
                    const step = {
                        process: i,
                        request: requested[i],
                        allocated: allocated[i],
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
                
                // Generate Resolution Strategies
                const strategy = generateResolutionStrategy(i, requested[i], allocated[i], available);
                resolutionStrategies.push(strategy);
            }
        }
        
        return { 
            isDeadlock: deadlockedProcesses.length > 0,
            deadlockedProcesses,
            steps,
            resolutionStrategies
        };
    }

    // New function to generate resolution strategies
    function generateResolutionStrategy(processIndex, requestedResources, allocatedResources, availableResources) {
        const strategies = [
            {
                type: 'Preemption',
                description: `Temporarily suspend process P${processIndex} and reallocate its resources to break the deadlock.`,
                steps: [
                    `Identify critical resources held by process P${processIndex}`,
                    `Forcibly release all resources allocated to P${processIndex}`,
                    `Redistribute resources to unblock waiting processes`
                ]
            },
            {
                type: 'Process Termination',
                description: `Completely terminate process P${processIndex} to release all its resources.`,
                steps: [
                    `Rollback process P${processIndex} to a safe checkpoint`,
                    `Release all resources held by P${processIndex}`,
                    `Restart the process or reallocate its work to other processes`
                ]
            },
            {
                type: 'Resource Request Optimization',
                description: `Optimize resource requests to prevent future deadlocks.`,
                steps: [
                    `Analyze resource request pattern of P${processIndex}`,
                    `Implement more granular resource allocation`,
                    `Introduce timeout or priority-based resource allocation`
                ]
            }
        ];

        // Select most appropriate strategy based on resource status
        const totalRequestedResources = requestedResources.reduce((a, b) => a + b, 0);
        const totalAllocatedResources = allocatedResources.reduce((a, b) => a + b, 0);
        const totalAvailableResources = availableResources.reduce((a, b) => a + b, 0);

        let selectedStrategy;
        if (totalAvailableResources === 0) {
            selectedStrategy = strategies[1]; // Process Termination
        } else if (totalRequestedResources > totalAvailableResources * 1.5) {
            selectedStrategy = strategies[0]; // Preemption
        } else {
            selectedStrategy = strategies[2]; // Resource Request Optimization
        }

        return {
            processId: processIndex,
            ...selectedStrategy
        };
    }

    // Enhanced Visualization Function
    function visualizeSteps(result) {
        stepsVisualization.innerHTML = ''; // Clear previous visualization
        
        // Create deadlock message if needed
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
        
        // Create steps timeline
        const timeline = document.createElement('div');
        timeline.classList.add('steps-timeline');
        
        // Previous step visualization code remains the same...

        // Add Resolution Strategies Section
        if (result.isDeadlock && result.resolutionStrategies.length > 0) {
            const resolutionSection = document.createElement('div');
            resolutionSection.classList.add('resolution-strategies');
            resolutionSection.innerHTML = `
                <h3>🔧 Deadlock Resolution Strategies</h3>
            `;

            result.resolutionStrategies.forEach(strategy => {
                const strategyElement = document.createElement('div');
                strategyElement.classList.add('strategy-card');
                strategyElement.innerHTML = `
                    <div class="strategy-header">
                        <span class="strategy-type">${strategy.type}</span>
                        <span class="strategy-process">Process P${strategy.processId}</span>
                    </div>
                    <div class="strategy-description">
                        ${strategy.description}
                    </div>
                    <div class="strategy-steps">
                        <strong>Resolution Steps:</strong>
                        <ul>
                            ${strategy.steps.map(step => `<li>${step}</li>`).join('')}
                        </ul>
                    </div>
                `;
                resolutionSection.appendChild(strategyElement);
            });

            stepsVisualization.appendChild(resolutionSection);
        }
    }

    // Rest of the code remains the same...
});