import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { generateLegalResponse } from '../services/geminiService';
import { PaperclipIcon, TemplateIcon, SendIcon, SparklesIcon, XIcon, UserIcon, BotIcon, MenuIcon, MicIcon, DocxIcon, PdfIcon, EditIcon } from './Icons';
import { Message } from '../types';
import { translations } from '../utils/translations';
import { PREDEFINED_TEMPLATES } from '../utils/templates';
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';

// Helper to escape HTML to prevent XSS before parsing custom tags
const escapeHTML = (str: string) => str.replace(/[&<>'"]/g, 
  tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
);

// Helper to convert custom tags to HTML for UI and PDF
const parseFormattingToHTML = (text: string) => {
  let safeText = escapeHTML(text);
  const lines = safeText.split('\n');
  
  const htmlLines = lines.map(line => {
    if (!line.trim()) return '<div><br></div>';
    
    let align = 'left';
    let currentLine = line;
    
    // Use includes to catch tags even if they are wrapped in ** **
    if (currentLine.includes('[CENTER]')) {
      align = 'center';
      currentLine = currentLine.replace(/\[\/?CENTER\]/g, '');
    } else if (currentLine.includes('[RIGHT]')) {
      align = 'right';
      currentLine = currentLine.replace(/\[\/?RIGHT\]/g, '');
    }
    
    currentLine = currentLine
      .replace(/\[U\]([\s\S]*?)\[\/U\]/g, '<u>$1</u>')
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
      .replace(/\*(.*?)\*/g, '<i>$1</i>');
      
    if (align !== 'left') {
      return `<div style="text-align: ${align};">${currentLine}</div>`;
    }
    return `<div>${currentLine}</div>`;
  });
  
  return htmlLines.join('');
};

// Helper to convert HTML back to custom tags after editing
const htmlToCustomTags = (html: string) => {
  const temp = document.createElement('div');
  temp.innerHTML = html;

  const processNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      // Convert non-breaking spaces back to regular spaces
      return (node.textContent || '').replace(/ /g, ' ');
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      let inner = Array.from(el.childNodes).map(processNode).join('');
      
      const tag = el.tagName.toUpperCase();
      
      if (tag === 'B' || tag === 'STRONG') return `**${inner}**`;
      if (tag === 'I' || tag === 'EM') return `*${inner}*`;
      if (tag === 'U') return `[U]${inner}[/U]`;
      
      if (tag === 'DIV' || tag === 'P') {
        let align = el.style.textAlign || el.getAttribute('align') || '';
        let prefix = '\n';
        
        if (inner === '\n' || inner === '') return '\n';

        if (align === 'center') return `${prefix}[CENTER]${inner}[/CENTER]`;
        if (align === 'right') return `${prefix}[RIGHT]${inner}[/RIGHT]`;
        return `${prefix}${inner}`;
      }
      if (tag === 'BR') return '\n';
      
      // Handle spans with styles (sometimes browsers use <span style="font-weight: bold">)
      if (tag === 'SPAN') {
        if (el.style.fontWeight === 'bold' || el.style.fontWeight === '700') inner = `**${inner}**`;
        if (el.style.fontStyle === 'italic') inner = `*${inner}*`;
        if (el.style.textDecoration === 'underline') inner = `[U]${inner}[/U]`;
        return inner;
      }
      
      return inner;
    }
    return '';
  };

  let result = Array.from(temp.childNodes).map(processNode).join('');
  // Clean up multiple newlines
  return result.replace(/\n{3,}/g, '\n\n').trim();
};

