# Defect Report

**Project:** AarogyamCareAI  
**Scope:** Defects observed during the completed Selenium automation work  
**Application defects confirmed:** None in the executed 20-test Selenium suite.

The issues below were test-automation implementation defects, not confirmed production-application defects.

| ID | Type | Severity | Summary | Evidence and resolution | Retest |
| --- | --- | --- | --- | --- | --- |
| TST-001 | Test automation | Medium | Appointment Page Object produced an invalid XPath for the label `Doctor's name`. | The apostrophe made the generated single-quoted XPath invalid. The locator was corrected to use a compatible XPath literal and appointment-card targeting was made specific. | Resolved: both appointment tests passed. |
| TST-002 | Test automation | Low | Admin test checked the SMS control after navigating away from the SMS page. | The assertion timed out because the test was on the System page. The test now verifies control visibility on the SMS page, then navigates to System. | Resolved: all three admin tests passed. |

## Defect handling rule

For future product defects, record reproduction steps, expected and actual outcomes, evidence, severity, proposed minimal fix, and retest status. Obtain approval before modifying production application logic.
