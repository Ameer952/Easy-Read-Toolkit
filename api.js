import { BASE_URL } from "./config";

export async function rewriteEasyRead(sentence, keepTerms = []) {
  try {
    const response = await fetch(`${BASE_URL}/ai/rewrite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sentence, keepTerms }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`AI rewrite failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    // Your backend (server.js) returns 'data.candidates' from OpenAI
    // So we take the first one safely:
    return data.candidates?.[0]?.output_text || data.easyRead || "";
  } catch (error) {
    console.error("Error connecting to backend:", error);
    throw new Error("Failed to reach the AI service. Please try again.");
  }
}