const downloadDocx = async (text: string, title: string) => {
  try {
    const paragraphs = [];
    const lines = text.split('\n');

    for (const line of lines) {
      let currentLine = line; // Do not trim here to preserve leading spaces
      if (!currentLine.trim()) {
        paragraphs.push(new Paragraph({ text: "" }));
        continue;
      }

      let alignment = AlignmentType.LEFT;
      // Use includes to catch tags even if they are wrapped in ** **
      if (currentLine.includes('[CENTER]')) {
        alignment = AlignmentType.CENTER;
        currentLine = currentLine.replace(/\[\/?CENTER\]/g, '');
      } else if (currentLine.includes('[RIGHT]')) {
        alignment = AlignmentType.RIGHT;
        currentLine = currentLine.replace(/\[\/?RIGHT\]/g, '');
      }

      const runs = [];
      let isBold = false;
      let isItalic = false;
      let isUnderline = false;
      let currentText = "";

      // Character by character parsing to handle nested tags like **[U]Text[/U]**
      for (let i = 0; i < currentLine.length; i++) {
        if (currentLine.startsWith('**', i)) {
          if (currentText) { 
            runs.push(new TextRun({ text: currentText, bold: isBold, italics: isItalic, underline: isUnderline ? { type: "single" } : undefined })); 
            currentText = ""; 
          }
          isBold = !isBold;
          i++; // skip second *
        } else if (currentLine.startsWith('*', i)) {
          if (currentText) { 
            runs.push(new TextRun({ text: currentText, bold: isBold, italics: isItalic, underline: isUnderline ? { type: "single" } : undefined })); 
            currentText = ""; 
          }
          isItalic = !isItalic;
        } else if (currentLine.startsWith('[U]', i)) {
          if (currentText) { 
            runs.push(new TextRun({ text: currentText, bold: isBold, italics: isItalic, underline: isUnderline ? { type: "single" } : undefined })); 
            currentText = ""; 
          }
          isUnderline = true;
          i += 2; // skip [U]
        } else if (currentLine.startsWith('[/U]', i)) {
          if (currentText) { 
            runs.push(new TextRun({ text: currentText, bold: isBold, italics: isItalic, underline: isUnderline ? { type: "single" } : undefined })); 
            currentText = ""; 
          }
          isUnderline = false;
          i += 3; // skip [/U]
        } else {
          currentText += currentLine[i];
        }
      }
      
      if (currentText) {
        runs.push(new TextRun({ text: currentText, bold: isBold, italics: isItalic, underline: isUnderline ? { type: "single" } : undefined }));
      }

      paragraphs.push(new Paragraph({
        alignment: alignment,
        children: runs,
      }));
    }

    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs,
      }],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = url;
    fileDownload.download = `${title.replace(/\s+/g, '_')}.docx`;
    fileDownload.click();
    document.body.removeChild(fileDownload);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error generating DOCX:", error);
    alert("Failed to generate DOCX file.");
  }
};

