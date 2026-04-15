import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

export type AIProvider = "google" | "openai";

export interface TicketExtraction {
    description: string;
    amount: number;
    currency: "ARS" | "USD";
    category: string;
    date?: string;
}

function normalizeGoogleModelName(modelName: string | undefined | null) {
    const raw = (modelName || "").trim();
    if (!raw) return "gemini-2.0-flash";
    return raw.startsWith("models/") ? raw.slice("models/".length) : raw;
}

export async function extractTicketData(
    imageBuffer: Buffer,
    provider: AIProvider,
    apiKey: string,
    options?: { modelName?: string }
): Promise<TicketExtraction | null> {
    if (provider === "google") {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: normalizeGoogleModelName(options?.modelName) });

        const prompt = "Extract the following details from this receipt image: description (store/item), total amount (number), currency (ARS or USD), and a short category. Return ONLY a JSON object with keys: description, amount, currency, category.";

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: imageBuffer.toString("base64"),
                    mimeType: "image/jpeg",
                },
            },
        ]);

        const text = result.response.text();
        try {
            const cleanJson = text.replace(/```json|```/g, "").trim();
            return JSON.parse(cleanJson);
        } catch (e) {
            console.error("Failed to parse AI response:", text);
            return null;
        }
    }

    if (provider === "openai") {
        const openai = new OpenAI({ apiKey });
        const response = await openai.chat.completions.create({
            model: options?.modelName || "gpt-4o",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Extract description, amount, currency (ARS/USD), and category from this receipt. Return ONLY JSON." },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${imageBuffer.toString("base64")}`,
                            },
                        },
                    ],
                },
            ],
        });

        const text = response.choices[0].message.content;
        try {
            const cleanJson = text?.replace(/```json|```/g, "").trim() || "{}";
            return JSON.parse(cleanJson);
        } catch (e) {
            console.error("Failed to parse AI response:", text);
            return null;
        }
    }

    return null;
}

export async function getAIRecommendation(transactions: any[], provider: AIProvider, apiKey: string) {
    // Logic to provide financial advice based on history
    const prompt = `Based on these transactions, give 3 concise pieces of financial advice for this user in Spanish: ${JSON.stringify(transactions)}`;
    // Similar implementation to extractTicketData...
}
