import { BASE_URL } from "./config";

/* =========================================================
   AI REWRITE
   ========================================================= */

export async function rewriteEasyRead(sentence, keepTerms = []) {
   try {
      const response = await fetch(`${BASE_URL}/ai/rewrite`, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ sentence, keepTerms }),
      });

      if (!response.ok) {
         const errorText = await response.text().catch(() => "");
         throw new Error(
            `AI rewrite failed (${response.status}): ${errorText}`
         );
      }

      const data = await response.json();
      return data.easyRead || "";
   } catch (error) {
      console.error("Error connecting to backend:", error);
      throw new Error("Failed to reach the AI service. Please try again.");
   }
}

/* =========================================================
   DOCUMENTS API (USER-LINKED)
   ========================================================= */

async function requestWithAuth(
   path,
   { method = "GET", headers = {}, body } = {},
   authToken
) {
   try {
      const response = await fetch(`${BASE_URL}${path}`, {
         method,
         headers: {
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            ...headers,
         },
         body,
      });

      const text = await response.text();
      let data;
      try {
         data = text ? JSON.parse(text) : {};
      } catch {
         data = { raw: text };
      }

      if (!response.ok) {
         const message =
            data?.message || data?.error || `HTTP ${response.status}`;
         throw new Error(message);
      }

      return data;
   } catch (error) {
      console.error("API error:", error);
      throw error;
   }
}

export async function fetchUserDocuments(authToken) {
   return requestWithAuth("/api/my-documents", {}, authToken);
}

export async function createUserDocument(
   authToken,
   { title, content, type, sourceTag, fileName, fileUrl }
) {
   return requestWithAuth(
      "/api/documents",
      {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
            title,
            content,
            type,
            sourceTag,
            fileName,
            fileUrl, // device-side PDF path for viewers (iOS / Android)
         }),
      },
      authToken
   );
}

export async function deleteUserDocument(authToken, id) {
   return requestWithAuth(
      `/api/documents/${encodeURIComponent(id)}`,
      { method: "DELETE" },
      authToken
   );
}

/* =========================================================
   SETTINGS API (USER-LINKED)
   ========================================================= */

export async function fetchUserSettings(authToken) {
   return requestWithAuth("/api/settings", {}, authToken);
}

export async function updateUserSettings(authToken, settingsObj) {
   return requestWithAuth(
      "/api/settings",
      {
         method: "PUT",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify(settingsObj || {}),
      },
      authToken
   );
}
