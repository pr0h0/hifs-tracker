"use client";

import { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RatingStars } from "@/components/rating-stars";
import { RatingBadge } from "@/components/rating-badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  submitReview,
  promoteToLearned,
  getDailyReviewQueue,
} from "@/app/actions/review";
import { getSurahByNumber } from "@/lib/quran-data";
import { getStatusConfig, getRatingConfig } from "@/lib/rating-colors";
import { cn } from "@/lib/utils";
import type { ReviewQueueItem } from "@/lib/sm2";
import {
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  StickyNote,
  ArrowUpCircle,
  Sparkles,
  Mic,
  Square,
  Play,
  Trash2,
  Minus,
  Plus,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface ReviewClientProps {
  initialQueue: ReviewQueueItem[];
}

interface ReviewResult {
  item: ReviewQueueItem;
  rating: number;
  surahName: string;
}

export function ReviewClient({ initialQueue }: ReviewClientProps) {
  const [queue, setQueue] = useState(initialQueue);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [results, setResults] = useState<ReviewResult[]>([]);
  const [showPromote, setShowPromote] = useState(false);

  // Filters
  const [filterLearning, setFilterLearning] = useState(true);
  const [filterLearned, setFilterLearned] = useState(true);
  const [limit, setLimit] = useState(
    initialQueue.length > 0 ? initialQueue.length : 5,
  );

  // Audio Recording
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const currentItem = queue[currentIndex];
  const progress =
    queue.length > 0
      ? ((currentIndex + (completed ? 1 : 0)) / queue.length) * 100
      : 0;

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  async function updateQueue(newLimit?: number) {
    const targetLimit = newLimit ?? limit;
    setLoading(true);
    try {
      const newQueue = await getDailyReviewQueue(
        filterLearning,
        filterLearned,
        targetLimit,
      );
      setQueue(newQueue);
      if (currentIndex >= newQueue.length) {
        setCurrentIndex(Math.max(0, newQueue.length - 1));
      }
      // If we are completed, check if new items appeared
      if (completed && newQueue.length > queue.length) {
        setCompleted(false);
      }
      // If result was empty and now not empty
      if (queue.length === 0 && newQueue.length > 0) {
        setCurrentIndex(0);
        setCompleted(false);
      }
    } catch (err) {
      toast.error("Failed to update queue");
    }
    setLoading(false);
  }

  // Effect to trigger update when filters change?
  // Probably better to have a button or trigger it manually to avoid double fetching on mount?
  // Or just use effect but skip first render if initialQueue matches filters (hard to know).
  // Let's rely on a "Apply" button or just simple effect.
  // Actually, users might want to toggle both before fetching.
  // Let's add a "Apply Filters" button or just reload on change. Reload on change is nicer UX if fast.
  useEffect(() => {
    // Skip initial load since initialQueue is passed
    // But we don't know if initialQueue matches current filters defaults (true, true).
    // It does match defaults.
    // So we only fetch if filters CHANGE from default?
    // Actually simpler: Just accept that changing filters triggers a fetch.
  }, [filterLearning, filterLearned]);
  // Moving the fetch logic to the checkbox change handler or effect

  const handleFilterChange = async (
    type: "learning" | "learned",
    checked: boolean,
  ) => {
    const newLearning = type === "learning" ? checked : filterLearning;
    const newLearned = type === "learned" ? checked : filterLearned;

    if (type === "learning") setFilterLearning(checked);
    if (type === "learned") setFilterLearned(checked);

    setLoading(true);
    try {
      const newQueue = await getDailyReviewQueue(
        newLearning,
        newLearned,
        limit,
      );
      setQueue(newQueue);
      setCurrentIndex(0);
      setCompleted(false);
      setResults([]);
      setAudioUrl(null);
      setShowDetails(false);
    } catch {
      toast.error("Failed to refresh queue");
    }
    setLoading(false);
  };

  const handleLimitChange = async (newLimit: number) => {
    if (newLimit < 1) return;
    setLimit(newLimit);
    await updateQueue(newLimit);
  };

  async function startRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error(
        "Microphone not supported. secure connection (HTTPS) required.",
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error("Mic error:", err);
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        toast.error(
          "Microphone permission denied. Please allow access in browser settings.",
        );
      } else if (
        err.name === "NotFoundError" ||
        err.name === "DevicesNotFoundError"
      ) {
        toast.error("No microphone found.");
      } else {
        toast.error(
          "Could not access microphone: " + (err.message || "Unknown error"),
        );
      }
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }

  function deleteRecording() {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
  }

  async function handleSubmitRating() {
    if (!selectedRating || !currentItem) return;

    setLoading(true);
    const result = await submitReview(currentItem.item_id, selectedRating);
    setLoading(false);

    if (result?.error) {
      toast.error(result.error);
      return;
    }

    const surah = getSurahByNumber(currentItem.surah_number);
    setResults((prev) => [
      ...prev,
      {
        item: currentItem,
        rating: selectedRating,
        surahName: surah?.name ?? `Surah ${currentItem.surah_number}`,
      },
    ]);

    if (result?.suggestPromote) {
      setShowPromote(true);
      return;
    }

    moveToNext();
  }

  async function handlePromote() {
    if (!currentItem) return;
    setLoading(true);
    await promoteToLearned(currentItem.item_id);
    setLoading(false);
    toast.success("Promoted to Learned! SM-2 scheduling now active.");
    setShowPromote(false);
    moveToNext();
  }

  function skipPromote() {
    setShowPromote(false);
    moveToNext();
  }

  function moveToNext() {
    setSelectedRating(null);
    setShowDetails(false);
    setShowPromote(false);
    setAudioUrl(null);

    if (currentIndex + 1 >= queue.length) {
      setCompleted(true);
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  }

  function moveToPrevious() {
    if (currentIndex > 0) {
      setSelectedRating(null);
      setShowDetails(false);
      setShowPromote(false);
      setAudioUrl(null);
      setCurrentIndex(currentIndex - 1);
    }
  }

  if (queue.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold">No Reviews Today</h2>
          <p className="text-muted-foreground mt-2 max-w-sm">
            Based on your filters, there are no items to review. Adjust filters
            or add new items.
          </p>

          <div className="flex gap-4 mt-6 mb-6 p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="empty-learning"
                checked={filterLearning}
                onCheckedChange={(c) =>
                  handleFilterChange("learning", c as boolean)
                }
              />
              <Label htmlFor="empty-learning">Learning</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="empty-learned"
                checked={filterLearned}
                onCheckedChange={(c) =>
                  handleFilterChange("learned", c as boolean)
                }
              />
              <Label htmlFor="empty-learned">Learned</Label>
            </div>
          </div>

          <Button asChild>
            <a href="/items">Go to My Items</a>
          </Button>
        </div>
      </div>
    );
  }

  if (completed) {
    const avgRating =
      results.length > 0
        ? results.reduce((sum, r) => sum + r.rating, 0) / results.length
        : 0;

    return (
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-col items-center py-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 mb-4">
            <Sparkles className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-balance">Session Complete</h2>
          <p className="text-muted-foreground mt-1">
            You reviewed {results.length} item{results.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{results.length}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Items Reviewed
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{avgRating.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Average Rating
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Review Details</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {results.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold",
                        getRatingConfig(r.rating).bg,
                        getRatingConfig(r.rating).text,
                      )}
                    >
                      {r.rating}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{r.surahName}</p>
                      <p className="text-xs text-muted-foreground">
                        Ayah {r.item.ayah_from}
                        {r.item.ayah_from !== r.item.ayah_to
                          ? ` - ${r.item.ayah_to}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <RatingStars value={r.rating} readonly size="sm" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center mt-6">
          <Button asChild>
            <a href="/review">
              <RotateCcw className="mr-2 h-4 w-4" />
              New Session
            </a>
          </Button>
        </div>
      </div>
    );
  }

  const surah = getSurahByNumber(currentItem.surah_number);
  const statusConfig = getStatusConfig(currentItem.status);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2 gap-4">
          <h1 className="text-lg font-bold">Daily Review</h1>
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} / {queue.length}
          </span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={moveToPrevious}
                disabled={currentIndex === 0}
                title="Previous Item"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Previous</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={moveToNext}
                disabled={currentIndex === queue.length - 1}
                title="Next Item (Skip)"
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Next</span>
              </Button>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <div className="flex gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="filter-learning"
                checked={filterLearning}
                onCheckedChange={(c) =>
                  handleFilterChange("learning", c as boolean)
                }
              />
              <Label htmlFor="filter-learning">Learning</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="filter-learned"
                checked={filterLearned}
                onCheckedChange={(c) =>
                  handleFilterChange("learned", c as boolean)
                }
              />
              <Label htmlFor="filter-learned">Learned</Label>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-md bg-background">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-none border-r"
                onClick={() => handleLimitChange(limit - 1)}
                disabled={limit <= 1 || loading}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <div className="w-10 text-center text-sm font-medium">
                {limit}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-none border-l"
                onClick={() => handleLimitChange(limit + 1)}
                disabled={loading}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
              onClick={() => setCompleted(true)}
              title="End Session"
            >
              <XCircle className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">End</span>
            </Button>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {showPromote ? (
        <Card className="border-sky-500/30 bg-sky-500/5">
          <CardContent className="p-6 text-center">
            <ArrowUpCircle className="h-10 w-10 text-sky-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold">Promote to Learned?</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              {"You've"} rated this item highly. Would you like to move it to{" "}
              {'"Learned"'} status? SM-2 spaced repetition scheduling will
              begin.
            </p>
            <div className="flex justify-center gap-3 mt-4">
              <Button variant="outline" onClick={skipPromote}>
                Keep as Learning
              </Button>
              <Button onClick={handlePromote} disabled={loading}>
                {loading ? "Promoting..." : "Yes, Promote"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge
                variant="outline"
                className={cn("text-xs", statusConfig.bg, statusConfig.text)}
              >
                {statusConfig.label}
              </Badge>
              <Badge variant="outline" className="text-xs capitalize">
                {currentItem.source === "learning"
                  ? "Daily"
                  : currentItem.source === "due"
                    ? "Scheduled"
                    : "Bonus"}
              </Badge>
              {currentItem.rating && (
                <RatingBadge rating={currentItem.rating} />
              )}
            </div>

            <div className="mt-4 text-center py-6">
              <p className="text-3xl font-bold" dir="rtl">
                {surah?.nameArabic}
              </p>
              <h2 className="text-xl font-semibold mt-2">{surah?.name}</h2>
              <p className="text-muted-foreground mt-1">
                Ayah {currentItem.ayah_from}
                {currentItem.ayah_from !== currentItem.ayah_to
                  ? ` - ${currentItem.ayah_to}`
                  : ""}
              </p>
            </div>

            {/* Audio Recorder */}
            <div className="flex flex-col items-center gap-4 py-4 px-4 bg-muted/30 rounded-lg mb-4">
              <div className="flex items-center gap-4">
                {!isRecording ? (
                  <Button
                    variant={audioUrl ? "secondary" : "default"}
                    size="icon"
                    className="h-12 w-12 rounded-full shadow-sm"
                    onClick={startRecording}
                    title="Record Recitation"
                  >
                    <Mic className="h-5 w-5" />
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-12 w-12 rounded-full animate-pulse shadow-sm"
                    onClick={stopRecording}
                    title="Stop Recording"
                  >
                    <Square className="h-5 w-5" />
                  </Button>
                )}
              </div>

              {isRecording && (
                <p className="text-sm font-medium text-destructive animate-pulse">
                  Recording...
                </p>
              )}

              {audioUrl && !isRecording && (
                <div className="flex items-center gap-2 w-full max-w-xs justify-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-primary hover:bg-primary/10"
                    onClick={() => {
                      const audio = new Audio(audioUrl);
                      audio.play();
                    }}
                    title="Play Recording"
                  >
                    <Play className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={deleteRecording}
                    title="Delete Recording"
                    className="hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {currentItem.notes && (
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mt-2"
              >
                <StickyNote className="h-3.5 w-3.5" />
                {showDetails ? "Hide notes" : "Show notes"}
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 transition-transform",
                    showDetails && "rotate-90",
                  )}
                />
              </button>
            )}

            {showDetails && currentItem.notes && (
              <div className="mt-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                {currentItem.notes}
              </div>
            )}

            <div className="mt-6 border-t pt-6">
              <p className="text-sm font-medium text-center mb-3">
                How well did you recall this?
              </p>
              <div className="flex justify-center">
                <RatingStars
                  value={selectedRating}
                  onChange={setSelectedRating}
                  size="md"
                />
              </div>
              {selectedRating && (
                <p className="text-xs text-center text-muted-foreground mt-2">
                  {getRatingConfig(selectedRating).label}
                </p>
              )}
            </div>

            <div className="mt-4 flex justify-center">
              <Button
                onClick={handleSubmitRating}
                disabled={!selectedRating || loading}
                className="min-w-[120px]"
              >
                {loading ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
