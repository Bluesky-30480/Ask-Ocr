import React from 'react';
import './FileOperationsPreview.css';

export interface FileOperation {
  type: 'rename';
  path: string;
  originalName: string;
  newName: string;
}

interface FileOperationsPreviewProps {
  operations: FileOperation[];
  onConfirm: () => void;
  onCancel: () => void;
  isExecuting: boolean;
}

export const FileOperationsPreview: React.FC<FileOperationsPreviewProps> = ({
  operations,
  onConfirm,
  onCancel,
  isExecuting
}) => {
  return (
    <div className="file-ops-overlay">
      <div className="file-ops-window">
        <div className="file-ops-header">
          <h3>Review File Operations</h3>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>
        
        <div className="file-ops-content">
          <p style={{ marginBottom: '15px', color: 'var(--text-secondary)' }}>
            The AI suggests the following changes. Please review carefully.
          </p>
          
          <div className="op-list">
            {operations.map((op, idx) => (
              <div key={idx} className="op-item">
                <div className="op-old" title={op.originalName}>{op.originalName}</div>
                <div className="op-arrow">➜</div>
                <div className="op-new" title={op.newName}>{op.newName}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="file-ops-footer">
          <button className="btn-cancel" onClick={onCancel} disabled={isExecuting}>
            Cancel
          </button>
          <button className="btn-confirm" onClick={onConfirm} disabled={isExecuting}>
            {isExecuting ? 'Executing...' : `Confirm ${operations.length} Changes`}
          </button>
        </div>
      </div>
    </div>
  );
};
