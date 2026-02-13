import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { audio } = await req.json();

    if (!audio) {
      return new Response(
        JSON.stringify({ error: "No audio provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== Step 1: Deepgram STT =====
    const deepgramKey = Deno.env.get("DEEPGRAM_API_KEY");
    if (!deepgramKey) {
      throw new Error("DEEPGRAM_API_KEY not configured");
    }

    const audioBuffer = Uint8Array.from(atob(audio), (c) => c.charCodeAt(0));

    const sttResponse = await fetch(
      "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${deepgramKey}`,
          "Content-Type": "audio/m4a",
        },
        body: audioBuffer,
      }
    );

    if (!sttResponse.ok) {
      const errText = await sttResponse.text();
      throw new Error(`Deepgram error (${sttResponse.status}): ${errText}`);
    }

    const sttData = await sttResponse.json();
    const transcript =
      sttData.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";

    if (!transcript.trim()) {
      return new Response(
        JSON.stringify({ error: "Could not transcribe audio. Please try again." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== Step 2: Gemini Classification =====
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const classificationPrompt = buildClassificationPrompt(transcript);

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: classificationPrompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      throw new Error(`Gemini error (${geminiResponse.status}): ${errText}`);
    }

    const geminiData = await geminiResponse.json();
    const geminiText =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    let intent;
    try {
      intent = JSON.parse(geminiText);
    } catch {
      throw new Error("Failed to parse Gemini response as JSON");
    }

    return new Response(
      JSON.stringify({
        transcript,
        intent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Build the Gemini classification prompt with full LOG + QUERY + ACT support.
 */
function buildClassificationPrompt(transcript: string): string {
  return `You are Saelo, an AI assistant that classifies voice commands into structured intents.

Analyze the following voice transcript and classify it as one of three intent types:

## Intent Types

### LOG — Recording/saving data
Categories: expense, income, contact, event
Examples:
- "Log a $50 dinner expense" → LOG/expense
- "I earned $500 from consulting" → LOG/income
- "Add John Smith as a contact" → LOG/contact (when just saving info, not performing an action)
- "Note that I have a dentist appointment Thursday" → LOG/event

### QUERY — Asking questions about data
Categories: calendar, finance, contact, task, general
Examples:
- "What meetings do I have tomorrow?" → QUERY/calendar
- "How much did I spend this month?" → QUERY/finance
- "Do I have Sarah's phone number?" → QUERY/contact
- "What tasks are due this week?" → QUERY/task
- "What's on my plate today?" → QUERY/general

### ACT — Performing an action or creating something
Categories: email, event, todo, workspace, contact, transaction, draft
Examples:
- "Send an email to John about the meeting" → ACT/email
- "Email Sarah the project update" → ACT/email
- "Schedule a meeting tomorrow at 2pm with the team" → ACT/event
- "Create a calendar event for Friday lunch" → ACT/event
- "Create a task to review the contract by Friday" → ACT/todo
- "Add a to-do: call the plumber" → ACT/todo
- "Create a workspace for Project Alpha" → ACT/workspace
- "Set up a new project called Marketing Q2" → ACT/workspace
- "Add Sarah as a new contact with phone 555-1234" → ACT/contact (when explicitly creating/adding)
- "Log a $200 payment from client as income" → ACT/transaction
- "Record $50 for office supplies" → ACT/transaction
- "Save a draft email to the team about the offsite" → ACT/draft
- "Draft a message to investors about Q2 results" → ACT/draft

## Classification Rules
1. LOG vs ACT: LOG is passive recording of past events. ACT is creating/performing something new.
   - "I spent $50 on lunch" → LOG (recording what happened)
   - "Record a $50 expense for lunch" → ACT/transaction (explicitly creating a record)
   - "Send email to John" → ACT/email (performing an action)
   - "Met Sarah at the conference" → LOG/contact (noting a past event)
2. ACT/email: Any command that involves sending or composing an email. Extract to, subject, body.
3. ACT/event: Any command to schedule, create, or set up a calendar event. Extract title, date, time, duration, location, attendees.
4. ACT/todo: Creating tasks, to-dos, reminders. Extract title, due_date, priority.
5. ACT/workspace: Creating a new project or workspace. Extract title, type (Business/Personal/Admin/Creative).
6. ACT/contact: Explicitly adding a new contact with details. Extract name, phone, email, company, role.
7. ACT/transaction: Explicitly recording/logging a financial entry. Extract amount, description, category (Income/Personal Expenses/Business Expenses), date.
8. ACT/draft: Saving a draft message without sending. Extract to, subject, body.

## Response Format
Return a JSON object with these fields:
{
  "intentType": "log" | "query" | "act",
  "category": "<category from above>",
  "title": "<short summary of the command>",
  "detail": "<longer description or the full command context>",
  "confidence": <0.0 to 1.0>,
  "entities": {
    // For expense/income/transaction:
    "amount": <number>,
    "description": "<what it's for>",
    "store": "<vendor/source>",
    "date": "<date string or null>",
    "businessExpense": <boolean>,
    "category": "<Income|Personal Expenses|Business Expenses>",

    // For contact:
    "person": "<name>",
    "name": "<name>",
    "role": "<role>",
    "company": "<company>",
    "phone": "<phone>",
    "email": "<email>",
    "whereMet": "<where met>",

    // For event:
    "title": "<event title>",
    "date": "<date>",
    "time": "<time>",
    "duration": "<duration>",
    "location": "<location>",
    "attendees": ["<name1>", "<name2>"],

    // For email:
    "to": "<recipient email or name>",
    "subject": "<email subject>",
    "body": "<email body text>",

    // For todo:
    "title": "<task title>",
    "due_date": "<due date>",
    "priority": "high" | "medium" | "low",

    // For workspace:
    "title": "<workspace name>",
    "type": "Business" | "Personal" | "Admin" | "Creative",

    // For draft:
    "to": "<recipient>",
    "subject": "<subject>",
    "body": "<draft body>"
  }
}

Only include entity fields that are relevant to the classified category. Omit fields that weren't mentioned.

Voice transcript: "${transcript}"`;
}
