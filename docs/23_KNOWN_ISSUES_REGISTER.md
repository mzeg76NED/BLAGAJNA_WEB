# Known Issues Register

| ID | Date | Area | Issue | Severity | Status | Owner | Note |
|---|---|---|---|---|---|---|---|
| KI-001 | 2026-05-29 | Deployment | User identity behavior must be confirmed after Web App deployment. | High | Open | Admin | Test with real Google Workspace users. |
| KI-002 | 2026-05-29 | Documents | Drive upload must be tested on mobile devices. | Medium | Open | Admin | Camera/file picker behavior can differ by device. |
| KI-003 | 2026-05-29 | Database | Concurrent writes must be tested during pilot. | High | Open | Admin | Google Sheets is not a transactional database. |
| KI-004 | 2026-05-29 | Platform | Apps Script quotas must be monitored. | Medium | Open | Admin | Watch execution time and Drive operations. |
| KI-005 | 2026-05-29 | Print/PDF | Server-side PDF generation is not implemented. | Low | Open | Admin | Use browser Print / Save as PDF. |
| KI-006 | 2026-05-29 | Corrections | Correction after daily closing requires management process. | High | Open | Finance | Use reversal/correction events and document approval. |
| KI-007 | 2026-05-29 | Performance | Core UI actions measured during pilot took 22-40 seconds before Task 15 optimization. | High | Monitoring | Admin | Re-measure after deployment. |
| KI-008 | 2026-05-29 | Platform | Apps Script iframe can limit browser automation visibility. | Medium | Open | Admin | Use screenshot plus Sheet verification. |
| KI-009 | 2026-05-29 | Database | Google Sheets is not a high-volume transactional database. | Medium | Open | Admin | Keep pilot volume controlled and monitor quotas. |
