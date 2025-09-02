import { app } from "../../scripts/app.js";

const EXTENSION_NAME = "Metadata2Workflow";
const VERSION = "1.0.1"; // Force cache refresh

app.registerExtension({
    name: `${EXTENSION_NAME}.contextMenu`,
    
    init() {
        // Add global context menu for pasting metadata
        this.addGlobalContextMenu();
        
        // Add keyboard shortcut
        this.addKeyboardShortcut();
        
        console.log(`${EXTENSION_NAME} v${VERSION}: Extension initialized`);
    },

    addGlobalContextMenu() {
        const originalGetCanvasMenuOptions = LGraphCanvas.prototype.getCanvasMenuOptions;
        const self = this;
        
        LGraphCanvas.prototype.getCanvasMenuOptions = function() {
            const options = originalGetCanvasMenuOptions.call(this);
            
            options.push(null); // separator
            options.push({
                content: "📋 Paste Civitai Metadata",
                callback: async () => {
                    console.log('Context menu clicked, calling pasteCivitaiMetadata');
                    try {
                        await self.pasteCivitaiMetadata();
                    } catch (error) {
                        console.error('Error in context menu callback:', error);
                    }
                }
            });
            
            return options;
        };
    },

    addKeyboardShortcut() {
        const extension = this;
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+V (or Cmd+Shift+V on Mac)
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'V') {
                e.preventDefault();
                extension.pasteCivitaiMetadata();
            }
        });
    },

    async pasteCivitaiMetadata() {
        try {
            // Try to read from clipboard
            let clipboardText = '';
            
            if (navigator.clipboard && navigator.clipboard.readText) {
                try {
                    clipboardText = await navigator.clipboard.readText();
                } catch (clipboardError) {
                    console.warn('Failed to read from clipboard:', clipboardError);
                    // Fallback to prompt
                    clipboardText = prompt('Please paste your Civitai metadata:') || '';
                }
            } else {
                // Fallback for browsers without clipboard API
                clipboardText = prompt('Please paste your Civitai metadata:') || '';
            }
            
            if (!clipboardText.trim()) {
                console.log('No metadata to process');
                return;
            }
            
            // Parse and generate the workflow
            await this.parseAndGenerateWorkflow(clipboardText);
            
        } catch (error) {
            console.error('Error processing metadata:', error);
            alert('Error processing metadata: ' + error.message);
        }
    },

    async parseAndGenerateWorkflow(metadataText) {
        try {
            console.log('Starting workflow generation with metadata:', metadataText);
            
            // Parse Civitai metadata
            const parsedData = this.parseCivitaiMetadata(metadataText);
            
            if (!parsedData) {
                throw new Error("Could not parse metadata. Please make sure you copied valid Civitai metadata.");
            }
            
            console.log('Successfully parsed metadata:', parsedData);
            
            // Clear current workflow
            console.log('Clearing current workflow...');
            app.graph.clear();
            
            // Generate complete workflow with standard ComfyUI nodes
            console.log('Creating complete workflow...');
            await this.createCompleteWorkflow(parsedData);
            
            console.log('Setting canvas dirty...');
            app.graph.setDirtyCanvas(true, true);
            
            // Show success message
            this.showNotification("Workflow generated successfully from Civitai metadata!", "success");
            console.log('Workflow generation completed successfully');
            
        } catch (error) {
            console.error('Error generating workflow:', error);
            console.error('Stack trace:', error.stack);
            this.showNotification("Error generating workflow: " + error.message, "error");
        }
    },

    parseCivitaiMetadata(text) {
        try {
            // Try to parse as JSON first
            if (text.trim().startsWith('{')) {
                const jsonData = JSON.parse(text);
                console.log('Parsed JSON data:', jsonData);
                return this.normalizeJsonData(jsonData);
            }
            
            // Parse parameter string format
            const data = {};
            const lines = text.split('\n');
            
            let promptText = '';
            let negativePromptText = '';
            let inNegativePrompt = false;
            let parsingParameters = false;
            
            for (let line of lines) {
                line = line.trim();
                if (!line) continue;
                
                // Check for "Negative prompt:" marker
                if (line.toLowerCase().startsWith('negative prompt:')) {
                    inNegativePrompt = true;
                    parsingParameters = false;
                    negativePromptText = line.replace(/negative prompt:\s*/i, '').trim();
                    continue;
                }
                
                // Check for parameters line (usually starts with "Steps:" or contains parameter patterns)
                if (line.match(/(Steps|Sampler|CFG scale|Seed|Size|Model hash|Model|Scheduler|Clip skip|Denoising strength):/i)) {
                    inNegativePrompt = false;
                    parsingParameters = true;
                    
                    // Parse parameters - handle both comma and newline separated formats
                    const parameterText = line;
                    this.parseParameterLine(parameterText, data);
                    continue;
                }
                
                // If we're already parsing parameters, continue with parameter parsing
                if (parsingParameters) {
                    this.parseParameterLine(line, data);
                    continue;
                }
                
                // Collect prompt text
                if (!inNegativePrompt && !parsingParameters) {
                    promptText += (promptText ? ' ' : '') + line;
                } else if (inNegativePrompt && !parsingParameters) {
                    negativePromptText += (negativePromptText ? ' ' : '') + line;
                }
            }
            
            data.positive_prompt = promptText.trim();
            data.negative_prompt = negativePromptText.trim();
            
            // Set defaults if not found
            if (!data.steps) data.steps = 20;
            if (!data.cfg_scale) data.cfg_scale = 7.0;
            if (!data.sampler) data.sampler = "Euler a";
            if (!data.size) data.size = "512x512";
            if (data.seed === undefined) data.seed = -1;
            
            console.log('Parsed metadata:', data); // Debug log
            return data;
            
        } catch (error) {
            console.error('Error parsing metadata:', error);
            return null;
        }
    },

    parseParameterLine(line, data) {
        // Handle both comma-separated and individual parameter lines
        const params = line.includes(',') ? line.split(',') : [line];
        
        for (const param of params) {
            const colonIndex = param.indexOf(':');
            if (colonIndex === -1) continue;
            
            const key = param.substring(0, colonIndex).trim();
            const value = param.substring(colonIndex + 1).trim();
            
            if (!key || !value) continue;
            
            switch (key.toLowerCase()) {
                case 'steps':
                    data.steps = parseInt(value);
                    break;
                case 'sampler':
                    data.sampler = value.replace(/"/g, ''); // Remove quotes
                    break;
                case 'cfg scale':
                    data.cfg_scale = parseFloat(value);
                    break;
                case 'seed':
                    data.seed = parseInt(value);
                    break;
                case 'size':
                    data.size = value.replace(/"/g, ''); // Remove quotes
                    break;
                case 'model':
                case 'basemodel':
                case 'base model':
                case 'checkpoint':
                    data.model = value.replace(/"/g, ''); // Remove quotes
                    break;
                case 'model hash':
                    data.model_hash = value.replace(/"/g, '');
                    break;
                case 'scheduler':
                    data.scheduler = value.replace(/"/g, '');
                    break;
                case 'clip skip':
                    data.clip_skip = parseInt(value);
                    break;
                case 'denoising strength':
                    data.denoising_strength = parseFloat(value);
                    break;
                case 'hires upscaler':
                    data.hires_upscaler = value.replace(/"/g, '');
                    break;
                case 'hires steps':
                    data.hires_steps = parseInt(value);
                    break;
                case 'hires upscale':
                    data.hires_upscale = parseFloat(value);
                    break;
            }
        }
    },

    normalizeJsonData(jsonData) {
        // Handle different JSON structures from various sources
        const normalized = {};
        
        // Direct properties
        const directMappings = {
            'prompt': 'positive_prompt',
            'positivePrompt': 'positive_prompt',
            'positive_prompt': 'positive_prompt',
            'negativePrompt': 'negative_prompt',
            'negative_prompt': 'negative_prompt',
            'steps': 'steps',
            'sampler': 'sampler',
            'samplerName': 'sampler',
            'sampler_name': 'sampler',
            'cfgScale': 'cfg_scale',
            'cfg_scale': 'cfg_scale',
            'seed': 'seed',
            'width': 'width',
            'height': 'height',
            'size': 'size',
            'model': 'model',
            'baseModel': 'model',
            'base_model': 'model',
            'checkpoint': 'model',
            'scheduler': 'scheduler',
            'clipSkip': 'clip_skip',
            'clip_skip': 'clip_skip'
        };
        
        // Apply direct mappings
        for (const [key, normalizedKey] of Object.entries(directMappings)) {
            if (jsonData[key] !== undefined) {
                normalized[normalizedKey] = jsonData[key];
            }
        }
        
        // Handle size as width x height
        if (jsonData.width && jsonData.height) {
            normalized.size = `${jsonData.width}x${jsonData.height}`;
        }
        
        // Handle nested parameters object (common in some formats)
        if (jsonData.parameters) {
            const params = jsonData.parameters;
            for (const [key, normalizedKey] of Object.entries(directMappings)) {
                if (params[key] !== undefined && normalized[normalizedKey] === undefined) {
                    normalized[normalizedKey] = params[key];
                }
            }
        }
        
        // Handle resources array (Civitai format)
        if (jsonData.resources && Array.isArray(jsonData.resources)) {
            normalized.resources = jsonData.resources;
        }
        
        // Handle meta object (A1111 format)
        if (jsonData.meta) {
            const meta = jsonData.meta;
            for (const [key, normalizedKey] of Object.entries(directMappings)) {
                if (meta[key] !== undefined && normalized[normalizedKey] === undefined) {
                    normalized[normalizedKey] = meta[key];
                }
            }
        }
        
        console.log('Normalized JSON data:', normalized);
        return normalized;
    },

    extractModelName(data) {
        // Try different possible model field names
        const modelFields = ['model', 'baseModel', 'base_model', 'checkpoint', 'ckpt_name'];
        
        for (const field of modelFields) {
            if (data[field]) {
                let modelName = data[field];
                
                // Clean up model name
                modelName = modelName.replace(/"/g, ''); // Remove quotes
                modelName = modelName.replace(/\.(safetensors|ckpt)$/i, ''); // Remove file extension
                
                // If it looks like a full filename, try to extract just the name part
                if (modelName.includes('/') || modelName.includes('\\')) {
                    const parts = modelName.split(/[/\\]/);
                    modelName = parts[parts.length - 1];
                }
                
                console.log(`Found model name in field '${field}':`, modelName);
                return modelName;
            }
        }
        
        // Also check if it's nested in JSON (common in some Civitai formats)
        if (data.resources && Array.isArray(data.resources)) {
            for (const resource of data.resources) {
                if (resource.type === 'model' || resource.type === 'checkpoint') {
                    if (resource.name) {
                        console.log('Found model name in resources:', resource.name);
                        return resource.name.replace(/\.(safetensors|ckpt)$/i, '');
                    }
                }
            }
        }
        
        console.log('No model name found in metadata');
        return null;
    },

    async createCompleteWorkflow(data) {
        try {
            const nodes = [];
            let currentX = 100;
            const baseY = 100;
            const nodeSpacing = 300;
            
            // 1. Checkpoint Loader
            const checkpointLoader = LiteGraph.createNode("CheckpointLoaderSimple");
            if (checkpointLoader) {
                checkpointLoader.pos = [currentX, baseY];
                app.graph.add(checkpointLoader);
                nodes.push({node: checkpointLoader, type: 'checkpoint'});
                console.log('Checkpoint loader created');
                
                // Set model name if available
                const modelName = this.extractModelName(data);
                if (modelName && checkpointLoader.widgets) {
                    console.log('Model name found:', modelName);
                    console.log('Checkpoint widgets:', checkpointLoader.widgets.map(w => w.name));
                    
                    const modelWidget = checkpointLoader.widgets.find(w => w.name === "ckpt_name");
                    if (modelWidget) {
                        modelWidget.value = modelName;
                        console.log('Set checkpoint model to:', modelName);
                        if (modelWidget.callback) {
                            modelWidget.callback(modelWidget.value);
                        }
                    } else {
                        console.warn('No ckpt_name widget found in checkpoint loader');
                    }
                } else {
                    console.log('No model name found in metadata');
                }
            }
            currentX += nodeSpacing;
            
            // 2. LoRA Loaders (if LoRAs are detected in prompt)
            const loraLoaders = [];
            const loraMatches = data.positive_prompt ? data.positive_prompt.match(/<lora:([^>]+)>/g) : [];
            console.log('LoRA matches found:', loraMatches);
            console.log('Full positive prompt:', data.positive_prompt);
            
            if (loraMatches && loraMatches.length > 0) {
                console.log(`Creating ${loraMatches.length} LoRA loader(s)...`);
                
                for (let i = 0; i < loraMatches.length; i++) {
                    const loraMatch = loraMatches[i];
                    console.log(`Processing LoRA ${i + 1}:`, loraMatch);
                    
                    const loraLoader = LiteGraph.createNode("LoraLoader");
                    if (!loraLoader) {
                        console.error(`Failed to create LoraLoader ${i + 1}`);
                        continue;
                    }
                    
                    // Position LoRAs vertically if multiple
                    const yOffset = i * 150;
                    loraLoader.pos = [currentX, baseY + yOffset];
                    app.graph.add(loraLoader);
                    loraLoaders.push(loraLoader);
                    nodes.push({node: loraLoader, type: 'lora', index: i});
                    console.log(`LoraLoader ${i + 1} created and added to graph`);
                    
                    // Extract LoRA name and strength
                    const loraPattern = /<lora:([^:>]+)(?::([0-9.]+))?>/;
                    const match = loraMatch.match(loraPattern);
                    const loraName = match ? match[1] : loraMatch.replace(/<lora:([^:>]+).*>/, '$1');
                    const loraStrength = match && match[2] ? parseFloat(match[2]) : 1.0;
                    
                    console.log(`LoRA ${i + 1} - name:`, loraName, 'strength:', loraStrength);
                    
                    // Configure LoRA
                    if (loraLoader.widgets) {
                        const loraNameWidget = loraLoader.widgets.find(w => w.name === "lora_name");
                        const strengthModelWidget = loraLoader.widgets.find(w => w.name === "strength_model");
                        const strengthClipWidget = loraLoader.widgets.find(w => w.name === "strength_clip");
                        
                        if (loraNameWidget) {
                            loraNameWidget.value = loraName;
                            console.log(`Set LoRA ${i + 1} name to:`, loraName);
                        }
                        if (strengthModelWidget) {
                            strengthModelWidget.value = loraStrength;
                            console.log(`Set LoRA ${i + 1} model strength to:`, loraStrength);
                        }
                        if (strengthClipWidget) {
                            strengthClipWidget.value = loraStrength;
                            console.log(`Set LoRA ${i + 1} clip strength to:`, loraStrength);
                        }
                        
                        // Trigger widget updates
                        loraLoader.widgets.forEach(widget => {
                            if (widget.callback) {
                                widget.callback(widget.value);
                            }
                        });
                    }
                    
                    // Connect LoRAs in chain: Checkpoint -> LoRA1 -> LoRA2 -> ...
                    if (i === 0) {
                        // First LoRA connects to checkpoint
                        if (checkpointLoader) {
                            console.log(`Connecting checkpoint to LoRA ${i + 1}...`);
                            checkpointLoader.connect(0, loraLoader, 0); // MODEL
                            checkpointLoader.connect(1, loraLoader, 1); // CLIP
                        }
                    } else {
                        // Subsequent LoRAs connect to previous LoRA
                        const previousLoRA = loraLoaders[i - 1];
                        if (previousLoRA) {
                            console.log(`Connecting LoRA ${i} to LoRA ${i + 1}...`);
                            previousLoRA.connect(0, loraLoader, 0); // MODEL
                            previousLoRA.connect(1, loraLoader, 1); // CLIP
                        }
                    }
                    
                    console.log(`LoRA ${i + 1} connections established`);
                }
                
                currentX += nodeSpacing;
            } else {
                console.log('No LoRA detected in prompt');
            }
            
            // Get the final source for MODEL and CLIP (last LoRA or checkpoint)
            const finalModelSource = loraLoaders.length > 0 ? loraLoaders[loraLoaders.length - 1] : checkpointLoader;
            
            // 3. Positive Prompt
            const positivePrompt = LiteGraph.createNode("CLIPTextEncode");
            if (positivePrompt) {
                positivePrompt.pos = [currentX, baseY - 100];
                app.graph.add(positivePrompt);
                nodes.push({node: positivePrompt, type: 'positive_prompt'});
                console.log('Positive prompt node created');
                
                // Set prompt text (remove LoRA tags)
                let cleanPrompt = data.positive_prompt || "";
                cleanPrompt = cleanPrompt.replace(/<lora:[^>]+>/g, '').trim();
                console.log('Clean positive prompt:', cleanPrompt);
                console.log('Positive prompt widgets:', positivePrompt.widgets?.map(w => w.name));
                
                if (positivePrompt.widgets) {
                    const textWidget = positivePrompt.widgets.find(w => w.name === "text");
                    if (textWidget) {
                        textWidget.value = cleanPrompt;
                        console.log('Set positive prompt text');
                        if (textWidget.callback) {
                            textWidget.callback(textWidget.value);
                        }
                    } else {
                        console.warn('No text widget found in positive prompt');
                    }
                } else {
                    console.warn('Positive prompt node has no widgets');
                }
                
                // Connect CLIP
                if (finalModelSource) {
                    console.log('Connecting CLIP to positive prompt from:', finalModelSource.type || 'final source');
                    finalModelSource.connect(1, positivePrompt, 0); // CLIP
                } else {
                    console.warn('No CLIP source found for positive prompt');
                }
            } else {
                console.error('Failed to create positive prompt node');
            }
            
            // 4. Negative Prompt
            const negativePrompt = LiteGraph.createNode("CLIPTextEncode");
            if (negativePrompt) {
                negativePrompt.pos = [currentX, baseY + 150];
                app.graph.add(negativePrompt);
                nodes.push({node: negativePrompt, type: 'negative_prompt'});
                console.log('Negative prompt node created');
                
                if (negativePrompt.widgets) {
                    const textWidget = negativePrompt.widgets.find(w => w.name === "text");
                    if (textWidget) {
                        textWidget.value = data.negative_prompt || "";
                        console.log('Set negative prompt text:', data.negative_prompt);
                        if (textWidget.callback) {
                            textWidget.callback(textWidget.value);
                        }
                    }
                }
                
                // Connect CLIP
                if (finalModelSource) {
                    finalModelSource.connect(1, negativePrompt, 0); // CLIP
                    console.log('Connected CLIP to negative prompt');
                }
            }
            currentX += nodeSpacing;
            
            // 5. Empty Latent Image
            const emptyLatent = LiteGraph.createNode("EmptyLatentImage");
            if (emptyLatent) {
                emptyLatent.pos = [currentX, baseY + 200];
                app.graph.add(emptyLatent);
                nodes.push({node: emptyLatent, type: 'latent'});
                console.log('Empty latent image node created');
                
                // Set dimensions
                if (data.size && emptyLatent.widgets) {
                    const [width, height] = data.size.split('x').map(Number);
                    console.log('Setting dimensions:', width, 'x', height);
                    const widthWidget = emptyLatent.widgets.find(w => w.name === "width");
                    const heightWidget = emptyLatent.widgets.find(w => w.name === "height");
                    
                    if (widthWidget) {
                        widthWidget.value = width || 512;
                        if (widthWidget.callback) widthWidget.callback(widthWidget.value);
                    }
                    if (heightWidget) {
                        heightWidget.value = height || 512;
                        if (heightWidget.callback) heightWidget.callback(heightWidget.value);
                    }
                } else {
                    console.log('No size data or empty latent has no widgets');
                }
            }
            currentX += nodeSpacing;
            
            // 6. KSampler
            const ksampler = LiteGraph.createNode("KSampler");
            if (ksampler) {
                ksampler.pos = [currentX, baseY];
                app.graph.add(ksampler);
                nodes.push({node: ksampler, type: 'sampler'});
                
                // Configure sampler parameters
                this.configureKSampler(ksampler, data);
                
                // Connect inputs
                if (finalModelSource) {
                    finalModelSource.connect(0, ksampler, 0); // MODEL
                }
                if (positivePrompt) {
                    positivePrompt.connect(0, ksampler, 1); // POSITIVE
                }
                if (negativePrompt) {
                    negativePrompt.connect(0, ksampler, 2); // NEGATIVE
                }
                if (emptyLatent) {
                    emptyLatent.connect(0, ksampler, 3); // LATENT
                }
            }
            currentX += nodeSpacing;
            
            // 7. VAE Decode
            const vaeDecode = LiteGraph.createNode("VAEDecode");
            if (vaeDecode) {
                vaeDecode.pos = [currentX, baseY];
                app.graph.add(vaeDecode);
                nodes.push({node: vaeDecode, type: 'vae_decode'});
                
                // Connect inputs
                if (ksampler) {
                    ksampler.connect(0, vaeDecode, 0); // LATENT
                }
                if (checkpointLoader) {
                    checkpointLoader.connect(2, vaeDecode, 1); // VAE
                }
            }
            currentX += nodeSpacing;
            
            // 8. Save Image
            const saveImage = LiteGraph.createNode("SaveImage");
            if (saveImage) {
                saveImage.pos = [currentX, baseY];
                app.graph.add(saveImage);
                nodes.push({node: saveImage, type: 'save'});
                
                // Connect input
                if (vaeDecode) {
                    vaeDecode.connect(0, saveImage, 0); // IMAGE
                }
            }
            
            app.graph.setDirtyCanvas(true, true);
            
        } catch (error) {
            console.error('Error creating workflow:', error);
            throw error;
        }
    },
    
    configureKSampler(ksampler, data) {
        console.log('Configuring KSampler with data:', data);
        console.log('KSampler widgets:', ksampler.widgets?.map(w => w.name));
        
        if (!ksampler.widgets) {
            console.warn('KSampler has no widgets');
            return;
        }
        
        const seedWidget = ksampler.widgets.find(w => w.name === "seed");
        const stepsWidget = ksampler.widgets.find(w => w.name === "steps");
        const cfgWidget = ksampler.widgets.find(w => w.name === "cfg");
        const samplerWidget = ksampler.widgets.find(w => w.name === "sampler_name");
        const schedulerWidget = ksampler.widgets.find(w => w.name === "scheduler");
        
        console.log('Found widgets:', {
            seed: !!seedWidget,
            steps: !!stepsWidget,
            cfg: !!cfgWidget,
            sampler: !!samplerWidget,
            scheduler: !!schedulerWidget
        });
        
        if (seedWidget && data.seed !== undefined) {
            console.log(`Setting seed: ${data.seed}`);
            seedWidget.value = data.seed;
        }
        if (stepsWidget && data.steps !== undefined) {
            console.log(`Setting steps: ${data.steps}`);
            stepsWidget.value = data.steps;
        }
        if (cfgWidget && data.cfg_scale !== undefined) {
            console.log(`Setting CFG scale: ${data.cfg_scale}`);
            cfgWidget.value = data.cfg_scale;
        }
        if (samplerWidget && data.sampler) {
            // Map common sampler names to ComfyUI format
            const samplerMap = {
                "Euler a": "euler_ancestral",
                "Euler": "euler",
                "DPM++ 2M": "dpmpp_2m",
                "DPM++ 2M Karras": "dpmpp_2m",
                "DPM++ 2M SDE": "dpmpp_2m_sde",
                "DPM++ 2M SDE Karras": "dpmpp_2m_sde",
                "DPM++ 3M SDE": "dpmpp_3m_sde",
                "DDIM": "ddim",
                "PLMS": "plms",
                "UniPC": "uni_pc"
            };
            const mappedSampler = samplerMap[data.sampler] || "euler_ancestral";
            console.log(`Setting sampler: ${data.sampler} -> ${mappedSampler}`);
            samplerWidget.value = mappedSampler;
        }
        if (schedulerWidget && data.scheduler) {
            const schedulerMap = {
                "karras": "karras",
                "exponential": "exponential",
                "normal": "normal"
            };
            const mappedScheduler = schedulerMap[data.scheduler.toLowerCase()] || "normal";
            console.log(`Setting scheduler: ${data.scheduler} -> ${mappedScheduler}`);
            schedulerWidget.value = mappedScheduler;
        }
        
        // Trigger widget updates
        ksampler.widgets.forEach(widget => {
            if (widget.callback) {
                widget.callback(widget.value);
            }
        });
    },


    showNotification(message, type = "info") {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-weight: bold;
            z-index: 10000;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
        `;
        
        // Set color based on type
        switch (type) {
            case "success":
                notification.style.backgroundColor = "#4CAF50";
                break;
            case "error":
                notification.style.backgroundColor = "#f44336";
                break;
            case "warning":
                notification.style.backgroundColor = "#FF9800";
                break;
            default:
                notification.style.backgroundColor = "#2196F3";
        }
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
        
        // Click to dismiss
        notification.addEventListener('click', () => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        });
    }
});