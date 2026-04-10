import { classifyReply } from "./reply-classifier.js";
import { appendConversationEvent, setConversationNextAction } from "../crm/conversation-store.js";
import { leadStatuses } from "../config/lead-statuses.js";
import { scheduleFollowup } from "../followups/followup-manager.js";

function buildReplyDraft(intent) {
  switch (intent) {
    case "positive_interest":
      return "ありがとうございます。今のご予約導線を大きく変えずに、DMやLINEでのやり取りをもう少し分かりやすく整えるイメージです。必要でしたら、Instagramを拝見した範囲で2〜3点ほど簡単にお伝えできます。";
    case "neutral_curious":
      return "ありがとうございます。たとえば、DMで来たご予約やご質問を今の雰囲気を崩さずに整理しやすくするイメージです。もし差し支えなければ、今の流れに合わせて具体例を短くお送りします。";
    case "busy_later":
      return "ありがとうございます、承知しました。お忙しいところ失礼しました。落ち着いた頃に、必要であれば短くご案内します。";
    case "no_need":
      return "ありがとうございます、承知しました。今の形で問題なく回っているようでしたら何よりです。もし今後だけでも比較してみたいタイミングがあれば、いつでも短くお伝えできます。";
    case "rejection":
      return "ご返信ありがとうございます。承知しました。今後はこちらからのご連絡は控えます。";
    default:
      return "ご返信ありがとうございます。差し支えない範囲で、今どのあたりが気になったかだけ教えていただければ、短くお返事します。";
  }
}

function resolveNextAction(intent) {
  if (intent === "positive_interest") return { type: "send_short_diagnosis", due: "now" };
  if (intent === "neutral_curious") return { type: "send_short_explanation", due: "now" };
  if (intent === "busy_later") return { type: "schedule_followup", dueInDays: 7 };
  if (intent === "no_need") return { type: "archive_soft", due: null };
  if (intent === "rejection") return { type: "suppress", due: null };
  return { type: "review_manually", due: "now" };
}

function resolveStatus(intent) {
  if (intent === "positive_interest") return leadStatuses.INTERESTED;
  if (intent === "neutral_curious") return leadStatuses.REPLIED;
  if (intent === "busy_later") return leadStatuses.FOLLOWUP_PENDING;
  if (intent === "no_need") return leadStatuses.LOST;
  if (intent === "rejection") return leadStatuses.DO_NOT_CONTACT;
  return leadStatuses.REPLIED;
}

export async function handleLeadReply(lead, inboundText) {
  const classification = classifyReply(inboundText);
  const draftReply = buildReplyDraft(classification.intent);
  const nextAction = resolveNextAction(classification.intent);

  await appendConversationEvent(lead.id, {
    role: "inbound",
    channel: lead.salesStrategy?.primaryChannel || lead.channel,
    text: inboundText,
    eventType: "reply_received",
    classification
  });

  await setConversationNextAction(lead.id, nextAction);

  let updatedLead = {
    ...lead,
    lastInboundReply: {
      text: inboundText,
      classification,
      receivedAt: new Date().toISOString()
    },
    replyPlan: {
      draftReply,
      nextAction
    },
    status: resolveStatus(classification.intent),
    updatedAt: new Date().toISOString()
  };

  if (classification.intent === "busy_later") {
    updatedLead = await scheduleFollowup(updatedLead, {
      days: 7,
      reason: "lead asked to revisit later",
      followupNumber: 1
    });
  }

  return updatedLead;
}
