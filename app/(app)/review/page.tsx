"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useApi } from "@/lib/api";
import type { ReviewQueueItem } from "@/lib/sm2";
import { ReviewClient } from "@/components/review-client";
import { PageLoader } from "@/components/page-loader";

function Review() {
  const juz = Number(useSearchParams().get("juz")) || null;
  const { data, error } = useApi<ReviewQueueItem[]>("getDailyReviewQueue", true, true, null, juz);
  // ReviewClient keeps its own queue; later refetches don't reset a session in progress.
  return data ? <ReviewClient initialQueue={data} /> : <PageLoader error={error} />;
}

export default function ReviewPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Review />
    </Suspense>
  );
}
