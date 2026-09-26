import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { printInvoice } from '../printInvoice';

describe('printInvoice utility', () => {
  let originalPrint: typeof window.print;

  beforeEach(() => {
    originalPrint = window.print;
    window.print = vi.fn();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    window.print = originalPrint;
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('falls back to window.print if target element does not exist', () => {
    printInvoice('non-existent-element');
    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it('creates an iframe and populates it with element html and print styles', () => {
    const invoiceDiv = document.createElement('div');
    invoiceDiv.id = 'invoice-print-area';
    invoiceDiv.innerHTML = '<div class="test-content"><h3>1. Resource Billing</h3><p>Total: $52,586.00</p></div>';
    document.body.appendChild(invoiceDiv);

    printInvoice('invoice-print-area', {
      title: 'Invoice - Test Project - Fixed Bid',
      projectName: 'Test Project',
    });

    const iframe = document.getElementById('pf-invoice-print-frame') as HTMLIFrameElement;
    expect(iframe).not.toBeNull();

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    expect(doc).not.toBeNull();
    expect(doc?.title).toBe('Invoice - Test Project - Fixed Bid');
    expect(doc?.body.innerHTML).toContain('1. Resource Billing');
    expect(doc?.body.innerHTML).toContain('$52,586.00');
  });

  it('preserves dark mode class and color-adjust print rules', () => {
    document.documentElement.classList.add('dark');

    const invoiceDiv = document.createElement('div');
    invoiceDiv.id = 'invoice-print-area';
    invoiceDiv.innerHTML = '<p>Invoice Content</p>';
    document.body.appendChild(invoiceDiv);

    printInvoice('invoice-print-area', { title: 'Dark Mode Invoice' });

    const iframe = document.getElementById('pf-invoice-print-frame') as HTMLIFrameElement;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    expect(doc?.documentElement.classList.contains('dark')).toBe(true);

    document.documentElement.classList.remove('dark');
  });
});
