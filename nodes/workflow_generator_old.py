import json
from typing import Dict, Any, Tuple, List


class WorkflowGeneratorNode:
    """
    ComfyUI node for generating workflow from parsed metadata
    """
    
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "parsed_data": ("DICT", {}),
            },
            "optional": {
                "model_name": ("STRING", {
                    "default": "sd_xl_base_1.0.safetensors",
                    "placeholder": "Model checkpoint name"
                }),
                "vae_name": ("STRING", {
                    "default": "sdxl_vae.safetensors",
                    "placeholder": "VAE name"
                }),
                "workflow_template": (["basic", "advanced", "img2img"], {"default": "basic"}),
            }
        }
    
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("workflow_json",)
    
    FUNCTION = "generate_workflow"
    CATEGORY = "Metadata2Workflow"
    
    def generate_workflow(self, parsed_data: Dict[str, Any], model_name: str = "", vae_name: str = "", workflow_template: str = "basic") -> Tuple[str]:
        """
        Generate ComfyUI workflow from parsed metadata
        """
        try:
            if workflow_template == "basic":
                workflow = self._generate_basic_workflow(parsed_data, model_name, vae_name)
            elif workflow_template == "advanced":
                workflow = self._generate_advanced_workflow(parsed_data, model_name, vae_name)
            elif workflow_template == "img2img":
                workflow = self._generate_img2img_workflow(parsed_data, model_name, vae_name)
            else:
                workflow = self._generate_basic_workflow(parsed_data, model_name, vae_name)
            
            return (json.dumps(workflow, indent=2),)
            
        except Exception as e:
            print(f"Error generating workflow: {str(e)}")
            return (json.dumps(self._get_empty_workflow(), indent=2),)
    
    def _generate_basic_workflow(self, data: Dict[str, Any], model_name: str, vae_name: str) -> Dict[str, Any]:
        """
        Generate basic txt2img workflow with LoRA support
        """
        # Extract dimensions
        size = data.get("size", "512x512")
        try:
            width, height = map(int, size.split("x"))
        except:
            width, height = 512, 512
        
        # Check if there are LoRAs to add
        loras = data.get("loras", [])
        has_loras = len(loras) > 0
        
        # Determine model and CLIP connections based on LoRA presence
        if has_loras:
            model_connection = [f"{100 + len(loras) - 1}", 0]  # Last LoRA loader output
            clip_connection = [f"{100 + len(loras) - 1}", 1]   # Last LoRA loader output
        else:
            model_connection = ["4", 0]  # Direct from checkpoint
            clip_connection = ["4", 1]   # Direct from checkpoint
        
        workflow = {
            "3": {
                "inputs": {
                    "seed": data.get("seed", -1),
                    "steps": data.get("steps", 20),
                    "cfg": data.get("cfg_scale", 7.0),
                    "sampler_name": self._map_sampler(data.get("sampler", "Euler a")),
                    "scheduler": self._map_scheduler(data.get("scheduler", "normal")),
                    "denoise": 1.0,
                    "model": model_connection,
                    "positive": ["6", 0],
                    "negative": ["7", 0],
                    "latent_image": ["5", 0]
                },
                "class_type": "KSampler",
                "_meta": {
                    "title": "KSampler"
                }
            },
            "4": {
                "inputs": {
                    "ckpt_name": model_name or data.get("model", "sd_xl_base_1.0.safetensors")
                },
                "class_type": "CheckpointLoaderSimple",
                "_meta": {
                    "title": "Load Checkpoint"
                }
            },
            "5": {
                "inputs": {
                    "width": width,
                    "height": height,
                    "batch_size": 1
                },
                "class_type": "EmptyLatentImage",
                "_meta": {
                    "title": "Empty Latent Image"
                }
            },
            "6": {
                "inputs": {
                    "text": data.get("positive_prompt", ""),
                    "clip": ["4", 1]
                },
                "class_type": "CLIPTextEncode",
                "_meta": {
                    "title": "CLIP Text Encode (Prompt)"
                }
            },
            "7": {
                "inputs": {
                    "text": data.get("negative_prompt", ""),
                    "clip": ["4", 1]
                },
                "class_type": "CLIPTextEncode",
                "_meta": {
                    "title": "CLIP Text Encode (Negative)"
                }
            },
            "8": {
                "inputs": {
                    "samples": ["3", 0],
                    "vae": ["4", 2]
                },
                "class_type": "VAEDecode",
                "_meta": {
                    "title": "VAE Decode"
                }
            },
            "9": {
                "inputs": {
                    "filename_prefix": "ComfyUI",
                    "images": ["8", 0]
                },
                "class_type": "SaveImage",
                "_meta": {
                    "title": "Save Image"
                }
            }
        }
        
        # Add VAE loader if specific VAE is provided
        if vae_name and vae_name.strip():
            workflow["10"] = {
                "inputs": {
                    "vae_name": vae_name
                },
                "class_type": "VAELoader",
                "_meta": {
                    "title": "Load VAE"
                }
            }
            # Update VAE references
            workflow["8"]["inputs"]["vae"] = ["10", 0]
        
        return workflow
    
    def _generate_advanced_workflow(self, data: Dict[str, Any], model_name: str, vae_name: str) -> Dict[str, Any]:
        """
        Generate advanced workflow with more nodes
        """
        basic_workflow = self._generate_basic_workflow(data, model_name, vae_name)
        
        # Extract dimensions
        size = data.get("size", "512x512")
        try:
            width, height = map(int, size.split("x"))
        except:
            width, height = 512, 512
        
        # Add upscaling and additional processing
        advanced_nodes = {
            "11": {
                "inputs": {
                    "upscale_method": "nearest-exact",
                    "width": width * 2,
                    "height": height * 2,
                    "crop": "disabled",
                    "samples": ["3", 0]
                },
                "class_type": "LatentUpscale",
                "_meta": {
                    "title": "Upscale Latent"
                }
            },
            "12": {
                "inputs": {
                    "seed": data.get("seed", -1),
                    "steps": max(10, data.get("steps", 20) // 2),
                    "cfg": data.get("cfg_scale", 7.0),
                    "sampler_name": self._map_sampler(data.get("sampler", "Euler a")),
                    "scheduler": self._map_scheduler(data.get("scheduler", "normal")),
                    "denoise": 0.5,
                    "model": ["4", 0],
                    "positive": ["6", 0],
                    "negative": ["7", 0],
                    "latent_image": ["11", 0]
                },
                "class_type": "KSampler",
                "_meta": {
                    "title": "KSampler (Upscale)"
                }
            }
        }
        
        # Update workflow
        basic_workflow.update(advanced_nodes)
        
        # Update VAE decode to use upscaled latent
        basic_workflow["8"]["inputs"]["samples"] = ["12", 0]
        
        return basic_workflow
    
    def _generate_img2img_workflow(self, data: Dict[str, Any], model_name: str, vae_name: str) -> Dict[str, Any]:
        """
        Generate img2img workflow
        """
        # Extract dimensions
        size = data.get("size", "512x512")
        try:
            width, height = map(int, size.split("x"))
        except:
            width, height = 512, 512
        
        workflow = {
            "3": {
                "inputs": {
                    "seed": data.get("seed", -1),
                    "steps": data.get("steps", 20),
                    "cfg": data.get("cfg_scale", 7.0),
                    "sampler_name": self._map_sampler(data.get("sampler", "Euler a")),
                    "scheduler": self._map_scheduler(data.get("scheduler", "normal")),
                    "denoise": data.get("denoising_strength", 0.7),
                    "model": ["4", 0],
                    "positive": ["6", 0],
                    "negative": ["7", 0],
                    "latent_image": ["13", 0]
                },
                "class_type": "KSampler",
                "_meta": {
                    "title": "KSampler"
                }
            },
            "4": {
                "inputs": {
                    "ckpt_name": model_name or data.get("model", "sd_xl_base_1.0.safetensors")
                },
                "class_type": "CheckpointLoaderSimple",
                "_meta": {
                    "title": "Load Checkpoint"
                }
            },
            "6": {
                "inputs": {
                    "text": data.get("positive_prompt", ""),
                    "clip": ["4", 1]
                },
                "class_type": "CLIPTextEncode",
                "_meta": {
                    "title": "CLIP Text Encode (Prompt)"
                }
            },
            "7": {
                "inputs": {
                    "text": data.get("negative_prompt", ""),
                    "clip": ["4", 1]
                },
                "class_type": "CLIPTextEncode",
                "_meta": {
                    "title": "CLIP Text Encode (Negative)"
                }
            },
            "8": {
                "inputs": {
                    "samples": ["3", 0],
                    "vae": ["4", 2]
                },
                "class_type": "VAEDecode",
                "_meta": {
                    "title": "VAE Decode"
                }
            },
            "9": {
                "inputs": {
                    "filename_prefix": "ComfyUI",
                    "images": ["8", 0]
                },
                "class_type": "SaveImage",
                "_meta": {
                    "title": "Save Image"
                }
            },
            "10": {
                "inputs": {
                    "image": "input_image_placeholder"
                },
                "class_type": "LoadImage",
                "_meta": {
                    "title": "Load Image"
                }
            },
            "13": {
                "inputs": {
                    "pixels": ["10", 0],
                    "vae": ["4", 2]
                },
                "class_type": "VAEEncode",
                "_meta": {
                    "title": "VAE Encode"
                }
            }
        }
        
        return workflow
    
    def _map_sampler(self, sampler: str) -> str:
        """
        Map Civitai sampler names to ComfyUI sampler names
        """
        sampler_map = {
            "Euler a": "euler_ancestral",
            "Euler": "euler",
            "DPM++ 2M": "dpmpp_2m",
            "DPM++ 2M SDE": "dpmpp_2m_sde",
            "DPM++ 2M Karras": "dpmpp_2m",
            "DPM++ 2M SDE Karras": "dpmpp_2m_sde",
            "DPM++ SDE": "dpmpp_sde",
            "DPM++ SDE Karras": "dpmpp_sde",
            "DPM2": "dpm_2",
            "DPM2 Karras": "dpm_2",
            "DPM2 a": "dpm_2_ancestral",
            "DPM2 a Karras": "dpm_2_ancestral",
            "DDIM": "ddim",
            "PLMS": "plms",
            "LMS": "lms",
            "Heun": "heun",
            "DPM fast": "dpm_fast",
            "DPM adaptive": "dpm_adaptive",
        }
        
        return sampler_map.get(sampler, "euler_ancestral")
    
    def _map_scheduler(self, scheduler: str) -> str:
        """
        Map scheduler names to ComfyUI scheduler names
        """
        scheduler_map = {
            "normal": "normal",
            "karras": "karras",
            "exponential": "exponential",
            "sgm_uniform": "sgm_uniform",
            "simple": "simple",
            "ddim_uniform": "ddim_uniform",
        }
        
        return scheduler_map.get(scheduler.lower(), "normal")
    
    def _get_empty_workflow(self) -> Dict[str, Any]:
        """
        Return empty workflow in case of errors
        """
        return {
            "error": "Failed to generate workflow",
            "message": "Please check the parsed metadata and try again"
        }