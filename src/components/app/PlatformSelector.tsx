import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PlatformConfig {
  threads: boolean;
  linkedin: boolean;
  instagram: boolean;
}

interface PlatformContent {
  threads?: string;
  linkedin?: string;
  instagram?: string;
}

interface PlatformSelectorProps {
  platforms: PlatformConfig;
  onPlatformsChange: (platforms: PlatformConfig) => void;
  content: PlatformContent;
  onContentChange: (content: PlatformContent) => void;
}

export const PlatformSelector = ({
  platforms,
  onPlatformsChange,
  content,
  onContentChange,
}: PlatformSelectorProps) => {
  const handlePlatformToggle = (platform: keyof PlatformConfig) => {
    onPlatformsChange({
      ...platforms,
      [platform]: !platforms[platform],
    });
  };

  const handleContentChange = (platform: keyof PlatformContent, value: string) => {
    onContentChange({
      ...content,
      [platform]: value,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-semibold mb-3 block">Select Platforms</Label>
        <div className="flex gap-6">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="threads"
              checked={platforms.threads}
              onCheckedChange={() => handlePlatformToggle("threads")}
            />
            <Label htmlFor="threads" className="cursor-pointer">Threads</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="linkedin"
              checked={platforms.linkedin}
              onCheckedChange={() => handlePlatformToggle("linkedin")}
            />
            <Label htmlFor="linkedin" className="cursor-pointer">LinkedIn</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="instagram"
              checked={platforms.instagram}
              onCheckedChange={() => handlePlatformToggle("instagram")}
            />
            <Label htmlFor="instagram" className="cursor-pointer">Instagram</Label>
          </div>
        </div>
      </div>

      {(platforms.threads || platforms.linkedin || platforms.instagram) && (
        <div className="space-y-4">
          <Label className="text-base font-semibold">Platform-Specific Content (Optional)</Label>
          <p className="text-sm text-muted-foreground">
            Customize content for each platform. Leave blank to use AI-generated content.
          </p>

          {platforms.threads && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Threads Content</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={content.threads || ""}
                  onChange={(e) => handleContentChange("threads", e.target.value)}
                  placeholder="Custom content for Threads (optional)"
                  rows={3}
                />
              </CardContent>
            </Card>
          )}

          {platforms.linkedin && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">LinkedIn Content</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={content.linkedin || ""}
                  onChange={(e) => handleContentChange("linkedin", e.target.value)}
                  placeholder="Custom content for LinkedIn (optional)"
                  rows={3}
                />
              </CardContent>
            </Card>
          )}

          {platforms.instagram && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Instagram Content</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={content.instagram || ""}
                  onChange={(e) => handleContentChange("instagram", e.target.value)}
                  placeholder="Custom content for Instagram (optional)"
                  rows={3}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
