# PE-Malware-Classification

# Overview

This is a web-based malware classifier that identifies Windows executables as benign or malware using PE Header Analysis. I trained a DNN using PyTorch on approximately 30,000 Windows PE header samples, distinguishing between benign executables and 6 malware families. I then exported it into ONNX format, deploying it with `onnxruntime-web`

## Why Static Analysis?
Malicious files can be found via static analysis without having to be executed. It is helpful for large-scale screening and triage since it is typically quicker and less costly to operate than dynamic analytic techniques like sandboxing. Dynamic analysis is slower, requires more resources, and can be evaded through anti-analysis tactics.

## Live Demo
https://7erzos.github.io/PE-Header-Analysis-with-ONNX/

## Dataset
https://figshare.com/articles/dataset/Windows_Malware_Detection_Dataset/21608262

# Pipeline

## 1. Preparing the Data:

### **Feature Selection**: 

I started with 54 columns and removed the SHA256 feature (identifier), e_magic (Constant MZ Signature), and LoaderFlags (Always Zero)

* SHA256: Removed since it's an identifier, not useful for generalization
* e_magic: Constant value for valid PE files (valid files are set to 0x5A4D when it corresponds to the MZ signature) which isnt helpful when distinguishing benign files from malicious
* LoaderFlags: Optional header which is reserved and must be zero
 
`Reserved1` was converted into a **binary anomaly indicator**, encoding whether the reserved field deviated from its expected normal value

After converting `Reserved1` into an anomaly flag, I engineered three boolean detector features, from `CheckSum`, `DllCharacteristics`, and `MajorImageVersion`. This follows prior malware studies that have found this zero-valued combination to be strongly associated with malicious executables. 
    `Dll Characteristics`: Has crucial flags such as `DYNAMIC_BASE`, `NX_COMPAT`, and `GUARD_CF`
    `MajorImageVersion`: The major version number of the image
    
### 2. Preprocessing:

* Stratified Train/Test Split to Preserve Class Ratios
* StandardScaler fit on training data only
* Computed inverse-frequency class weights to handle Benign being the smallest class (1,877 samples vs 5,000 for malware families). This allows the loss function to penalize mistakes on minority classes. 

### 3. Training:
* PyTorch feedforward Deep Neural Network with weighted CrossEntropyLoss and Adam optimizer for 50 epochs

### 4. Evaluation:
* Classification Report
* Confusion Matrix
* Comparison Against Random Forest and XGBoost on the same split

### 5. Deployment:
* ONNX Export with scaler parameters saved to JSON, served client-side through GitHub Pages with onnxruntime-web

# ML Architecture

```
Input Layer (53 Features)
↓
Hidden Layer 1: Linear(53 -> 128) -> BatchNorm1d -> ReLU -> Dropout(0.3)
↓
Hidden Layer 2: Linear(128 -> 64) -> BatchNorm1d -> ReLU -> Dropout(0.3)
↓
Hidden Layer 3: Linear(64 -> 32) -> BatchNorm1d -> ReLU -> Dropout(0.2)
↓
Output Layer: Linear(32 -> 7)
```

## Results

### Multi-Layer Perceptron
<img width="768" height="384" alt="image" src="https://github.com/user-attachments/assets/a0d59cc1-3bba-4970-8b0c-1feea96314b9" />

#### Heatmap:
<img width="900" height="790" alt="image" src="https://github.com/user-attachments/assets/36efa0c1-0d37-47c6-ac54-a86f1d931c10" />

### Random Forest
<img width="778" height="404" alt="image" src="https://github.com/user-attachments/assets/a299c62f-8626-434e-b0d0-482ca1dbb4c9" />

### XGBoost
<img width="712" height="412" alt="image" src="https://github.com/user-attachments/assets/c063d7ac-f60d-4f4b-94a1-3f626887bdb0" />


## Imports

* sklearn
* Numpy
* Pandas
* PyTorch
* ONNX
* matplotlib
* xgboost

# Web Deployment

The PyTorch model was exported into ONNX format which is then loaded directly in the browser using `onnxruntime-web`. The StandardScaler parameters (mean and standard deviation) from training were saved to a JSON file, and then replicated in JavaScript, ensuring inputs are normalized identically as if training. Users can either select a preloaded sample from the dataset or paste their own raw PE-header values. Inference runs entirely in the browser and returns both the predicted class and confidence scores across all seven classes.

# References

[Dataset Paper](https://arxiv.org/abs/2210.16285)
[Dataset Repo](https://github.com/DA-Proj/PE-Malware-Dataset1)

**PE Header Malware Detection Research:** 
* [Edward Raff - Learning the PE Header, Malware Detection with Minimal Domain Knowledge](https://arxiv.org/abs/1709.01471)
* [Samuel Kim - PE Header Analysis for Malware Detection](https://scholarworks.sjsu.edu/etd_projects/624/)
* [Zatloukal et al. (2017) citing Yibin Liao (2012) - Detecting Malware Based on Multiple PE Headers Identification and Optimization For Specific Types of Files](https://jaec.vn/index.php/JAEC/article/viewFile/64/37)
* [Hasan H. Al-Khshali & Muhammad Ilyas (2022) - Impact of Portable Executable Header Features on Malware Detection Accuracy](https://www.techscience.com/cmc/v74n1/49842/html)

**Malware Analysis Background:**
* [Scientific World Journal - Malware Detection Based on Mining Format Information](https://pmc.ncbi.nlm.nih.gov/articles/PMC4060536/) 
* [Comparing Static, Dynamic, and Hybrid Analysis for Malware Detection](https://arxiv.org/pdf/2203.09938)
  
**PE Format Documentation:** 
* [Microsoft Learn - Win32 PE File Format (In-Depth Look)](https://learn.microsoft.com/en-us/archive/msdn-magazine/2002/february/inside-windows-win32-portable-executable-file-format-in-detail)
* [Microsoft Learn - PE Format](https://learn.microsoft.com/en-us/windows/win32/debug/pe-format)

