
import { GoogleGenAI, Type } from "@google/genai";
import { Creator, AnalysisResult, CaptionResult, ReportedVideo, ReportAnalysisResult, ViralReportResult } from '../types';

const getClient = () => {
  // Check Environment Variables (Standard Vercel/Vite Config)
  // We prioritize VITE_GEMINI_API_KEY as the standard for this app.
  const apiKey = 
    (typeof import.meta !== 'undefined' && (import.meta as any).env ? (
      (import.meta as any).env.VITE_GEMINI_API_KEY || 
      (import.meta as any).env.VITE_API_KEY || 
      (import.meta as any).env.NEXT_PUBLIC_API_KEY
    ) : undefined) ||
    (typeof process !== 'undefined' ? (
      process.env.VITE_GEMINI_API_KEY ||
      process.env.API_KEY || 
      process.env.NEXT_PUBLIC_API_KEY
    ) : undefined);
              
  if (!apiKey) {
    console.warn("API Key is missing. Checked: VITE_GEMINI_API_KEY, VITE_API_KEY");
    throw new Error("Missing API Key. Please add 'VITE_GEMINI_API_KEY' to your Vercel Environment Variables.");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeCreatorData = async (creators: Creator[]): Promise<AnalysisResult> => {
  const dataset = JSON.stringify(creators.map(c => ({
    name: c.name,
    niche: c.niche,
    product: c.productCategory || 'Other',
    views: c.avgViews,
    likes: c.avgLikes,
    shares: c.avgShares || 0,
    engagement: c.avgViews > 0 ? ((c.avgLikes + c.avgComments + (c.avgShares || 0)) / c.avgViews).toFixed(3) : 0
  })));

  const prompt = `
    Analyze the following dataset of TikTok creators. 
    Provide a summary of performance, list key assumptions explaining the data patterns (e.g., why certain niches or products are performing better), 
    identify top performers, and suggest growth opportunities.
    Also infer the likely Audience Demographics (Age, Gender, Interests) based on the niches and product categories.
    
    Dataset: ${dataset}
  `;

  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            assumptions: { type: Type.ARRAY, items: { type: Type.STRING } },
            topPerformers: { type: Type.ARRAY, items: { type: Type.STRING } },
            growthOpportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
            audienceDemographics: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No analysis generated");
    
    const parsed = JSON.parse(text);

    return {
      summary: parsed.summary || "Analysis completed.",
      assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions : [],
      topPerformers: Array.isArray(parsed.topPerformers) ? parsed.topPerformers : [],
      growthOpportunities: Array.isArray(parsed.growthOpportunities) ? parsed.growthOpportunities : [],
      audienceDemographics: Array.isArray(parsed.audienceDemographics) ? parsed.audienceDemographics : []
    };
    
  } catch (error: any) {
    console.error("Analysis Error:", error);
    // Re-throw so the UI knows it failed, rather than showing empty data
    throw new Error(error.message || "Failed to generate analysis");
  }
};

export const analyzeClientData = async (clients: Creator[]): Promise<AnalysisResult> => {
  const dataset = JSON.stringify(clients.map(c => ({
    brand: c.name,
    industry: c.niche,
    totalVideos: c.videosCount,
    avgViews: c.avgViews,
    engagement: c.avgViews > 0 ? ((c.avgLikes + c.avgComments + (c.avgShares || 0)) / c.avgViews).toFixed(3) : 0,
    products: c.uploads?.map(u => u.product).slice(0, 3) || []
  })));

  const prompt = `
    Analyze the following dataset of Client Brands utilizing AI-generated video content.
    
    1. **Summary**: High-level overview of performance.
    2. **Good Things (Top Performers)**: Identify the best performing brands/industries and positive trends.
    3. **Key Assumptions for AI Videos**: What patterns explain the success? (e.g. Does the 'Tech' niche perform better with AI avatars? Do high engagement rates correlate with specific products?).
    4. **Growth Opportunities**: Strategic advice for scaling.
    5. **Audience Demographics**: Inferred target audience based on the industries.

    Dataset: ${dataset}
  `;

  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            topPerformers: { type: Type.ARRAY, items: { type: Type.STRING } }, // Mapped to "Good Things"
            assumptions: { type: Type.ARRAY, items: { type: Type.STRING } }, // Mapped to "Key Assumptions"
            growthOpportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
            audienceDemographics: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No analysis generated");
    
    const parsed = JSON.parse(text);

    return {
      summary: parsed.summary || "Analysis completed.",
      assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions : [],
      topPerformers: Array.isArray(parsed.topPerformers) ? parsed.topPerformers : [],
      growthOpportunities: Array.isArray(parsed.growthOpportunities) ? parsed.growthOpportunities : [],
      audienceDemographics: Array.isArray(parsed.audienceDemographics) ? parsed.audienceDemographics : []
    };
    
  } catch (error: any) {
    console.error("Client Analysis Error:", error);
    throw new Error(error.message || "Failed to generate client analysis");
  }
};

