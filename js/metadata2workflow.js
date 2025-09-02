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
            
            options.push({
                content: "🖼️ Upload Civitai Image",
                callback: async () => {
                    console.log('Image upload clicked');
                    try {
                        await self.uploadCivitaiImage();
                    } catch (error) {
                        console.error('Error in image upload callback:', error);
                    }
                }
            });
            
            options.push({
                content: "🔍 Debug Image Upload",
                callback: async () => {
                    console.log('Debug image upload clicked');
                    try {
                        await self.debugUploadCivitaiImage();
                    } catch (error) {
                        console.error('Error in debug upload callback:', error);
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

    async uploadCivitaiImage() {
        let input = null;
        try {
            console.log('Starting image upload process...');
            
            // Show loading notification
            this.showNotification('Preparing file upload...', 'info');
            
            // Create file input element
            input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/png,image/jpeg,image/jpg,image/webp';
            input.style.display = 'none';
            document.body.appendChild(input);
            
            // Wait for file selection
            const file = await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('File selection timeout'));
                }, 30000); // 30 second timeout
                
                input.onchange = (e) => {
                    clearTimeout(timeout);
                    const file = e.target.files[0];
                    if (file) {
                        resolve(file);
                    } else {
                        reject(new Error('No file selected'));
                    }
                };
                input.onerror = () => {
                    clearTimeout(timeout);
                    reject(new Error('File input error'));
                };
                input.click();
            });
            
            console.log('File selected:', file.name, file.type, file.size);
            
            // Validate file size (max 50MB)
            const maxSize = 50 * 1024 * 1024;
            if (file.size > maxSize) {
                throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum allowed: 50MB`);
            }
            
            // Validate file type
            const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                throw new Error(`Unsupported file type: ${file.type}. Supported: PNG, JPEG, WebP`);
            }
            
            // Show processing notification
            const progressNotification = this.showProgressNotification(`Processing ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)...`);
            
            // Extract metadata from image (with timeout)
            const metadata = await Promise.race([
                this.extractImageMetadata(file),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Metadata extraction timeout after 30 seconds')), 30000)
                )
            ]);
            
            // Update progress
            if (progressNotification) {
                progressNotification.updateMessage('Metadata extracted, generating workflow...');
            }
            
            if (metadata) {
                console.log('Extracted metadata:', metadata);
                
                // Generate workflow from extracted metadata (with timeout)
                await Promise.race([
                    this.parseAndGenerateWorkflow(metadata),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Workflow generation timeout after 15 seconds')), 15000)
                    )
                ]);
                
                // Close progress notification and show success
                if (progressNotification) {
                    progressNotification.close();
                }
            } else {
                if (progressNotification) {
                    progressNotification.close();
                }
                throw new Error('No metadata found in the image. Make sure this is a Civitai generated image with embedded metadata.');
            }
            
        } catch (error) {
            console.error('Error uploading image:', error);
            
            // Close progress notification if it exists
            if (typeof progressNotification !== 'undefined' && progressNotification) {
                progressNotification.close();
            }
            
            this.showNotification('Error processing image: ' + error.message, 'error');
        } finally {
            // Clean up
            if (input && input.parentNode) {
                try {
                    document.body.removeChild(input);
                } catch (e) {
                    console.warn('Error removing input element:', e);
                }
            }
        }
    },

    async debugUploadCivitaiImage() {
        let input = null;
        try {
            console.log('🔍 Starting DEBUG image upload process...');
            
            // Show debug notification
            this.showNotification('Debug mode: Will show ALL found text', 'warning');
            
            // Create file input element
            input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.style.display = 'none';
            document.body.appendChild(input);
            
            // Wait for file selection
            const file = await new Promise((resolve, reject) => {
                input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) resolve(file);
                    else reject(new Error('No file selected'));
                };
                input.click();
            });
            
            console.log('🔍 DEBUG - File selected:', file.name, file.type, file.size);
            
            // Extract ALL possible text content
            const allContent = await this.debugExtractAllContent(file);
            
            if (allContent && allContent.length > 0) {
                console.log('🔍 DEBUG - Found content blocks:', allContent.length);
                
                // Display all found content in notifications
                for (let i = 0; i < allContent.length && i < 5; i++) {
                    const content = allContent[i];
                    this.showNotification(
                        `Text Block ${i+1} (${content.source}): "${content.text.substring(0, 100)}..."`,
                        'info'
                    );
                }
                
                // Try to use the first/longest text block
                const bestContent = allContent[0];
                console.log('🔍 DEBUG - Using content from:', bestContent.source);
                console.log('🔍 DEBUG - Full content:', bestContent.text);
                
                // Show content in alert for easy copying
                const userChoice = confirm(
                    `Found text in ${bestContent.source}:\n\n${bestContent.text.substring(0, 500)}...\n\nDo you want to try generating a workflow with this text?`
                );
                
                if (userChoice) {
                    await this.parseAndGenerateWorkflow(bestContent.text);
                }
            } else {
                this.showNotification('DEBUG: No text content found in image at all', 'error');
                console.log('🔍 DEBUG - Absolutely no text content found');
                
                // Offer manual input as fallback
                const manualInput = confirm(
                    'No metadata found in the image.\n\nWould you like to manually input the metadata text instead?\n(You can copy it from an EXIF viewer or from Civitai)'
                );
                
                if (manualInput) {
                    const metadata = prompt(
                        'Please paste the Civitai metadata here:\n(Steps, Sampler, Prompt, etc.)',
                        ''
                    );
                    
                    if (metadata && metadata.trim()) {
                        await this.parseAndGenerateWorkflow(metadata.trim());
                    }
                }
            }
            
        } catch (error) {
            console.error('🔍 DEBUG - Error:', error);
            this.showNotification('Debug upload error: ' + error.message, 'error');
        } finally {
            if (input && input.parentNode) {
                document.body.removeChild(input);
            }
        }
    },

    async debugExtractAllContent(file) {
        const allContent = [];
        
        try {
            if (file.type === 'image/png') {
                console.log('🔍 DEBUG - Extracting all PNG text blocks...');
                const pngContent = await this.debugExtractAllPngText(file);
                if (pngContent) allContent.push(...pngContent);
            }
            
            if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
                console.log('🔍 DEBUG - Extracting all JPEG text...');
                const jpegContent = await this.debugExtractAllJpegText(file);
                if (jpegContent) allContent.push(...jpegContent);
            }
            
            // Sort by text length (longest first)
            allContent.sort((a, b) => b.text.length - a.text.length);
            
            console.log('🔍 DEBUG - Total content blocks found:', allContent.length);
            allContent.forEach((content, i) => {
                console.log(`🔍 DEBUG - Block ${i+1}: ${content.source} (${content.text.length} chars)`);
            });
            
        } catch (error) {
            console.error('🔍 DEBUG - Error in content extraction:', error);
        }
        
        return allContent;
    },

    async debugExtractAllPngText(file) {
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const allContent = [];
        
        // Check PNG signature
        if (uint8Array.length < 8 || uint8Array[0] !== 0x89 || uint8Array[1] !== 0x50) {
            console.log('🔍 DEBUG - Not a valid PNG file');
            return allContent;
        }
        
        let offset = 8;
        let chunkCount = 0;
        
        while (offset < uint8Array.length && chunkCount < 100) {
            if (offset + 12 > uint8Array.length) break;
            
            const chunkLength = (uint8Array[offset] << 24) | 
                              (uint8Array[offset + 1] << 16) | 
                              (uint8Array[offset + 2] << 8) | 
                              uint8Array[offset + 3];
                              
            const chunkType = String.fromCharCode(
                uint8Array[offset + 4], uint8Array[offset + 5], 
                uint8Array[offset + 6], uint8Array[offset + 7]
            );
            
            console.log(`🔍 DEBUG - PNG chunk: ${chunkType}, length: ${chunkLength}`);
            chunkCount++;
            
            if ((chunkType === 'tEXt' || chunkType === 'iTXt' || chunkType === 'zTXt') && 
                chunkLength > 0 && offset + 8 + chunkLength <= uint8Array.length) {
                
                const chunkData = uint8Array.slice(offset + 8, offset + 8 + chunkLength);
                
                try {
                    if (chunkType === 'tEXt') {
                        const nullIndex = chunkData.indexOf(0);
                        if (nullIndex > 0) {
                            const keyword = new TextDecoder('utf-8', {fatal: false}).decode(chunkData.slice(0, nullIndex));
                            const text = new TextDecoder('utf-8', {fatal: false}).decode(chunkData.slice(nullIndex + 1));
                            
                            console.log(`🔍 DEBUG - Found tEXt: "${keyword}" (${text.length} chars)`);
                            
                            allContent.push({
                                source: `PNG tEXt "${keyword}"`,
                                text: text,
                                type: 'png-text'
                            });
                        }
                    }
                    // Add other chunk types if needed
                    
                } catch (error) {
                    console.warn(`🔍 DEBUG - Error parsing ${chunkType}:`, error);
                }
            }
            
            if (chunkType === 'IEND') break;
            
            const nextOffset = offset + 4 + 4 + chunkLength + 4;
            if (nextOffset <= offset) break;
            offset = nextOffset;
        }
        
        console.log(`🔍 DEBUG - PNG: Found ${allContent.length} text blocks`);
        return allContent;
    },

    async debugExtractAllJpegText(file) {
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const allContent = [];
        
        // Convert to string for pattern searching
        const maxSize = Math.min(uint8Array.length, 5 * 1024 * 1024); // Limit to 5MB
        const text = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array.slice(0, maxSize));
        
        console.log(`🔍 DEBUG - JPEG: Searching ${text.length} characters...`);
        
        // Look for any text patterns that might be metadata
        const patterns = [
            { name: 'Steps pattern', regex: /(Steps:\s*\d+[^]*?)(?=\n\n|\n[A-Z]|$)/gi },
            { name: 'JSON pattern', regex: /\{[^{}]*"(?:prompt|steps|sampler|model)"[^{}]*\}/gi },
            { name: 'Parameter block', regex: /((?:Negative prompt:|Steps:|Sampler:|CFG scale:|Seed:|Model:)[^]*?)(?=\n\n|\n[A-Z]|$)/gi },
            { name: 'Long text block', regex: /([^\x00-\x1f]{100,})/g }
        ];
        
        patterns.forEach(pattern => {
            let match;
            let matchCount = 0;
            while ((match = pattern.regex.exec(text)) !== null && matchCount < 10) {
                const foundText = match[1] || match[0];
                if (foundText && foundText.length > 50) {
                    console.log(`🔍 DEBUG - Found ${pattern.name}: ${foundText.length} chars`);
                    
                    allContent.push({
                        source: `JPEG ${pattern.name}`,
                        text: foundText.trim(),
                        type: 'jpeg-text'
                    });
                }
                matchCount++;
            }
        });
        
        console.log(`🔍 DEBUG - JPEG: Found ${allContent.length} text blocks`);
        return allContent;
    },

    async extractImageMetadata(file) {
        console.log('Extracting metadata from image...');
        
        try {
            // Check if it's a PNG file (most common for AI images)
            if (file.type === 'image/png') {
                return await this.extractPngMetadata(file);
            }
            
            // Try EXIF for JPEG files
            if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
                return await this.extractExifMetadata(file);
            }
            
            // Try WebP metadata
            if (file.type === 'image/webp') {
                return await this.extractWebpMetadata(file);
            }
            
            throw new Error(`Unsupported image format: ${file.type}. Supported formats: PNG, JPEG, WebP`);
            
        } catch (error) {
            console.error('Error extracting metadata:', error);
            throw error;
        }
    },

    async extractPngMetadata(file) {
        console.log('Extracting PNG metadata...');
        
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // PNG file signature check
        if (uint8Array.length < 8 || 
            uint8Array[0] !== 0x89 || uint8Array[1] !== 0x50 || 
            uint8Array[2] !== 0x4E || uint8Array[3] !== 0x47 ||
            uint8Array[4] !== 0x0D || uint8Array[5] !== 0x0A ||
            uint8Array[6] !== 0x1A || uint8Array[7] !== 0x0A) {
            throw new Error('Invalid PNG file signature');
        }
        
        let offset = 8; // Skip PNG signature
        let chunksProcessed = 0;
        const maxChunks = 100; // Prevent infinite loops
        
        while (offset < uint8Array.length && chunksProcessed < maxChunks) {
            // Safety check - ensure we have enough bytes for chunk header
            if (offset + 12 > uint8Array.length) {
                console.log('Reached end of PNG data');
                break;
            }
            
            // Read chunk length (4 bytes, big-endian)
            const chunkLength = (uint8Array[offset] << 24) | 
                              (uint8Array[offset + 1] << 16) | 
                              (uint8Array[offset + 2] << 8) | 
                              uint8Array[offset + 3];
            
            // Validate chunk length
            if (chunkLength < 0 || chunkLength > uint8Array.length || 
                offset + 8 + chunkLength + 4 > uint8Array.length) {
                console.warn(`Invalid chunk length ${chunkLength} at offset ${offset}, stopping`);
                break;
            }
            
            // Read chunk type (4 bytes)
            const chunkType = String.fromCharCode(
                uint8Array[offset + 4],
                uint8Array[offset + 5], 
                uint8Array[offset + 6],
                uint8Array[offset + 7]
            );
            
            console.log(`Found PNG chunk: ${chunkType}, length: ${chunkLength}`);
            chunksProcessed++;
            
            // Look for text chunks that might contain metadata
            if (chunkType === 'tEXt' || chunkType === 'iTXt' || chunkType === 'zTXt') {
                try {
                    const chunkData = uint8Array.slice(offset + 8, offset + 8 + chunkLength);
                    const result = await this.parsePngTextChunk(chunkData, chunkType);
                    
                    if (result && result.text) {
                        console.log(`Found PNG text chunk - keyword: ${result.keyword}, text length: ${result.text.length}`);
                        console.log('Text preview:', result.text.substring(0, 200) + '...');
                        
                        if (this.isValidMetadata(result.text)) {
                            console.log('✅ Valid metadata found in PNG chunk');
                            return result.text;
                        } else {
                            console.log('❌ Text chunk not recognized as valid metadata');
                        }
                    }
                } catch (error) {
                    console.warn(`Error processing ${chunkType} chunk:`, error);
                }
            }
            
            // Check for IEND chunk (end of file)
            if (chunkType === 'IEND') {
                console.log('Reached IEND chunk, stopping');
                break;
            }
            
            // Move to next chunk (length + type + data + CRC)
            const nextOffset = offset + 4 + 4 + chunkLength + 4;
            
            // Prevent infinite loop
            if (nextOffset <= offset) {
                console.warn('Invalid chunk offset calculation, stopping');
                break;
            }
            
            offset = nextOffset;
        }
        
        console.log(`Processed ${chunksProcessed} PNG chunks, no valid metadata found`);
        
        // As a fallback, let's try to collect ALL text chunks for debugging
        console.log('🔍 Collecting all text chunks for debugging...');
        return await this.extractAllPngText(uint8Array);
    },

    async extractAllPngText(uint8Array) {
        // Collect all text chunks for debugging purposes
        let offset = 8; // Skip PNG signature
        let chunksProcessed = 0;
        const maxChunks = 100;
        const allTexts = [];
        
        while (offset < uint8Array.length && chunksProcessed < maxChunks) {
            if (offset + 12 > uint8Array.length) break;
            
            const chunkLength = (uint8Array[offset] << 24) | 
                              (uint8Array[offset + 1] << 16) | 
                              (uint8Array[offset + 2] << 8) | 
                              uint8Array[offset + 3];
            
            if (chunkLength < 0 || offset + 8 + chunkLength + 4 > uint8Array.length) break;
            
            const chunkType = String.fromCharCode(
                uint8Array[offset + 4], uint8Array[offset + 5], 
                uint8Array[offset + 6], uint8Array[offset + 7]
            );
            
            chunksProcessed++;
            
            if (chunkType === 'tEXt' || chunkType === 'iTXt' || chunkType === 'zTXt') {
                try {
                    const chunkData = uint8Array.slice(offset + 8, offset + 8 + chunkLength);
                    const result = await this.parsePngTextChunk(chunkData, chunkType);
                    
                    if (result && result.text) {
                        allTexts.push({
                            keyword: result.keyword,
                            text: result.text,
                            type: chunkType,
                            length: result.text.length
                        });
                        
                        console.log(`📝 Text chunk found - ${chunkType} "${result.keyword}": ${result.text.length} chars`);
                        console.log(`Content preview: ${result.text.substring(0, 150)}...`);
                    }
                } catch (error) {
                    console.warn(`Error in fallback ${chunkType} parsing:`, error);
                }
            }
            
            if (chunkType === 'IEND') break;
            
            const nextOffset = offset + 4 + 4 + chunkLength + 4;
            if (nextOffset <= offset) break;
            offset = nextOffset;
        }
        
        console.log(`📊 Found ${allTexts.length} text chunks total`);
        
        if (allTexts.length === 0) {
            return null;
        }
        
        // Try to find the longest text chunk that might be metadata
        const candidateTexts = allTexts
            .filter(item => item.text.length > 50)
            .sort((a, b) => b.text.length - a.text.length);
        
        console.log('🎯 Candidate texts by length:', candidateTexts.map(t => `${t.keyword}(${t.length})`));
        
        // Try each candidate text with relaxed validation
        for (const candidate of candidateTexts) {
            console.log(`🔍 Trying candidate: "${candidate.keyword}" (${candidate.length} chars)`);
            
            // Very relaxed validation - just check for any parameter-like pattern
            if (this.isLikelyMetadata(candidate.text)) {
                console.log(`✅ Selected candidate: "${candidate.keyword}"`);
                return candidate.text;
            }
        }
        
        // If nothing passes validation, return the longest text anyway for debugging
        if (candidateTexts.length > 0) {
            const longest = candidateTexts[0];
            console.log(`🤷 No candidates passed validation, returning longest text: "${longest.keyword}"`);
            return longest.text;
        }
        
        return null;
    },

    isLikelyMetadata(text) {
        // Very relaxed check for any metadata-like content
        const lowerText = text.toLowerCase();
        
        // Look for any parameter patterns
        const patterns = [
            /\w+:\s*\w+/,  // key: value pattern
            /"[^"]*":\s*[^,}]+/,  // JSON-like patterns
            /steps|sampler|cfg|seed|model|prompt|lora/i,  // Common AI terms
            /\d+x\d+/,  // Resolution pattern
            /<[^>]+>/   // Tag patterns
        ];
        
        const hasPattern = patterns.some(pattern => pattern.test(text));
        const hasReasonableLength = text.length > 30 && text.length < 10000;
        
        console.log(`Metadata likelihood check: hasPattern=${hasPattern}, hasReasonableLength=${hasReasonableLength}`);
        
        return hasPattern && hasReasonableLength;
    },

    async parsePngTextChunk(data, chunkType) {
        try {
            if (chunkType === 'tEXt') {
                // Find null terminator separating keyword from text
                let nullIndex = -1;
                for (let i = 0; i < data.length; i++) {
                    if (data[i] === 0) {
                        nullIndex = i;
                        break;
                    }
                }
                
                if (nullIndex === -1) {
                    console.warn('No null terminator found in tEXt chunk');
                    return null;
                }
                
                const keyword = new TextDecoder('utf-8', {fatal: false}).decode(data.slice(0, nullIndex));
                const text = new TextDecoder('utf-8', {fatal: false}).decode(data.slice(nullIndex + 1));
                
                console.log(`PNG tEXt chunk - keyword: "${keyword}", text length: ${text.length}`);
                
                return { keyword, text };
            }
            
            if (chunkType === 'iTXt') {
                // iTXt format: keyword\0compression\0language\0translated_keyword\0text
                let offset = 0;
                const parts = [];
                let currentPart = [];
                
                for (let i = 0; i < data.length; i++) {
                    if (data[i] === 0) {
                        parts.push(new TextDecoder('utf-8', {fatal: false}).decode(new Uint8Array(currentPart)));
                        currentPart = [];
                        if (parts.length === 4) {
                            // Remaining data is the text
                            const text = new TextDecoder('utf-8', {fatal: false}).decode(data.slice(i + 1));
                            console.log(`PNG iTXt chunk - keyword: "${parts[0]}", text length: ${text.length}`);
                            return { keyword: parts[0], text };
                        }
                    } else {
                        currentPart.push(data[i]);
                    }
                }
            }
            
            if (chunkType === 'zTXt') {
                // zTXt format: keyword\0compression_method\compressed_text
                let nullIndex = -1;
                for (let i = 0; i < data.length; i++) {
                    if (data[i] === 0) {
                        nullIndex = i;
                        break;
                    }
                }
                
                if (nullIndex === -1 || nullIndex + 2 >= data.length) {
                    console.warn('Invalid zTXt chunk format');
                    return null;
                }
                
                const keyword = new TextDecoder('utf-8', {fatal: false}).decode(data.slice(0, nullIndex));
                const compressionMethod = data[nullIndex + 1];
                
                if (compressionMethod === 0) { // zlib compression
                    console.log(`PNG zTXt chunk - keyword: "${keyword}", attempting decompression...`);
                    // Note: Would need a zlib decompression library for full support
                    // For now, we'll try to extract what we can
                    const compressedData = data.slice(nullIndex + 2);
                    try {
                        // Try to find readable text patterns in compressed data
                        const text = new TextDecoder('utf-8', {fatal: false}).decode(compressedData);
                        if (text.length > 10) {
                            console.log(`Extracted text from zTXt (may be incomplete): ${text.length} chars`);
                            return { keyword, text };
                        }
                    } catch (e) {
                        console.warn('Could not decompress zTXt data');
                    }
                }
            }
            
        } catch (error) {
            console.error('Error parsing PNG text chunk:', error);
        }
        
        return null;
    },

    async extractExifMetadata(file) {
        console.log('Extracting EXIF metadata...');
        
        // Limit file size for string conversion (to prevent memory issues)
        const maxStringSize = 10 * 1024 * 1024; // 10MB limit for string conversion
        const arrayBuffer = await file.arrayBuffer();
        
        let uint8Array = new Uint8Array(arrayBuffer);
        if (uint8Array.length > maxStringSize) {
            console.log(`File too large for full text search (${uint8Array.length} bytes), using first ${maxStringSize} bytes`);
            uint8Array = uint8Array.slice(0, maxStringSize);
        }
        
        // Convert to string for pattern matching (with error handling)
        let text;
        try {
            text = new TextDecoder('utf-8', { ignoreBOM: true, fatal: false }).decode(uint8Array);
        } catch (error) {
            console.error('Failed to decode JPEG as UTF-8:', error);
            return null;
        }
        
        console.log(`Searching for metadata patterns in JPEG (${text.length} characters)...`);
        
        // Look for JSON patterns (limit matches to prevent performance issues)
        const jsonPatterns = [
            /\{[^}]{10,1000}"prompt"[^}]{10,1000}\}/g,
            /\{[^}]{10,1000}"positive_prompt"[^}]{10,1000}\}/g,
            /\{[^}]{10,1000}"steps"[^}]{10,1000}\}/g,
            /\{[^}]{10,1000}"sampler"[^}]{10,1000}\}/g
        ];
        
        for (const pattern of jsonPatterns) {
            let matchCount = 0;
            const matches = [];
            let match;
            
            // Limit number of matches to prevent performance issues
            while ((match = pattern.exec(text)) !== null && matchCount < 10) {
                matches.push(match[0]);
                matchCount++;
            }
            
            if (matches.length > 0) {
                console.log(`Found ${matches.length} potential JSON matches`);
                for (const matchText of matches) {
                    try {
                        const parsed = JSON.parse(matchText);
                        if (this.isValidMetadataObject(parsed)) {
                            console.log('Found valid JSON metadata in JPEG');
                            return JSON.stringify(parsed);
                        }
                    } catch (e) {
                        console.debug('JSON parse failed for match');
                    }
                }
            }
        }
        
        // Look for parameter string patterns (limited scope)
        const paramPatterns = [
            /(Steps: \d+[^]{0,500})/i,
            /(Negative prompt:[^]{0,1000}Steps: \d+[^]{0,500})/i,
            /(<lora:[^>]+>[^]{0,500}Steps: \d+[^]{0,200})/i,
            /(Sampler: [^,\n]{1,50}[^]{0,300}Steps: \d+[^]{0,200})/i
        ];
        
        for (const pattern of paramPatterns) {
            const match = text.match(pattern);
            if (match && match[1] && this.isValidMetadata(match[1])) {
                console.log('Found parameter string in JPEG');
                return match[1].trim();
            }
        }
        
        // Look for base64 encoded metadata (limited to reasonable sizes)
        const base64Pattern = /([A-Za-z0-9+/]{100,2000}={0,2})/g;
        let base64MatchCount = 0;
        let base64Match;
        
        while ((base64Match = base64Pattern.exec(text)) !== null && base64MatchCount < 5) {
            try {
                const decoded = atob(base64Match[1]);
                if (decoded.length > 50 && this.isValidMetadata(decoded)) {
                    console.log('Found base64 encoded metadata in JPEG');
                    return decoded;
                }
            } catch (e) {
                // Not valid base64, continue
            }
            base64MatchCount++;
        }
        
        console.log('No metadata found in JPEG');
        return null;
    },

    isValidMetadataObject(obj) {
        if (!obj || typeof obj !== 'object') return false;
        
        const requiredFields = ['prompt', 'positive_prompt', 'steps', 'sampler', 'model', 'baseModel'];
        return requiredFields.some(field => obj.hasOwnProperty(field));
    },

    async extractWebpMetadata(file) {
        console.log('WebP metadata extraction not yet implemented');
        // WebP metadata extraction would be implemented here
        return null;
    },

    isValidMetadata(text) {
        if (!text || typeof text !== 'string') return false;
        
        // Check for common AI generation indicators (more comprehensive)
        const indicators = [
            // Parameters
            'steps:', 'sampler:', 'cfg scale:', 'seed:', 'model:', 'basemodel:', 'base model:',
            'negative prompt:', 'lora:', 'scheduler:', 'clip skip:', 'denoising strength:',
            'hires upscaler:', 'hires steps:', 'hires upscale:',
            
            // JSON format
            '"prompt"', '"steps"', '"sampler"', '"cfgscale"', '"cfg_scale"',
            '"negativePrompt"', '"negative_prompt"', '"baseModel"', '"model"',
            
            // Software indicators
            'automatic1111', 'comfyui', 'stable diffusion', 'civitai', 'novelai',
            'dream', 'invoke', 'webui',
            
            // Common patterns
            'width:', 'height:', 'size:', 'resolution:',
            'upscaled by:', 'face restoration:', 'controlnet:'
        ];
        
        const lowerText = text.toLowerCase().trim();
        
        // Must be at least 20 characters and contain at least one indicator
        if (lowerText.length < 20) return false;
        
        const hasIndicator = indicators.some(indicator => lowerText.includes(indicator));
        
        // Additional check for parameter-like strings
        const hasParameterPattern = /\w+:\s*[^\s,]+/.test(text);
        
        // Check for JSON-like structure
        const hasJsonPattern = text.includes('"') && (text.includes('{') || text.includes(':'));
        
        console.log('Metadata validation:', {
            text: text.substring(0, 100) + '...',
            hasIndicator,
            hasParameterPattern,
            hasJsonPattern,
            result: hasIndicator || hasParameterPattern || hasJsonPattern
        });
        
        return hasIndicator || hasParameterPattern || hasJsonPattern;
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

    showProgressNotification(message) {
        // Create progress notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-weight: bold;
            z-index: 10001;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
            background-color: #2196F3;
            border-left: 4px solid #1976D2;
        `;
        
        // Add message and progress indicator
        notification.innerHTML = `
            <div style="display: flex; align-items: center;">
                <div style="margin-right: 10px;">⏳</div>
                <div class="message">${message}</div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        return {
            updateMessage: (newMessage) => {
                const messageEl = notification.querySelector('.message');
                if (messageEl) {
                    messageEl.textContent = newMessage;
                }
            },
            
            close: () => {
                if (notification.parentNode) {
                    notification.style.opacity = '0';
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.parentNode.removeChild(notification);
                        }
                    }, 300);
                }
            }
        };
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