"use client";

import { Card, CardContent } from "@/components/ui/card";
import { RatingBadge } from "@/components/rating-badge";
import { RatingStars } from "@/components/rating-stars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getSurahByNumber } from "@/lib/quran-data";
import { getStatusConfig } from "@/lib/rating-colors";
import { cn } from "@/lib/utils";
import { MoreVertical, Pencil, Trash2, StickyNote } from "lucide-react";
import type { MemorizationItem } from "@/app/actions/items";

interface ItemCardProps {
  item: MemorizationItem;
  onEdit: (item: MemorizationItem) => void;
  onDelete: (id: number) => void;
}

export function ItemCard({ item, onEdit, onDelete }: ItemCardProps) {
  const surah = getSurahByNumber(item.surah_number);
  const statusConfig = getStatusConfig(item.status);

  return (
    <Card className="group transition-colors hover:border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm">
                {surah?.name ?? `Surah ${item.surah_number}`}
              </h3>
              <span className="text-sm text-muted-foreground font-arabic" dir="rtl">
                {surah?.nameArabic}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Ayah {item.ayah_from}
              {item.ayah_from !== item.ayah_to ? ` - ${item.ayah_to}` : ""}
              {surah && (
                <span className="ml-1">
                  {"("}of {surah.totalAyahs}
                  {")"}
                </span>
              )}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(item)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(item.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className={cn("text-xs", statusConfig.bg, statusConfig.text)}
          >
            {statusConfig.label}
          </Badge>
          <RatingBadge rating={item.rating} />
        </div>

        {item.rating && (
          <div className="mt-2">
            <RatingStars value={item.rating} readonly size="sm" />
          </div>
        )}

        {item.notes && (
          <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
            <StickyNote className="h-3 w-3 mt-0.5 shrink-0" />
            <p className="line-clamp-2">{item.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
