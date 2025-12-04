import { GoogleGenAI, Type } from "@google/genai";
import { Creator, AnalysisResult, CaptionResult } from '../types';

const getClient = () => {
  // Support both process.env (Node/CRA) and import.meta.env (Vite/Vercel)
  // This prevents "process is not defined" errors in modern browser builds
  const apiKey = (typeof process !== 'undefined' ? process.env.API_KEY : undefined) 
              || (typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env.VITE_API_KEY : undefined);
              
  if (!apiKey) {
    console.warn("API Key is missing. Check your .env file or Vercel Environment Variables.");
    throw new Error("API_KEY environment variable is missing.");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeCreatorData = async (creators: Creator[]): Promise<AnalysisResult> => {
  const ai = getClient();
  const dataset = JSON.stringify(creators.map(c => ({
    name: c.name,
    niche: c.niche,
    views: c.avgViews,
    likes: c.avgLikes,
    engagement: c.avgViews > 0 ? ((c.avgLikes + c.avgComments) / c.avgViews).toFixed(3) : 0
  })));

  const prompt = `
    Analyze the following dataset of TikTok creators. 
    Provide a summary of performance, list key assumptions explaining the data patterns (e.g., why certain niches are performing better), 
    identify top performers, and suggest growth opportunities.
    
    Dataset: ${dataset}
  `;

  try {
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
      growthOpportunities: Array.isArray(parsed.growthOpportunities) ? parsed.growthOpportunities : []
    };
    
  } catch (error) {
    console.error("Analysis Error:", error);
    return {
      summary: "Unable to analyze data at this time.",
      assumptions: ["Error processing request."],
      topPerformers: [],
      growthOpportunities: []
    };
  }
};

export const generateTrendCaption = async (
  topic: string, 
  niche: string, 
  tone: string
): Promise<CaptionResult> => {
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
  
  const captionMatch = text.match(/Caption:\s*([\s\S]*?)(?=Hashtags:|$)/i);
  const hashtagsMatch = text.match(/Hashtags:\s*([\s\S]*?)(?=Strategy:|$)/i);
  const strategyMatch = text.match(/Strategy:\s*([\s\S]*)/i);

  const caption = captionMatch ? captionMatch[1].trim() : "See generated text below.";
  const hashtagsRaw = hashtagsMatch ? hashtagsMatch[1].trim() : "";
  const hashtags = hashtagsRaw.split(/[\s,]+/).filter(tag => tag.startsWith('#'));
  const strategy = strategyMatch ? strategyMatch[1].trim() : text;

  return {
    caption,
    hashtags: hashtags.length > 0 ? hashtags : ['#fyp', '#trending'],
    strategy
  };
};

// Helper to extract TikTok Video ID
const extractVideoId = (url: string): string | null => {
  const match = url.match(/\/video\/(\d+)/);
  return match ? match[1] : null;
};

// Improved Scraper Function
export const scrapeVideoStats = async (url: string): Promise<{ views: number; likes: number; comments: number } | null> => {
  const ai = getClient();
  const videoId = extractVideoId(url);
  
  // Construct a smarter search query
  const searchQuery = videoId 
    ? `site:tiktok.com "${videoId}"` 
    : `TikTok video "${url}" stats`;

  const prompt = `
    I need you to act as a precise data extractor.
    Target Video URL: "${url}"
    Search Query Context: ${searchQuery}
    
    Task:
    1. Use Google Search to find the PUBLIC engagement metrics for this specific TikTok video.
    2. Look specifically for numbers associated with "Views", "Likes", "Comments" in the search snippets.
    3. Be careful with "K" (thousand), "M" (million), "B" (billion). Convert them to plain integers.
       - Example: "1.2M" = 1200000
       - Example: "50.5K" = 50500
    
    CRITICAL OUTPUT RULE:
    You must output a VALID JSON object. Do not include any markdown formatting.
    
    Required JSON Format:
    {
      "views": <number>,
      "likes": <number>,
      "comments": <number>
    }
    
    If absolutely no data is found for this specific video, return 0 for the values.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are a JSON-only API. You extract numbers from text. You convert 'K', 'M' suffixes to numbers.",
        temperature: 0.1, 
      },
    });

    const text = response.text;
    if (!text) {
      console.warn("Gemini returned empty text.");
      return null;
    }

    // Robust Parsing: Find the first JSON-like structure in the response
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    
    if (!jsonMatch) {
      console.warn("No JSON found in response:", text);
      return null;
    }

    const data = JSON.parse(jsonMatch[0]);
    
    return {
      views: typeof data.views === 'number' ? data.views : Number(data.views) || 0,
      likes: typeof data.likes === 'number' ? data.likes : Number(data.likes) || 0,
      comments: typeof data.comments === 'number' ? data.comments : Number(data.comments) || 0
    };

  } catch (error) {
    console.error("Scraping error:", error);
    return null;
  }
};