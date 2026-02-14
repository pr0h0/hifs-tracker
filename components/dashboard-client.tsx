"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RatingBadge } from "@/components/rating-badge";
import { getStatusConfig, getRatingConfig } from "@/lib/rating-colors";
import { getSurahByNumber } from "@/lib/quran-data";
import { cn } from "@/lib/utils";
import {
  BookOpenText,
  GraduationCap,
  BookOpen,
  CalendarCheck,
  Flame,
  RotateCcw,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

interface DashboardStats {
  counts: {
    total: number;
    learned: number;
    learning: number;
    planned: number;
  };
  ratingDistribution: Array<{ rating: number; count: number }>;
  reviewsDue: number;
  streak: number;
  progressData: Array<{
    date: string;
    items_reviewed: number;
    items_added: number;
  }>;
  recentItems: Array<{
    id: number;
    surah_number: number;
    ayah_from: number;
    ayah_to: number;
    status: string;
    rating: number | null;
    updated_at: string;
  }>;
}

const ratingLabels: Record<number, string> = {
  1: "Just Started",
  2: "Struggling",
  3: "Getting There",
  4: "Almost Solid",
  5: "Mastered",
};

export function DashboardClient({ stats }: { stats: DashboardStats }) {
  const {
    counts,
    ratingDistribution,
    reviewsDue,
    streak,
    progressData,
    recentItems,
  } = stats;

  const ratingChartData = [1, 2, 3, 4, 5].map((rating) => ({
    name: ratingLabels[rating],
    count: ratingDistribution.find((r) => r.rating === rating)?.count ?? 0,
    fill: getRatingConfig(rating).fill,
  }));

  const activityData = progressData.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en", {
      month: "short",
      day: "numeric",
    }),
    reviewed: d.items_reviewed,
    added: d.items_added,
  }));

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-bold text-balance">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your memorization overview
          </p>
        </div>
        {reviewsDue > 0 && (
          <Button asChild>
            <Link href="/review">
              <RotateCcw className="mr-2 h-4 w-4" />
              {reviewsDue} Review{reviewsDue !== 1 ? "s" : ""} Due
            </Link>
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
        <StatCard
          title="Total Items"
          value={counts.total}
          icon={BookOpenText}
          className="bg-card"
        />
        <StatCard
          title="Learned"
          value={counts.learned}
          icon={GraduationCap}
          className="bg-emerald-500/5 border-emerald-500/20"
          valueClassName="text-emerald-700 dark:text-emerald-400"
        />
        <StatCard
          title="Learning"
          value={counts.learning}
          icon={BookOpen}
          className="bg-sky-500/5 border-sky-500/20"
          valueClassName="text-sky-700 dark:text-sky-400"
        />
        <StatCard
          title="Streak"
          value={streak}
          suffix={streak === 1 ? " day" : " days"}
          icon={Flame}
          className="bg-orange-500/5 border-orange-500/20"
          valueClassName="text-orange-700 dark:text-orange-400"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2 mb-6">
        {/* Activity Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Activity (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={activityData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="reviewed"
                    stackId="1"
                    stroke="hsl(162, 63%, 32%)"
                    fill="hsl(162, 63%, 32%)"
                    fillOpacity={0.3}
                    name="Reviewed"
                  />
                  <Area
                    type="monotone"
                    dataKey="added"
                    stackId="2"
                    stroke="hsl(199, 89%, 48%)"
                    fill="hsl(199, 89%, 48%)"
                    fillOpacity={0.3}
                    name="Added"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                No activity data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rating Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rating Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ratingChartData.some((d) => d.count > 0) ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={ratingChartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" name="Items" radius={[4, 4, 0, 0]}>
                    {ratingChartData.map((entry, index) => (
                      <rect key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                No rated items yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Recent Items
          </CardTitle>
          <Link
            href="/items"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {recentItems.length > 0 ? (
            <div className="divide-y">
              {recentItems.map((item) => {
                const surah = getSurahByNumber(item.surah_number);
                const statusConfig = getStatusConfig(item.status);

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold tabular-nums",
                          getRatingConfig(item.rating).bg,
                          getRatingConfig(item.rating).text,
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
                      <span
                        className={cn(
                          "rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                          statusConfig.bg,
                          statusConfig.text,
                        )}
                      >
                        {statusConfig.label}
                      </span>
                      <RatingBadge rating={item.rating} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CalendarCheck className="h-10 w-10 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No items yet</p>
              <Button asChild size="sm" variant="outline" className="mt-2">
                <Link href="/items">Add your first item</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  suffix,
  icon: Icon,
  className,
  valueClassName,
}: {
  title: string;
  value: number;
  suffix?: string;
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className={cn("mt-2 text-2xl font-bold", valueClassName)}>
          {value}
          {suffix && <span className="text-sm font-normal">{suffix}</span>}
        </p>
      </CardContent>
    </Card>
  );
}
