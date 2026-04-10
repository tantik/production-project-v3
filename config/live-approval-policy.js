export function getLiveApprovalPolicy() {
  return {
    enabled: true,
    requireManualApprovalForLive: process.env.LIVE_REQUIRE_MANUAL_APPROVAL !== 'false',
    blockAutoApproveInLive: process.env.LIVE_BLOCK_AUTO_APPROVE !== 'false',
    allowDryRunAutoApprove: true
  };
}

export function canLiveSend({ approvalRequest }) {
  const policy = getLiveApprovalPolicy();
  if (!policy.requireManualApprovalForLive) return { allowed: true, policy };
  if (!approvalRequest) return { allowed: false, reason: 'live_requires_approval_request', policy };
  if (approvalRequest.status !== 'approved') return { allowed: false, reason: 'live_requires_approved_status', policy };
  if (approvalRequest.approvalSource !== 'manual') return { allowed: false, reason: 'live_requires_manual_approval', policy };
  return { allowed: true, policy };
}
