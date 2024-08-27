import { VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const secretKey = process.env.SECRET_KEY || '';

export async function POST(request: Request, response: VercelResponse) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== `Bearer ${secretKey}`) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const body = await request.json();
    const formContent = JSON.stringify(body);

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a spam detection assistant. Respond with 'true' if the given content is spam, or 'false' if it's not spam." },
        { role: "user", content: `Is this spam? ${formContent}` }
      ],
      max_tokens: 5,
    });

    const isSpam = completion.choices[0].message.content?.trim().toLowerCase() === 'true';

    return response.status(200).json({ isSpam });
  } catch (error) {
    console.error('Error checking spam:', error);
    return response.status(500).json({ error: 'Internal Server Error' });
  }
}
