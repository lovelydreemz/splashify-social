import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Heart, Share2, MessageCircle } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5" />
        
        <div className="container relative mx-auto px-4 py-20 lg:py-32">
          <div className="text-center space-y-8 animate-fade-in-up">
            {/* Logo */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary via-secondary to-accent p-0.5 mb-4">
              <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-10 h-10"
                >
                  <path
                    d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                    fill="url(#hero-gradient)"
                  />
                  <defs>
                    <linearGradient id="hero-gradient" x1="2" y1="2" x2="22" y2="21">
                      <stop offset="0%" stopColor="hsl(14 100% 57%)" />
                      <stop offset="50%" stopColor="hsl(340 82% 67%)" />
                      <stop offset="100%" stopColor="hsl(25 95% 53%)" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              Automate your{" "}
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Threads posts
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Generate AI-powered posts and schedule them to Threads automatically
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button
                size="lg"
                className="bg-gradient-to-r from-primary via-secondary to-accent text-white border-0 hover:opacity-90 transition-opacity text-lg px-8 py-6 rounded-full shadow-lg"
                style={{ boxShadow: "var(--shadow-glow)" }}
                onClick={() => navigate("/auth")}
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6 rounded-full"
                onClick={() => navigate("/auth")}
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything you need for automated social posting
            </h2>
            <p className="text-xl text-muted-foreground">
              Built for content creators and social media managers
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Users,
                title: "AI Generation",
                description: "Create engaging posts with AI in any language",
                gradient: "from-primary to-secondary",
              },
              {
                icon: Share2,
                title: "Auto Posting",
                description: "Schedule posts to go live automatically",
                gradient: "from-secondary to-accent",
              },
              {
                icon: Heart,
                title: "Multi-Language",
                description: "Generate content in multiple languages",
                gradient: "from-accent to-primary",
              },
              {
                icon: MessageCircle,
                title: "Templates",
                description: "Reuse templates for consistent posting",
                gradient: "from-primary to-accent",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="group p-8 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div
                  className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} mb-4 group-hover:scale-110 transition-transform duration-300`}
                >
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32 bg-muted/50">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold">
              Ready to automate your Threads posts?
            </h2>
            <p className="text-xl text-muted-foreground">
              Start creating AI-powered content today. Get started for free.
            </p>
            <Button
              size="lg"
              className="bg-gradient-to-r from-primary via-secondary to-accent text-white border-0 hover:opacity-90 transition-opacity text-lg px-12 py-6 rounded-full shadow-lg"
              style={{ boxShadow: "var(--shadow-glow)" }}
              onClick={() => navigate("/auth")}
            >
              Create Account
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2024 Splashify Social. Automate your social presence.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
