import { NextRequest } from 'next/server';

export interface FrameButton {
  title: string;
  action: 'post' | 'post_redirect' | 'link' | 'mint';
  target?: string;
}

export interface FrameMetadata {
  version: 'next';
  imageUrl: string;
  imageAspectRatio?: '1.91:1' | '1:1';
  buttons?: FrameButton[];
  input?: {
    text: string;
  };
  postUrl?: string;
  state?: Record<string, any>;
}

export function generateFrameMetadata(metadata: FrameMetadata): Record<string, string> {
  const frameMeta: Record<string, string> = {
    'fc:frame': metadata.version,
    'fc:frame:image': metadata.imageUrl,
  };

  if (metadata.imageAspectRatio) {
    frameMeta['fc:frame:image:aspect_ratio'] = metadata.imageAspectRatio;
  }

  if (metadata.buttons && metadata.buttons.length > 0) {
    metadata.buttons.forEach((button, index) => {
      const buttonIndex = index + 1;
      frameMeta[`fc:frame:button:${buttonIndex}`] = button.title;
      frameMeta[`fc:frame:button:${buttonIndex}:action`] = button.action;
      
      if (button.target) {
        frameMeta[`fc:frame:button:${buttonIndex}:target`] = button.target;
      }
    });
  }

  if (metadata.input) {
    frameMeta['fc:frame:input:text'] = metadata.input.text;
  }

  if (metadata.postUrl) {
    frameMeta['fc:frame:post_url'] = metadata.postUrl;
  }

  if (metadata.state) {
    frameMeta['fc:frame:state'] = JSON.stringify(metadata.state);
  }

  return frameMeta;
}

export function parseFrameRequest(request: NextRequest) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  
  return {
    buttonIndex: searchParams.get('buttonIndex'),
    inputText: searchParams.get('inputText'),
    state: searchParams.get('state') ? JSON.parse(searchParams.get('state')!) : {},
    fid: searchParams.get('fid'),
    username: searchParams.get('username'),
    displayName: searchParams.get('displayName'),
  };
}

export function createFrameResponse(metadata: FrameMetadata, html?: string) {
  const frameMeta = generateFrameMetadata(metadata);
  
  const htmlContent = html || `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="fc:frame" content="${frameMeta['fc:frame']}" />
        <meta property="fc:frame:image" content="${frameMeta['fc:frame:image']}" />
        ${frameMeta['fc:frame:image:aspect_ratio'] ? `<meta property="fc:frame:image:aspect_ratio" content="${frameMeta['fc:frame:image:aspect_ratio']}" />` : ''}
        ${Object.entries(frameMeta)
          .filter(([key]) => key.startsWith('fc:frame:button'))
          .map(([key, value]) => `<meta property="${key}" content="${value}" />`)
          .join('\n        ')}
        ${frameMeta['fc:frame:input:text'] ? `<meta property="fc:frame:input:text" content="${frameMeta['fc:frame:input:text']}" />` : ''}
        ${frameMeta['fc:frame:post_url'] ? `<meta property="fc:frame:post_url" content="${frameMeta['fc:frame:post_url']}" />` : ''}
        ${frameMeta['fc:frame:state'] ? `<meta property="fc:frame:state" content="${frameMeta['fc:frame:state']}" />` : ''}
        <title>Esusu Frame</title>
      </head>
      <body>
        <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: system-ui;">
          <img src="${metadata.imageUrl}" alt="Frame Image" style="max-width: 100%; max-height: 100%;" />
        </div>
      </body>
    </html>
  `;

  return new Response(htmlContent, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}