import { getDailyReviewQueue } from "@/app/actions/review";
import { ReviewClient } from "@/components/review-client";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function ReviewPage(props: {
  searchParams: SearchParams;
}) {
  const searchParams = await props.searchParams;
  const juzParam = searchParams.juz;
  const juz = typeof juzParam === "string" ? parseInt(juzParam) : undefined;
  const queue = await getDailyReviewQueue(true, true, undefined, juz);

  return <ReviewClient initialQueue={queue} />;
}