const downloadPdf = (text: string, title: string) => {
  const htmlText = parseFormattingToHTML(text);

  // Create a temporary element to render the HTML
  const element = document.createElement('div');
  element.innerHTML = htmlText;
  // Apply styles with Hindi-supporting fonts and pre-wrap for spaces
  element.style.fontFamily = "'Times New Roman', 'Nirmala UI', 'Mangal', 'Arial Unicode MS', serif";
  element.style.fontSize = "12pt";
  element.style.lineHeight = "1.5";
  element.style.padding = "40px"; // Add padding for PDF margins
  element.style.color = "black";
  element.style.backgroundColor = "white";
  element.style.whiteSpace = "pre-wrap"; // Ensure spaces are respected in PDF

  const opt = {
    margin:       [0.5, 0.5, 0.5, 0.5], // top, left, bottom, right margins
    filename:     `${title.replace(/\s+/g, '_')}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' },
    pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] } // Prevents text from being cut in half
  };

  // Use html2pdf to generate PDF from the DOM element (preserves Unicode/Hindi fonts)
  if ((window as any).html2pdf) {
    (window as any).html2pdf().set(opt).from(element).save();
  } else {
    alert("PDF generation library is still loading. Please try again in a moment.");
  }
};

// Editable Document Component
const EditableDocument = ({ msg, title, t, onUpdate }: { msg: Message, title: string, t: any, onUpdate: (id: string, text: string) => void }) => {
  const [isEditing, setIsEditing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Only set the innerHTML once when entering edit mode.
  // This prevents React re-renders (like the 1-second timer) from resetting the cursor or ignoring spacebar.
  useEffect(() => {
    if (isEditing && contentRef.current) {
      contentRef.current.innerHTML = parseFormattingToHTML(msg.text);
      contentRef.current.focus();
    }
  }, [isEditing, msg.text]);

  const handleSave = () => {
    if (contentRef.current) {
      const newHtml = contentRef.current.innerHTML;
      const newText = htmlToCustomTags(newHtml);
      onUpdate(msg.id, newText);
    }
    setIsEditing(false);
  };

  const execCmd = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    contentRef.current?.focus();
  };

  if (isEditing) {
    return (
      <div className="w-full">
        <div className="w-full bg-slate-900 border border-blue-500 rounded-lg overflow-hidden flex flex-col shadow-lg">
          {/* Toolbar */}
          <div className="bg-slate-800 px-3 py-2 border-b border-slate-700 flex gap-2 text-slate-300 text-sm items-center">
            <button onClick={() => execCmd('bold')} className="w-8 h-8 flex items-center justify-center hover:bg-slate-700 rounded font-bold" title="Bold">B</button>
            <button onClick={() => execCmd('italic')} className="w-8 h-8 flex items-center justify-center hover:bg-slate-700 rounded italic" title="Italic">I</button>
            <button onClick={() => execCmd('underline')} className="w-8 h-8 flex items-center justify-center hover:bg-slate-700 rounded underline" title="Underline">U</button>
            <div className="w-px h-5 bg-slate-600 mx-1"></div>
            <button onClick={() => execCmd('justifyLeft')} className="px-2 h-8 flex items-center justify-center hover:bg-slate-700 rounded" title="Align Left">Left</button>
            <button onClick={() => execCmd('justifyCenter')} className="px-2 h-8 flex items-center justify-center hover:bg-slate-700 rounded" title="Align Center">Center</button>
            <button onClick={() => execCmd('justifyRight')} className="px-2 h-8 flex items-center justify-center hover:bg-slate-700 rounded" title="Align Right">Right</button>
          </div>
          
          {/* Editor Area - NO dangerouslySetInnerHTML here to prevent React interference! */}
          <div 
            ref={contentRef}
            contentEditable
            suppressContentEditableWarning
            className="w-full min-h-[300px] max-h-[60vh] overflow-y-auto p-5 text-slate-200 outline-none leading-relaxed"
            style={{ whiteSpace: 'pre-wrap' }}
          />
          
          <div className="flex justify-end gap-2 p-3 bg-slate-800 border-t border-slate-700">
            <button 
              onClick={() => setIsEditing(false)} 
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
              {t.cancel}
            </button>
            <button 
              onClick={handleSave} 
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
            >
              {t.saveChanges}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div dangerouslySetInnerHTML={{ __html: parseFormattingToHTML(msg.text) }} className="w-full text-slate-200" style={{ whiteSpace: 'pre-wrap' }} />
      
      <div className="mt-4 pt-3 border-t border-slate-700/50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <TemplateIcon className="w-4 h-4 text-purple-400" />
          <span>Legal Document Generated</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <EditIcon className="w-3.5 h-3.5" />
            {t.edit}
          </button>
          <button
            onClick={() => downloadDocx(msg.text, title)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <DocxIcon className="w-3.5 h-3.5" />
            {t.downloadDocx}
          </button>
          <button
            onClick={() => downloadPdf(msg.text, title)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <PdfIcon className="w-3.5 h-3.5" />
            {t.downloadPdf}
          </button>
        </div>
      </div>
    </div>
  );
};

export const ChatArea = () => {
  const { activeSessionId, chatSessions, addMessageToActiveSession, updateMessageText, isTimeUp, language, isSidebarOpen, setIsSidebarOpen } = useAppContext();
  const [inputText, setInputText] = useState('');
  const [caseFiles, setCaseFiles] = useState<File[]>([]);
  const [formatFiles, setFormatFiles] = useState<File[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const t = translations[language] || translations['English'];
  const activeSession = chatSessions.find(s => s.id === activeSessionId);
  const messages = activeSession?.messages || [];
  const isSpeechSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;

  const templateOptions = [
    { id: 'bail', name: t.bailApplication },
    { id: 'notice', name: t.legalNotice },
    { id: 'divorce', name: t.divorcePetition },
    { id: 'nda', name: t.nda }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (isSpeechSupported) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTranscript) {
          setInputText(prev => prev + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [isSpeechSupported]);

  // Update Speech Recognition Language
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = language === 'Hindi' ? 'hi-IN' : 'en-US';
    }
  }, [language]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleCaseFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setCaseFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
    e.target.value = ''; // Reset input
  };

  const handleFormatFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormatFiles(prev => [...prev, ...Array.from(e.target.files!)]);
      setSelectedTemplateId(null); // Clear predefined template if file is uploaded
    }
    e.target.value = '';
  };

  const handleTemplateSelect = (id: string) => {
    setSelectedTemplateId(id);
    setFormatFiles([]); // Clear files if predefined template is selected
    setShowTemplateMenu(false);
  };

  const removeCaseFile = (index: number) => {
    setCaseFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeFormatFile = (index: number) => {
    setFormatFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (isGenerate: boolean) => {
    const textToSend = inputText.trim() || (isGenerate ? "Please generate the document based on the provided context and files." : "");
    
    if (!textToSend && caseFiles.length === 0 && formatFiles.length === 0 && !selectedTemplateId) return;
    if (isTimeUp || !activeSessionId) return;

    if (isListening) {
      toggleListening();
    }

    const templateName = selectedTemplateId ? templateOptions.find(t => t.id === selectedTemplateId)?.name : null;

    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend,
      timestamp: Date.now(),
      attachments: [
        ...caseFiles.map(f => ({ name: f.name, type: 'case' as const })),
        ...formatFiles.map(f => ({ name: f.name, type: 'format' as const })),
        ...(templateName ? [{ name: `Template: ${templateName}`, type: 'format' as const }] : [])
      ]
    };

    addMessageToActiveSession(newUserMsg);
    setInputText('');
    setIsLoading(true);

    // Capture current state for API call
    const currentHistory = [...messages];
    const currentCaseFiles = [...caseFiles];
    const currentFormatFiles = [...formatFiles];
    const currentTemplateContent = selectedTemplateId ? PREDEFINED_TEMPLATES[selectedTemplateId] : null;

    // Clear files from UI immediately for better UX
    setCaseFiles([]);
    setFormatFiles([]);
    setSelectedTemplateId(null);

    const responseText = await generateLegalResponse(
      newUserMsg.text,
      currentHistory,
      currentCaseFiles,
      currentFormatFiles,
      currentTemplateContent,
      isGenerate,
      language
    );

    const newAiMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: responseText,
      timestamp: Date.now(),
      isDocument: isGenerate
    };

    addMessageToActiveSession(newAiMsg);
    setIsLoading(false);
  };

  // Simple markdown formatter for display (for non-document messages)
  const formatMessageText = (text: string) => {
    return text.split('\n').map((line, i) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <span key={i}>
          {parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={j} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
          <br />
        </span>
      );
    });
  };

  if (!activeSessionId) {
    return (
      <div className="flex-1 flex flex-col bg-slate-950">
        <div className="flex items-center p-4 border-b border-slate-800 bg-slate-900 text-white">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="mr-3 text-slate-400 hover:text-white transition-colors">
            <MenuIcon className="w-6 h-6" />
          </button>
          <h1 className="font-semibold text-lg truncate">{t.appTitle}</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-slate-500">
            <BotIcon className="w-16 h-16 mx-auto mb-4 text-slate-600" />
            <h2 className="text-xl font-medium text-slate-300">{t.welcome}</h2>
            <p className="mt-2">{t.selectCase}</p>
          </div>
        </div>
      </div>
    );
  }

  const canSend = inputText.trim().length > 0 || caseFiles.length > 0 || formatFiles.length > 0 || selectedTemplateId !== null;
  const canGenerate = canSend || messages.length > 0;

  return (
    <div className="flex flex-col h-full bg-slate-950 relative">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-slate-800 bg-slate-900 text-white shadow-sm z-10">
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="mr-3 text-slate-400 hover:text-white transition-colors">
          <MenuIcon className="w-6 h-6" />
        </button>
        <h1 className="font-semibold text-lg truncate">{activeSession?.title || t.newChat}</h1>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 max-w-lg mx-auto text-center space-y-4">
            <div className="bg-blue-900/30 p-4 rounded-full border border-blue-800/50">
              <BotIcon className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-200">{t.howCanIAssist}</h3>
            <p className="text-sm">{t.uploadPrompt}</p>
          </div>
        )}
        
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'model' && (
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 mt-1">
                <BotIcon className="w-5 h-5 text-blue-400" />
              </div>
            )}
            
            <div className={`max-w-[85%] sm:max-w-[75%] ${msg.role === 'user' ? 'order-1' : 'order-2'}`}>
              {/* Attachments Display */}
              {msg.attachments && msg.attachments.length > 0 && (
                <div className={`flex flex-wrap gap-2 mb-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.attachments.map((att, i) => (
                    <div key={i} className={`flex items-center text-xs px-2.5 py-1.5 rounded-md border ${
                      att.type === 'case' ? 'bg-blue-900/30 text-blue-300 border-blue-800/50' : 'bg-purple-900/30 text-purple-300 border-purple-800/50'
                    }`}>
                      {att.type === 'case' ? <PaperclipIcon className="w-3 h-3 mr-1.5" /> : <TemplateIcon className="w-3 h-3 mr-1.5" />}
                      <span className="truncate max-w-[200px] font-medium">{att.name}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Message Bubble */}
              {msg.text && (
                <div className={`px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-sm' 
                    : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-sm'
                }`}>
                  {msg.isDocument ? (
                    <EditableDocument 
                      msg={msg} 
                      title={activeSession?.title || 'Legal_Document'} 
                      t={t} 
                      onUpdate={updateMessageText} 
                    />
                  ) : (
                    formatMessageText(msg.text)
                  )}
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-blue-900/50 border border-blue-800 flex items-center justify-center flex-shrink-0 mt-1 order-2">
                <UserIcon className="w-5 h-5 text-blue-400" />
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-4 justify-start">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 mt-1">
              <BotIcon className="w-5 h-5 text-blue-400" />
            </div>
            <div className="bg-slate-800 border border-slate-700 px-5 py-4 rounded-2xl rounded-tl-sm flex items-center gap-2">
              <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-950 border-t border-slate-800 shadow-[0_-4px_20px_-15px_rgba(0,0,0,0.5)]">
        <div className="max-w-4xl mx-auto">
          {/* File Previews */}
          {(caseFiles.length > 0 || formatFiles.length > 0 || selectedTemplateId) && (
            <div className="flex flex-wrap gap-2 mb-3 max-h-32 overflow-y-auto custom-scrollbar">
              {caseFiles.map((f, i) => (
                <div key={`case-${i}`} className="flex items-center bg-blue-900/30 text-blue-300 text-xs px-3 py-1.5 rounded-lg border border-blue-800/50 shadow-sm">
                  <PaperclipIcon className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                  <span className="truncate max-w-[150px] font-medium">{f.name}</span>
                  <button onClick={() => removeCaseFile(i)} className="ml-2 hover:text-blue-200 hover:bg-blue-800/50 rounded-full p-0.5 transition-colors flex-shrink-0"><XIcon className="w-3 h-3" /></button>
                </div>
              ))}
              {formatFiles.map((f, i) => (
                <div key={`fmt-${i}`} className="flex items-center bg-purple-900/30 text-purple-300 text-xs px-3 py-1.5 rounded-lg border border-purple-800/50 shadow-sm">
                  <TemplateIcon className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                  <span className="truncate max-w-[150px] font-medium">{f.name}</span>
                  <button onClick={() => removeFormatFile(i)} className="ml-2 hover:text-purple-200 hover:bg-purple-800/50 rounded-full p-0.5 transition-colors flex-shrink-0"><XIcon className="w-3 h-3" /></button>
                </div>
              ))}
              {selectedTemplateId && (
                <div className="flex items-center bg-purple-900/30 text-purple-300 text-xs px-3 py-1.5 rounded-lg border border-purple-800/50 shadow-sm">
                  <TemplateIcon className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                  <span className="truncate max-w-[150px] font-medium">Template: {templateOptions.find(t => t.id === selectedTemplateId)?.name}</span>
                  <button onClick={() => setSelectedTemplateId(null)} className="ml-2 hover:text-purple-200 hover:bg-purple-800/50 rounded-full p-0.5 transition-colors flex-shrink-0"><XIcon className="w-3 h-3" /></button>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <div className="relative flex flex-col border border-slate-700 rounded-2xl bg-slate-900 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
              
              {/* Attachment Labels Bar */}
              <div className="flex flex-wrap p-2 gap-2 border-b border-slate-800 bg-slate-800/30 rounded-t-2xl items-center">
                <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-300 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors border border-slate-700" title={t.uploadCase}>
                  <PaperclipIcon className="w-4 h-4" />
                  <span className="font-medium">{t.uploadCase}</span>
                  <input type="file" multiple className="hidden" onChange={handleCaseFileChange} disabled={isTimeUp} />
                </label>
                
                <div className="h-4 w-px bg-slate-700 mx-1"></div>

                <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-300 hover:text-purple-400 hover:bg-slate-800 rounded-lg transition-colors border border-slate-700" title={t.uploadFormat}>
                  <TemplateIcon className="w-4 h-4" />
                  <span className="font-medium">{t.uploadFormat}</span>
                  <input type="file" multiple className="hidden" onChange={handleFormatFileChange} disabled={isTimeUp} />
                </label>

                <div className="relative">
                  <button 
                    onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                    disabled={isTimeUp}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-300 hover:text-purple-400 hover:bg-slate-800 rounded-lg transition-colors border border-slate-700 disabled:opacity-50"
                  >
                    <span className="font-medium">{t.selectTemplate}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </button>
                  
                  {showTemplateMenu && (
                    <div className="absolute bottom-full left-0 mb-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50">
                      {templateOptions.map(option => (
                        <button
                          key={option.id}
                          onClick={() => handleTemplateSelect(option.id)}
                          className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors border-b border-slate-700/50 last:border-0"
                        >
                          {option.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-end p-1">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={isTimeUp ? t.timeLimitReached : t.messagePlaceholder}
                  disabled={isTimeUp}
                  className="flex-1 max-h-32 p-3 bg-transparent resize-none outline-none text-white placeholder-slate-500 disabled:opacity-50"
                  rows={1}
                  onKeyDown={(e) => { 
                    if (e.key === 'Enter' && !e.shiftKey) { 
                      e.preventDefault(); 
                      handleSend(false); 
                    } 
                  }}
                />

                <div className="p-2 flex gap-2">
                  {isSpeechSupported && (
                    <button
                      onClick={toggleListening}
                      disabled={isTimeUp || isLoading}
                      className={`p-2 rounded-xl transition-colors shadow-sm ${isListening ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'} disabled:opacity-50 disabled:cursor-not-allowed`}
                      title="Speech to Text"
                    >
                      <MicIcon className={`w-5 h-5 ${isListening ? 'animate-pulse' : ''}`} />
                    </button>
                  )}
                  <button 
                    onClick={() => handleSend(false)}
                    disabled={!canSend || isTimeUp || isLoading}
                    className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    <SendIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <button 
              onClick={() => handleSend(true)}
              disabled={!canGenerate || isTimeUp || isLoading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3.5 rounded-2xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <SparklesIcon className="w-5 h-5 text-yellow-300 group-hover:animate-pulse" />
              {t.generateDoc}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
