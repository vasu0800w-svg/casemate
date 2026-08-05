import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { Message } from '../types';

// Initialize the Gemini client
// Assuming process.env.API_KEY is provided by the environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, vertexai: true });

export const generateLegalResponse = async (
  prompt: string,
  history: Message[],
  caseFiles: File[],
  formatFiles: File[],
  templateContent: string | null,
  isGenerateDocument: boolean,
  language: string
): Promise<string> => {
  try {
    const currentParts: any[] = [];

    // Helper to convert file to base64
    const fileToBase64 = async (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          const result = reader.result as string;
          // Extract just the base64 data part
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
      });
    };

    // Process case files (Uploader 1) - Explicitly label them for the AI
    if (caseFiles.length > 0) {
      currentParts.push({ text: "--- START OF CASE FILES (USE THESE STRICTLY FOR ACTUAL FACTS, NAMES, DATES, AND CONTENT) ---" });
      for (const file of caseFiles) {
        const base64 = await fileToBase64(file);
        currentParts.push({
          inlineData: {
            mimeType: file.type || 'application/octet-stream',
            data: base64,
          },
        });
      }
      currentParts.push({ text: "--- END OF CASE FILES ---" });
    }

    // Process format reference files (Uploader 2) - Explicitly label them for the AI
    if (formatFiles.length > 0) {
      currentParts.push({ text: "--- START OF FORMAT TEMPLATE FILES (USE STRICTLY FOR LAYOUT/STYLE REFERENCE ONLY. DO NOT COPY FACTS, NAMES, OR SPECIFIC CASE DETAILS FROM HERE) ---" });
      for (const file of formatFiles) {
        const base64 = await fileToBase64(file);
        currentParts.push({
          inlineData: {
            mimeType: file.type || 'application/octet-stream',
            data: base64,
          },
        });
      }
      currentParts.push({ text: "--- END OF FORMAT TEMPLATE FILES ---" });
    }

    // Construct the text prompt with history context
    let finalPromptText = '';
    
    if (history.length > 0) {
      finalPromptText += "--- Previous Conversation Context ---\n";
      history.forEach(msg => {
        finalPromptText += `${msg.role === 'user' ? 'Advocate' : 'LegalAI'}: ${msg.text}\n`;
      });
      finalPromptText += "--- End Context ---\n\n";
    }

    // Add predefined template content if selected
    if (templateContent) {
      finalPromptText += `--- PREDEFINED FORMAT TEMPLATE TO FOLLOW (USE STRICTLY FOR LAYOUT/STYLE REFERENCE ONLY) ---\n${templateContent}\n--- END TEMPLATE ---\n\n`;
    }

    if (isGenerateDocument) {
      finalPromptText += `
TASK: Generate a comprehensive legal document based on the ENTIRE conversation history, provided case files, and instructions.
INSTRUCTIONS:
1. Synthesize all facts, evidence, and context ONLY from the previous conversation history and uploaded CASE FILES.
2. CRITICAL ACCURACY: Extract names, dates, places, and facts EXACTLY as they appear in the uploaded CASE FILES. DO NOT invent, hallucinate, or guess names. If a detail is missing, use a placeholder like [NAME] or [DATE].
3. Carefully map the Petitioner/Applicant/Complainant and Respondent/Defendant/Accused names from the CASE FILES to the correct positions in the document.
4. Analyze the provided FORMAT TEMPLATE files OR predefined format template (if any) to understand the required structure, tone, headings, and formatting style.
5. STRICT SEPARATION: You MUST NOT copy any specific names, facts, or case details from the FORMAT TEMPLATE. The format template is purely a visual and structural guide. Apply the facts from the CASE FILES into the structure of the FORMAT TEMPLATE.
6. Draft the final document based on the user's request below, strictly adhering to the style of the format reference/template.
7. FORMATTING RULES (CRITICAL):
   - You MUST use [CENTER]text[/CENTER] for Court Names, Main Titles, "PRAYER", and "VERIFICATION".
   - You MUST use [RIGHT]text[/RIGHT] for Signatures, Dates, Place, or any text that should be right-aligned.
   - For elements that must appear on the EXACT SAME LINE with space in between (e.g., Date/Place on the left corner and Signature/Name on the right corner of the same line), you MUST use the format: [SPLIT]Left Text | Right Text[/SPLIT].
   - You MUST use **text** for bolding important terms, names, and headings.
   - You MUST use [U]text[/U] for underlining text.
   - Combine them if needed, e.g., [CENTER]**[U]HEADING[/U]**[/CENTER].
8. Output ONLY the document content. Do not include conversational filler like "Here is the document".
9. Ensure the output is professional, legally sound, and ready for review.

USER REQUEST: ${prompt}
      `;
    } else {
      finalPromptText += `
CRITICAL ACCURACY: When answering, extract names, dates, places, and facts EXACTLY as they appear in the uploaded case files. DO NOT invent or hallucinate details.

USER REQUEST: ${prompt}`;
    }

    // Apply language preference
    if (language !== 'English') {
      finalPromptText += `\n\nIMPORTANT: Please provide your entire response in ${language}.`;
    }

    currentParts.push({ text: finalPromptText });

    // Call the Gemini API
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        role: 'user',
        parts: currentParts,
      },
      config: {
        systemInstruction: 'You are LegalAI, an expert legal assistant and drafter. You help advocates analyze cases, extract facts, and draft documents with precise formatting based on their preferences. CRITICAL: You must be extremely accurate with names, dates, and facts from the provided files. Never invent or hallucinate information. Never mix template placeholder text with actual case facts.',
      }
    });

    return response.text || 'No response generated.';
  } catch (error) {
    console.error('Error calling Gemini:', error);
    return 'An error occurred while processing your request. Please ensure your files are valid and try again.';
  }
};
