import { app } from "../../scripts/app.js";

const EXTENSION_NAME = "Metadata2Workflow";

app.registerExtension({
    name: `${EXTENSION_NAME}.contextMenu`,
    
    init() {
        // Add global context menu for pasting metadata
        this.addGlobalContextMenu();
        
        // Add keyboard shortcut
        this.addKeyboardShortcut();
        
        console.log(`${EXTENSION_NAME}: Extension initialized`);
    },

    addGlobalContextMenu() {
        const originalGetCanvasMenuOptions = LGraphCanvas.prototype.getCanvasMenuOptions;
        
        LGraphCanvas.prototype.getCanvasMenuOptions = function() {
            const options = originalGetCanvasMenuOptions.call(this);
            
            options.push(null); // separator
            options.push({
                content: "📋 Paste Civitai Metadata",
                callback: async () => {
                    await this.pasteCivitaiMetadata();
                }
            });
            
            return options;
        };
    },

    addKeyboardShortcut() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+V (or Cmd+Shift+V on Mac)
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'V') {
                e.preventDefault();
                this.pasteCivitaiMetadata();
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
            
            // Generate the workflow
            await this.generateWorkflowFromMetadata(clipboardText);
            
        } catch (error) {
            console.error('Error processing metadata:', error);
            alert('Error processing metadata: ' + error.message);
        }
    },

    async generateWorkflowFromMetadata(metadataText) {
        try {
            // Clear current workflow
            app.graph.clear();
            
            // Create MetadataParserNode
            const parserNode = LiteGraph.createNode("MetadataParserNode");
            if (!parserNode) {
                throw new Error("MetadataParserNode not found. Make sure the plugin is properly installed.");
            }
            
            parserNode.pos = [100, 100];
            app.graph.add(parserNode);
            
            // Set the metadata text
            if (parserNode.widgets) {
                const metadataWidget = parserNode.widgets.find(w => w.name === "metadata_text");
                if (metadataWidget) {
                    metadataWidget.value = metadataText;
                }
            }
            
            // Create WorkflowGeneratorNode
            const generatorNode = LiteGraph.createNode("WorkflowGeneratorNode");
            if (!generatorNode) {
                throw new Error("WorkflowGeneratorNode not found. Make sure the plugin is properly installed.");
            }
            
            generatorNode.pos = [400, 100];
            app.graph.add(generatorNode);
            
            // Connect parser to generator
            parserNode.connect(8, generatorNode, 0); // parsed_data output to parsed_data input
            
            // Execute the parser to get parsed data
            const parseResult = parserNode.onExecute ? parserNode.onExecute() : null;
            
            if (parseResult) {
                // Generate and apply workflow
                await this.applyGeneratedWorkflow(parseResult);
            }
            
            app.graph.setDirtyCanvas(true, true);
            
            // Show success message
            this.showNotification("Workflow generated successfully from Civitai metadata!", "success");
            
        } catch (error) {
            console.error('Error generating workflow:', error);
            this.showNotification("Error generating workflow: " + error.message, "error");
        }
    },

    async applyGeneratedWorkflow(parsedData) {
        // This method would apply the generated workflow
        // For now, we'll just create the basic nodes manually
        
        try {
            // Clear current graph
            app.graph.clear();
            
            // Create basic workflow nodes
            await this.createBasicWorkflow(parsedData);
            
        } catch (error) {
            console.error('Error applying workflow:', error);
            throw error;
        }
    },

    async createBasicWorkflow(data) {
        const workflow = [
            { type: "CheckpointLoaderSimple", pos: [100, 100] },
            { type: "CLIPTextEncode", pos: [400, 50] },  // Positive prompt
            { type: "CLIPTextEncode", pos: [400, 200] }, // Negative prompt
            { type: "EmptyLatentImage", pos: [400, 350] },
            { type: "KSampler", pos: [700, 100] },
            { type: "VAEDecode", pos: [1000, 100] },
            { type: "SaveImage", pos: [1300, 100] }
        ];
        
        const nodes = [];
        
        // Create nodes
        for (const nodeInfo of workflow) {
            const node = LiteGraph.createNode(nodeInfo.type);
            if (node) {
                node.pos = nodeInfo.pos;
                app.graph.add(node);
                nodes.push(node);
                
                // Set node properties based on parsed data
                this.configureNode(node, data);
            }
        }
        
        // Connect nodes
        if (nodes.length >= 7) {
            // CheckpointLoader to CLIP encoders and KSampler
            nodes[0].connect(1, nodes[1], 0); // CLIP to positive encoder
            nodes[0].connect(1, nodes[2], 0); // CLIP to negative encoder
            nodes[0].connect(0, nodes[4], 0); // Model to KSampler
            nodes[0].connect(2, nodes[5], 1); // VAE to VAEDecode
            
            // CLIP encoders to KSampler
            nodes[1].connect(0, nodes[4], 1); // Positive conditioning
            nodes[2].connect(0, nodes[4], 2); // Negative conditioning
            
            // Empty latent to KSampler
            nodes[3].connect(0, nodes[4], 3); // Latent image
            
            // KSampler to VAEDecode
            nodes[4].connect(0, nodes[5], 0); // Latent
            
            // VAEDecode to SaveImage
            nodes[5].connect(0, nodes[6], 0); // Images
        }
        
        app.graph.setDirtyCanvas(true, true);
    },

    configureNode(node, data) {
        if (!node.widgets || !data) return;
        
        // Configure based on node type
        switch (node.type) {
            case "CLIPTextEncode":
                const textWidget = node.widgets.find(w => w.name === "text");
                if (textWidget) {
                    // Determine if this is positive or negative based on position or existing connections
                    if (node.pos[1] < 150) { // Assume positive if higher position
                        textWidget.value = data.positive_prompt || "";
                    } else {
                        textWidget.value = data.negative_prompt || "";
                    }
                }
                break;
                
            case "EmptyLatentImage":
                if (data.size) {
                    const [width, height] = data.size.split('x').map(Number);
                    const widthWidget = node.widgets.find(w => w.name === "width");
                    const heightWidget = node.widgets.find(w => w.name === "height");
                    if (widthWidget) widthWidget.value = width || 512;
                    if (heightWidget) heightWidget.value = height || 512;
                }
                break;
                
            case "KSampler":
                const seedWidget = node.widgets.find(w => w.name === "seed");
                const stepsWidget = node.widgets.find(w => w.name === "steps");
                const cfgWidget = node.widgets.find(w => w.name === "cfg");
                const samplerWidget = node.widgets.find(w => w.name === "sampler_name");
                const schedulerWidget = node.widgets.find(w => w.name === "scheduler");
                
                if (seedWidget && data.seed !== undefined) seedWidget.value = data.seed;
                if (stepsWidget && data.steps !== undefined) stepsWidget.value = data.steps;
                if (cfgWidget && data.cfg_scale !== undefined) cfgWidget.value = data.cfg_scale;
                if (samplerWidget && data.sampler) {
                    // Map sampler name
                    const samplerMap = {
                        "Euler a": "euler_ancestral",
                        "Euler": "euler",
                        "DPM++ 2M": "dpmpp_2m",
                        "DPM++ 2M SDE": "dpmpp_2m_sde"
                    };
                    samplerWidget.value = samplerMap[data.sampler] || "euler_ancestral";
                }
                if (schedulerWidget && data.scheduler) {
                    schedulerWidget.value = data.scheduler === "karras" ? "karras" : "normal";
                }
                break;
        }
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