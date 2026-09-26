/**
 * Utility to print an invoice section formatted identically to the on-screen display.
 * Uses an isolated hidden iframe with exact styles, theme variables, and color-adjust rules
 * to guarantee that backgrounds, badges, subtotals, and borders print cleanly to PDF without
 * leaking application navigation, sidebars, or layout artifacts.
 * Falls back to window.print() if iframe creation is blocked or unsupported.
 */
export function printInvoice(
  elementId: string,
  options?: { title?: string; projectName?: string }
): void {
  if (typeof window === 'undefined') return;

  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`[printInvoice] Element with ID '${elementId}' not found.`);
    window.print();
    return;
  }

  const documentTitle =
    options?.title ||
    (options?.projectName ? `Invoice - ${options.projectName}` : 'Invoice');

  try {
    // Remove any previous print iframe to avoid stale artifacts
    const existingIframe = document.getElementById('pf-invoice-print-frame');
    if (existingIframe) {
      existingIframe.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'pf-invoice-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      throw new Error('Unable to access iframe document');
    }

    // Collect all stylesheets and style rules from current page
    let stylesHtml = '';
    document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
      stylesHtml += link.outerHTML + '\n';
    });
    document.querySelectorAll('style').forEach((style) => {
      stylesHtml += style.outerHTML + '\n';
    });

    // Detect dark mode from root element or body
    const isDark =
      document.documentElement.classList.contains('dark') ||
      document.body.classList.contains('dark');
    const themeClass = isDark ? 'dark' : '';

    const contentHtml = element.outerHTML;

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html class="${themeClass}">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${documentTitle}</title>
          ${stylesHtml}
          <style>
            @page {
              size: landscape;
              margin: 12mm 10mm;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            html, body {
              margin: 0 !important;
              padding: 16px !important;
              background-color: ${isDark ? '#090d16' : '#ffffff'} !important;
              color: ${isDark ? '#f8fafc' : '#0f172a'} !important;
              font-family: inherit !important;
              overflow: visible !important;
              height: auto !important;
              min-height: 0 !important;
            }
            .overflow-x-auto {
              overflow: visible !important;
            }
            table {
              width: 100% !important;
              table-layout: auto !important;
              border-collapse: collapse !important;
            }
            tr {
              page-break-inside: avoid;
            }
            button, .no-print {
              display: none !important;
            }
          </style>
        </head>
        <body class="${themeClass}">
          <div style="width: 100%; max-width: 100%; margin: 0 auto;">
            ${contentHtml}
          </div>
        </body>
      </html>
    `);
    iframeDoc.close();

    // Trigger print after resources and layout are rendered
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.warn(
          '[printInvoice] Failed to trigger iframe print, falling back to window.print():',
          err
        );
        window.print();
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 2000);
      }
    }, 350);
  } catch (err) {
    console.warn(
      '[printInvoice] Exception during iframe printing, falling back to window.print():',
      err
    );
    window.print();
  }
}
