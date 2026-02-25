// app/api/test-ai/route.ts
// App Router API route to test AI review functionality

import { NextResponse } from 'next/server';
import { reviewArticleWithAI } from '../../../lib/ai-review';

function isTestRouteAllowed(request: Request) {
  const enabled = process.env.ENABLE_TEST_ROUTES === 'true';
  const internalKey = process.env.INTERNAL_API_KEY;
  const requestKey = request.headers.get('x-internal-api-key');
  return enabled && !!internalKey && requestKey === internalKey;
}

export async function POST(request: Request) {
  try {
    if (process.env.NODE_ENV === 'production' || !isTestRouteAllowed(request)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const testArticle = {
      title: "Test Article: Climate Change Impact",
      content: "Climate change is affecting our planet in many ways. Scientists have observed rising temperatures, melting ice caps, and more extreme weather events. This article discusses the importance of taking action to reduce carbon emissions and protect our environment. The information comes from reputable scientific sources and environmental organizations.",
      article_type: "reporting",
      disclosure: "This information is based on scientific reports from NASA, NOAA, and IPCC. The author has no financial conflicts of interest and believes in evidence-based environmental protection."
    };

    const result = await reviewArticleWithAI(testArticle as any);

    return NextResponse.json({
      success: true,
      testArticle,
      result,
    });

  } catch (error: any) {
    console.error('Test AI review error:', error);
    return NextResponse.json(
      { error: error.message || 'Test failed' },
      { status: 500 }
    );
  }
}
