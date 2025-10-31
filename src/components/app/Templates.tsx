import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

interface Template {
  id: string;
  title: string;
  comment: string;
  language: string;
}

export const Templates = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newComment, setNewComment] = useState("");
  const [newLanguage, setNewLanguage] = useState("en");

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("post_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error("Error loading templates:", error);
      toast.error("Failed to load templates");
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTitle.trim() || !newComment.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("post_templates").insert({
        user_id: user.id,
        title: newTitle,
        comment: newComment,
        language: newLanguage,
      });

      if (error) throw error;

      toast.success("Template created!");
      setNewTitle("");
      setNewComment("");
      setNewLanguage("en");
      loadTemplates();
    } catch (error: any) {
      toast.error(error.message || "Error creating template");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from("post_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Template deleted");
      loadTemplates();
    } catch (error: any) {
      toast.error(error.message || "Error deleting template");
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Template</CardTitle>
          <CardDescription>
            Create a template for your AI-generated posts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g., Morning Motivation"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Comment/Prompt</Label>
            <Textarea
              id="comment"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Enter the base comment or topic for AI to generate posts from"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Select value={newLanguage} onValueChange={setNewLanguage}>
              <SelectTrigger id="language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="de">German</SelectItem>
                <SelectItem value="hi">Hindi</SelectItem>
                <SelectItem value="ja">Japanese</SelectItem>
                <SelectItem value="zh">Chinese</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleCreateTemplate} disabled={loading} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            {loading ? "Creating..." : "Create Template"}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Your Templates</h3>
        {templates.length === 0 ? (
          <p className="text-muted-foreground">No templates yet. Create one above!</p>
        ) : (
          templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{template.title}</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteTemplate(template.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">{template.comment}</p>
                <p className="text-xs text-muted-foreground">Language: {template.language}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};