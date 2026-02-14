"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SurahPicker } from "@/components/surah-picker";
import { RatingStars } from "@/components/rating-stars";
import { addItem, updateItem } from "@/app/actions/items";
import { getSurahByNumber } from "@/lib/quran-data";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface AddItemDialogProps {
  editItem?: {
    id: number;
    surah_number: number;
    ayah_from: number;
    ayah_to: number;
    status: string;
    rating: number | null;
    notes: string;
  } | null;
  onClose?: () => void;
  trigger?: React.ReactNode;
}

export function AddItemDialog({
  editItem,
  onClose,
  trigger,
}: AddItemDialogProps) {
  const [open, setOpen] = useState(!!editItem);
  const [surahNumber, setSurahNumber] = useState<number | null>(
    editItem?.surah_number ?? null,
  );
  const [ayahFrom, setAyahFrom] = useState(
    editItem?.ayah_from?.toString() ?? "1",
  );
  const [ayahTo, setAyahTo] = useState(editItem?.ayah_to?.toString() ?? "");
  const [status, setStatus] = useState(editItem?.status ?? "planned");
  const [rating, setRating] = useState<number | null>(editItem?.rating ?? null);
  const [notes, setNotes] = useState(editItem?.notes ?? "");
  const [loading, setLoading] = useState(false);

  const selectedSurah = surahNumber ? getSurahByNumber(surahNumber) : null;

  function handleSurahChange(num: number) {
    setSurahNumber(num);
    const surah = getSurahByNumber(num);
    if (surah) {
      setAyahFrom("1");
      setAyahTo(surah.totalAyahs.toString());
    }
  }

  function resetForm() {
    if (!editItem) {
      setSurahNumber(null);
      setAyahFrom("1");
      setAyahTo("");
      setStatus("planned");
      setRating(null);
      setNotes("");
    }
  }

  async function handleSubmit() {
    if (!surahNumber) {
      toast.error("Please select a surah");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    if (editItem) formData.set("id", editItem.id.toString());
    formData.set("surah_number", surahNumber.toString());
    formData.set("ayah_from", ayahFrom);
    formData.set(
      "ayah_to",
      ayahTo || (selectedSurah?.totalAyahs.toString() ?? "1"),
    );
    formData.set("status", status);
    if (rating) formData.set("rating", rating.toString());
    formData.set("notes", notes);

    const result = editItem
      ? await updateItem(formData)
      : await addItem(formData);

    setLoading(false);

    if (result?.error) {
      toast.error(result.error);
      return;
    }

    toast.success(editItem ? "Item updated" : "Item added");
    setOpen(false);
    resetForm();
    onClose?.();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          resetForm();
          onClose?.();
        }
      }}
    >
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editItem ? "Edit Item" : "Add Memorization Item"}
          </DialogTitle>
          <DialogDescription>
            {editItem
              ? "Update your memorization item details."
              : "Add a surah or ayah range you want to track."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <Label>Surah</Label>
            <SurahPicker value={surahNumber} onChange={handleSurahChange} />
          </div>

          <div className="flex gap-4">
            <div className="flex-1 flex flex-col gap-2">
              <Label htmlFor="ayah_from">From Ayah</Label>
              <Input
                id="ayah_from"
                type="number"
                min={1}
                max={selectedSurah?.totalAyahs ?? 999}
                value={ayahFrom}
                onChange={(e) => setAyahFrom(e.target.value)}
              />
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <Label htmlFor="ayah_to">To Ayah</Label>
              <Input
                id="ayah_to"
                type="number"
                min={1}
                max={selectedSurah?.totalAyahs ?? 999}
                value={ayahTo}
                onChange={(e) => setAyahTo(e.target.value)}
                placeholder={selectedSurah?.totalAyahs?.toString() ?? ""}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="learning">Learning</SelectItem>
                <SelectItem value="learned">Learned</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Rating (optional)</Label>
            <RatingStars value={rating} onChange={setRating} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tajweed notes, difficult words, etc."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false);
              resetForm();
              onClose?.();
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading
              ? editItem
                ? "Updating..."
                : "Adding..."
              : editItem
                ? "Update"
                : "Add Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
