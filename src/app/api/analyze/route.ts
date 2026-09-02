import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GOOGLE_CLOUD_PROJECT,
  location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
});

function getMimeType(file: File): string {
  if (file.type && file.type !== 'application/octet-stream') {
    return file.type;
  }
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return 'application/pdf';
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.txt')) return 'text/plain';
  return file.type || 'text/plain';
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'Please upload at least one document.' },
        { status: 400 }
      );
    }

    const fileParts = await Promise.all(
      files.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return {
          inlineData: {
            data: buffer.toString('base64'),
            mimeType: getMimeType(file),
          },
        };
      })
    );

    const existingContext = formData.get('existingContext') as string | null;

    let promptText = '';

    if (existingContext) {
      promptText = `
You are CareBridge AI, a clinical post-hospital care coordinator.
You are provided with NEW patient medical document(s) alongside an EXISTING PATIENT CARE PLAN CONTEXT.

EXISTING PATIENT CONTEXT:
${existingContext}

CRITICAL INSTRUCTION FOR LENGTH AND DETAIL:
- Do NOT provide brief or single-word answers.
- Write thorough, comprehensive, and detailed descriptions for every field (summaries, recommendations, reasons, gaps, and timeline steps).
- Ensure clinical nuances and post-discharge instructions are fully explained in complete sentences.

CRITICAL OCR INSTRUCTION:
- Perform optical character recognition (OCR) on any provided image or scanned PDF.
- Extract all clinical text including handwritten clinical notes, medication names, dosages, frequencies, and diagnostic laboratory values.
- Ignore stamps, noise, or background artifacts and produce a standard unified JSON report.

Task:
1. Reconcile the newly provided medical document(s) against the EXISTING PATIENT CONTEXT.
2. Incorporate newly prescribed medications, modified dosages, newly identified conflicts, missing lab gaps, required action items, and updated timeline steps while preserving valid historical details.
3. Dynamically update or refine the primary diagnosis/condition and Emergency / Clinic Red-Flag escalation triggers based on all cumulative records.

Return a SINGLE, valid JSON object matching this structure strictly:

{
  "patient": {
    "name": "string",
    "dob": "string",
    "dischargeDate": "string"
  },
  "needsAttention": [
    {
      "id": "string",
      "title": "string",
      "severity": "HIGH | MEDIUM | LOW",
      "summary": "Detailed sentence explaining the conflict",
      "sources": [
        {
          "documentName": "string",
          "excerpt": "Exact quote or excerpt supporting this conflict from this document"
        }
      ],
      "recommendation": "Detailed actionable clinical recommendation"
    }
  ],
  "actionNeeded": [
    {
      "id": "string",
      "task": "string",
      "deadline": "string",
      "reason": "Detailed clinical reasoning"
    }
  ],
  "upcoming": [
    {
      "id": "string",
      "task": "string",
      "timeframe": "string",
      "reason": "Detailed explanation"
    }
  ],
  "gaps": [
    {
      "id": "string",
      "missingInfo": "string",
      "impact": "Detailed potential clinical impact",
      "recommendation": "Detailed safe action plan"
    }
  ],
  "timeline": [
    {
      "step": 1,
      "event": "Detailed description of step",
      "dependency": "Prerequisite step or condition",
      "status": "string"
    }
  ],
  "redFlags": {
    "condition": "Primary diagnosed condition extracted from records",
    "emergencyTriggers": [
      "Detailed emergency symptom 1 specific to condition"
    ],
    "clinicTriggers": [
      "Detailed clinic call trigger 1 specific to condition"
    ]
  }
}
`;
    } else {
      promptText = `
You are CareBridge AI, a clinical post-hospital care coordinator. Analyze all provided patient medical documents as a single unified record.

CRITICAL INSTRUCTION FOR LENGTH AND DETAIL:
- Do NOT provide brief or single-word answers.
- Write thorough, comprehensive, and detailed descriptions for every field (summaries, recommendations, reasons, gaps, and timeline steps).
- Ensure clinical nuances and post-discharge instructions are fully explained in complete sentences.

CRITICAL OCR INSTRUCTION:
- Perform optical character recognition (OCR) on any provided image or scanned PDF.
- Extract all clinical text including handwritten clinical notes, medication names, dosages, frequencies, and diagnostic laboratory values.
- Ignore stamps, noise, or background artifacts and produce a standard unified JSON report.

Task:
1. Reconcile medical instructions, detect conflicts, missing lab gaps, required action items, and timelines.
2. Dynamically extract the patient's primary diagnosis/condition and derive clinically appropriate Emergency and Clinic Red-Flag escalation triggers specific to their conditions.

Return a SINGLE, valid JSON object matching this structure strictly:

{
  "patient": {
    "name": "string",
    "dob": "string",
    "dischargeDate": "string"
  },
  "needsAttention": [
    {
      "id": "string",
      "title": "string",
      "severity": "HIGH | MEDIUM | LOW",
      "summary": "Detailed sentence explaining the conflict",
      "sources": [
        {
          "documentName": "string",
          "excerpt": "Exact quote or excerpt supporting this conflict from this document"
        }
      ],
      "recommendation": "Detailed actionable clinical recommendation"
    }
  ],
  "actionNeeded": [
    {
      "id": "string",
      "task": "string",
      "deadline": "string",
      "reason": "Detailed clinical reasoning"
    }
  ],
  "upcoming": [
    {
      "id": "string",
      "task": "string",
      "timeframe": "string",
      "reason": "Detailed explanation"
    }
  ],
  "gaps": [
    {
      "id": "string",
      "missingInfo": "string",
      "impact": "Detailed potential clinical impact",
      "recommendation": "Detailed safe action plan"
    }
  ],
  "timeline": [
    {
      "step": 1,
      "event": "Detailed description of step",
      "dependency": "Prerequisite step or condition",
      "status": "string"
    }
  ],
  "redFlags": {
    "condition": "Primary diagnosed condition extracted from records",
    "emergencyTriggers": [
      "Detailed emergency symptom 1 specific to condition"
    ],
    "clinicTriggers": [
      "Detailed clinic call trigger 1 specific to condition"
    ]
  }
}
`;
    }

    let response;
    let modelUsed = 'Gemini 3.6 Flash (Primary High-Precision Model)';

    try {
      // 1. Primary Attempt
      response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        config: {
          temperature: 0.1, // Slight temperature boost encourages fuller descriptive text
        },
        contents: [...fileParts, { text: promptText }],
      });
    } catch (primaryError: any) {
      if (
        primaryError.status === 429 ||
        primaryError.message?.includes('429') ||
        primaryError.message?.includes('quota')
      ) {
        console.warn('Gemini 3.6 Flash quota exceeded. Switching to fallback model.');
        modelUsed = 'Gemini 3.5 Flash-Lite (Fallback Fast Engine)';

        // 2. Fallback Attempt
        response = await ai.models.generateContent({
          model: 'gemini-3.5-flash-lite',
          config: {
            temperature: 0.1,
            responseMimeType: 'application/json'
          },
          contents: [...fileParts, { text: promptText }],
        });
      } else {
        throw primaryError;
      }
    }

    if (!response.text) {
      throw new Error('No response text returned from AI model.');
    }

    // Mandatory sanitization for both models when responseMimeType is omitted
    const cleanedText = response.text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const data = JSON.parse(cleanedText);

    return NextResponse.json({
      ...data,
      meta: {
        modelUsed,
        isFallback: modelUsed.includes('Lite'),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}