import { PageHeading } from "@/components/page-heading";
import { AiAssistant } from "@/components/ai/ai-assistant";
import { requireFeature } from "@/lib/features/server";

export default async function ManagementAiPage() {
  await requireFeature("ai_assistant");
  return (
    <>
      <PageHeading eyebrow="VMC MANAGEMENT · AI" title="VMC AI" description="Ask operational questions and use secure VMC data tools in plain language." />
      <AiAssistant
        role="management"
        suggestions={[
          "Give me the current fleet summary.",
          "What needs urgent attention?",
          "Find low-stock brake parts.",
        ]}
      />
    </>
  );
}
