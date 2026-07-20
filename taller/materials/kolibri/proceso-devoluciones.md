[FICTIONAL - workshop material]
# Process: online order returns management (fictional retail client "ModaExpress")
Volume: ~45,000 cases/month, 60% chat, 40% email. Current team: 38 agents.
Current flow: (1) customer contacts with order number; (2) agent verifies the purchase in the order system
(internal web application, no API); (3) applies policy: <30 days and unused → refund; 30-60 days → voucher;
>60 days → rejection unless defective; (4) if defective: requests photo, assesses, may escalate to supervisor;
(5) generates shipping label and confirms by email; (6) logs the reason in a shared Excel for the monthly report.
Known pains: agents take ~7 min/case (the order system is slow), the reasons Excel is filled in badly, and 12%
of cases escalate to a supervisor over doubts about the defects policy.
Data: 24 months of labeled case history. Sensitivity: customer personal data (address, purchases). The client
requires that rejection decisions be reviewed by a human.
