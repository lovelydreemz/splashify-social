import { useState } from "react";
import { ArrowRight, CheckCircle2, Sparkles, Calendar, Settings as SettingsIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface OnboardingWizardProps {
  open: boolean;
  onComplete: () => void;
}

const steps = [
  {
    title: "Welcome to Splashify Social! 🎉",
    description: "Your AI-powered social media posting assistant for Threads",
    icon: Sparkles,
    content: "Splashify Social helps you automate your Threads posting with AI-generated content. Let's get you set up in just a few steps!"
  },
  {
    title: "Create Templates",
    description: "Define AI prompts for content generation",
    icon: Sparkles,
    content: "Templates are AI prompts that generate unique content. For example: 'Write a motivational quote about productivity' will create fresh content each time."
  },
  {
    title: "Schedule Your Posts",
    description: "Set up automatic posting schedules",
    icon: Calendar,
    content: "Choose a template and set posting frequency (e.g., every 4 hours). Splashify will automatically generate and post content to your Threads account."
  },
  {
    title: "Configure API Settings",
    description: "Connect your Threads account",
    icon: SettingsIcon,
    content: "Go to Settings to add your Threads API credentials. You'll need an App ID, Access Token, and App Secret from Meta's developer platform."
  }
];

export function OnboardingWizard({ open, onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  
  const progress = ((currentStep + 1) / steps.length) * 100;
  const currentStepData = steps[currentStep];
  const StepIcon = currentStepData.icon;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onComplete()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <StepIcon className="h-6 w-6 text-primary" />
            {currentStepData.title}
          </DialogTitle>
          <DialogDescription>
            {currentStepData.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Progress value={progress} className="w-full" />
          
          <div className="bg-muted/50 rounded-lg p-4 min-h-[120px] flex items-center">
            <p className="text-sm text-foreground leading-relaxed">
              {currentStepData.content}
            </p>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Step {currentStep + 1} of {steps.length}</span>
          </div>
        </div>

        <div className="flex justify-between gap-2">
          <Button variant="outline" onClick={handleSkip}>
            Skip Tutorial
          </Button>
          <Button onClick={handleNext}>
            {currentStep === steps.length - 1 ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Get Started
              </>
            ) : (
              <>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
