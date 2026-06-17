"use client";

import React, { useState, useEffect } from 'react';
import { FileText, Image as ImageIcon, File, Download } from 'lucide-react';

interface AssetPreviewProps {
  fileId: string;
  filename: string;
  contentType: string;
}

export default function AssetPreview({ fileId, filename, contentType }: AssetPreviewProps) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const streamUrl = `/api/v1/assets/${fileId}/stream`;
  const isImage = contentType.startsWith('image/');
  const isPdf = contentType === 'application/pdf';
  const isText = contentType.startsWith('text/') || contentType === 'application/json';

  useEffect(() => {
    if (isText) {
      fetch(streamUrl)
        .then(res => res.text())
        .then(text => {
          setTextContent(text);
          setLoading(false);
        })
        .catch(err => {
          console.error("Failed to load text asset", err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [fileId, isText, streamUrl]);

  return (
    <div className="border-2 border-black bg-white mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col">
      {/* Header bar */}
      <div className="bg-brand-almond border-b-2 border-black px-4 py-2 flex justify-between items-center">
        <div className="flex items-center gap-2 font-mono text-sm font-bold truncate">
          {isImage && <ImageIcon className="w-4 h-4" />}
          {isPdf && <FileText className="w-4 h-4" />}
          {isText && <FileText className="w-4 h-4" />}
          {!isImage && !isPdf && !isText && <File className="w-4 h-4" />}
          <span className="truncate max-w-[200px] sm:max-w-[400px]">{filename}</span>
        </div>
        <a 
          href={streamUrl} 
          download={filename}
          className="text-black hover:text-brand-olive transition-colors flex items-center gap-1 text-xs font-bold uppercase"
        >
          <Download className="w-3 h-3" /> Download
        </a>
      </div>

      {/* Preview Content */}
      <div className="p-4 overflow-auto max-h-[400px] bg-gray-50 flex items-center justify-center">
        {loading && <div className="animate-pulse font-mono text-sm">Loading stream...</div>}
        
        {!loading && isImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img 
            src={streamUrl} 
            alt={filename} 
            className="max-w-full h-auto object-contain border border-black shadow-sm"
          />
        )}

        {!loading && isPdf && (
          <iframe 
            src={streamUrl} 
            className="w-full h-[400px] border border-black" 
            title={filename}
          />
        )}

        {!loading && isText && (
          <pre className="font-mono text-xs w-full whitespace-pre-wrap break-words text-left p-2 bg-white border border-black">
            {textContent || 'No text content available.'}
          </pre>
        )}

        {!loading && !isImage && !isPdf && !isText && (
          <div className="text-gray-500 font-mono text-sm flex flex-col items-center gap-2">
            <File className="w-8 h-8 opacity-50" />
            <span>Preview not available for this file type.</span>
          </div>
        )}
      </div>
    </div>
  );
}
