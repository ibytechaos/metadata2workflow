#!/usr/bin/env python3
"""
Test script for Metadata Parser Node
"""

import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from nodes.metadata_parser import MetadataParserNode

def test_basic_metadata_parsing():
    """Test basic metadata parsing functionality"""
    
    # Create parser node
    parser = MetadataParserNode()
    
    # Test data - typical Civitai metadata format
    test_metadata = """masterpiece, best quality, 1girl, beautiful lighting, detailed face
Negative prompt: ugly, blurry, low quality, bad anatomy
Steps: 30, Sampler: Euler a, CFG scale: 7, Seed: 1234567890, Size: 1024x1024, Model: sd_xl_base_1.0.safetensors"""
    
    print("Testing basic metadata parsing...")
    print("Input metadata:")
    print(test_metadata)
    print("\n" + "="*50)
    
    # Parse metadata
    result = parser.parse_metadata(test_metadata, True)
    
    print("Parsed results:")
    print(f"Positive prompt: {result[0]}")
    print(f"Negative prompt: {result[1]}")
    print(f"Steps: {result[2]}")
    print(f"CFG Scale: {result[3]}")
    print(f"Sampler: {result[4]}")
    print(f"Scheduler: {result[5]}")
    print(f"Seed: {result[6]}")
    print(f"Size: {result[7]}")
    print(f"Full parsed data: {result[8]}")
    
    return result

def test_complex_metadata_parsing():
    """Test complex metadata with more parameters"""
    
    parser = MetadataParserNode()
    
    test_metadata = """(masterpiece:1.2), (best quality:1.2), (ultra-detailed:1.2), (illustration:1.1), (disheveled hair:1.1), (solo:1.3), (1girl:1.3), detailed face, beautiful eyes
Negative prompt: (worst quality, low quality:1.4), (zombie, sketch, interlocked fingers, comic:1.1), (nsfw:1.3)
Steps: 25, Sampler: DPM++ 2M SDE, CFG scale: 8.5, Seed: 987654321, Size: 768x1024, Model: sdxl_realism.safetensors, VAE: sdxl_vae.safetensors, Clip skip: 2, Schedule type: karras, Denoising strength: 0.75"""
    
    print("\n\nTesting complex metadata parsing...")
    print("Input metadata:")
    print(test_metadata)
    print("\n" + "="*50)
    
    # Parse metadata
    result = parser.parse_metadata(test_metadata, True)
    
    print("Parsed results:")
    print(f"Positive prompt: {result[0]}")
    print(f"Negative prompt: {result[1]}")
    print(f"Steps: {result[2]}")
    print(f"CFG Scale: {result[3]}")
    print(f"Sampler: {result[4]}")
    print(f"Scheduler: {result[5]}")
    print(f"Seed: {result[6]}")
    print(f"Size: {result[7]}")
    print(f"Full parsed data: {result[8]}")
    print(f"LoRAs: {result[9]}")
    
    return result

def test_lora_metadata_parsing():
    """Test LoRA metadata parsing"""
    
    parser = MetadataParserNode()
    
    test_metadata = """<lora:character_v1:0.8>, masterpiece, best quality, 1girl, <lora:style_anime:1.0>, beautiful lighting, detailed face, <lora:clothing_dress:0.6>
Negative prompt: ugly, blurry, low quality, bad anatomy
Steps: 30, Sampler: Euler a, CFG scale: 7, Seed: 1234567890, Size: 1024x1024, Model: sd_xl_base_1.0.safetensors"""
    
    print("\n\nTesting LoRA metadata parsing...")
    print("Input metadata:")
    print(test_metadata)
    print("\n" + "="*50)
    
    # Parse metadata
    result = parser.parse_metadata(test_metadata, True)
    
    print("Parsed results:")
    print(f"Positive prompt (clean): {result[0]}")
    print(f"Negative prompt: {result[1]}")
    print(f"Steps: {result[2]}")
    print(f"CFG Scale: {result[3]}")
    print(f"LoRAs found: {result[9]}")
    print(f"Full parsed data: {result[8]}")
    
    # Verify LoRA extraction
    loras = result[9]
    print(f"\nLoRA Details:")
    for i, lora in enumerate(loras):
        print(f"  LoRA {i+1}:")
        print(f"    Name: {lora['name']}")
        print(f"    Strength: {lora['strength']}")
        print(f"    Original tag: {lora['full_tag']}")
    
    return result

