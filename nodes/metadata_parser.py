import re
import json
from typing import Dict, Any, Tuple, Optional, List


class MetadataParserNode:
    """
    ComfyUI node for parsing Civitai image metadata from clipboard or text input
    """
    
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "metadata_text": ("STRING", {
                    "multiline": True,
                    "default": "",
                    "placeholder": "Paste Civitai metadata here..."
                }),
            },
            "optional": {
                "auto_parse": ("BOOLEAN", {"default": True}),
            }
        }
    
    RETURN_TYPES = ("STRING", "STRING", "INT", "FLOAT", "STRING", "STRING", "INT", "STRING", "DICT", "LIST")
    RETURN_NAMES = ("positive_prompt", "negative_prompt", "steps", "cfg_scale", "sampler", "scheduler", "seed", "size", "parsed_data", "loras")
    
    FUNCTION = "parse_metadata"
    CATEGORY = "Metadata2Workflow"
    
    def parse_metadata(self, metadata_text: str, auto_parse: bool = True) -> Tuple:
        """
        Parse Civitai metadata from text input
        """
        if not metadata_text.strip():
            return self._empty_result()
        
        try:
            parsed_data = self._parse_civitai_metadata(metadata_text)
            
            return (
                parsed_data.get("positive_prompt", ""),
                parsed_data.get("negative_prompt", ""),
                parsed_data.get("steps", 20),
                parsed_data.get("cfg_scale", 7.0),
                parsed_data.get("sampler", "Euler a"),
                parsed_data.get("scheduler", "normal"),
                parsed_data.get("seed", -1),
                parsed_data.get("size", "512x512"),
                parsed_data,
                parsed_data.get("loras", [])
            )
            
        except Exception as e:
            print(f"Error parsing metadata: {str(e)}")
            return self._empty_result()
    
    def _parse_civitai_metadata(self, text: str) -> Dict[str, Any]:
        """
        Parse Civitai metadata from various formats
        """
        parsed_data = {}
        
        # Clean up the text
        text = text.strip()
        
        # Try to extract positive prompt (everything before "Negative prompt:")
        positive_match = re.search(r'^(.*?)(?=Negative prompt:|Steps:|$)', text, re.DOTALL | re.IGNORECASE)
        if positive_match:
            positive_prompt = positive_match.group(1).strip()
            # Remove common prefixes
            positive_prompt = re.sub(r'^(prompt:|positive prompt:)', '', positive_prompt, flags=re.IGNORECASE).strip()
            
            # Extract LoRA information from positive prompt
            loras, clean_prompt = self._extract_loras_from_prompt(positive_prompt)
            parsed_data["positive_prompt"] = clean_prompt
            parsed_data["loras"] = loras
        
        # Extract negative prompt
        negative_match = re.search(r'Negative prompt:\s*(.*?)(?=Steps:|$)', text, re.DOTALL | re.IGNORECASE)
        if negative_match:
            parsed_data["negative_prompt"] = negative_match.group(1).strip()
        
        # Extract parameters using regex patterns
        parameter_patterns = {
            "steps": r'Steps:\s*(\d+)',
            "cfg_scale": r'CFG scale:\s*([\d.]+)',
            "sampler": r'Sampler:\s*([^,\n]+)',
            "scheduler": r'Schedule type:\s*([^,\n]+)',
            "seed": r'Seed:\s*(\d+)',
            "size": r'Size:\s*(\d+x\d+)',
            "model": r'Model:\s*([^,\n]+)',
            "vae": r'VAE:\s*([^,\n]+)',
            "clip_skip": r'Clip skip:\s*(\d+)',
            "eta": r'Eta:\s*([\d.]+)',
            "denoising_strength": r'Denoising strength:\s*([\d.]+)',
        }
        
        for param, pattern in parameter_patterns.items():
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                value = match.group(1).strip()
                # Convert to appropriate type
                if param in ["steps", "seed", "clip_skip"]:
                    try:
                        parsed_data[param] = int(value)
                    except ValueError:
                        parsed_data[param] = value
                elif param in ["cfg_scale", "eta", "denoising_strength"]:
                    try:
                        parsed_data[param] = float(value)
                    except ValueError:
                        parsed_data[param] = value
                else:
                    parsed_data[param] = value
        
        # Set defaults for missing values
        defaults = {
            "steps": 20,
            "cfg_scale": 7.0,
            "sampler": "Euler a",
            "scheduler": "normal",
            "seed": -1,
            "size": "512x512",
            "negative_prompt": "",
            "positive_prompt": "",
            "loras": []
        }
        
        for key, default_value in defaults.items():
            if key not in parsed_data:
                parsed_data[key] = default_value
        
        return parsed_data
    
    def _extract_loras_from_prompt(self, prompt: str) -> Tuple[List[Dict[str, Any]], str]:
        """
        Extract LoRA information from prompt text
        
        Args:
            prompt: The prompt text containing LoRA tags
            
        Returns:
            Tuple of (loras_list, clean_prompt)
        """
        loras = []
        clean_prompt = prompt
        
        # Pattern to match LoRA tags: <lora:name:weight> or <lora:name>
        lora_pattern = r'<lora:([^:>]+):?([0-9]*\.?[0-9]*)>'
        
        matches = re.finditer(lora_pattern, prompt, re.IGNORECASE)
        
        for match in matches:
            lora_name = match.group(1).strip()
            lora_weight = match.group(2).strip()
            
            # Default weight is 1.0 if not specified
            if not lora_weight:
                lora_weight = 1.0
            else:
                try:
                    lora_weight = float(lora_weight)
                except ValueError:
                    lora_weight = 1.0
            
            loras.append({
                "name": lora_name,
                "strength": lora_weight,
                "full_tag": match.group(0)
            })
            
            # Remove LoRA tag from clean prompt
            clean_prompt = clean_prompt.replace(match.group(0), "").strip()
        
        # Clean up multiple spaces and commas
        clean_prompt = re.sub(r'\s*,\s*,\s*', ', ', clean_prompt)
        clean_prompt = re.sub(r'\s+', ' ', clean_prompt)
        clean_prompt = clean_prompt.strip(', ')
        
        return loras, clean_prompt
    
    def _extract_additional_lora_info(self, text: str) -> Dict[str, Any]:
        """
        Extract additional LoRA-related parameters from metadata text
        """
        lora_info = {}
        
        # Look for LoRA-related parameters in the metadata
        lora_patterns = {
            "lora_hashes": r'Lora hashes:\s*"([^"]*)"',
            "hashes": r'Hashes:\s*\{([^}]*)\}',
            "version": r'Version:\s*([^,\n]+)',
            "ti_hashes": r'TI hashes:\s*"([^"]*)"'
        }
        
        for param, pattern in lora_patterns.items():
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                lora_info[param] = match.group(1).strip()
        
        return lora_info
    
    def _empty_result(self) -> Tuple:
        """
        Return empty/default values
        """
        empty_dict = {
            "positive_prompt": "",
            "negative_prompt": "",
            "steps": 20,
            "cfg_scale": 7.0,
            "sampler": "Euler a",
            "scheduler": "normal",
            "seed": -1,
            "size": "512x512",
            "loras": []
        }
        
        return ("", "", 20, 7.0, "Euler a", "normal", -1, "512x512", empty_dict, [])