export const analyzeViralVideo = async (videoData: any): Promise<ViralReportResult> => {
  const prompt = `
    Analyze this single viral video performance to create an exclusive report.
    
    Video Details:
    Title: "${videoData.title}"
    Niche: "${videoData.niche}"
    Product: "${videoData.product}"
    Platform: "${videoData.platform}"
    
    Metrics:
    Views: ${videoData.views}
    Likes: ${videoData.likes}
    Comments: ${videoData.comments}
    Shares: ${videoData.shares}
    Saves: ${videoData.saves}
    
    Task:
    1. Calculate a "Virality Score" (0-100) based on the engagement ratio relative to views.
    2. Analyze the "Hook" effectiveness (theoretical, based on the high metrics).
    3. Determine the "Engagement Quality" (e.g., are people sharing? saving?).
    4. Provide 3 specific reasons "Why It Worked".
    5. Suggest 3 specific "Next Steps" to replicate this success.
  `;

  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            viralityScore: { type: Type.INTEGER },
            hookAnalysis: { type: Type.STRING },
            engagementQuality: { type: Type.STRING },
            whyItWorked: { type: Type.ARRAY, items: { type: Type.STRING } },
            nextSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No analysis generated");
    const parsed = JSON.parse(text);

    return {
      viralityScore: parsed.viralityScore || 0,
      hookAnalysis: parsed.hookAnalysis || "Analysis pending.",
      engagementQuality: parsed.engagementQuality || "Analysis pending.",
      whyItWorked: Array.isArray(parsed.whyItWorked) ? parsed.whyItWorked : [],
      nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : []
    };

  } catch (error: any) {
    console.error("Viral Analysis Error:", error);
    throw new Error(error.message || "Failed to analyze viral video");
  }
};

export const analyzeViolations = async (reports: ReportedVideo[]): Promise<ReportAnalysisResult> => {
  if (reports.length === 0) {
    throw new Error("No reports to analyze.");
  }

  // Create a simplified dataset for the AI to process token-efficiently
  const dataset = JSON.stringify(reports.map(r => ({
    type: r.violationType,
    product: r.productCategory,
    sanctions: r.sanctions,
    remarks: r.remarks,
    date: r.dateReported
  })));

  const prompt = `
    Analyze the following database of TikTok violation reports.
    1. Summarize the 'remarks' and overall situation.
    2. Identify the MAIN REASONS (root causes) why these violations are happening based on the patterns in types and remarks.
    3. Provide actionable recommendations to prevent future violations.

    Dataset: ${dataset}
  `;

  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            mainReasons: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No analysis generated");
    
    const parsed = JSON.parse(text);

    return {
      summary: parsed.summary || "No summary available.",
      mainReasons: Array.isArray(parsed.mainReasons) ? parsed.mainReasons : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : []
    };

  } catch (error: any) {
    console.error("Violation Analysis Error:", error);
    throw new Error(error.message || "Failed to generate violation analysis");
  }
};

export const generateTrendCaption = async (
  topic: string, 
  niche: string, 
  tone: string
): Promise<CaptionResult> => {
  try {
    const ai = getClient();
    const prompt = `
      Create a viral TikTok caption for a video about "${topic}" in the "${niche}" niche.
      Tone: ${tone}.
      
      Important:
      1. Search for CURRENT trending hashtags relevant to this specific topic and niche on TikTok today.
      2. Write a catchy hook.
      3. Explain the strategy behind why this caption works.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are a TikTok social media expert. Output your response in this structure:\nCaption: [The Caption]\nHashtags: [List of hashtags]\nStrategy: [Explanation]",
      },
    });

    const text = response.text || "";
    
    const captionMatch = text.match(/Caption:\s*(.+?)(?=\nHashtags:|$)/s);
    const hashtagsMatch = text.match(/Hashtags:\s*(.+?)(?=\nStrategy:|$)/s);
    const strategyMatch = text.match(/Strategy:\s*(.+?)$/s);

    let hashtags: string[] = [];
    if (hashtagsMatch) {
      hashtags = hashtagsMatch[1]
        .split(/[, ]+/)
        .filter(t => t.startsWith('#'))
        .map(t => t.trim());
    }

    return {
      caption: captionMatch ? captionMatch[1].trim() : text,
      hashtags: hashtags.length > 0 ? hashtags : ['#fyp', '#tiktok', `#${niche.replace(/\s+/g, '')}`],
      strategy: strategyMatch ? strategyMatch[1].trim() : "AI generated based on current trends."
    };

  } catch (error: any) {
    console.error("Caption Error:", error);
    throw new Error(error.message || "Failed to generate caption");
  }
};