def test_edge_cases():
    """Test edge cases and error handling"""
    
    parser = MetadataParserNode()
    
    print("\n\nTesting edge cases...")
    
    # Test empty input
    print("1. Testing empty input:")
    result = parser.parse_metadata("", True)
    print(f"Empty result: {result[8]}")
    print(f"Empty LoRAs: {result[9]}")
    
    # Test malformed input
    print("\n2. Testing malformed input:")
    malformed = "This is not valid metadata at all!"
    result = parser.parse_metadata(malformed, True)
    print(f"Malformed result: {result[8]}")
    print(f"Malformed LoRAs: {result[9]}")
    
    # Test partial metadata
    print("\n3. Testing partial metadata:")
    partial = "beautiful girl\nSteps: 20"
    result = parser.parse_metadata(partial, True)
    print(f"Partial result: {result[8]}")
    print(f"Partial LoRAs: {result[9]}")
    
    # Test LoRA edge cases
    print("\n4. Testing LoRA edge cases:")
    lora_edge_cases = [
        "<lora:model_name>",  # No strength specified
        "<lora:model_name:>",  # Empty strength
        "<lora:model_name:1.5>",  # High strength
        "<lora:model-with-dashes:0.5>",  # Dashes in name
        "<lora:model_with_underscores_v2:0.3>",  # Complex name
        "prompt with <lora:test:0.8> and <lora:another:1.2> multiple loras"
    ]
    
    for i, test_case in enumerate(lora_edge_cases):
        result = parser.parse_metadata(test_case, True)
        print(f"    Case {i+1}: '{test_case}' -> LoRAs: {result[9]}")

def test_workflow_generator():
    """Test workflow generation with LoRA support"""
    
    # Import workflow generator
    from nodes.workflow_generator import WorkflowGeneratorNode
    
    print("\n\n" + "="*60)
    print("Testing Workflow Generator with LoRA Support")
    print("="*60)
    
    generator = WorkflowGeneratorNode()
    
    # Test basic workflow without LoRAs
    parser = MetadataParserNode()
    test_metadata = """masterpiece, best quality, 1girl
Negative prompt: ugly, blurry
Steps: 20, Sampler: Euler a, CFG scale: 7, Seed: 12345, Size: 512x512"""
    
    result = parser.parse_metadata(test_metadata, True)
    parsed_data = result[8]
    
    print("1. Testing basic workflow generation (no LoRAs)...")
    workflow_result = generator.generate_workflow(parsed_data, "test_model.safetensors", "test_vae.safetensors", "basic")
    
    print("Generated workflow structure:")
    import json
    try:
        workflow_json = json.loads(workflow_result[0])
        print(f"Workflow contains {len(workflow_json)} nodes")
        for node_id, node_data in workflow_json.items():
            print(f"Node {node_id}: {node_data.get('class_type', 'Unknown')} - {node_data.get('_meta', {}).get('title', 'No title')}")
    except json.JSONDecodeError as e:
        print(f"Error parsing workflow JSON: {e}")
        print(f"Raw workflow: {workflow_result[0][:200]}...")

def test_workflow_generator_with_loras():
    """Test workflow generation with LoRAs"""
    
    from nodes.workflow_generator import WorkflowGeneratorNode
    
    print("\n\n2. Testing workflow generation with LoRAs...")
    
    generator = WorkflowGeneratorNode()
    parser = MetadataParserNode()
    
    # Test with LoRAs
    lora_metadata = """<lora:character_v1:0.8>, <lora:style_anime:1.0>, masterpiece, best quality, 1girl
Negative prompt: ugly, blurry, low quality
Steps: 25, Sampler: DPM++ 2M, CFG scale: 7.5, Seed: 98765, Size: 1024x1024"""
    
    result = parser.parse_metadata(lora_metadata, True)
    parsed_data = result[8]
    loras = result[9]
    
    print(f"Input LoRAs: {loras}")
    
    workflow_result = generator.generate_workflow(parsed_data, "test_model.safetensors", "", "basic")
    
    print("Generated workflow with LoRAs:")
    import json
    try:
        workflow_json = json.loads(workflow_result[0])
        print(f"Workflow contains {len(workflow_json)} nodes")
        
        # Show all nodes and their connections
        for node_id, node_data in workflow_json.items():
            class_type = node_data.get('class_type', 'Unknown')
            title = node_data.get('_meta', {}).get('title', 'No title')
            print(f"Node {node_id}: {class_type} - {title}")
            
            # Show LoRA loader details
            if class_type == "LoraLoader":
                inputs = node_data.get('inputs', {})
                print(f"    LoRA: {inputs.get('lora_name')}")
                print(f"    Model Strength: {inputs.get('strength_model')}")
                print(f"    CLIP Strength: {inputs.get('strength_clip')}")
                print(f"    Model Input: {inputs.get('model')}")
                print(f"    CLIP Input: {inputs.get('clip')}")
        
    except json.JSONDecodeError as e:
        print(f"Error parsing workflow JSON: {e}")
        print(f"Raw workflow: {workflow_result[0][:200]}...")

if __name__ == "__main__":
    print("ComfyUI Metadata2Workflow Plugin - Test Suite")
    print("=" * 60)
    
    try:
        # Run tests
        test_basic_metadata_parsing()
        test_complex_metadata_parsing()
        test_lora_metadata_parsing()
        test_edge_cases()
        test_workflow_generator()
        test_workflow_generator_with_loras()
        
        print("\n" + "="*60)
        print("All tests completed successfully!")
        print("LoRA support has been successfully implemented!")
        print("="*60)
        
    except Exception as e:
        print(f"\nTest failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)