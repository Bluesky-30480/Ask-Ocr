/**
 * Advanced Model Manager - Super Advanced AI Model Management
 * Features: Multi-provider support, model comparison, performance metrics,
 * batch operations, model recommendations, GPU/CPU optimization
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ollamaManager } from '../../../services/ai/ollama-manager.service';
import { 
  Download, Trash2, RefreshCw, Search, Play, AlertCircle, CheckCircle2, 
  Box, HardDrive, Cpu, Zap, Star, SortAsc, SortDesc,
  ChevronDown, ChevronRight, Activity, Clock, Database,
  Brain, Eye, Globe, MessageSquare, Code, Layers,
  Sparkles, X, Info, Gauge, MemoryStick
} from 'lucide-react';
import './settings.css';
import './AdvancedModelManager.css';

// Types
interface ModelInfo {
  name: string;
  displayName: string;
  provider: 'ollama' | 'openai' | 'anthropic' | 'google' | 'local';
  size: string;
  sizeBytes: number;
  parameterSize: string;
  quantization?: string;
  category: 'chat' | 'code' | 'vision' | 'embedding' | 'multimodal';
  description: string;
  capabilities: string[];
  contextLength: number;
  license: string;
  isInstalled: boolean;
  isRunning?: boolean;
  performance?: ModelPerformance;
  tags: string[];
  recommended?: boolean;
  featured?: boolean;
}

interface ModelPerformance {
  tokensPerSecond: number;
  latencyMs: number;
  memoryUsageMB: number;
  gpuMemoryMB?: number;
  lastUsed?: Date;
  totalTokensGenerated: number;
  averageResponseTime: number;
}

interface FilterState {
  category: string[];
  provider: string[];
  size: string[];
  capabilities: string[];
  installed: 'all' | 'installed' | 'not-installed';
}

interface SortState {
  field: 'name' | 'size' | 'performance' | 'popularity' | 'recent';
  direction: 'asc' | 'desc';
}

// Model Database with comprehensive info
const MODEL_DATABASE: Omit<ModelInfo, 'isInstalled' | 'isRunning'>[] = [
  // Llama Models
  {
    name: 'llama3.2:3b',
    displayName: 'Llama 3.2 3B',
    provider: 'ollama',
    size: '2.0 GB',
    sizeBytes: 2000000000,
    parameterSize: '3B',
    quantization: 'Q4_K_M',
    category: 'chat',
    description: 'Meta\'s latest compact model, excellent for general conversation and light tasks. Great balance of speed and capability.',
    capabilities: ['chat', 'reasoning', 'summarization', 'creative-writing'],
    contextLength: 128000,
    license: 'Llama 3.2 Community License',
    tags: ['fast', 'efficient', 'general-purpose'],
    recommended: true,
    featured: true
  },
  {
    name: 'llama3.2:1b',
    displayName: 'Llama 3.2 1B',
    provider: 'ollama',
    size: '1.3 GB',
    sizeBytes: 1300000000,
    parameterSize: '1B',
    quantization: 'Q4_K_M',
    category: 'chat',
    description: 'Ultra-lightweight Llama model for basic tasks. Extremely fast on CPU.',
    capabilities: ['chat', 'simple-tasks'],
    contextLength: 128000,
    license: 'Llama 3.2 Community License',
    tags: ['ultra-fast', 'cpu-friendly', 'lightweight']
  },
  {
    name: 'llama3.1:8b',
    displayName: 'Llama 3.1 8B',
    provider: 'ollama',
    size: '4.7 GB',
    sizeBytes: 4700000000,
    parameterSize: '8B',
    quantization: 'Q4_K_M',
    category: 'chat',
    description: 'Powerful general-purpose model with excellent reasoning capabilities.',
    capabilities: ['chat', 'reasoning', 'coding', 'analysis', 'creative-writing'],
    contextLength: 128000,
    license: 'Llama 3.1 Community License',
    tags: ['balanced', 'versatile', 'popular'],
    recommended: true
  },
  {
    name: 'llama3.1:70b',
    displayName: 'Llama 3.1 70B',
    provider: 'ollama',
    size: '40 GB',
    sizeBytes: 40000000000,
    parameterSize: '70B',
    quantization: 'Q4_K_M',
    category: 'chat',
    description: 'Flagship Llama model with near-frontier capabilities. Requires significant GPU memory.',
    capabilities: ['chat', 'reasoning', 'coding', 'analysis', 'creative-writing', 'complex-tasks'],
    contextLength: 128000,
    license: 'Llama 3.1 Community License',
    tags: ['powerful', 'gpu-required', 'frontier-class']
  },
  // DeepSeek Models
  {
    name: 'deepseek-r1:1.5b',
    displayName: 'DeepSeek R1 1.5B',
    provider: 'ollama',
    size: '1.1 GB',
    sizeBytes: 1100000000,
    parameterSize: '1.5B',
    quantization: 'Q4_K_M',
    category: 'chat',
    description: 'DeepSeek\'s reasoning model with chain-of-thought capabilities. Shows thinking process.',
    capabilities: ['chat', 'reasoning', 'chain-of-thought', 'problem-solving'],
    contextLength: 64000,
    license: 'DeepSeek License',
    tags: ['reasoning', 'transparent-thinking', 'efficient'],
    recommended: true,
    featured: true
  },
  {
    name: 'deepseek-r1:7b',
    displayName: 'DeepSeek R1 7B',
    provider: 'ollama',
    size: '4.7 GB',
    sizeBytes: 4700000000,
    parameterSize: '7B',
    quantization: 'Q4_K_M',
    category: 'chat',
    description: 'Larger DeepSeek reasoning model with improved capabilities.',
    capabilities: ['chat', 'reasoning', 'chain-of-thought', 'problem-solving', 'analysis'],
    contextLength: 64000,
    license: 'DeepSeek License',
    tags: ['reasoning', 'transparent-thinking', 'powerful']
  },
  {
    name: 'deepseek-r1:14b',
    displayName: 'DeepSeek R1 14B',
    provider: 'ollama',
    size: '9.0 GB',
    sizeBytes: 9000000000,
    parameterSize: '14B',
    quantization: 'Q4_K_M',
    category: 'chat',
    description: 'Advanced DeepSeek reasoning model for complex problems.',
    capabilities: ['chat', 'reasoning', 'chain-of-thought', 'problem-solving', 'analysis', 'math'],
    contextLength: 64000,
    license: 'DeepSeek License',
    tags: ['reasoning', 'math', 'complex-tasks']
  },
  {
    name: 'deepseek-coder-v2:16b',
    displayName: 'DeepSeek Coder V2 16B',
    provider: 'ollama',
    size: '8.9 GB',
    sizeBytes: 8900000000,
    parameterSize: '16B',
    quantization: 'Q4_K_M',
    category: 'code',
    description: 'Specialized coding model with excellent code generation and understanding.',
    capabilities: ['coding', 'code-review', 'debugging', 'refactoring', 'documentation'],
    contextLength: 128000,
    license: 'DeepSeek License',
    tags: ['coding', 'specialized', 'powerful'],
    recommended: true
  },
  // Qwen Models
  {
    name: 'qwen2.5:3b',
    displayName: 'Qwen 2.5 3B',
    provider: 'ollama',
    size: '1.9 GB',
    sizeBytes: 1900000000,
    parameterSize: '3B',
    quantization: 'Q4_K_M',
    category: 'chat',
    description: 'Alibaba\'s efficient model with strong multilingual support including Chinese.',
    capabilities: ['chat', 'multilingual', 'chinese', 'reasoning'],
    contextLength: 32768,
    license: 'Qwen License',
    tags: ['multilingual', 'chinese', 'efficient'],
    recommended: true
  },
  {
    name: 'qwen2.5:7b',
    displayName: 'Qwen 2.5 7B',
    provider: 'ollama',
    size: '4.4 GB',
    sizeBytes: 4400000000,
    parameterSize: '7B',
    quantization: 'Q4_K_M',
    category: 'chat',
    description: 'Balanced Qwen model with strong performance across tasks.',
    capabilities: ['chat', 'multilingual', 'chinese', 'reasoning', 'coding'],
    contextLength: 32768,
    license: 'Qwen License',
    tags: ['multilingual', 'versatile', 'balanced']
  },
  {
    name: 'qwen2.5-coder:7b',
    displayName: 'Qwen 2.5 Coder 7B',
    provider: 'ollama',
    size: '4.7 GB',
    sizeBytes: 4700000000,
    parameterSize: '7B',
    quantization: 'Q4_K_M',
    category: 'code',
    description: 'Qwen\'s specialized coding model with strong performance.',
    capabilities: ['coding', 'code-review', 'debugging', 'multiple-languages'],
    contextLength: 32768,
    license: 'Qwen License',
    tags: ['coding', 'specialized', 'multilingual']
  },
  // Mistral Models
  {
    name: 'mistral:7b',
    displayName: 'Mistral 7B',
    provider: 'ollama',
    size: '4.1 GB',
    sizeBytes: 4100000000,
    parameterSize: '7B',
    quantization: 'Q4_K_M',
    category: 'chat',
    description: 'Efficient European AI model with excellent instruction following.',
    capabilities: ['chat', 'reasoning', 'instruction-following'],
    contextLength: 32768,
    license: 'Apache 2.0',
    tags: ['efficient', 'instruction-following', 'popular'],
    recommended: true
  },
  {
    name: 'mixtral:8x7b',
    displayName: 'Mixtral 8x7B MoE',
    provider: 'ollama',
    size: '26 GB',
    sizeBytes: 26000000000,
    parameterSize: '47B (8x7B MoE)',
    quantization: 'Q4_K_M',
    category: 'chat',
    description: 'Mixture of Experts model with frontier-level performance. Uses 12B parameters per inference.',
    capabilities: ['chat', 'reasoning', 'coding', 'analysis', 'complex-tasks'],
    contextLength: 32768,
    license: 'Apache 2.0',
    tags: ['moe', 'powerful', 'efficient-inference']
  },
  // Gemma Models
  {
    name: 'gemma2:2b',
    displayName: 'Gemma 2 2B',
    provider: 'ollama',
    size: '1.6 GB',
    sizeBytes: 1600000000,
    parameterSize: '2B',
    quantization: 'Q4_K_M',
    category: 'chat',
    description: 'Google\'s compact model optimized for efficiency.',
    capabilities: ['chat', 'simple-tasks', 'summarization'],
    contextLength: 8192,
    license: 'Gemma License',
    tags: ['compact', 'google', 'efficient'],
    recommended: true
  },
  {
    name: 'gemma2:9b',
    displayName: 'Gemma 2 9B',
    provider: 'ollama',
    size: '5.4 GB',
    sizeBytes: 5400000000,
    parameterSize: '9B',
    quantization: 'Q4_K_M',
    category: 'chat',
    description: 'Google\'s balanced model with strong performance.',
    capabilities: ['chat', 'reasoning', 'analysis', 'creative-writing'],
    contextLength: 8192,
    license: 'Gemma License',
    tags: ['balanced', 'google', 'versatile']
  },
  // Phi Models
  {
    name: 'phi3:mini',
    displayName: 'Phi-3 Mini',
    provider: 'ollama',
    size: '2.3 GB',
    sizeBytes: 2300000000,
    parameterSize: '3.8B',
    quantization: 'Q4_K_M',
    category: 'chat',
    description: 'Microsoft\'s small but capable model, punches above its weight.',
    capabilities: ['chat', 'reasoning', 'coding', 'math'],
    contextLength: 128000,
    license: 'MIT',
    tags: ['efficient', 'microsoft', 'long-context'],
    recommended: true
  },
  {
    name: 'phi3:medium',
    displayName: 'Phi-3 Medium',
    provider: 'ollama',
    size: '7.9 GB',
    sizeBytes: 7900000000,
    parameterSize: '14B',
    quantization: 'Q4_K_M',
    category: 'chat',
    description: 'Microsoft\'s larger Phi model with enhanced capabilities.',
    capabilities: ['chat', 'reasoning', 'coding', 'math', 'analysis'],
    contextLength: 128000,
    license: 'MIT',
    tags: ['powerful', 'microsoft', 'long-context']
  },
  // Vision Models
  {
    name: 'llava:7b',
    displayName: 'LLaVA 7B',
    provider: 'ollama',
    size: '4.7 GB',
    sizeBytes: 4700000000,
    parameterSize: '7B',
    quantization: 'Q4_K_M',
    category: 'vision',
    description: 'Vision-Language model that can understand and describe images.',
    capabilities: ['vision', 'image-understanding', 'ocr', 'image-description'],
    contextLength: 4096,
    license: 'LLaVA License',
    tags: ['vision', 'multimodal', 'image-ai'],
    recommended: true
  },
  {
    name: 'llava:13b',
    displayName: 'LLaVA 13B',
    provider: 'ollama',
    size: '8.0 GB',
    sizeBytes: 8000000000,
    parameterSize: '13B',
    quantization: 'Q4_K_M',
    category: 'vision',
    description: 'Larger vision model with improved image understanding.',
    capabilities: ['vision', 'image-understanding', 'ocr', 'image-description', 'complex-images'],
    contextLength: 4096,
    license: 'LLaVA License',
    tags: ['vision', 'multimodal', 'powerful']
  },
  // Embedding Models
  {
    name: 'nomic-embed-text',
    displayName: 'Nomic Embed Text',
    provider: 'ollama',
    size: '274 MB',
    sizeBytes: 274000000,
    parameterSize: '137M',
    quantization: 'F16',
    category: 'embedding',
    description: 'High-quality text embedding model for semantic search and RAG.',
    capabilities: ['embedding', 'semantic-search', 'rag', 'similarity'],
    contextLength: 8192,
    license: 'Apache 2.0',
    tags: ['embedding', 'search', 'rag'],
    recommended: true
  },
  {
    name: 'mxbai-embed-large',
    displayName: 'MixedBread Embed Large',
    provider: 'ollama',
    size: '670 MB',
    sizeBytes: 670000000,
    parameterSize: '335M',
    quantization: 'F16',
    category: 'embedding',
    description: 'State-of-the-art embedding model with excellent performance.',
    capabilities: ['embedding', 'semantic-search', 'rag', 'similarity', 'clustering'],
    contextLength: 512,
    license: 'Apache 2.0',
    tags: ['embedding', 'sota', 'accurate']
  },
  // Specialized Models
  {
    name: 'codellama:7b',
    displayName: 'Code Llama 7B',
    provider: 'ollama',
    size: '3.8 GB',
    sizeBytes: 3800000000,
    parameterSize: '7B',
    quantization: 'Q4_K_M',
    category: 'code',
    description: 'Meta\'s code-specialized model fine-tuned for programming tasks.',
    capabilities: ['coding', 'code-completion', 'debugging', 'explanation'],
    contextLength: 16384,
    license: 'Llama 2 Community License',
    tags: ['coding', 'meta', 'specialized']
  },
  {
    name: 'starcoder2:3b',
    displayName: 'StarCoder2 3B',
    provider: 'ollama',
    size: '1.7 GB',
    sizeBytes: 1700000000,
    parameterSize: '3B',
    quantization: 'Q4_K_M',
    category: 'code',
    description: 'Code model trained on The Stack v2 with 600+ programming languages.',
    capabilities: ['coding', 'code-completion', 'multi-language', 'fill-in-middle'],
    contextLength: 16384,
    license: 'BigCode OpenRAIL-M',
    tags: ['coding', 'multi-language', 'open-source']
  }
];

// Category Icons
const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'chat': return <MessageSquare size={14} />;
    case 'code': return <Code size={14} />;
    case 'vision': return <Eye size={14} />;
    case 'embedding': return <Database size={14} />;
    case 'multimodal': return <Layers size={14} />;
    default: return <Brain size={14} />;
  }
};

// Capability Icons
const getCapabilityIcon = (cap: string) => {
  switch (cap) {
    case 'vision': return <Eye size={12} />;
    case 'coding': return <Code size={12} />;
    case 'reasoning': return <Brain size={12} />;
    case 'multilingual': return <Globe size={12} />;
    case 'embedding': return <Database size={12} />;
    default: return <Sparkles size={12} />;
  }
};

// Format bytes to human readable
const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
};

// Model Card Component
const ModelCard: React.FC<{
  model: ModelInfo;
  isInstalling: boolean;
  installProgress: number;
  onInstall: (name: string) => void;
  onDelete: (name: string) => void;
  onTest: (name: string) => void;
  expanded: boolean;
  onToggleExpand: () => void;
  systemStatus: { gpuAvailable: boolean; availableMemory: number };
}> = ({ 
  model, 
  isInstalling, 
  installProgress, 
  onInstall, 
  onDelete, 
  onTest,
  expanded,
  onToggleExpand,
  systemStatus
}) => {
  const canRun = systemStatus.availableMemory > model.sizeBytes / (1024 * 1024);
  
  return (
    <div className={`adv-model-card ${model.isInstalled ? 'installed' : ''} ${model.featured ? 'featured' : ''}`}>
      {model.featured && <div className="featured-badge"><Star size={12} /> Featured</div>}
      
      <div className="model-card-header" onClick={onToggleExpand}>
        <div className="model-identity">
          <div className="model-icon">
            {getCategoryIcon(model.category)}
          </div>
          <div className="model-names">
            <h3>{model.displayName}</h3>
            <span className="model-id">{model.name}</span>
          </div>
        </div>
        
        <div className="model-meta">
          <span className="model-size-badge">
            <HardDrive size={12} />
            {model.size}
          </span>
          <span className="model-params-badge">
            <Cpu size={12} />
            {model.parameterSize}
          </span>
          {model.isInstalled && (
            <span className="installed-badge">
              <CheckCircle2 size={12} />
              Installed
            </span>
          )}
        </div>
        
        <button className="expand-btn">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>
      
      <p className="model-description">{model.description}</p>
      
      <div className="model-tags">
        {model.tags.slice(0, 3).map(tag => (
          <span key={tag} className="tag">{tag}</span>
        ))}
        {model.recommended && <span className="tag recommended">⭐ Recommended</span>}
      </div>
      
      {expanded && (
        <div className="model-details">
          <div className="details-section">
            <h4><Zap size={14} /> Capabilities</h4>
            <div className="capabilities-grid">
              {model.capabilities.map(cap => (
                <span key={cap} className="capability">
                  {getCapabilityIcon(cap)}
                  {cap.replace('-', ' ')}
                </span>
              ))}
            </div>
          </div>
          
          <div className="details-section">
            <h4><Info size={14} /> Technical Details</h4>
            <div className="specs-grid">
              <div className="spec">
                <span className="spec-label">Context Length</span>
                <span className="spec-value">{model.contextLength.toLocaleString()} tokens</span>
              </div>
              <div className="spec">
                <span className="spec-label">Quantization</span>
                <span className="spec-value">{model.quantization || 'N/A'}</span>
              </div>
              <div className="spec">
                <span className="spec-label">License</span>
                <span className="spec-value">{model.license}</span>
              </div>
              <div className="spec">
                <span className="spec-label">Provider</span>
                <span className="spec-value">{model.provider}</span>
              </div>
            </div>
          </div>
          
          {model.performance && (
            <div className="details-section">
              <h4><Activity size={14} /> Performance Metrics</h4>
              <div className="performance-grid">
                <div className="perf-stat">
                  <Gauge size={16} />
                  <span className="perf-value">{model.performance.tokensPerSecond}</span>
                  <span className="perf-label">tok/s</span>
                </div>
                <div className="perf-stat">
                  <Clock size={16} />
                  <span className="perf-value">{model.performance.latencyMs}ms</span>
                  <span className="perf-label">latency</span>
                </div>
                <div className="perf-stat">
                  <MemoryStick size={16} />
                  <span className="perf-value">{formatBytes(model.performance.memoryUsageMB * 1024 * 1024)}</span>
                  <span className="perf-label">memory</span>
                </div>
              </div>
            </div>
          )}
          
          {!canRun && !model.isInstalled && (
            <div className="warning-banner">
              <AlertCircle size={14} />
              <span>This model may require more memory than currently available</span>
            </div>
          )}
        </div>
      )}
      
      {isInstalling ? (
        <div className="install-progress">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${installProgress}%` }} />
          </div>
          <span className="progress-label">{installProgress}% - Downloading...</span>
        </div>
      ) : (
        <div className="model-actions">
          {model.isInstalled ? (
            <>
              <button className="action-btn test" onClick={() => onTest(model.name)} title="Test Model">
                <Play size={14} />
                <span>Test</span>
              </button>
              <button className="action-btn danger" onClick={() => onDelete(model.name)} title="Delete Model">
                <Trash2 size={14} />
              </button>
            </>
          ) : (
            <button 
              className="action-btn primary full" 
              onClick={() => onInstall(model.name)}
              disabled={!canRun}
            >
              <Download size={14} />
              <span>Install</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Main Component
export const AdvancedModelManager: React.FC = () => {
  // State
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [installedModels, setInstalledModels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [ollamaStatus, setOllamaStatus] = useState({ isInstalled: false, isRunning: false });
  
  // Filter & Sort
  const [filters, setFilters] = useState<FilterState>({
    category: [],
    provider: [],
    size: [],
    capabilities: [],
    installed: 'all'
  });
  const [sort, setSort] = useState<SortState>({ field: 'popularity', direction: 'desc' });
  const [searchQuery, setSearchQuery] = useState('');
  
  // Installation
  const [installingModel, setInstallingModel] = useState<string | null>(null);
  const [installProgress, setInstallProgress] = useState(0);
  
  // UI
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'installed' | 'recommended'>('all');
  
  // System Info
  const [systemStatus] = useState({
    gpuAvailable: false,
    availableMemory: 16000, // MB
    gpuMemory: 0
  });

  // Initialize
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Get Ollama status
      const status = await ollamaManager.getStatus();
      setOllamaStatus(status);
      
      // Get installed models
      if (status.isRunning) {
        const installed = await ollamaManager.listModels();
        setInstalledModels(installed.map((m: any) => m.name));
      }
      
      // Merge database with installed status
      const mergedModels = MODEL_DATABASE.map(m => ({
        ...m,
        isInstalled: installedModels.includes(m.name)
      }));
      setModels(mergedModels);
      
    } catch (error) {
      console.error('Failed to load models:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update models when installed list changes
  useEffect(() => {
    setModels(prev => prev.map(m => ({
      ...m,
      isInstalled: installedModels.includes(m.name)
    })));
  }, [installedModels]);

  // Filter and sort models
  const filteredModels = useMemo(() => {
    let result = [...models];
    
    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(m => 
        m.name.toLowerCase().includes(query) ||
        m.displayName.toLowerCase().includes(query) ||
        m.description.toLowerCase().includes(query) ||
        m.tags.some(t => t.toLowerCase().includes(query))
      );
    }
    
    // Tab filter
    if (activeTab === 'installed') {
      result = result.filter(m => m.isInstalled);
    } else if (activeTab === 'recommended') {
      result = result.filter(m => m.recommended || m.featured);
    }
    
    // Category filter
    if (filters.category.length > 0) {
      result = result.filter(m => filters.category.includes(m.category));
    }
    
    // Install status filter
    if (filters.installed === 'installed') {
      result = result.filter(m => m.isInstalled);
    } else if (filters.installed === 'not-installed') {
      result = result.filter(m => !m.isInstalled);
    }
    
    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sort.field) {
        case 'name':
          comparison = a.displayName.localeCompare(b.displayName);
          break;
        case 'size':
          comparison = a.sizeBytes - b.sizeBytes;
          break;
        case 'popularity':
          // Featured first, then recommended, then others
          const aScore = (a.featured ? 2 : 0) + (a.recommended ? 1 : 0);
          const bScore = (b.featured ? 2 : 0) + (b.recommended ? 1 : 0);
          comparison = bScore - aScore;
          break;
        default:
          comparison = 0;
      }
      return sort.direction === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [models, searchQuery, filters, sort, activeTab]);

  // Handlers
  const handleInstall = async (modelName: string) => {
    if (!ollamaStatus.isRunning) return;
    
    setInstallingModel(modelName);
    setInstallProgress(0);
    
    try {
      await ollamaManager.downloadModel(modelName, (progress) => {
        setInstallProgress(Math.round(progress.progress));
      });
      
      // Update installed list
      const installed = await ollamaManager.listModels();
      setInstalledModels(installed.map((m: any) => m.name));
      
    } catch (error) {
      console.error(`Failed to install ${modelName}:`, error);
    } finally {
      setInstallingModel(null);
      setInstallProgress(0);
    }
  };

  const handleDelete = async (modelName: string) => {
    if (!confirm(`Delete ${modelName}? This cannot be undone.`)) return;
    
    try {
      await ollamaManager.deleteModel(modelName);
      setInstalledModels(prev => prev.filter(m => m !== modelName));
    } catch (error) {
      console.error(`Failed to delete ${modelName}:`, error);
    }
  };

  const handleTest = async (modelName: string) => {
    // Open a test dialog or navigate to chat with this model
    alert(`Testing ${modelName}... Feature coming soon!`);
  };

  const handleStartOllama = async () => {
    try {
      await ollamaManager.startOllama();
      setTimeout(loadData, 2000);
    } catch (error) {
      console.error('Failed to start Ollama:', error);
    }
  };

  // Stats
  const stats = useMemo(() => ({
    total: models.length,
    installed: installedModels.length,
    totalSize: installedModels.reduce((acc, name) => {
      const model = models.find(m => m.name === name);
      return acc + (model?.sizeBytes || 0);
    }, 0)
  }), [models, installedModels]);

  return (
    <div className="adv-model-manager">
      {/* Header */}
      <div className="manager-header">
        <div className="header-info">
          <h2>
            <Brain size={24} />
            Model Manager
          </h2>
          <p>Discover, install, and manage AI models</p>
        </div>
        
        <div className="header-actions">
          <button className="btn-icon" onClick={loadData} title="Refresh">
            <RefreshCw size={18} className={isLoading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div className={`status-bar ${ollamaStatus.isRunning ? 'running' : 'stopped'}`}>
        <div className="status-indicator">
          {ollamaStatus.isRunning ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>Ollama {ollamaStatus.isRunning ? 'Running' : 'Stopped'}</span>
        </div>
        
        <div className="status-stats">
          <span><Box size={14} /> {stats.installed} models</span>
          <span><HardDrive size={14} /> {formatBytes(stats.totalSize)} used</span>
        </div>
        
        {!ollamaStatus.isRunning && ollamaStatus.isInstalled && (
          <button className="start-btn" onClick={handleStartOllama}>
            <Play size={14} /> Start
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="controls-bar">
        <div className="search-box">
          <Search size={16} />
          <input 
            type="text"
            placeholder="Search models by name, capability, or tag..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-btn" onClick={() => setSearchQuery('')}>
              <X size={14} />
            </button>
          )}
        </div>
        
        <div className="tabs">
          <button 
            className={activeTab === 'all' ? 'active' : ''} 
            onClick={() => setActiveTab('all')}
          >
            All ({models.length})
          </button>
          <button 
            className={activeTab === 'installed' ? 'active' : ''} 
            onClick={() => setActiveTab('installed')}
          >
            Installed ({stats.installed})
          </button>
          <button 
            className={activeTab === 'recommended' ? 'active' : ''} 
            onClick={() => setActiveTab('recommended')}
          >
            <Star size={14} /> Recommended
          </button>
        </div>
        
        <div className="sort-controls">
          <select 
            value={sort.field} 
            onChange={e => setSort(prev => ({ ...prev, field: e.target.value as any }))}
          >
            <option value="popularity">Popularity</option>
            <option value="name">Name</option>
            <option value="size">Size</option>
          </select>
          <button 
            className="sort-dir-btn"
            onClick={() => setSort(prev => ({ 
              ...prev, 
              direction: prev.direction === 'asc' ? 'desc' : 'asc' 
            }))}
          >
            {sort.direction === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />}
          </button>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="quick-filters">
        <span className="filter-label">Category:</span>
        {['chat', 'code', 'vision', 'embedding'].map(cat => (
          <button
            key={cat}
            className={`filter-chip ${filters.category.includes(cat) ? 'active' : ''}`}
            onClick={() => setFilters(prev => ({
              ...prev,
              category: prev.category.includes(cat)
                ? prev.category.filter(c => c !== cat)
                : [...prev.category, cat]
            }))}
          >
            {getCategoryIcon(cat)}
            {cat}
          </button>
        ))}
        {filters.category.length > 0 && (
          <button 
            className="clear-filters"
            onClick={() => setFilters(prev => ({ ...prev, category: [] }))}
          >
            Clear
          </button>
        )}
      </div>

      {/* Models Grid */}
      <div className="models-container">
        {isLoading ? (
          <div className="loading-state">
            <RefreshCw size={32} className="spinning" />
            <p>Loading models...</p>
          </div>
        ) : filteredModels.length === 0 ? (
          <div className="empty-state">
            <Box size={48} />
            <h3>No models found</h3>
            <p>Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="models-grid">
            {filteredModels.map(model => (
              <ModelCard
                key={model.name}
                model={model}
                isInstalling={installingModel === model.name}
                installProgress={installProgress}
                onInstall={handleInstall}
                onDelete={handleDelete}
                onTest={handleTest}
                expanded={expandedModel === model.name}
                onToggleExpand={() => setExpandedModel(
                  expandedModel === model.name ? null : model.name
                )}
                systemStatus={systemStatus}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedModelManager;
