/**
 * Runs JavaScript in a sandboxed, opaque-origin iframe and an isolated Worker.
 * No server executes user code. CSP prevents network, storage and navigation;
 * the Worker can be terminated if code loops forever.
 */
export function runJavaScriptSafely(source: string, timeoutMs = 4000): Promise<string> {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    const session = crypto.randomUUID();
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.display = 'none';

    let settled = false;
    let timer: ReturnType<typeof setTimeout>;
    const finish = (result: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      iframe.remove();
      resolve(result.slice(0, 20000));
    };
    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow) return;
      const data = event.data;
      if (data?.type === 'meetly-sandbox-output' && data.session === session &&
          typeof data.output === 'string') {
        finish(data.output);
      }
    };
    window.addEventListener('message', onMessage);
    timer = setTimeout(
      () => finish('Execution stopped: code exceeded the 4-second safety limit.'),
      timeoutMs
    );

    const workerSource = [
      "self.onmessage = ({ data: code }) => {",
      " const lines = [];",
      " console.log = (...args) => lines.push(args.map(a => { try { return typeof a === 'object' ? JSON.stringify(a) : String(a); } catch { return '[object]'; } }).join(' '));",
      " console.error = console.log;",
      " try {",
      "  const returned = new Function(code)();",
      "  if (returned !== undefined) lines.push('[Return value]: ' + String(returned));",
      "  self.postMessage({ output: lines.join('\\n') || 'Executed successfully (no output).' });",
      " } catch (error) {",
      "  self.postMessage({ output: 'Execution error: ' + String(error?.message || error) });",
      " }",
      "};"
    ].join('\n');

    // Escape less-than signs to keep pasted code from closing script tags.
    const safelyEmbeddedCode = JSON.stringify(source).replace(/</g, '\\u003c');
    const embeddedScript = `
      const session = ${JSON.stringify(session)};
      const code = ${safelyEmbeddedCode};
      const source = ${JSON.stringify(workerSource)};
      try {
        const objectUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
        const worker = new Worker(objectUrl);
        URL.revokeObjectURL(objectUrl);
        worker.onmessage = (event) => {
          parent.postMessage({ type: 'meetly-sandbox-output', session, output: String(event.data.output || '') }, '*');
          worker.terminate();
        };
        worker.onerror = () => {
          parent.postMessage({ type: 'meetly-sandbox-output', session, output: 'Sandbox worker failed to start.' }, '*');
          worker.terminate();
        };
        worker.postMessage(code);
      } catch (error) {
        parent.postMessage({ type: 'meetly-sandbox-output', session, output: 'Sandbox unavailable: ' + String(error.message || error) }, '*');
      }
    `;
    iframe.srcdoc =
      '<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\' \'unsafe-eval\' blob:; worker-src blob:; connect-src \'none\'; form-action \'none\'; base-uri \'none\'"><script>' +
      embeddedScript + '</script>';
    document.body.appendChild(iframe);
  });
}
