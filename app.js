
let session = null;       
let scalerParams = null;   
let examples = {};         
 
const classNames = [
    'Benign',
    'RedLineStealer',
    'Downloader',
    'RAT',
    'BankingTrojan',
    'SnakeKeyLogger',
    'Spyware'
];
 

async function initModel() {
    try {
       
        // Load Scaler Params
        const scalerResponse = await fetch('scaler_params.json');
        scalerParams = await scalerResponse.json();
 
        session = await ort.InferenceSession.create('malware_classifier_embedded.onnx');
 
        await loadExamples();
        console.log('Model loaded sucessfully');
 
    } catch (error) {
        console.error('Failed to load model:', error);
    }
}
 
 
// Grab pre-loaded samples and build dropdown  
async function loadExamples() {
    const response = await fetch('sample_examples.json');
    examples = await response.json();
 
    // Populate Dropdown
    const select = document.getElementById('sample-select');
    for (const name of Object.keys(examples)) {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
    }
}
 
 
function scaleInput(rawValues) {
    return rawValues.map((value, i) => {
        const std = scalerParams.std[i];
 

        // element-wise scaling (value - mean) / std
        return std === 0 ? 0 : (value - scalerParams.mean[i]) / std; // Guard against division by zero
    });
}
 
 
function softmax(logits) {

    // Find Max
    const maxLogit = Math.max(...logits); 
 
    // Shift for Stability
    const exps = logits.map(logit => Math.exp(logit - maxLogit));
 
    // Exponentiate
    const sumExps = exps.reduce((a, b) => a + b, 0);
 
    // Sum all exponentials
    const probabilities = exps.map(exp => exp / sumExps);
 
    // Normalize to Probabilities
    return probabilities;
}


async function predict() {
   
    const selectedSample = document.getElementById('sample-select').value;
    const csvInput = document.getElementById('csv-input').value.trim();
 
    let rawValues;
 
    if (selectedSample) {
        rawValues = examples[selectedSample];  
 
    } else if (csvInput) {
        rawValues = csvInput.split(',').map(v => parseFloat(v.trim())); 
    } else {
        alert('Select a sample or paste PE Header Values');
        return;
    }
 
    // Validate feature count matches what is expected by the model
    if (rawValues.length !== 53) {
        alert(`Expected 53 Features, got ${rawValues.length}`);
        return;
    }
 
    // Scale with training params 
    const scaledValues = scaleInput(rawValues);
 
    // ONNX Tensor 
    const tensor = new ort.Tensor('float32', new Float32Array(scaledValues), [1, 53]);
    const feeds = { 'input': tensor }; // Key must match export's input names
 
    const results = await session.run(feeds);
    const logits = Array.from(results['output'].data); // Extract Raw Scores, Convert into Regular Array
 
    const probabilities = softmax(logits);
 
    const predictedIndex = probabilities.indexOf(Math.max(...probabilities));
 
    updateResults(predictedIndex, probabilities);
}
 

 
function updateResults(classIndex, probabilities) {
 
    document.getElementById('results-section').classList.remove('hidden');
 
    const classLabel = document.getElementById('predicted-class');
    classLabel.textContent = classNames[classIndex];
 
    classLabel.classList.remove('benign', 'malware');
    classLabel.classList.add(classIndex === 0 ? 'benign' : 'malware');
 
    const confidence = document.getElementById('confidence');
    confidence.textContent = (probabilities[classIndex] * 100).toFixed(1) + '% confidence';
 
    const container = document.getElementById('confidence-bars');
    container.innerHTML = '';
 
    for (let i = 0; i < classNames.length; i++) {

        const row = document.createElement('div');
        row.classList.add('bar-row');
 
        const label = document.createElement('span');
        label.classList.add('bar-label');
        label.textContent = classNames[i];
 
        const track = document.createElement('div');
        track.classList.add('bar-container');
 
        const fill = document.createElement('div');
        fill.classList.add('bar-fill');
        fill.style.width = (probabilities[i] * 100) + '%';
        fill.classList.add(i === 0 ? 'benign' : 'malware');
 
        const pct = document.createElement('span');
        pct.classList.add('bar-pct');
        pct.textContent = (probabilities[i] * 100).toFixed(1) + '%';
 
        track.appendChild(fill);
        row.appendChild(label);
        row.appendChild(track);
        row.appendChild(pct);
        container.appendChild(row);
    }
}
 
 
window.addEventListener('DOMContentLoaded', initModel);
