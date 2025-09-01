"""
ComfyUI Metadata2Workflow Plugin
Author: [Your Name]
Version: 1.0.0
Description: A ComfyUI plugin that parses Civitai image metadata and generates workflows
"""

from .nodes.metadata_parser import MetadataParserNode
from .nodes.workflow_generator import WorkflowGeneratorNode

NODE_CLASS_MAPPINGS = {
    "MetadataParserNode": MetadataParserNode,
    "WorkflowGeneratorNode": WorkflowGeneratorNode,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "MetadataParserNode": "Metadata Parser",
    "WorkflowGeneratorNode": "Workflow Generator",
}

WEB_DIRECTORY = "./js"

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS', 'WEB_DIRECTORY']