"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SURAHS, JUZ_LIST, getSurahsByJuz } from "@/lib/quran-data";
import { getRatingConfig, getStatusConfig } from "@/lib/rating-colors";
import { cn } from "@/lib/utils";
import type { MemorizationItem } from "@/app/actions/items";
import {
  Grid3X3,
  ChevronDown,
  ChevronRight,
  BookOpenText,
  Play,
} from "lucide-react";

interface JuzClientProps {
  allItems: MemorizationItem[];
}

interface JuzStats {
  juz: number;
  totalSurahs: number;
  totalItems: number;
  learned: number;
  learning: number;
  planned: number;
  avgRating: number | null;
}

export function JuzClient({ allItems }: JuzClientProps) {
  const [expandedJuz, setExpandedJuz] = useState<number | null>(null);

  const juzStats: JuzStats[] = JUZ_LIST.map((juz) => {
    const surahsInJuz = getSurahsByJuz(juz);
    const surahNumbers = surahsInJuz.map((s) => s.number);
    const juzItems = allItems.filter((i) =>
      surahNumbers.includes(i.surah_number),
    );
    const ratings = juzItems
      .filter((i) => i.rating !== null)
      .map((i) => i.rating!);

    return {
      juz,
      totalSurahs: surahsInJuz.length,
      totalItems: juzItems.length,
      learned: juzItems.filter((i) => i.status === "learned").length,
      learning: juzItems.filter((i) => i.status === "learning").length,
      planned: juzItems.filter((i) => i.status === "planned").length,
      avgRating:
        ratings.length > 0
          ? ratings.reduce((a, b) => a + b, 0) / ratings.length
          : null,
    };
  });

  function scrollToJuz(juz: number) {
    setExpandedJuz(juz);
    setTimeout(() => {
      const element = document.getElementById(`juz-card-${juz}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  }

  function getJuzColor(stats: JuzStats) {
    if (stats.totalItems === 0) return "bg-muted";
    const ratio = stats.learned / Math.max(stats.totalItems, 1);
    if (ratio >= 0.8) return "bg-emerald-500/15 border-emerald-500/30";
    if (ratio >= 0.5) return "bg-sky-500/15 border-sky-500/30";
    if (ratio >= 0.2) return "bg-amber-500/15 border-amber-500/30";
    if (stats.totalItems > 0) return "bg-orange-500/15 border-orange-500/30";
    return "bg-muted";
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-balance">Juz View</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of your progress across all 30 Juz
        </p>
      </div>

      {/* Grid overview */}
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 md:grid-cols-10 mb-8">
        {juzStats.map((stats) => (
          <button
            key={stats.juz}
            onClick={() => scrollToJuz(stats.juz)}
            className={cn(
              "flex flex-col items-center justify-center rounded-lg border p-2 transition-all hover:scale-105",
              getJuzColor(stats),
              expandedJuz === stats.juz && "ring-2 ring-primary",
            )}
          >
            <span className="text-lg font-bold">{stats.juz}</span>
            <span className="text-[10px] text-muted-foreground">
              {stats.totalItems > 0
                ? `${stats.learned}/${stats.totalItems}`
                : "--"}
            </span>
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-emerald-500/15 border border-emerald-500/30" />
          <span>{"80%+"} learned</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-sky-500/15 border border-sky-500/30" />
          <span>{"50%+"} learned</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-amber-500/15 border border-amber-500/30" />
          <span>{"20%+"} learned</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-orange-500/15 border border-orange-500/30" />
          <span>{"< 20%"} learned</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-muted border" />
          <span>No items</span>
        </div>
      </div>

      {/* Detailed list */}
      <div className="flex flex-col gap-3">
        {juzStats.map((stats) => {
          const isExpanded = expandedJuz === stats.juz;
          const surahsInJuz = getSurahsByJuz(stats.juz);
          const juzItems = allItems.filter((i) =>
            surahsInJuz.map((s) => s.number).includes(i.surah_number),
          );

          return (
            <Card
              key={stats.juz}
              id={`juz-card-${stats.juz}`}
              className={cn(
                isExpanded && "border-primary/30",
                "scroll-mt-24 transition-colors",
              )}
            >
              <button
                onClick={() => setExpandedJuz(isExpanded ? null : stats.juz)}
                className="w-full"
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
                      getJuzColor(stats),
                    )}
                  >
                    {stats.juz}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Juz {stats.juz}</p>
                      <div className="flex items-center gap-2">
                        {stats.totalItems > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {stats.learned}/{stats.totalItems} learned
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">
                        {stats.totalSurahs} surah
                        {stats.totalSurahs !== 1 ? "s" : ""}
                        {" - "}
                        {surahsInJuz.map((s) => s.name).join(", ")}
                      </p>
                    </div>
                    {stats.totalItems > 0 && (
                      <Progress
                        value={
                          (stats.learned / Math.max(stats.totalItems, 1)) * 100
                        }
                        className="h-1.5 mt-2"
                      />
                    )}
                  </div>
                </CardContent>
              </button>

              {isExpanded && (
                <div className="border-t">
                  <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/10">
                    <span className="text-xs font-medium text-muted-foreground">
                      Queue
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      asChild
                    >
                      <Link href={`/review?juz=${stats.juz}`}>
                        <Play className="mr-2 h-3 w-3" />
                        Review Juz {stats.juz}
                      </Link>
                    </Button>
                  </div>
                  {juzItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <BookOpenText className="h-8 w-8 text-muted-foreground/40 mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No items tracked for this Juz yet
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {juzItems.map((item) => {
                        const surah = SURAHS.find(
                          (s) => s.number === item.surah_number,
                        );
                        const statusConfig = getStatusConfig(item.status);
                        const ratingConfig = getRatingConfig(item.rating);

                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between px-4 py-3"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold tabular-nums",
                                  ratingConfig.bg,
                                  ratingConfig.text,
                                )}
                              >
                                {item.surah_number}
                              </div>
                              <div>
                                <p className="text-sm font-medium">
                                  {surah?.name}
                                  <span
                                    className="text-muted-foreground ml-1.5 text-xs"
                                    dir="rtl"
                                  >
                                    {surah?.nameArabic}
                                  </span>
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Ayah {item.ayah_from}
                                  {item.ayah_from !== item.ayah_to
                                    ? ` - ${item.ayah_to}`
                                    : ""}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px]",
                                  statusConfig.bg,
                                  statusConfig.text,
                                )}
                              >
                                {statusConfig.label}
                              </Badge>
                              {item.rating && (
                                <span
                                  className={cn(
                                    "text-xs font-medium px-1.5 py-0.5 rounded",
                                    ratingConfig.bg,
                                    ratingConfig.text,
                                  )}
                                >
                                  {item.rating}/5
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