export const scrapeVideoStats = async (videoUrl: string): Promise<{ views: number, likes: number, comments: number, shares: number } | null> => {
  try {
    const ai = getClient();
    
    // Extract ID to help search
    const idMatch = videoUrl.match(/\/video\/(\d+)/);
    const videoId = idMatch ? idMatch[1] : '';
    
    // Broader search query to find the video across Google
    const searchQuery = videoId 
      ? `site:tiktok.com inurl:${videoId} OR "tiktok video ${videoId}" stats`
      : `site:tiktok.com "${videoUrl}" views likes shares`;

    const prompt = `
      I need the public engagement stats for this TikTok video: "${videoUrl}".
      
      1. Use Google Search to find the most recent view count, like count, comment count AND SHARE count for this specific video.
      2. Look for search results that mention "K" (thousands) or "M" (millions) or "B" (billions).
      3. Return ONLY a JSON object with integer numbers. Convert K/M/B to full numbers.
      
      Output format:
      {
        "views": 12345,
        "likes": 123,
        "comments": 12,
        "shares": 50
      }
      
      If you absolutely cannot find any specific numbers for this video, return null.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are a data extraction assistant. You MUST return valid JSON. Do not use Markdown code blocks.",
        temperature: 0.1, // Very low temperature for factual extraction
      },
    });

    let text = response.text || "";
    
    // 1. Strip Markdown Code Blocks if present (```json ... ```)
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    // 2. Extract JSON using Regex
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    
    if (jsonMatch) {
      const json = JSON.parse(jsonMatch[0]);
      // Ensure we have numbers
      return {
        views: Number(json.views) || 0,
        likes: Number(json.likes) || 0,
        comments: Number(json.comments) || 0,
        shares: Number(json.shares) || 0
      };
    }
    
    return null;

  } catch (error) {
    console.error("Scraping error:", error);
    return null; // Return null to trigger manual override in UI
  }
};

export const analyzeProductImages = async (imageUrls: (string | null)[]): Promise<{ global: string, labels: string[] }> => {
  try {
    const ai = getClient();

    const parts: any[] = [];
    const validIndices: number[] = [];

    // Process images
    for (let i = 0; i < imageUrls.length; i++) {
        const url = imageUrls[i];
        if (!url) continue;
        
        validIndices.push(i);
        const response = await fetch(url);
        const blob = await response.blob();
        const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
        
        // Remove data:image/xxx;base64, prefix
        const cleanBase64 = base64.split(',')[1];
        const mimeType = base64.substring(base64.indexOf(':') + 1, base64.indexOf(';'));

        parts.push({
            inlineData: {
                data: cleanBase64,
                mimeType: mimeType
            }
        });
    }

    if (parts.length === 0) return { global: '', labels: [] };

    // Update prompt to be very explicit about JSON format since we can't use responseMimeType
    parts.push({
        text: `Analyze these ${parts.length} product images. 
        Return a valid, raw JSON object (do not use Markdown code blocks) with the following structure:
        {
            "global": "A short product summary.",
            "labels": ["Label 1", "Label 2", ...]
        }
        The "labels" array must have exactly ${parts.length} strings. Each string is a very short annotation (max 5-8 words) for the specific image (e.g. "Front: 14x20cm", "Pockets: 20 slots", "Weight: 1kg"). Order must match the images provided.`
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image", // Nano Banana
      contents: { parts },
      // NOTE: gemini-2.5-flash-image does NOT support responseMimeType: "application/json"
      // We must handle the text response manually.
    });

    let text = response.text || "{}";
    
    // Clean up if model still output markdown
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let json;
    try {
        json = JSON.parse(text);
    } catch (e) {
        console.warn("Raw JSON parse failed, attempting regex extraction", text);
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
            try {
                json = JSON.parse(match[0]);
            } catch (e2) {
                json = { global: '', labels: [] };
            }
        } else {
            json = { global: '', labels: [] };
        }
    }
    
    // Map partial labels back to full array slots (Dynamic length)
    const finalLabels = new Array(imageUrls.length).fill('');
    if (json && Array.isArray(json.labels)) {
        json.labels.forEach((label: string, idx: number) => {
            if (idx < validIndices.length) {
                finalLabels[validIndices[idx]] = label;
            }
        });
    }

    return {
        global: json?.global || '',
        labels: finalLabels
    };

  } catch (error: any) {
    console.error("Nano Banana Analysis Error:", error);
    throw new Error(error.message || "Failed to analyze images.");
  }
};
