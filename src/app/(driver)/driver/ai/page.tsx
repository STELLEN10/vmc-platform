import { PageHeading } from "@/components/page-heading";
import { AiAssistant } from "@/components/ai/ai-assistant";
import { requireFeature } from "@/lib/features/server";

export default async function DriverAiPage() {
  await requireFeature("ai_assistant");
  return (
    <>
      <PageHeading eyebrow="VMC DRIVER · AI" title="VMC AI" description="A plain-language assistant for your motorcycle, payments, and parts." />
      <AiAssistant
        role="driver"
        suggestions={[
          "What do I need to know about my motorcycle?",
          "What's my payment status?",
          "Find brake parts for my bike.",
        ]}
      />
    </>
  );
}
