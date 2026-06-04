export async function POST({ request }) {
  try {
    const { logText } = await request.json();

    // ⚡ Naya Logic: Yeh purani key aur nayi keys dono ko support karega.
    // Isse aapko apni .env file change nahi karni padegi!
    const apiKeys = [
      import.meta.env.GROQ_API_KEY,   // Aapki current .env file wali key
      import.meta.env.GROQ_API_KEY_1, // Future backup key 1
      import.meta.env.GROQ_API_KEY_2  // Future backup key 2
    ].filter(Boolean); // Jo keys nahi milengi unko ignore kar dega

    // Agar koi bhi key nahi mili, tabhi error aayega
    if (apiKeys.length === 0) {
      throw new Error("Server Error: API Key .env file mein nahi mil rahi hai.");
    }

    let groqResponse;
    let successfulKeyIndex = -1;

    // ⚡ Try keys one by one until one works
    for (let i = 0; i < apiKeys.length; i++) {
      const currentKey = apiKeys[i];
      
      groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          stream: true, 
          max_tokens: 1024,
          messages: [
            {
              role: "system",
              content: "You are an expert Red Hat Linux Administrator. Analyze logs, write shell scripts, create cron jobs, and provide exact Linux commands based on the user's request. Use clear markdown formatting.",
            },
            {
              role: "user",
              content: "Please help me with this Linux task or analyze this log:\n\n" + logText,
            },
          ],
        }),
      });

      // Agar response 429 (Rate Limit) hai, toh next key try karega loop mein
      if (groqResponse.ok) {
        successfulKeyIndex = i;
        break; // Key chal gayi, loop se bahar aa jao
      } else if (groqResponse.status !== 429) {
        // Agar rate limit ke alawa koi aur bada error aaya toh turant break
        break;
      }
    }

    // ⚡ Agar saari keys fail ho gayi (sabki limit khatam)
    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      // Yahan specific 429 status check kar rahe hain taaki frontend ko graceful message bheje
      if (groqResponse.status === 429) {
        return new Response(JSON.stringify({ error: "LIMIT_REACHED" }), { status: 429 });
      }
      throw new Error(`API Error ${groqResponse.status}: ${errText}`);
    }

    // Streaming Logic
    const stream = new ReadableStream({
      async start(controller) {
        const reader = groqResponse.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); // Aakhiri aadi line ko buffer mein rakho

            for (const line of lines) {
              const trimmedLine = line.trim();
              if (trimmedLine.startsWith('data: ') && trimmedLine !== 'data: [DONE]') {
                try {
                  const data = JSON.parse(trimmedLine.slice(6));
                  const text = data.choices[0]?.delta?.content || "";
                  if (text) {
                    controller.enqueue(new TextEncoder().encode(text));
                  }
                } catch (e) {
                  // Ignore partial JSON parse errors
                }
              }
            }
          }
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });

  } catch (error) {
    // ⚡ Backend Crash Handle
    console.error("Backend Error:", error);
    return new Response(error.message, { 
      status: 500,
      headers: { "Content-Type": "text/plain" }
    });
  }
}