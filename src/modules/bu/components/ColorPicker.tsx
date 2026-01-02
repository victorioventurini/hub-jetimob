import { useState } from "react";
import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label: string;
  presets?: string[];
}

const DEFAULT_PRESETS = [
  "#0A3D62", // Dark Blue
  "#1E3A5F", // Navy
  "#2E86AB", // Blue
  "#28A745", // Green
  "#DC3545", // Red
  "#FFC107", // Yellow
  "#6C63FF", // Purple
  "#E91E63", // Pink
  "#00BCD4", // Cyan
  "#FF5722", // Orange
  "#607D8B", // Blue Grey
  "#795548", // Brown
];

export function ColorPicker({
  value,
  onChange,
  label,
  presets = DEFAULT_PRESETS,
}: ColorPickerProps) {
  const [inputValue, setInputValue] = useState(value);

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    // Only update if it's a valid hex color
    if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(newValue)) {
      onChange(newValue);
    }
  };

  const handlePresetClick = (color: string) => {
    setInputValue(color);
    onChange(color);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      
      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="w-10 h-10 p-0 border-2"
              style={{ backgroundColor: value }}
            >
              <span className="sr-only">Escolher cor</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="start">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Escolher cor</span>
              </div>
              
              {/* Native color picker */}
              <input
                type="color"
                value={value}
                onChange={(e) => handleInputChange(e.target.value)}
                className="w-full h-10 cursor-pointer rounded border"
              />
              
              {/* Preset colors */}
              <div className="grid grid-cols-6 gap-1">
                {presets.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      "w-8 h-8 rounded-md border-2 transition-transform hover:scale-110",
                      value === color ? "border-foreground ring-2 ring-offset-2" : "border-transparent"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => handlePresetClick(color)}
                  />
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
        <Input
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="#000000"
          className="flex-1 font-mono"
          maxLength={7}
        />
      </div>
    </div>
  );
}
