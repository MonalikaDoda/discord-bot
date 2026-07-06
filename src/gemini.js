async function summarizeAndTagReport(reportText, options = {}) {
  const timeoutMs = options.timeoutMs || 8000;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

    const prompt = `You are an assistant. Given the following incident report, return only a JSON object with two keys:\n` +
      `  - \"summary\": a single short one-line summary of the report.\n` +
      `  - \"urgency\": one of the exact values High, Medium, or Low.\n` +
      `Do not add any explanation or extra text.\n\nReport:\n${reportText}`;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch('https://generativelanguage.googleapis.com/v1beta2/models/text-bison-001:generateText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`,
      },
      body: JSON.stringify({
        prompt: { text: prompt },
        maxOutputTokens: 256,
      }),
      signal: controller.signal,
    });
    clearTimeout(id);

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Gemini API error ${res.status}: ${body}`);
    }

    const data = await res.json();

    const rawText = (data?.candidates?.[0]?.output) || (data?.candidates?.[0]?.content) ||
      (data?.output?.[0]?.content) || (data?.text) || JSON.stringify(data);

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        const summary = parsed.summary ? String(parsed.summary).trim() : null;
        let urgency = parsed.urgency ? String(parsed.urgency).trim() : null;
        if (urgency) {
          urgency = urgency.charAt(0).toUpperCase() + urgency.slice(1).toLowerCase();
          if (!['High', 'Medium', 'Low'].includes(urgency)) urgency = null;
        }
        if (summary) return { summary, urgency };
      } catch (e) {
      }
    }

    const urgencyMatch = rawText.match(/\b(High|Medium|Low)\b/i);
    const urgency = urgencyMatch ? (urgencyMatch[1].charAt(0).toUpperCase() + urgencyMatch[1].slice(1).toLowerCase()) : null;
    const firstLine = rawText.split(/\r?\n/).map(l => l.trim()).find(l => l.length > 0) || reportText;
    const summary = firstLine.length > 200 ? firstLine.slice(0, 200) + '...' : firstLine;

    return { summary, urgency };
  } catch (error) {
    try {
      const oneLine = reportText.split(/\r?\n/)[0].trim();
      const summary = oneLine.length > 200 ? oneLine.slice(0, 200) + '...' : oneLine || reportText;
      return { summary, urgency: null };
    } catch (e) {
      return { summary: reportText, urgency: null };
    }
  }
}

module.exports = { summarizeAndTagReport };
