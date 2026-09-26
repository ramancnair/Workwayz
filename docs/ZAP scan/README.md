# OWASP ZAP Security Scan Reports

This directory stores the OWASP ZAP (Zed Attack Proxy) vulnerability and dynamic application security testing (DAST) scan reports for ProjectFlow across the development and hardening lifecycle.

---

## Scan Reports Index

| Report File | Scan Date & Time | Target URL | High | Medium | Low | Informational | Status |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **[2026-09-22-ZAP-Report.pdf](./2026-09-22-ZAP-Report.pdf)** | 2026-09-22 16:04:03 | `http://192.168.1.8:3000` | 0 | 3 | 3 | 3 | **Scan 1**: Baseline Initial Scan |
| **[2026-09-26-ZAP-Report-2.pdf](./2026-09-26-ZAP-Report-2.pdf)** | 2026-09-26 14:15:20 | `http://192.168.1.6:3000` | 0 | 4 | 1 | 3 | **Scan 2**: Intermediate Remediation Scan |
| **[2026-09-26-ZAP-Report-3.pdf](./2026-09-26-ZAP-Report-3.pdf)** | 2026-09-26 19:38:40 | `http://192.168.1.6:3000` | 0 | **0** | **0** | 2 | **Scan 3**: Final Verification — All Vulnerabilities Resolved |

---

## Security Remediation Progression

Over the course of the 3 scans:

1. **High Risk Vulnerabilities**:
   * **0** throughout all scans (no critical exploits or SQL injection vulnerabilities detected).
2. **Medium Risk Vulnerabilities**:
   * Started at **3** in Scan 1.
   * Shifted to **4** in Scan 2 as new endpoints and features were scanned.
   * Completely eliminated down to **0** in Scan 3 (100% resolved via Content Security Policy and security headers).
3. **Low Risk Vulnerabilities**:
   * Started at **3** in Scan 1.
   * Decreased to **1** in Scan 2.
   * Completely eliminated down to **0** in Scan 3.
4. **Final Security Posture**:
   * **Clean zero-vulnerability report** with only 2 informational alerts.

---

## Files in This Directory
* `2026-09-22-ZAP-Report.pdf` — Baseline initial OWASP ZAP scan report.
* `2026-09-26-ZAP-Report-2.pdf` — Intermediate remediation OWASP ZAP scan report.
* `2026-09-26-ZAP-Report-3.pdf` — Final verification OWASP ZAP scan report.
