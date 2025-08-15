import express from "express";
import docusign from "docusign-esign";
import { withDsClient } from "../../utils/tokenManager-redis.js";
import { withBackoff } from "../../utils/backoff.js";

const router = express.Router();

router.post("/api/docusign/send-transmittal", async (req, res) => {
  const form = req.body || {};
  try {
    const result = await withBackoff(() =>
      withDsClient(async ({ apiClient, accountId }) => {
        const envelopesApi = new docusign.EnvelopesApi(apiClient);

        const envelopeDefinition = {
          templateId: process.env.DS_TEMPLATE_ID,
          templateRoles: [
            {
              roleName: "Signer1",
              name: form.requesterName || "Dining Services",
              email: form.requesterEmail || process.env.FALLBACK_SIGNER_EMAIL,
              tabs: {
                textTabs: [
                  { tabLabel: "Unit", value: form.unit || "" },
                  { tabLabel: "TransmittalNumber", value: form.transmittalNumber || "" },
                  { tabLabel: "WorkDate", value: form.workDate || "" }
                ]
              }
            }
          ],
          status: "sent"
        };

        return envelopesApi.createEnvelope(accountId, { envelopeDefinition });
      })
    );

    res.json({ envelopeId: result.envelopeId, status: "sent" });
  } catch (err) {
    const detail = err?.response?.text || err?.message || String(err);
    console.error("DocuSign send error:", detail);
    res.status(500).json({ error: "DocuSign send failed", detail });
  }
});

export default router;
