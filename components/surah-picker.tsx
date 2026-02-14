"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SURAHS } from "@/lib/quran-data";

interface SurahPickerProps {
  value: number | null;
  onChange: (value: number) => void;
}

export function SurahPicker({ value, onChange }: SurahPickerProps) {
  const [open, setOpen] = useState(false);
  const selectedSurah = value ? SURAHS.find((s) => s.number === value) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selectedSurah ? (
            <span className="flex items-center gap-2 truncate">
              <span className="text-muted-foreground">
                {selectedSurah.number}.
              </span>
              {selectedSurah.name}
              <span className="text-muted-foreground" dir="rtl">
                {selectedSurah.nameArabic}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">Select a surah...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search surah..." />
          <CommandList>
            <CommandEmpty>No surah found.</CommandEmpty>
            <CommandGroup>
              {SURAHS.map((surah) => (
                <CommandItem
                  key={surah.number}
                  value={`${surah.number} ${surah.name} ${surah.nameArabic}`}
                  onSelect={() => {
                    onChange(surah.number);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === surah.number ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="mr-2 text-muted-foreground tabular-nums w-6 text-right">
                    {surah.number}.
                  </span>
                  <span className="flex-1">{surah.name}</span>
                  <span className="text-muted-foreground text-sm" dir="rtl">
                    {surah.nameArabic}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {surah.totalAyahs} ayahs
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
