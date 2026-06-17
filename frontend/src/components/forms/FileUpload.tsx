"use client";

import React, { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { UploadCloud, File as FileIcon, X, CheckCircle } from 'lucide-react';

export interface UploadedAsset {
  fileId: string;
  filename: string;
  contentType: string;
}

interface FileUploadProps {
  onUploadComplete?: (assets: UploadedAsset[]) => void;
  maxFiles?: number;
}

export default function FileUpload({ onUploadComplete, maxFiles = 5 }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedAssets, setUploadedAssets] = useState<UploadedAsset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (newFiles: File[]) => {
    setError(null);
    if (files.length + newFiles.length > maxFiles) {
      setError(`You can only upload up to ${maxFiles} files.`);
      return;
    }
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    setError(null);

    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    try {
      const response = await fetch('/api/v1/assets/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed with status ' + response.status);
      }

      const data = await response.json();
      setUploadedAssets(data.assets);
      setFiles([]);
      
      if (onUploadComplete) {
        onUploadComplete(data.assets);
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred during file upload. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full">
      <div 
        className={`relative border-2 border-black p-8 text-center transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center justify-center min-h-[200px] bg-white ${
          dragActive ? 'bg-[#b6d094] border-dashed' : ''
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={handleChange}
          className="hidden"
        />
        
        <UploadCloud className={`w-12 h-12 mb-4 ${dragActive ? 'text-black animate-bounce' : 'text-gray-500'}`} />
        <h3 className="font-bold text-xl mb-2">Drag & Drop files here</h3>
        <p className="text-sm font-mono text-gray-600 mb-4">Or click to browse your computer</p>
        
        <button 
          onClick={() => inputRef.current?.click()}
          type="button"
          className="px-6 py-2 bg-brand-almond border-2 border-black font-bold uppercase text-sm hover:bg-[#CA9F7D] transition-colors"
        >
          Select Files
        </button>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-500 text-red-700 text-sm font-bold animate-pulse">
          {error}
        </div>
      )}

      {/* Queued Files */}
      {files.length > 0 && (
        <div className="mt-6">
          <h4 className="font-bold border-b-2 border-black mb-3 pb-1">Queued for Upload ({files.length})</h4>
          <ul className="space-y-2">
            {files.map((file, idx) => (
              <li key={idx} className="flex items-center justify-between p-2 border-2 border-black bg-gray-50 text-sm font-mono">
                <div className="flex items-center gap-2 truncate">
                  <FileIcon className="w-4 h-4 opacity-70" />
                  <span className="truncate">{file.name}</span>
                  <span className="text-gray-500 text-xs">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
                <button 
                  onClick={() => removeFile(idx)}
                  className="text-red-500 hover:text-red-700 font-bold p-1"
                  title="Remove"
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
          
          <button 
            onClick={handleUpload}
            disabled={uploading}
            className="mt-4 w-full px-6 py-3 bg-brand-olive border-2 border-black font-black uppercase tracking-widest hover:bg-[#b6d094] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : `Upload ${files.length} File(s)`}
          </button>
        </div>
      )}

      {/* Uploaded Files Success */}
      {uploadedAssets.length > 0 && (
        <div className="mt-6">
          <h4 className="font-bold border-b-2 border-black mb-3 pb-1 text-green-700 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" /> 
            Upload Successful
          </h4>
          <ul className="space-y-2">
            {uploadedAssets.map((asset, idx) => (
              <li key={idx} className="flex items-center gap-2 p-2 border-2 border-green-700 bg-green-50 text-sm font-mono text-green-900">
                <FileIcon className="w-4 h-4" />
                <span className="truncate">{asset.filename}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
