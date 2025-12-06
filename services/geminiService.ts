
import { GoogleGenAI, Type } from "@google/genai";
import { Creator, AnalysisResult, CaptionResult } from '../types';

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
